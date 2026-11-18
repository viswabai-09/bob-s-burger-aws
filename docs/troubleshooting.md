# Problems I hit and how I fixed them

| Symptom | Cause | Fix |
| --- | --- | --- |
| Lambda log shows a `ValidationException` about reserved keywords and the order never reaches DynamoDB | `status` and `total` are DynamoDB reserved words | Write them as `#s` and `#t` and pass `ExpressionAttributeNames={"#s": "status", "#t": "total"}` |
| The log still shows the old error after the fix | I was reading old log lines, or the new code was not deployed | Check the log timestamp, click **Deploy**, then place a new order |
| `scp` says `Permission denied (publickey)` | The `$SERVER` variable was missing `ec2-user@` | Set `$SERVER = "ec2-user@<public DNS>"` in every new PowerShell window. The DNS changes after a stop and start |
| No "order received" line in the server log | Gunicorn does not print `INFO` lines by default | Prove the pipeline from the DynamoDB status instead. Warnings and errors still show |
| Only one email per order | The first design sent a single confirmation | The Lambda now sends four: confirmed, being prepared, on the way, delivered |
| Status jumped straight to Preparing | Lambda moved it within one second, faster than the page checks every 10 seconds | Received now waits one step before Preparing |
| Cart still full after an order and the Back button | The browser restored an old copy of the page | The page now reloads the cart when it is shown again |
| Button stays on "Placing order..." | No healthy server or the database was stopped | Check RDS and the target group. The site now stops waiting after 25 seconds |
| A photo is missing, or the old page shows | File name differs from S3, or CloudFront is serving a cached copy | Match the name in `site/menu.js`, then invalidate `/*` |
| EventBridge Scheduler has no EC2 in Templated targets | Only a short list of services has templates | Choose **All APIs**, search `EC2`, choose `StopInstances`, input `{"InstanceIds": ["i-..."]}` |
| "Create new role for this schedule" is greyed out | It is unavailable with All APIs | Create the IAM role yourself: trust `scheduler.amazonaws.com`, attach the start/stop policy, then choose **Use existing role** |
| CloudWatch alarm `TargetTracking-...AlarmLow` is In alarm | Auto Scaling made it, and CPU is below the threshold | Normal. Leave it. It goes away when the Auto Scaling group is deleted |
| `efsMounted` is `false` | EFS is not mounted on that server | `sudo mount -a`. If it hangs, check the EFS security group allows NFS from the servers |
