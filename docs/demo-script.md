# The 10-minute demo script

One story: a customer orders a burger, and I follow that one order through every service.

| Time | Show | What I say |
| --- | --- | --- |
| 0:00 | Architecture diagram | The customer reaches CloudFront, which serves the site from S3 and sends orders to the load balancer |
| 0:45 | CloudFront address and the S3 bucket | S3 stores the page and photos, CloudFront delivers them from edge locations |
| 1:45 | `/api/server`, refreshed a few times | The load balancer spreads requests over two servers in different zones |
| 2:30 | Auto Scaling group and target group | The group keeps the right number of servers and replaces an unhealthy one |
| 3:15 | Place an order with 3 burgers | The server checks prices itself, so the total cannot be changed in the browser |
| 4:15 | SQS queue and Lambda monitor | The queue holds the order so it is never lost, and Lambda picks it up |
| 5:15 | DynamoDB item | Lambda writes the live status here for fast lookups |
| 6:00 | Email inbox and the Track Order page | SNS sent the email, and the Track page reads the same table |
| 6:45 | Receipt file in the shared EFS folder | Every server writes receipts to one shared folder |
| 7:30 | CloudWatch dashboard and alarms | Alarms email me if the dead-letter queue fills, Lambda fails or a server goes unhealthy |
| 8:15 | IAM user and CloudTrail event history | The viewer user can read but not stop servers, and CloudTrail records who did what |
| 9:00 | EventBridge schedules | A nightly stop and a daily order summary run on a schedule |
| 9:40 | Back to the diagram | One order touched ten services |
