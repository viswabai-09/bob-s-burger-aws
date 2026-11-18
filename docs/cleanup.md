# Cleanup: stop the bill

Do this only after the demo and screenshots are finished. Delete in this order so nothing is blocked by
something that still depends on it, and check each service's list page afterwards. Check every Region you used.

| Order | Resource | How |
| --- | --- | --- |
| 1 | Elastic Beanstalk environment, then the application | Terminate the environment, then delete the application |
| 2 | Auto Scaling group | EC2 > Auto Scaling groups > Delete |
| 3 | Load balancer, then target group | EC2 > Load Balancers > Delete, then Target Groups |
| 4 | EC2 instances | Terminate the base server and anything left over |
| 5 | EFS file system | EFS > Delete (this removes the mount targets) |
| 6 | RDS database | Delete, and skip the final snapshot unless you want one. A stopped database restarts itself after 7 days and still charges for storage |
| 7 | CloudFront distribution | Disable, wait until Deployed, then Delete |
| 8 | S3 buckets | Empty, then delete (the website bucket and the CloudTrail bucket) |
| 9 | Lambda functions, SQS queues, SNS topics | Delete Lambda first, because its trigger reads the queue |
| 10 | DynamoDB table | Delete |
| 11 | EventBridge schedules, CloudWatch alarms and dashboard, CloudTrail trail | Delete |
| 12 | IAM test user, group, policies and roles | Delete the ones made for this project. Keep your own admin user |
| 13 | AMIs and snapshots | Deregister the AMIs, then delete their snapshots |
| 14 | Elastic IPs and unattached volumes | Release and delete |

Then look at **Billing and Cost Management > Bills** after a day and again after three days. A charge that
keeps rising means something is still running.
