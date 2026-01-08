/**
 * File: helpers.js
 * 
 * Purpose: Common utility functions used across services/utils.
 *          Date formatting, calculations, validation helpers.
 * 
 * Layer: Utility
 * 
 * Notes:
 * - Framework-agnostic, no Express/Supabase imports
 * - date-fns for reliable date handling (IST timezone)
 * - Business calculations (margin, GST) as pure functions
 * - No domain logic (services orchestrate these)
 * - Used by services only
 */

const { format, parseISO, addMonths, isValid: isValidDate } = require('date-fns');
const { utcToZonedTime } = require('date-fns-tz');
const ApiError = require('./apiError');
const { GST_RATES } = require('./constants');

/**
 * Formats ISO date to IST string (project default timezone)
 * 
 * @param {string|Date} date - ISO string or Date
 * @param {string} [formatStr='yyyy-MM-dd HH:mm'] - date-fns format
 * @returns {string} Formatted IST date
 */
const formatDateIST = (date, formatStr = 'yyyy-MM-dd HH:mm') => {
  try {
    const zonedDate = utcToZonedTime(date, 'Asia/Kolkata');
    return format(zonedDate, formatStr);
  } catch (error) {
    throw ApiError.VALIDATION_ERROR(`Invalid date: ${date}`);
  }
};

/**
 * Calculates profit margin percentage
 * 
 * @param {number} costPrice - Unit cost
 * @param {number} sellingPrice - Unit selling price
 * @returns {number} Margin % (rounded to 2 decimals)
 */
const calculateMargin = (costPrice, sellingPrice) => {
  if (sellingPrice <= 0) return 0;
  return Math.round(((sellingPrice - costPrice) / sellingPrice) * 100 * 100) / 100;
};

/**
 * Calculates GST amount and breakdown (CGST/SGST/IGST)
 * 
 * @param {number} amount - Base amount (pre-tax)
 * @param {number} rate - GST rate (5, 12, 18, 28)
 * @param {boolean} [isInterstate=false] - true=IGST, false=CGST+SGST
 * @returns {Object} { gstAmount, cgst, sgst, igst, total }
 */
const calculateGST = (amount, rate, isInterstate = false) => {
  if (![0, 5, 12, 18, 28].includes(rate)) {
    throw ApiError.VALIDATION_ERROR('Invalid GST rate');
  }
  
  const gstAmount = Math.round(amount * rate / 100 * 100) / 100;
  
  return {
    rate,
    isInterstate,
    gstAmount,
    cgst: isInterstate ? 0 : gstAmount / 2,
    sgst: isInterstate ? 0 : gstAmount / 2,
    igst: isInterstate ? gstAmount : 0,
    total: amount + gstAmount
  };
};

/**
 * Validates and parses positive decimal amount
 * 
 * @param {*} value - Input value
 * @param {string} fieldName - For error message
 * @returns {number} Validated amount
 */
const parseAmount = (value, fieldName) => {
  const num = parseFloat(value);
  if (isNaN(num) || num < 0 || num > 999999.99) {
    throw ApiError.VALIDATION_ERROR(`${fieldName} must be 0 to 999999.99`);
  }
  return Math.round(num * 100) / 100;  // 2 decimal precision
};

/**
 * Validates positive integer quantity
 * 
 * @param {*} value - Input value
 * @param {string} fieldName - For error message
 * @returns {number} Validated quantity
 */
const parseQuantity = (value, fieldName) => {
  const num = parseInt(value, 10);
  if (isNaN(num) || num < 0 || num > 999999) {
    throw ApiError.VALIDATION_ERROR(`${fieldName} must be 0 to 999999`);
  }
  return num;
};

/**
 * Generates invoice number (YYYYMMDD-SEQ)
 * 
 * @param {number} [sequence=1] - Daily sequence number
 * @returns {string} e.g., '20260109-001'
 */
const generateInvoiceNumber = (sequence = 1) => {
  const dateStr = formatDateIST(new Date(), 'yyyyMMdd');
  return `${dateStr}-${String(sequence).padStart(3, '0')}`;
};

/**
 * Converts snake_case to camelCase (DB → API response)
 * 
 * @param {Object} obj - Input object
 * @returns {Object} CamelCase keys
 */
const toCamelCase = (obj) => {
  if (typeof obj !== 'object' || obj === null) return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(toCamelCase);
  }
  
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/([_][a-z])/g, (group) => 
      group.toUpperCase().replace('_', '')
    );
    result[camelKey] = toCamelCase(value);
  }
  
  return result;
};

module.exports = {
  // Date/Time
  formatDateIST,
  
  // Financial calcs
  calculateMargin,
  calculateGST,
  parseAmount,
  parseQuantity,
  generateInvoiceNumber,
  
  // Data formatting
  toCamelCase
};
