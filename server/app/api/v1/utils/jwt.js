const jwt = require('jsonwebtoken');
const moment = require('moment');
const config = require('@/config/config');

const generateToken = (userId, expires, type, role, name = null, email = null) => {
    const payload = {
        sub: userId,
        iat: moment().unix(),
        exp: expires.unix(),
        type,
        role,
        name,      // ← Add name
        email,     // ← Add email (optional but useful)
    };
    return jwt.sign(payload, config.jwt.secret);
};

const generateAuthTokens = (user) => {
    const expires = moment().add(config.jwt.accessExpirationMinutes, 'minutes');
    
    const userId = user._id ? user._id.toString() : user.id;
    
    const accessToken = generateToken(
        userId, 
        expires, 
        'access', 
        user.role,
        user.name,      // ← Pass the user's name
        user.email      // ← Pass the user's email (optional)
    );

    return {
        access: {
            token: accessToken,
            expires: expires.toDate(),
        },
    };
};

const verifyToken = (token) => {
    return jwt.verify(token, config.jwt.secret);
};

module.exports = {
    generateAuthTokens,
    verifyToken,
};