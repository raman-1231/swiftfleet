/**
 * Currency and localized formatting utilities for SwiftFleet India Operations.
 */

export const CURRENCY_CODE = 'INR';
export const CURRENCY_SYMBOL = '₹';

/**
 * Format a numeric amount to Indian Rupee (INR) representation with Indian numbering system (e.g. ₹1,23,456.00).
 * @param {number|string} amount
 * @param {boolean} showSymbol
 * @returns {string}
 */
export const formatINR = (amount, showSymbol = true) => {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return showSymbol ? '₹0.00' : '0.00';
  }
  const numeric = Number(amount);
  const formatted = numeric.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return showSymbol ? `₹${formatted}` : formatted;
};

/**
 * Shorthand Indian fare formatter (e.g., ₹40)
 */
export const formatINRCompact = (amount) => {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return '₹0';
  }
  const numeric = Number(amount);
  return `₹${numeric.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
};
