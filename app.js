var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var mongoose = require('mongoose');
require('./models.js');
var bcrypt = require('bcrypt');
var expressSession = require('express-session');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var dotenv = require('dotenv');
dotenv.config();
var AWS = require('aws-sdk');
AWS.config.update({region: 'REGION'}); // Load credentials and set region from JSON file

var User = mongoose.model('User');

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

mongoose.connect('mongodb://localhost:27017/robotkeys-data',{ useNewUrlParser: true, useUnifiedTopology: true });

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// ----------------- Stripe Sample Code ------------------
// Use body-parser to retrieve the raw body as a buffer
const bodyParser = require('body-parser');

// Match the raw body to content type application/json
app.post('/webhook', bodyParser.raw({type: 'application/json'}), (request, response) => {
  const sig = request.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(request.body, sig, process.env.ENDPOINT_SECRET);
  } catch (err) {
    return response.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the checkout.session.completed event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    // Fulfill the purchase...
    console.log(session);
    User.findOne({
      email: session.customer_email
    }, function (err,user) {
      if (user) {
        user.subscriptionActive = true;
        user.subscriptionId = session.subscription;
        user.customerId = session.customer;
        user.save();
      }
    })
  }

  // Return a response to acknowledge receipt of the event
  response.json({received: true});
});
// ----------------- End Stripe Sample Code ------------------

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
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
}, function (email,password,next) {
  User.findOne({
    email: email
  }, function(err,user) {
    if (err) return next(err);
    if(!user || !bcrypt.compareSync(password, user.passwordHash)) {
      return next({message: 'Email or password incorrect'});
    }
    next(null,user);
  })
}));

passport.use('signup-local', new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password',
}, function (email,password,next) {
  User.findOne({
    email: email
  }, function(err,user) {
    if (err) return next(err);
    if (user) return next({message: "User already exists"});
    let newUser = new User({
      email: email,
      passwordHash: bcrypt.hashSync(password, 10)
    });
    newUser.save(function(err) {
      next(err, newUser);
    });

  });
}));

passport.serializeUser(function (user,next) {
  next(null,user._id);
});

passport.deserializeUser(function (id,next) {
  User.findById(id, function (err, user) {
    next(err,user);
  })
});

app.get('/', function(req,res,next) {
  res.render('index', {title: "RobotKeys"});
});

app.get('/billing', function(req,res,next) {
  stripe.checkout.sessions.create({
    customer_email: req.user.email,
    payment_method_types: ['card'],
    subscription_data: {
      items: [{
        plan: process.env.STRIPE_PLAN,
      }],
    },
    success_url: 'http://localhost:3000/billing?session_id={CHECKOUT_SESSION_ID}',
    cancel_url: 'http://localhost:3000/billing',
  }, function (err, session) {
    if (err) return next(err);
    res.render('billing', {
      STRIPE_PUBLIC_KEY: process.env.STRIPE_PUBLIC_KEY,
      sessionId: session.id,
      subscriptionActive: req.user.subscriptionActive
    })
  });
});

app.get('/logout', function(req,res,next) {
  req.logout();
  res.redirect('/');
});

app.get('/main', function(req,res,next) {
  res.render('main');
});

app.get('/login', function(req,res,next) {
  res.render('login');
});

app.post('/login',
    passport.authenticate('local', { failureRedirect: '/login' }),
    function(req, res) {
      res.redirect('/main');
    });

app.get('/walkthrough', function (req,res,next) {
  req.session.sawWalkthrough = true;
  res.end();
});

app.get('/complicated', function (req,res,next) {
  console.log(req.session.sawWalkthrough);
});

app.post('/signup',
    passport.authenticate('signup-local', { failureRedirect: '/' }),
    function(req, res) {
      res.redirect('/main');
    });

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
