// server/src/config/passport.js
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const userService = require('@/api/v1/services/userService');

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
},
async (accessToken, refreshToken, profile, done) => {
    try {
        const user = await userService.findOrCreateGoogleUser(profile);
        return done(null, user);
    } catch (error) {
        console.error('Google Strategy Error:', error);
        return done(error, null);
    }
}));

module.exports = passport;