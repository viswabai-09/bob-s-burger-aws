# Bob's Burger daily summary (AWS Lambda) - Version 1.0 (Day 9)
#
# Trigger : an EventBridge Scheduler schedule (once a day)
# Does    : counts the orders in the DynamoDB table bobs-burger-order-status by status and sends one summary
#           email through the SNS topic bobs-burger-ops-alerts
# Settings: environment variables TABLE_NAME and TOPIC_ARN (set in the Lambda console, no secrets here)
#
# Note: a Scan reads the whole table. That is fine for a small student table. A big production table would
# keep running counters or use a query on an index instead.

import logging
import os
from collections import Counter
from datetime import datetime, timezone

import boto3

logger = logging.getLogger()
logger.setLevel(logging.INFO)

TABLE_NAME = os.environ["TABLE_NAME"]
TOPIC_ARN = os.environ["TOPIC_ARN"]

# Created once per container and reused on the next invocation (faster).
table = boto3.resource("dynamodb").Table(TABLE_NAME)
sns = boto3.client("sns")

STATUS_ORDER = ("RECEIVED", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED")


def lambda_handler(event, context):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    counts = Counter()
    total = 0
    updated_today = 0

    # "status" is a reserved word in DynamoDB, so it is written as #s (same trick as the order processor).
    kwargs = {"ProjectionExpression": "#s, updatedAt", "ExpressionAttributeNames": {"#s": "status"}}
    while True:  # a Scan returns at most 1 MB per call, so keep going until there is no next page
        page = table.scan(**kwargs)
        for item in page.get("Items", []):
            total += 1
            counts[str(item.get("status", "UNKNOWN"))] += 1
            if str(item.get("updatedAt", "")).startswith(today):
                updated_today += 1
        last_key = page.get("LastEvaluatedKey")
        if not last_key:
            break
        kwargs["ExclusiveStartKey"] = last_key

    known = [s for s in STATUS_ORDER if s in counts]
    other = sorted(s for s in counts if s not in STATUS_ORDER)
    status_lines = "\n".join("  %s: %d" % (s, counts[s]) for s in known + other) or "  (no orders yet)"
    message = (
        "Bob's Burger daily summary for %s (UTC date)\n\n"
        "Orders in the status table: %d\n"
        "Orders updated today: %d\n\n"
        "By status:\n%s\n"
    ) % (today, total, updated_today, status_lines)

    sns.publish(
        TopicArn=TOPIC_ARN,
        Subject="Bob's Burger daily summary %s" % today,  # plain ASCII, under 100 characters
        Message=message,
    )
    logger.info("Summary sent: %d orders, %d updated today", total, updated_today)
    return {"orders": total, "updatedToday": updated_today}
