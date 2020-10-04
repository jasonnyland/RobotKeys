# RobotKeys
RobotKeys is a PaaS that accepts payment and then creates a pre-configured WebDAV server with SSL for customers to host a KeePass file.  It is my first web development project.
## How It Works
1.  User creates account or logs in
2.  User chooses a subscription plan and pays through the Stripe portal
4.  An API call is made to AWS to create a new EC2 instance
5.  User is prompted to choose a subdomain and WebDAV credentials
6.  An API call is made to Namecheap to create a DNS entry for the subdomain
7.  A watchdog process pings the subdomain every minute until the DNS propogates
8.  Once the URL is valid, the app connects to the server via SSH to copy and execute scripts
9.  Two Docker containers are run: a LetsEncrypt-configured reverse proxy & a WebDAV server

## Sources
- I started with this SaaS tutorial on Youtube [Full-Stack Web Dev Crash Course](https://bit.ly/3junLhh) because this was my first experience with Javascript, Node.js, and web development.  This left me with working user validation and Stripe payment integration.
- I have been using a VPS to host my KeePass database for several years based on this [DigitalOcean tutorial](https://do.co/34ocjNN).  It is preferrable to use WebDAV instead of services like Dropbox to avoid overwrites and conflicts when multiple devices are accessing the same file.

## Outcome
I have decided to halt development on this project and make it public as a portfolio piece.  I don't think the business model is sustainable: it would cost $6/month per customer when newer services like Bitwarden are priced at $10 per year, and is still far from being production-ready.  If I were to continue, some features I would still need to implement would be:
- Enforce good passwords
- Create functionality to unsubscribe and remove instances
- Add discounted yearly subscription tier using reserve instances on EC2
- Add Terms of Service
- Use Ansible or similar to provision/update client machines instead of Bash scripts
