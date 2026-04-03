const jwt = require('jsonwebtoken');
const moment = require('moment');
const config = require('@/config/config');

const generateToken = (userId, expires, type, role) => {
    const payload = {
        sub: userId,
        iat: moment().unix(),
        exp: expires.unix(),
        type,
        role, // Added role so you don't have to query the DB every time
    };
    return jwt.sign(payload, config.jwt.secret);
};

const generateAuthTokens = (user) => {
    const expires = moment().add(config.jwt.accessExpirationMinutes, 'minutes');
    
    const userId = user._id ? user._id.toString() : user.id;
    
    const accessToken = generateToken(userId, expires, 'access', user.role);

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