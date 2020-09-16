const createError = require('http-errors');
const express = require('express');
const router = express.Router();
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const mongoose = require('mongoose');
require('./models.js');
const bcrypt = require('bcrypt');
const expressSession = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const dotenv = require('dotenv');
dotenv.config();
//const AWS = require('aws-sdk');
//AWS.config.update({region: 'REGION'}); // Load credentials and set region from JSON file
const ec2 = require('./ec2.js');
const User = mongoose.model('User');
const namecheap = require('./namecheap.js');
const sshscript = require('./sshscript.js');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const forgot = require('./routes/forgot')
const webhook = require('./webhook.js')

//mongoose.connect('mongodb://'+process.env.MONGO_USERNAME+":"+process.env.MONGO_PASSWORD+"@"+process.env.MONGO_LOCATION,{useNewUrlParser: true, useUnifiedTopology: true})
mongoose.connect(process.env.MONGO_LOCATION, {useNewUrlParser: true, useUnifiedTopology: true});

const app = express();
app.use(router);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use('/webhook', webhook);


app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(expressSession({
    secret: process.env.EXPRESS_SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password',
}, (email, password, next) => {
    User.findOne({
        email: email
    }, (err, user) => {
        if (err) return next(err);
        if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
            return next({message: 'Email or password incorrect'});
        }
        return next(null, user);
    })
}));

passport.use('signup-local', new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
}, (email, password, next) => {
    User.findOne({
        email: email
    }, (err, user) => {
        if (err) return next(err);
        if (user) return next({message: "User already exists"});
        let newUser = new User({
            email: email,
            passwordHash: bcrypt.hashSync(password, 10)
        });
        newUser.save((err) => {
            return next(err, newUser);
        });

    });
}));

passport.serializeUser((user, next) => {
    return next(null, user._id);
});

passport.deserializeUser((id, next) => {
    User.findById(id, (err, user) => {
        return next(err, user);
    })
});

app.get('/', (req, res) => {
    res.render('index', {title: "RobotKeys"});
});

app.get('/billing', (req, res, next) => {
    if (req.user.subscriptionActive) {
        res.redirect('/main');
    } else {
        stripe.checkout.sessions.create({
            customer_email: req.user.email,
            payment_method_types: ['card'],
            subscription_data: {
                items: [{
                    plan: process.env.STRIPE_PLAN,
                }],
            },
            success_url: process.env.STRIPE_WEBHOOK_SUCCESS_URL,
            cancel_url: process.env.STRIPE_WEBHOOK_CANCEL_URL,
        }, (err, session) => {
            if (err) return next(err);
            res.render('billing', {
                STRIPE_PUBLIC_KEY: process.env.STRIPE_PUBLIC_KEY,
                sessionId: session.id,
                subscriptionActive: req.user.subscriptionActive,
                subdomain: req.user.subdomain
            })
        });
    }
});

app.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/');
});

app.get('/main', (req, res) => {
    if (!req.user.subscriptionActive) {
        res.redirect('/billing');
    } else {
        res.render('main', {
            subscriptionActive: req.user.subscriptionActive,
            subdomain: req.user.subdomain,
            SLD: process.env.APP_URL_SLD,
            TLD: process.env.APP_URL_TLD
        });
    }

});

app.post('/main', (req, res, next) => {
    // if user has an instance, get the IP, update nameservers, and launch scripts when nameservers update
    if (req.user.instance) {
        User.findOne({subdomain: req.body.subdomain}, (err, user) => {
            if (err) return next(err);
            if (user) return next({message: 'Subdomain is taken.'});
            if (!user) {
                User.findOne({_id: req.user._id}, (err, user) => {
                    if (err) return next(err);
                    if (user) {
                        user.subdomain = req.body.subdomain;
                        user.save();
                        /////////////////////////////////////////////
                        ec2.getIP(req.user.instance, (err, data) => {
                            user.ip = data;
                            user.save();
                            namecheap.addHost(user.subdomain, user.ip, (err, data) => {
                                let entry = {
                                    domain: [user.subdomain, process.env.APP_URL_SLD, process.env.APP_URL_TLD].join('.'),
                                    dav_user: req.body.name,
                                    dav_pass: req.body.pw
                                }
                                sshscript.dnsWatchdog(entry.domain, 0, () => {
                                    console.log("Watchdog ended, triggering sshPayload")
                                    sshscript.sshPayload(entry, () => {
                                        console.log("sshPayload has ended and triggered its callback")
                                    });
                                });
                            });
                        });
                        /////////////////////////////////////////////
                        ec2.tagInstance(user.instance,'Name',user.subdomain, () => {
                            //console.log("Instance Tagged")
                        })
                        res.redirect('/main');
                    }
                });
            }
        });
    }

});

app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login',
    passport.authenticate('local', {failureRedirect: '/login'}), (req, res) => {
        res.redirect('/main');
    });

app.use('/forgot', forgot);

app.get('/guide', (req, res) => {
    res.render('guide')
});

app.post('/signup',
    passport.authenticate('signup-local', {failureRedirect: '/'}),
    (req, res) => {
        res.redirect('/billing');
    });

// catch 404 and forward to error handler
app.use((req, res, next) => {
    next(createError(404));
});

// error handler
app.use((err, req, res) => {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;
