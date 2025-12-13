/**
 * GST (Goods and Services Tax) calculation utilities for India.
 * Handles GST breakdown, tax calculations, and invoice generation.
 */

const GSTSlab = {
  ZERO: 0.0,
  FIVE: 5.0,
  TWELVE: 12.0,
  EIGHTEEN: 18.0,
  TWENTY_EIGHT: 28.0,
};

/**
 * Calculate GST breakdown for an amount.
 * @param {number} amount - Base amount or total amount (if inclusive)
 * @param {number} gstRate - GST rate percentage (default 18%)
 * @param {boolean} isInclusive - Whether GST is included in the amount
 * @returns {Object} GST breakdown
 */
const calculateGST = (amount, gstRate = 18.0, isInclusive = false) => {
  const gstRateDecimal = gstRate / 100;
  
  let baseAmount, totalGst;
  
  if (isInclusive) {
    baseAmount = amount / (1 + gstRateDecimal);
    totalGst = amount - baseAmount;
  } else {
    baseAmount = amount;
    totalGst = baseAmount * gstRateDecimal;
  }
  
  const cgst = totalGst / 2;
  const sgst = totalGst / 2;
  const igst = totalGst;
  const totalAmount = baseAmount + totalGst;
  
  return {
    base_amount: Math.round(baseAmount * 100) / 100,
    cgst: Math.round(cgst * 100) / 100,
    sgst: Math.round(sgst * 100) / 100,
    igst: Math.round(igst * 100) / 100,
    total_gst: Math.round(totalGst * 100) / 100,
    total_amount: Math.round(totalAmount * 100) / 100,
    gst_rate: gstRate,
  };
};

/**
 * Calculate GST for a line item (product in sale).
 * @param {number} quantity - Quantity of items
 * @param {number} unitPrice - Price per unit
 * @param {number} discount - Discount amount
 * @param {number} gstRate - GST rate percentage
 * @returns {Object} GST breakdown and line totals
 */
const calculateLineItemGST = (quantity, unitPrice, discount = 0, gstRate = 18.0) => {
  const subtotal = quantity * unitPrice;
  const discountedAmount = subtotal - discount;
  
  const gstBreakdown = calculateGST(discountedAmount, gstRate, false);
  
  return {
    ...gstBreakdown,
    quantity,
    unit_price: unitPrice,
    subtotal: Math.round(subtotal * 100) / 100,
    discount,
    line_total: Math.round(gstBreakdown.total_amount * 100) / 100,
  };
};

/**
 * Aggregate GST breakdown from multiple line items.
 * @param {Array} lineItems - List of line item GST breakdowns
 * @returns {Object} Aggregated GST breakdown
 */
const aggregateGSTBreakdown = (lineItems) => {
  let totalBase = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;
  let totalGst = 0;
  let totalAmount = 0;
  
  for (const item of lineItems) {
    totalBase += parseFloat(item.base_amount || 0);
    totalCgst += parseFloat(item.cgst || 0);
    totalSgst += parseFloat(item.sgst || 0);
    totalIgst += parseFloat(item.igst || 0);
    totalGst += parseFloat(item.total_gst || 0);
    totalAmount += parseFloat(item.total_amount || 0);
  }
  
  return {
    base_amount: Math.round(totalBase * 100) / 100,
    cgst: Math.round(totalCgst * 100) / 100,
    sgst: Math.round(totalSgst * 100) / 100,
    igst: Math.round(totalIgst * 100) / 100,
    total_gst: Math.round(totalGst * 100) / 100,
    total_amount: Math.round(totalAmount * 100) / 100,
  };
};

/**
 * Validate and format GST number.
 * @param {string} gstNumber - Raw GST number string
 * @returns {string|null} Formatted GST number or null if invalid
 */
const formatGSTNumber = (gstNumber) => {
  if (!gstNumber) return null;
  
  const formatted = gstNumber.replace(/\s/g, '').toUpperCase();
  
  if (formatted.length === 15 && /^[A-Z0-9]+$/.test(formatted)) {
    return formatted;
  }
  
  return null;
};

module.exports = {
  GSTSlab,
  calculateGST,
  calculateLineItemGST,
  aggregateGSTBreakdown,
  formatGSTNumber,
};

