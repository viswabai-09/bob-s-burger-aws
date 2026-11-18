// Bob's Burger frontend configuration - Version 1.3 (Day 3, served from EC2)
// The website and the backend are on the same server, so the API address is the page's own address.
// Day 4 (S3 + CloudFront): this changes to the Load Balancer address.
// Leave it as "" to go back to DEMO MODE (orders kept in the browser only).
window.API_BASE_URL = window.location.origin;
