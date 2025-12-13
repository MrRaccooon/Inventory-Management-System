/**
 * GST and billing service.
 * Handles GST calculations, invoice generation, and GST reports.
 */
const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');
const { Sale, Invoice, Shop } = require('../models');
const { startOfMonth } = require('date-fns');

/**
 * Get GST summary for a period.
 */
const getGSTSummary = async (shopId, startDate = null, endDate = null) => {
  const end = endDate ? new Date(endDate) : new Date();
  const start = startDate ? new Date(startDate) : startOfMonth(end);
  
  const sales = await Sale.findAll({
    where: {
      shop_id: shopId,
      created_at: { [Op.between]: [start, end] },
      status: { [Op.ne]: 'void' },
    },
  });
  
  let totalGstCollected = 0;
  
  for (const sale of sales) {
    const gstBreakdown = sale.gst_breakdown || {};
    totalGstCollected += parseFloat(gstBreakdown.total_gst || 0);
  }
  
  const pendingBills = await Sale.count({
    where: {
      shop_id: shopId,
      created_at: { [Op.between]: [start, end] },
      status: 'pending',
    },
  });
  
  const completedBills = await Sale.count({
    where: {
      shop_id: shopId,
      created_at: { [Op.between]: [start, end] },
      status: 'paid',
    },
  });
  
  return {
    total_gst_collected: totalGstCollected,
    gst_payable: totalGstCollected,
    gst_input_credit: 0,
    pending_bills: pendingBills,
    completed_bills: completedBills,
  };
};

/**
 * Get detailed GST report.
 */
const getGSTReport = async (shopId, startDate = null, endDate = null) => {
  const summary = await getGSTSummary(shopId, startDate, endDate);
  
  const end = endDate ? new Date(endDate) : new Date();
  const start = startDate ? new Date(startDate) : startOfMonth(end);
  
  const invoices = await Invoice.findAll({
    include: [{
      model: Sale,
      as: 'sale',
      where: {
        shop_id: shopId,
        created_at: { [Op.between]: [start, end] },
      },
    }],
  });
  
  const sales = await Sale.findAll({
    where: {
      shop_id: shopId,
      created_at: { [Op.between]: [start, end] },
      status: { [Op.ne]: 'void' },
    },
    order: [['created_at', 'DESC']],
  });
  
  const shop = await Shop.findByPk(shopId);
  
  const gstItems = sales.map(sale => {
    const gstBreakdown = sale.gst_breakdown || {};
    const customerInfo = sale.customer_info || {};
    
    return {
      invoice_no: sale.invoice_no,
      date: sale.created_at.toISOString(),
      customer_name: customerInfo.name || null,
      base_amount: parseFloat(gstBreakdown.base_amount || 0),
      cgst: parseFloat(gstBreakdown.cgst || 0),
      sgst: parseFloat(gstBreakdown.sgst || 0),
      igst: parseFloat(gstBreakdown.igst || 0),
      total_gst: parseFloat(gstBreakdown.total_gst || 0),
      total_amount: parseFloat(sale.total_amount),
      gst_number: shop?.gst_number || null,
    };
  });
  
  return {
    summary,
    invoices: invoices.map(inv => ({
      id: inv.id,
      sale_id: inv.sale_id,
      invoice_no: inv.invoice_no,
      pdf_url: inv.pdf_url,
      created_at: inv.created_at.toISOString(),
      issued_by: inv.issued_by,
    })),
    gst_items: gstItems,
    period_start: start.toISOString(),
    period_end: end.toISOString(),
  };
};

/**
 * Create an invoice record for a sale.
 */
const createInvoice = async (saleId, shopId, issuedBy = null) => {
  const sale = await Sale.findOne({
    where: { id: saleId, shop_id: shopId },
  });
  
  if (!sale) {
    throw new Error(`Sale ${saleId} not found`);
  }
  
  // Check if invoice already exists
  const existing = await Invoice.findOne({ where: { sale_id: saleId } });
  if (existing) {
    return existing;
  }
  
  const invoice = await Invoice.create({
    id: uuidv4(),
    sale_id: saleId,
    invoice_no: sale.invoice_no,
    issued_by: issuedBy,
  });
  
  return invoice;
};

module.exports = {
  getGSTSummary,
  getGSTReport,
  createInvoice,
};

