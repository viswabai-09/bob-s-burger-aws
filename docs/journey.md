# The 10-day journey

This is the day-by-day record of how Bob's Burger was built, and what I learned on the way. Each day added
one layer to the same architecture, and each day finished with a working test before I moved on.

```
Day 1   plan  ->  Day 2 network  ->  Day 3 server  ->  Day 4 S3 + CloudFront  ->  Day 5 databases
   ->  Day 6 load balancer + scaling  ->  Day 7 queue + Lambda + email  ->  Day 8 EFS + Beanstalk
   ->  Day 9 security + monitoring  ->  Day 10 demo and cleanup
```

## Day 1. Introduction and architecture

Goal: understand what is being built before touching the console. The project is a food ordering system:
customer, website, backend, database, queue, function, email. I drew the target architecture and the ten-day plan.

## Day 2. VPC and networking

Built the private network the rest of the project lives in: a VPC, public and private subnets in two
Availability Zones, an internet gateway, route tables and security groups.
Lesson: public subnets have a route to the internet gateway, private subnets do not. The database goes in the private ones.

## Day 3. EC2 and the website

Launched a server, installed Python, and ran the Flask backend with Gunicorn as a systemd service, so it
starts again after a reboot. The same server served the website. First working order, end to end.

## Day 4. S3 and CloudFront

Moved the website files to an S3 bucket and put CloudFront in front. CloudFront serves the files and forwards
`/api/*` calls to the backend.
Lesson: CloudFront caches files. After uploading a new version, create an invalidation for `/*` or the old page keeps showing.

## Day 5. RDS and DynamoDB

Orders now live in an RDS MySQL database (customers, orders, order items). The live order status lives in a
DynamoDB table so the Track page can read it quickly. Database settings moved out of the code into
`/etc/bobs-burger.env` (permissions `600`), and the app refuses to start if the file still contains example text.

## Day 6. Load balancer and Auto Scaling

Saved the configured server as an AMI, made a launch template, and built an Auto Scaling group over two
zones behind an Application Load Balancer. Health checks keep traffic away from a bad server, and the group
replaces it. AWS created CPU alarms for the scaling policy automatically.
Lesson: those `TargetTracking-...` alarms are managed by Auto Scaling. One showing "In alarm" just means CPU is low.

## Day 7. SQS, Lambda and SNS

The order pipeline. The backend saves the order, then sends a message to an SQS queue. A Lambda function
reads it, sets the status in DynamoDB and emails the customer through SNS. A dead-letter queue catches a
message that fails 5 times.
Lesson: DynamoDB reserved words. `status` and `total` must be written as `#s` and `#t` with `ExpressionAttributeNames`.
Later I made Lambda move the order on its own, one step a minute: Received, Preparing, On the way, Delivered.
It does that by putting a delayed message back on the same queue for the next step.

## Day 8. EFS and Elastic Beanstalk

Added a shared EFS folder mounted at `/mnt/efs` on every server. Each order writes a receipt file there, so
any server can read any receipt. Then deployed the same app with Elastic Beanstalk to compare a managed
deployment against building it by hand.
Lesson: EFS needs a mount target in each zone and a security group that allows NFS (port 2049) from the servers.

## Day 9. IAM, CloudWatch, CloudTrail and EventBridge

- **IAM:** a read-only group and user, then one extra policy so that user can start and stop servers, nothing more.
- **CloudWatch:** an alert topic, a dashboard, and alarms for the dead-letter queue, Lambda errors and unhealthy servers.
- **CloudTrail:** found a refused `StopInstances` call in Event history, and created a trail that stores events in S3.
- **EventBridge Scheduler:** a nightly server stop and a daily order-summary email.
Lesson: EventBridge Scheduler's templated targets have no EC2. Use All APIs, a JSON input, and an IAM role you create yourself.

## Day 10. Demo, viva and cleanup

Started everything in order, ran a health check on each layer, placed one real order and followed it through
every service. Then answered viva questions and deleted everything in dependency order. See
[demo-script.md](demo-script.md) and [cleanup.md](cleanup.md).
