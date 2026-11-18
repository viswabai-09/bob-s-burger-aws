# Bob's Burger order processor (AWS Lambda) - Version 1.3 (Day 7, order steps with a visible Received step)
#
# Trigger : the SQS queue bobs-burger-order-queue
# One order passes through these steps on its own, one step per STEP_DELAY_SECONDS (default 60):
#     RECEIVED  ->  PREPARING  ->  OUT_FOR_DELIVERY  ->  DELIVERED   (then it stays DELIVERED)
#
#   New-order message  {"orderId", "customerName", "items", "total", ...}
#       1) emails "order confirmed" through the SNS topic
#       2) makes sure the DynamoDB item exists with status RECEIVED (it stays RECEIVED for one step)
#       3) puts a follow-up message on the SAME queue, delayed, asking for PREPARING
#   Follow-up message  {"orderId", "customerName", "advanceTo": "PREPARING", "OUT_FOR_DELIVERY" or "DELIVERED"}
#       1) sets the next status in DynamoDB (only if the order is in the step just before it)
#       2) emails the customer
#       3) queues the next follow-up (nothing after DELIVERED)
#
# Settings (Lambda console > Configuration > Environment variables):
#     TABLE_NAME          bobs-burger-order-status          (required)
#     TOPIC_ARN           the order-alerts topic ARN        (required)
#     STEP_DELAY_SECONDS  seconds between steps, 0 to 900  (optional, default 60)
#     QUEUE_URL           only needed if you test with an event that has no eventSourceARN (optional)
#
# If anything goes wrong the function raises an error. SQS then shows the message again after the
# visibility timeout, and after 5 failed tries moves it to the dead-letter queue.

import json
import logging
import os
import re
from datetime import datetime, timezone

import boto3

logger = logging.getLogger()
logger.setLevel(logging.INFO)

TABLE_NAME = os.environ["TABLE_NAME"]
TOPIC_ARN = os.environ["TOPIC_ARN"]
try:
    STEP_DELAY = max(0, min(900, int(os.environ.get("STEP_DELAY_SECONDS", "60"))))  # SQS allows 0 to 900
except ValueError:
    STEP_DELAY = 60
QUEUE_URL_SETTING = os.environ.get("QUEUE_URL", "").strip()

# Created once per container and reused on the next invocation (faster).
table = boto3.resource("dynamodb").Table(TABLE_NAME)
sns = boto3.client("sns")
sqs = boto3.client("sqs")

ORDER_ID_RE = re.compile(r"^BB-[0-9A-F]{8}$")

NEXT = {"RECEIVED": "PREPARING", "PREPARING": "OUT_FOR_DELIVERY", "OUT_FOR_DELIVERY": "DELIVERED"}   # what comes after each step
PREVIOUS = {"PREPARING": "RECEIVED", "OUT_FOR_DELIVERY": "PREPARING", "DELIVERED": "OUT_FOR_DELIVERY"}  # the step an order must be in first


def lambda_handler(event, context):
    # With batch size 1 there is one record; the loop also works for bigger batches.
    for record in event["Records"]:
        process(record["body"], queue_url_for(record))
    return {"processed": len(event["Records"])}


def queue_url_for(record):
    """The queue this message came from, so follow-ups go back to the same queue."""
    if QUEUE_URL_SETTING:
        return QUEUE_URL_SETTING
    arn = record.get("eventSourceARN", "")           # arn:aws:sqs:REGION:ACCOUNT:NAME
    parts = arn.split(":")
    if len(parts) == 6 and parts[2] == "sqs":
        return "https://sqs.%s.amazonaws.com/%s/%s" % (parts[3], parts[4], parts[5])
    return ""


def process(body, queue_url):
    order = json.loads(body)  # a message that is not JSON raises here and is retried
    if not isinstance(order, dict):
        raise ValueError("The message must be a JSON object")
    order_id = order["orderId"]
    if not isinstance(order_id, str) or not ORDER_ID_RE.match(order_id):
        raise ValueError("Bad order number")
    if "advanceTo" in order:
        advance(order, order_id, queue_url)
    else:
        new_order(order, order_id, queue_url)


def move_status(order_id, new, old, total=None, create_if_missing=False):
    """Move the order from `old` to `new` in DynamoDB. The status only ever moves forward.
    Returns "moved", "already" (it was already `new`, for example a repeated message) or "past"."""
    # "status" and "total" are reserved words in DynamoDB, so they are written as #s and #t.
    names = {"#s": "status"}
    values = {":new": new, ":old": old, ":now": datetime.now(timezone.utc).isoformat(timespec="seconds")}
    expression = "SET #s = :new, updatedAt = :now"
    condition = "attribute_not_exists(#s) OR #s = :old" if create_if_missing else "#s = :old"
    if total is not None:
        expression += ", #t = :total"
        names["#t"] = "total"
        values[":total"] = total
    try:
        table.update_item(
            Key={"orderId": order_id},
            UpdateExpression=expression,
            ConditionExpression=condition,
            ExpressionAttributeNames=names,
            ExpressionAttributeValues=values,
        )
        return "moved"
    except table.meta.client.exceptions.ConditionalCheckFailedException:
        item = table.get_item(Key={"orderId": order_id}).get("Item", {})
        return "already" if item.get("status") == new else "past"


def queue_next_step(queue_url, order_id, name, next_status):
    if not queue_url:
        logger.warning("No queue address (no eventSourceARN and no QUEUE_URL), so %s will stay as it is", order_id)
        return
    sqs.send_message(
        QueueUrl=queue_url,
        MessageBody=json.dumps({"orderId": order_id, "customerName": name, "advanceTo": next_status}),
        DelaySeconds=STEP_DELAY,
    )
    logger.info("Order %s: %s is queued in %d seconds", order_id, next_status, STEP_DELAY)


def new_order(order, order_id, queue_url):
    name = str(order.get("customerName", "customer"))[:60]
    total = int(order["total"])
    lines = order.get("items", [])

    # 1) Email first. SQS can deliver a message twice (at-least-once), so a repeat means a second
    #    email, which is harmless. Sending last could lose the email if the status update worked
    #    but the send failed, because the retry would then think the work was done.
    item_text = "\n".join("  %s x %s" % (int(i["quantity"]), i["name"]) for i in lines)
    message = (
        "Order %s is confirmed.\n\n"
        "Customer: %s\n"
        "Items:\n%s\n"
        "Total: INR %d\n\n"
        "The kitchen will start preparing it shortly. Open the Track Order page and type the order number to follow it."
        % (order_id, name, item_text, total)
    )
    sns.publish(
        TopicArn=TOPIC_ARN,
        Subject="Bob's Burger: order %s confirmed" % order_id,  # plain ASCII, under 100 characters
        Message=message,
    )

    # 2) Status second: make sure the DynamoDB item exists and says RECEIVED. An item that is already
    #    there (the website wrote it) is left exactly as it is. The order now waits one step as RECEIVED.
    current = ensure_received(order_id, total)
    logger.info("Order %s: confirmed email sent, status is %s", order_id, current)

    # 3) Start the clock for the next step (PREPARING), unless the order is already past RECEIVED.
    if current == "RECEIVED":
        queue_next_step(queue_url, order_id, name, NEXT["RECEIVED"])


def ensure_received(order_id, total):
    """Create the order's DynamoDB item as RECEIVED if it does not exist. Returns the current status."""
    try:
        table.update_item(
            Key={"orderId": order_id},
            UpdateExpression="SET #s = :new, updatedAt = :now, #t = :total",
            ConditionExpression="attribute_not_exists(#s)",
            ExpressionAttributeNames={"#s": "status", "#t": "total"},  # reserved words in DynamoDB
            ExpressionAttributeValues={
                ":new": "RECEIVED",
                ":now": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                ":total": total,
            },
        )
        return "RECEIVED"
    except table.meta.client.exceptions.ConditionalCheckFailedException:
        return table.get_item(Key={"orderId": order_id}).get("Item", {}).get("status", "RECEIVED")


def advance(order, order_id, queue_url):
    target = order["advanceTo"]
    if target not in PREVIOUS:
        raise ValueError("Bad status step")
    name = str(order.get("customerName", "customer"))[:60]

    # 1) Status first. If the email or the next message fails later, the retry finds the status
    #    already moved ("already") and simply carries on, so nothing is lost.
    result = move_status(order_id, target, PREVIOUS[target])
    if result == "past":
        logger.info("Order %s is already past %s; nothing to do", order_id, target)
        return

    # 2) Email the customer.
    if target == "PREPARING":
        subject = "Bob's Burger: order %s is being prepared" % order_id
        text = "Order %s is being prepared.\n\nHi %s, the kitchen has started cooking your order." % (order_id, name)
    elif target == "OUT_FOR_DELIVERY":
        subject = "Bob's Burger: order %s is on the way" % order_id
        text = "Order %s is out for delivery.\n\nHi %s, your burgers are on the way." % (order_id, name)
    else:
        subject = "Bob's Burger: order %s delivered" % order_id
        text = "Order %s has been delivered.\n\nEnjoy your meal, %s!" % (order_id, name)
    sns.publish(TopicArn=TOPIC_ARN, Subject=subject, Message=text)  # subject is plain ASCII

    # 3) Next step, if there is one (nothing comes after DELIVERED).
    if target in NEXT:
        queue_next_step(queue_url, order_id, name, NEXT[target])
    logger.info("Order %s moved to %s (%s)", order_id, target, result)
