const bcrypt = require('bcrypt');
require('../models/models');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

passport.serializeUser((user, next) => {
    return next(null, user._id);
});

passport.deserializeUser((id, next) => {
    User.findById(id, (err, user) => {
        return next(err, user);
    })
});

passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password',
}, (email, password, next) => {
    User.findOne({
        email: email
    }, (err, user) => {
        if (err) return next(err);
        if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
            return next({
                message: 'Email or password incorrect'
            });
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
        if (user) return next({
            message: "User already exists"
        });
        let newUser = new User({
            email: email,
            passwordHash: bcrypt.hashSync(password, 10)
        });
        newUser.save((err) => {
            return next(err, newUser);
        });

    });
}));

module.exports = passport;