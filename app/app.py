# Bob's Burger backend - Version 1.5 (Day 8)
#
# What changed from 1.4 (Day 8):
#   - New optional setting EFS_MOUNT (for example /mnt/efs). When EFS is mounted there, every order also
#     writes a small receipt file to EFS_MOUNT/receipts/<order number>.txt. All servers share that folder,
#     so every server sees every receipt. If EFS is not mounted the app logs a warning and skips the
#     receipt (it never writes to the local disk by mistake). A receipt problem never fails an order.
#   - GET /api/server now also says whether EFS is mounted ("efsMounted": true or false).
#   - No phone number or address is written to the receipt.
#
# What changed from 1.3 (Day 7):
#   - After an order is saved in RDS and DynamoDB, the app puts a small message in an SQS queue.
#     A Lambda function reads the queue, moves the order to PREPARING in DynamoDB and sends an SNS email.
#   - The queue address comes from the new setting SQS_QUEUE_URL. If it is empty the app still works
#     (the order is saved, it just is not queued) and logs a warning.
#   - If the message cannot be queued, the order still succeeds: it is already safe in RDS.
#   - Start-up now refuses to run if a setting still holds a placeholder from the example file
#     (for example YOUR-RDS-ENDPOINT). It names the setting, never its value.
#
# What changed from 1.2 (Day 6): new route GET /api/server shows which server answered, so you can SEE the
# Load Balancer share requests between servers. Nothing else changed.
#
# What changed from 1.1: the menu now has the 9 share boxes (SH01-SH09) and 2 drinks (DR01, DR02).
# What changed from 1.0:
#   - Customers, orders and order items are saved in RDS (MySQL).
#   - The order status is saved in DynamoDB, so the tracking page survives a restart.
#   - If DB_HOST is not set, the app falls back to the old in-memory mode (handy on a laptop).
#
# Routes (unchanged):
#   - GET  /health                      -> {"status": "ok", "storage": "aws" or "memory"}
#   - POST /api/orders                  -> checks the order, recalculates the price and the 10% offer,
#                                          saves it, returns an order number
#   - GET  /api/orders/<id>/status      -> the status of an order
# Still to come: monitoring and automation (Day 9).
#
# Settings come from environment variables (see bobs-burger.env.example):
#   DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, DDB_TABLE, AWS_REGION, SQS_QUEUE_URL, EFS_MOUNT (optional)

import json
import os
import re
import socket
import uuid
from datetime import datetime, timezone

from flask import Flask, jsonify, request, send_from_directory

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SITE_DIR = os.environ.get("SITE_DIR", os.path.join(BASE_DIR, "site"))

app = Flask(__name__, static_folder=None)
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024  # an order is tiny; refuse anything bigger

# ---------------------------------------------------------------------------
# Storage mode. "aws" = RDS + DynamoDB, "memory" = a Python dictionary (lost on restart).
# ---------------------------------------------------------------------------
REQUIRED_SETTINGS = ("DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME", "DDB_TABLE")
STORAGE = "aws" if os.environ.get("DB_HOST") else "memory"

# The queue is optional so the app still starts without it, but its address is a setting like the others.
SQS_QUEUE_URL = os.environ.get("SQS_QUEUE_URL", "").strip()

# Optional (Day 8): the folder where the EFS shared file system is mounted, for example /mnt/efs.
EFS_MOUNT = os.environ.get("EFS_MOUNT", "").strip()


def _is_placeholder(value):
    """True if a setting still holds text copied from bobs-burger.env.example."""
    return "YOUR-" in value or "xxxxxxxxxxxx" in value or value == "put-the-app-user-password-here"


if STORAGE == "aws":
    _missing = [name for name in REQUIRED_SETTINGS if not os.environ.get(name)]
    if _missing:
        # Fail loudly at start-up so the problem shows in "journalctl", not at the first order.
        raise RuntimeError("Missing settings: " + ", ".join(_missing))
    _placeholders = [n for n in REQUIRED_SETTINGS + ("SQS_QUEUE_URL",) if _is_placeholder(os.environ.get(n, ""))]
    if _placeholders:
        # Names only, never the values (one of them is the database password).
        raise RuntimeError("Settings still hold example text, edit /etc/bobs-burger.env: " + ", ".join(_placeholders))

ORDERS = {}  # used only in "memory" mode

# Prices live on the SERVER. The browser's prices are only for display and are never trusted.
# id: (name, price in INR, category). Keep this in step with site/menu.js.
MENU = {
    "TH01": ("Tender Beef Burger", 279, "twohand"),
    "TH02": ("BBQ Beef Burger", 299, "twohand"),
    "TH03": ("12 O Crisp Chicken Burger", 249, "twohand"),
    "TH04": ("Big Fish Burger", 279, "twohand"),
    "NB01": ("Classic Beef Burger", 149, "normal"),
    "NB02": ("Spice Beef Burger", 169, "normal"),
    "NB03": ("Red Pepper Chicken Burger", 149, "normal"),
    "NB04": ("Some Chicken Burger", 129, "normal"),
    "NB05": ("Some Fish Burger", 159, "normal"),
    "SP01": ("12 O Smokey Beef Burger", 349, "special"),
    "SP02": ("12 Spice Chicken Burger", 329, "special"),
    # Share boxes: 3 burgers + 2 medium fries + 4 dips + 2 x 750 ml drinks
    "SH01": ("Bento-Style Share Box - Beef", 699, "share"),
    "SH02": ("Bento-Style Share Box - Chicken", 649, "share"),
    "SH03": ("Bento-Style Share Box - Fish", 679, "share"),
    "SH04": ("The Pull-Apart Loaf - Beef", 749, "share"),
    "SH05": ("The Pull-Apart Loaf - Chicken", 699, "share"),
    "SH06": ("The Pull-Apart Loaf - Fish", 729, "share"),
    "SH07": ("Slider Flight on a Wooden Paddle - Beef", 719, "share"),
    "SH08": ("Slider Flight on a Wooden Paddle - Chicken", 669, "share"),
    "SH09": ("Slider Flight on a Wooden Paddle - Fish", 699, "share"),
    # Drinks (750 ml bottles)
    "DR01": ("Coca-Cola 750 ml", 70, "drink"),
    "DR02": ("Pepsi 750 ml", 70, "drink"),
}

# Offer: buy 3 or more Two Hand / Special burgers (any mix), get 10% off those burgers.
OFFER_MIN_QTY = 3
OFFER_PERCENT = 10
OFFER_CATEGORIES = ("twohand", "special")

MAX_QTY_PER_ITEM = 20

PHONE_RE = re.compile(r"^\+?[0-9]{7,15}$")
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
ORDER_ID_RE = re.compile(r"^BB-[0-9A-F]{8}$")


# ---------------------------------------------------------------------------
# RDS (MySQL): customers, orders, order_items
# ---------------------------------------------------------------------------
def db_connect():
    import pymysql  # imported here so memory mode needs no database packages

    return pymysql.connect(
        host=os.environ["DB_HOST"],
        port=int(os.environ.get("DB_PORT", "3306")),
        user=os.environ["DB_USER"],
        password=os.environ["DB_PASSWORD"],
        database=os.environ["DB_NAME"],
        charset="utf8mb4",
        connect_timeout=5,
        read_timeout=10,
        write_timeout=10,
        autocommit=False,  # we commit once, after all three tables are written
    )


def save_order_rds(order_id, customer, lines, subtotal, discount, total):
    """Write the customer, the order and its items in ONE transaction: all saved or none."""
    conn = db_connect()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO customers (name, phone, address, email) VALUES (%s, %s, %s, %s)",
                (customer["name"], customer["phone"], customer["address"], customer["email"] or None),
            )
            customer_id = cur.lastrowid
            cur.execute(
                "INSERT INTO orders (order_id, customer_id, subtotal, discount, total, status) "
                "VALUES (%s, %s, %s, %s, %s, %s)",
                (order_id, customer_id, subtotal, discount, total, "RECEIVED"),
            )
            cur.executemany(
                "INSERT INTO order_items (order_id, item_id, item_name, quantity, unit_price) "
                "VALUES (%s, %s, %s, %s, %s)",
                [(order_id, l["id"], l["name"], l["quantity"], l["unitPrice"]) for l in lines],
            )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def status_from_rds(order_id):
    conn = db_connect()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT status FROM orders WHERE order_id = %s", (order_id,))
            row = cur.fetchone()
        return row[0] if row else None
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# DynamoDB: one small item per order, holding the live status
# ---------------------------------------------------------------------------
_ddb_table = None


def ddb_table():
    global _ddb_table
    if _ddb_table is None:
        import boto3
        from botocore.config import Config

        cfg = Config(connect_timeout=3, read_timeout=5, retries={"max_attempts": 2})
        resource = boto3.resource("dynamodb", region_name=os.environ.get("AWS_REGION", "us-east-1"), config=cfg)
        _ddb_table = resource.Table(os.environ["DDB_TABLE"])
    return _ddb_table


def put_status_ddb(order_id, status, total):
    ddb_table().put_item(
        Item={
            "orderId": order_id,
            "status": status,
            "total": total,
            "updatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        }
    )


# ---------------------------------------------------------------------------
# SQS: after the order is saved, put one small message in the queue (Day 7)
# ---------------------------------------------------------------------------
_sqs_client = None


def sqs_client():
    global _sqs_client
    if _sqs_client is None:
        import boto3
        from botocore.config import Config

        cfg = Config(connect_timeout=3, read_timeout=5, retries={"max_attempts": 2})
        _sqs_client = boto3.client("sqs", region_name=os.environ.get("AWS_REGION", "us-east-1"), config=cfg)
    return _sqs_client


def send_order_message(order_id, customer_name, lines, total):
    """Queue what the Lambda function needs to send the email. No phone number and no address: it does not need them."""
    body = {
        "orderId": order_id,
        "customerName": customer_name,
        "items": [{"name": l["name"], "quantity": l["quantity"]} for l in lines],
        "total": total,
        "placedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }
    sqs_client().send_message(QueueUrl=SQS_QUEUE_URL, MessageBody=json.dumps(body))


def lookup_status(order_id):
    """Return the status text, or None if the order does not exist."""
    if STORAGE == "memory":
        order = ORDERS.get(order_id)
        return order["status"] if order else None
    try:
        item = ddb_table().get_item(Key={"orderId": order_id}).get("Item")
        if item:
            return item["status"]
    except Exception:
        app.logger.exception("DynamoDB read failed for %s; trying RDS", order_id)
    return status_from_rds(order_id)  # RDS is the source of truth if DynamoDB has nothing


# ---------------------------------------------------------------------------
# Helpers and routes
# ---------------------------------------------------------------------------
def bad_request(message):
    return jsonify({"error": message}), 400


def calculate(items):
    """Return (lines, subtotal, discount, total) in whole rupees, using the server's prices."""
    lines = []
    subtotal = 0
    eligible_qty = 0
    eligible_amount = 0
    for item_id, qty in items.items():
        name, price, category = MENU[item_id]
        line_total = price * qty
        lines.append({"id": item_id, "name": name, "quantity": qty, "unitPrice": price, "lineTotal": line_total})
        subtotal += line_total
        if category in OFFER_CATEGORIES:
            eligible_qty += qty
            eligible_amount += line_total
    discount = 0
    if eligible_qty >= OFFER_MIN_QTY:
        # whole-number maths, rounding half up, so the result matches the website exactly
        discount = (eligible_amount * OFFER_PERCENT + 50) // 100
    return lines, subtotal, discount, subtotal - discount


@app.get("/health")
def health():
    # Deliberately does NOT touch the databases: the Load Balancer (Day 6) uses this to decide
    # whether the server is alive, and a database hiccup must not make it remove every server.
    return jsonify({"status": "ok", "storage": STORAGE})


def write_receipt(order_id, customer_name, lines, total):
    """Write one small text file for the order on the shared EFS folder. Returns True if it was written.

    The folder EFS_MOUNT/receipts must already exist (you create it once on Day 8). The app does not create
    it, and it first checks that EFS is really mounted: otherwise a missing mount would quietly put the
    files on this server's own disk, where the other servers cannot see them.
    """
    if not EFS_MOUNT or not os.path.ismount(EFS_MOUNT):
        return False
    folder = os.path.join(EFS_MOUNT, "receipts")
    item_text = "\n".join("  %d x %s" % (int(l["quantity"]), l["name"]) for l in lines)
    text = (
        "Bob's Burger receipt\n"
        "Order: %s\n"
        "Placed (UTC): %s\n"
        "Written by server: %s\n"
        "Customer: %s\n"
        "Items:\n%s\n"
        "Total: INR %d\n"
    ) % (order_id, datetime.now(timezone.utc).isoformat(timespec="seconds"), socket.gethostname(),
         str(customer_name)[:60], item_text, int(total))
    final_path = os.path.join(folder, order_id + ".txt")
    temp_path = final_path + ".tmp"
    with open(temp_path, "w", encoding="utf-8") as f:  # write a temp file, then rename: no half-written receipts
        f.write(text)
    os.replace(temp_path, final_path)
    return True


@app.get("/api/server")
def which_server():
    # Day 6 teaching route: shows the private name of the server that answered (for example ip-10-0-1-25).
    # It lets you watch the Load Balancer switch between servers. Remove it in a real production system.
    efs_mounted = bool(EFS_MOUNT) and os.path.ismount(EFS_MOUNT)
    resp = jsonify({"server": socket.gethostname(), "efsMounted": efs_mounted})
    resp.headers["Cache-Control"] = "no-store"
    return resp


@app.post("/api/orders")
def create_order():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return bad_request("Send the order as JSON.")

    name = data.get("customerName")
    phone = data.get("phone")
    address = data.get("address")
    email = data.get("email") or ""
    raw_items = data.get("items")

    if not isinstance(name, str) or not 2 <= len(name.strip()) <= 60:
        return bad_request("Name must be 2 to 60 characters.")
    if not isinstance(phone, str) or not PHONE_RE.match(phone.strip()):
        return bad_request("Phone must be 7 to 15 digits.")
    if not isinstance(address, str) or not 10 <= len(" ".join(address.split())) <= 250:
        return bad_request("Address must be 10 to 250 characters.")
    if not isinstance(email, str) or (email and (len(email) > 100 or not EMAIL_RE.match(email.strip()))):
        return bad_request("Email is not valid.")
    if not isinstance(raw_items, list) or not 1 <= len(raw_items) <= 30:
        return bad_request("Add at least one item.")

    items = {}
    for entry in raw_items:
        if not isinstance(entry, dict):
            return bad_request("Each item must have an id and a quantity.")
        item_id = entry.get("id")
        qty = entry.get("quantity")
        if item_id not in MENU:
            return bad_request("Unknown item.")
        if isinstance(qty, bool) or not isinstance(qty, int) or not 1 <= qty <= MAX_QTY_PER_ITEM:
            return bad_request("Quantity must be a whole number from 1 to %d." % MAX_QTY_PER_ITEM)
        items[item_id] = min(items.get(item_id, 0) + qty, MAX_QTY_PER_ITEM)

    lines, subtotal, discount, total = calculate(items)

    client_total = data.get("clientTotal")
    if client_total != total:
        app.logger.warning("Browser total %r differs from server total %r; using the server total", client_total, total)

    order_id = "BB-" + uuid.uuid4().hex[:8].upper()
    customer = {
        "name": name.strip(),
        "phone": phone.strip(),
        "address": " ".join(address.split()),
        "email": email.strip(),
    }

    if STORAGE == "memory":
        ORDERS[order_id] = {"status": "RECEIVED", "total": total}
    else:
        # 1) RDS first: this is the permanent record. If it fails, nothing was saved, so say so.
        try:
            save_order_rds(order_id, customer, lines, subtotal, discount, total)
        except Exception:
            app.logger.exception("RDS write failed for order %s", order_id)
            return jsonify({"error": "We could not save your order. Please try again."}), 503
        # 2) DynamoDB second: the live status. The order is already safe in RDS, so a failure here
        #    is logged but does not fail the order; the status endpoint falls back to RDS.
        try:
            put_status_ddb(order_id, "RECEIVED", total)
        except Exception:
            app.logger.exception("DynamoDB status write failed for order %s (order is safe in RDS)", order_id)
        # 3) SQS last: this starts the kitchen pipeline (Lambda, then DynamoDB status, then the SNS email).
        #    The order is already safe in RDS, so a failure here is logged but does not fail the order.
        if SQS_QUEUE_URL:
            try:
                send_order_message(order_id, customer["name"], lines, total)
                app.logger.info("Order %s put in the queue", order_id)
            except Exception:
                app.logger.exception("SQS send failed for order %s (order is safe in RDS)", order_id)
        else:
            app.logger.warning("SQS_QUEUE_URL is not set, so order %s was not queued", order_id)

    # Receipt on the shared EFS folder (Day 8). Optional: a problem here never fails the order.
    if EFS_MOUNT:
        try:
            if write_receipt(order_id, customer["name"], lines, total):
                app.logger.info("Receipt for order %s saved on EFS", order_id)
            else:
                app.logger.warning("EFS is not mounted at %s, so the receipt for order %s was not saved", EFS_MOUNT, order_id)
        except Exception:
            app.logger.exception("Receipt write failed for order %s (the order itself is safe)", order_id)

    # Log the order number and amounts only, never the customer's phone or address.
    app.logger.info("Order %s received: %d item lines, total INR %d", order_id, len(lines), total)

    return jsonify({
        "orderId": order_id,
        "status": "RECEIVED",
        "currency": "INR",
        "items": lines,
        "subtotal": subtotal,
        "discount": discount,
        "total": total,
    }), 201


@app.get("/api/orders/<order_id>/status")
def order_status(order_id):
    if not ORDER_ID_RE.match(order_id):
        return jsonify({"error": "Order not found."}), 404
    try:
        status = lookup_status(order_id)
    except Exception:
        app.logger.exception("Status lookup failed for %s", order_id)
        return jsonify({"error": "Status is temporarily unavailable."}), 503
    if status is None:
        return jsonify({"error": "Order not found."}), 404
    return jsonify({"orderId": order_id, "status": status})


@app.after_request
def add_headers(response):
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response


@app.get("/")
def home():
    return send_from_directory(SITE_DIR, "index.html")


@app.get("/<path:filename>")
def site_file(filename):
    # send_from_directory refuses paths that try to escape SITE_DIR
    return send_from_directory(SITE_DIR, filename)


if __name__ == "__main__":
    # Only for trying the app by hand. The real server runs it with gunicorn (see bobs-burger.service).
    app.run(host="127.0.0.1", port=int(os.environ.get("PORT", "5000")))
