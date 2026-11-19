# Screenshots

Evidence from the Bob's Burger project, taken while the system was running in AWS (region `us-east-1`).
They follow one customer order from the website to the AWS services behind it. The same pictures are
shown with captions on the [main README](../README.md#screenshots).

Account numbers and email addresses were covered before upload.

## Demo video (50 seconds)

A short screen recording of the whole flow: browse the menu, add to cart, place an order, then watch the
status move on the Track page.

**Watch it:** [Bob's Burger demo video]((https://youtu.be/cBwL-SRaGbo))

## 1. Website and storage

| File | What it shows | Service |
| --- | --- | --- |
| `01-website.png` | The Bob's Burger site on the CloudFront address | CloudFront |
| `02-s3-bucket.png` | The S3 bucket holding the website files | S3 |
| `02-s3-bucket-images.png` | The `images/` folder with the burger photos and logo | S3 |
| `03-cloudfront-1.png` | The CloudFront distribution and its status | CloudFront |
| `03-cloudfront-2.png` | The distribution's settings, including how `/api` calls are forwarded | CloudFront |

## 2. Network and database

| File | What it shows | Service |
| --- | --- | --- |
| `04-vpc-map.png` | The VPC resource map: public and private subnets in two zones | VPC |
| `05-rds.png` | The MySQL database in RDS | RDS |
| `06-rds-query.png` | Saved orders read with a SQL query from a server | RDS |

## 3. Servers and scaling

| File | What it shows | Service |
| --- | --- | --- |
| `07-load-balancer.png` | The Application Load Balancer | ALB |
| `07-target-group.png` | The target group with the healthy servers | ALB |
| `08-auto-scaling.png` | The Auto Scaling group and its server count | Auto Scaling |
| `09-api-server-1.png` | `/api/server` answered by one server | ALB, EC2 |
| `09-api-server-2.png` | `/api/server` answered by a different server | ALB, EC2 |

## 4. One order, end to end

| File | What it shows | Service |
| --- | --- | --- |
| `10-cart.png` | The cart with the 10% discount | Website |
| `11-confirmation.png` | The order confirmation page with the order number | Website, EC2 |
| `12-dynamodb-1.png` | The order's live status in DynamoDB (early step) | DynamoDB |
| `12-dynamodb-2.png` | The same order's status further along | DynamoDB |
| `13-sqs.png` | The order queue and the dead-letter queue | SQS |
| `14-lambda-1.png` | The Lambda function's monitoring graphs | Lambda |
| `14-lambda-2.png` | The Lambda function's trigger from the queue | Lambda |
| `15-emails-1.png` | An order email (confirmed) | SNS |
| `15-emails-2.png` | An order email (delivered) | SNS |
| `16-track-order-1.png` | The Track Order page while the order is being prepared | Website, DynamoDB |
| `16-track-order-2.png` | The Track Order page after delivery | Website, DynamoDB |

## 5. Shared storage, monitoring and automation

| File | What it shows | Service |
| --- | --- | --- |
| `17-efs.png` | The EFS file system used for shared receipts | EFS |
| `20-cloudwatch-1.png` | The CloudWatch dashboard and alarms | CloudWatch |
| `21-cloudtrail.png` | CloudTrail event history recording who did what | CloudTrail |
| `22-eventbridge.png` | The EventBridge schedules (nightly stop, daily summary) | EventBridge Scheduler |

## Naming rules

- Lowercase, dashes, no spaces, no apostrophes (for example `07-target-group.png`, not `07-target-group's.png`).
- When one topic needs two pictures, they end in `-1` and `-2`.
- A name in a README link must match the file name exactly, including the `.png` ending.

