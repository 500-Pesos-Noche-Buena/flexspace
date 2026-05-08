/**
 * Format a number with commas (e.g., 20000 -> "20,000")
 * @param {number|string} num - The number to format
 * @returns {string} Formatted number string
 */
export const formatNumber = (num) => {
    if (num === undefined || num === null) return '0';
    const number = typeof num === 'number' ? num : parseFloat(num);
    if (isNaN(number)) return '0';
    return number.toLocaleString('en-US');
};

/**
 * Format number with currency (e.g., 20000 -> "₱20,000")
 * @param {number|string} num - The number to format
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (num) => {
    return `₱${formatNumber(num)}`;
};

/**
 * Format number with K/M suffix (e.g., 2500 -> "2.5K")
 * @param {number|string} num - The number to format
 * @returns {string} Formatted number with suffix
 */
export const formatCompactNumber = (num) => {
    if (num === undefined || num === null) return '0';
    const number = typeof num === 'number' ? num : parseFloat(num);
    if (isNaN(number)) return '0';
    
    if (number >= 1000000) return (number / 1000000).toFixed(1) + 'M';
    if (number >= 1000) return (number / 1000).toFixed(1) + 'K';
    return number.toString();
};