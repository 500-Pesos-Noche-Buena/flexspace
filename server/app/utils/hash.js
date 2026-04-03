// /var/www/html/LaravelApp/psa/server/app/utils/hash.js

const bcrypt = require('bcrypt');
const config = require('@/config/config'); 

// Get salt rounds from the centralized configuration
const saltRounds = config.bcrypt.saltRounds;

/**
 * Hashes a plaintext password using Bcrypt.
 * @param {string} password - The plaintext password to hash.
 * @returns {Promise<string>} The hashed password string.
 */
const hashPassword = async (password) => {
    // The hashing process involves repeatedly applying a function to the password
    // and a randomly generated salt. The salt rounds determine the complexity.
    return bcrypt.hash(password, saltRounds);
};

/**
 * Compares a plaintext password with a stored hash.
 * @param {string} password - The plaintext password.
 * @param {string} hash - The stored hash (including the salt).
 * @returns {Promise<boolean>} True if the password matches the hash, false otherwise.
 */
const comparePassword = async (password, hash) => {
    // Bcrypt comparison securely checks the password against the hash
    // using the salt embedded within the hash.
    return bcrypt.compare(password, hash);
};

module.exports = {
    hashPassword,
    comparePassword,
};