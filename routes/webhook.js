const express = require('express');
const router = express.Router();
const User = require('../models/Users');
const dotenv = require('dotenv');
dotenv.config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const ec2 = require('../modules/ec2');

// ----------------- Stripe Sample Code ------------------
// Use body-parser to retrieve the raw body as a buffer
const bodyParser = require('body-parser');

// Match the raw body to content type application/json
router.post('/', bodyParser.raw({type: 'application/json'}), (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_ENDPOINT_SECRET);
    } catch (err) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;

        // Fulfill the purchase...
        console.log("[Checkout Completed]");
        User.findOne({
            email: session.customer_email
        }, (err, user) => {
            if (user) {
                user.subscriptionActive = true;
                user.subscriptionId = session.subscription;
                user.customerId = session.customer;
                user.save();
                ec2.newEC2((err, data) => {
                    if (err) {
                        console.log("[AWS API ERROR] The instance failed to be created");
                    } else {
                        console.log("[AWS API] New instance created:", data);
                        user.instance = data;
                        user.save();
                    }
                });
            }
        })
    }

    // Return a response to acknowledge receipt of the event
    res.json({received: true});
});
// ----------------- End Stripe Sample Code ------------------

module.exports = router;