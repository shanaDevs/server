/**
 * Coupon Code Generator Utility
 * Generates unique coupon codes for birthday promotions
 */

const crypto = require('crypto');

/**
 * Generate a random string
 * @param {number} length - Length of the random string
 * @returns {string} Random uppercase alphanumeric string
 */
function generateRandomString(length = 6) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    const randomBytes = crypto.randomBytes(length);
    
    for (let i = 0; i < length; i++) {
        result += chars[randomBytes[i] % chars.length];
    }
    
    return result;
}

/**
 * Generate a unique birthday coupon code
 * Format: BDAY-[FirstName]-[Random6]
 * Example: BDAY-JOHN-A4B2C9
 * 
 * @param {string} customerName - Full name of the customer
 * @returns {string} Unique coupon code
 */
function generateBirthdayCoupon(customerName) {
    // Extract first name and clean it
    const firstName = customerName
        .split(' ')[0]
        .toUpperCase()
        .replace(/[^A-Z]/g, '')
        .substring(0, 10); // Limit to 10 chars
    
    const randomPart = generateRandomString(6);
    
    return `BDAY-${firstName}-${randomPart}`;
}

/**
 * Generate a unique coupon code with validation against database
 * @param {string} customerName - Customer name
 * @param {Function} checkUniqueness - Async function to check if code exists in DB
 * @param {number} maxRetries - Maximum retry attempts
 * @returns {Promise<string>} Unique coupon code
 */
async function generateUniqueCoupon(customerName, checkUniqueness, maxRetries = 10) {
    let attempts = 0;
    
    while (attempts < maxRetries) {
        const couponCode = generateBirthdayCoupon(customerName);
        
        // Check if this code already exists
        const exists = await checkUniqueness(couponCode);
        
        if (!exists) {
            return couponCode;
        }
        
        attempts++;
    }
    
    // Fallback: use timestamp if all retries failed
    const timestamp = Date.now().toString().slice(-6);
    return `BDAY-${generateRandomString(4)}-${timestamp}`;
}

module.exports = {
    generateRandomString,
    generateBirthdayCoupon,
    generateUniqueCoupon
};
