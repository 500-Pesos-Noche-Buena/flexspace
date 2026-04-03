
const bcrypt = require('bcryptjs'); // Change this line
const config = require('@/config/config'); 

const saltRounds = config.bcrypt.saltRounds;

/**
 * Hashes a plaintext password using Bcryptjs.
 */
const hashPassword = async (password) => {
    return bcrypt.hash(password, saltRounds);
};

/**
 * Compares a plaintext password with a stored hash.
 */
const comparePassword = async (password, hash) => {
    return bcrypt.compare(password, hash);
};

module.exports = {
    hashPassword,
    comparePassword,
};