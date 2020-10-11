const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const User = require('../models/Users');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({ windowMs: (60*60*1000), max: 10 });
const dotenv = require('dotenv');
dotenv.config();

// Enable if you're behind a reverse proxy (Heroku, Bluemix, AWS ELB, Nginx, etc)
// see https://expressjs.com/en/guide/behind-proxies.html
// app.set('trust proxy', 1);
if (process.env.ENVIRONMENT === "production") router.set('trust proxy', 1); 


router.get('/', (req, res, next) => {
    res.render('forgot', {
        user: req.user
    });
});

router.post('/', limiter, (req, res, next) => {
    User.findOne({ email: req.body.email }, (err, user) => {
        if (err) return next(err);
        if (!user) {
            res.status(500).send(`Email not recognized`);
        } else {
            user.resetPasswordToken = crypto.randomBytes(32).toString('hex');
            user.resetPasswordExpires = Date.now() + (60*60*1000);
            user.save();
            const transport = nodemailer.createTransport({
                service: process.env.SEND_MAIL_SERVICE,
                auth: {
                    user: process.env.SEND_MAIL_USER,
                    pass: process.env.SEND_MAIL_PASS
                }
            });
            const messageOptions = {
                to: user.email,
                from: process.env.SEND_MAIL_FROM,
                subject: 'RobotKeys.com Password Reset',
                text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
                    'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
                    'http://' + req.headers.host + '/forgot/' + user.resetPasswordToken + '\n\n' +
                    'If you did not request this, please ignore this email and your password will remain unchanged.\n'
            };
            transport.sendMail(messageOptions, (err, data) => {
                if (err) {
                    res.redirect('/forgot');
                    return next(err);
                }
                res.status(200).send('Please check your email for the reset link');
                console.log('DEBUG: data returned from sendMail\n',data);
            })
        }
    });
});

router.get('/:token', (req, res) => {
    console.log('looking up', req.params.token )
    User.findOne({ 
        resetPasswordToken: req.params.token, 
        resetPasswordExpires: { $gt: Date.now() } 
    }, (err, user) => {
        if (err) next(err);
        if (!user) {
            res.status(500).send('Password reset token is invalid or has expired.');
        } else {
            res.render('reset', {
                user: req.user
            });
        }
    });
});

router.post('/:token', (req, res) => {
    User.findOne({ 
        resetPasswordToken: req.params.token, 
        resetPasswordExpires: { $gt: Date.now() } 
    }, (err, user) => {
        if (err) next(err);
        if (!user) {
            res.status(500).send('Password reset token is invalid or has expired.');
        } else {
            console.log('req.body.password', req.body.password);
            user.passwordHash = bcrypt.hashSync(req.body.password, 10);
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;
            user.save();
            res.redirect('/login');
        }
    });
});

module.exports = router;