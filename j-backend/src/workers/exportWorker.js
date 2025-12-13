/**
 * Export worker using Bull queue.
 * Replaces Celery export_worker.py
 */
const Queue = require('bull');
const fs = require('fs').promises;
const path = require('path');
const config = require('../config');
const { Product, Sale, SaleItem, Customer, Supplier } = require('../models');
const { Op } = require('sequelize');

// Create queue
const exportQueue = new Queue('export', config.redis.url, {
  defaultJobOptions: {
    removeOnComplete: 50,
    removeOnFail: 20,
    attempts: 2,
    backoff: {
      type: 'fixed',
      delay: 5000,
    },
  },
});

/**
 * Export products to CSV.
 */
const exportProductsToCSV = async (shopId, filters = {}) => {
  const where = { shop_id: shopId };
  
  if (filters.category_id) {
    where.category_id = filters.category_id;
  }
  if (filters.is_active !== undefined) {
    where.is_active = filters.is_active;
  }
  
  const products = await Product.findAll({ where });
  
  const headers = ['SKU', 'Name', 'Description', 'Category', 'MRP', 'Retail Price', 'Wholesale Price', 'Cost Price', 'Current Stock', 'Min Stock', 'Unit', 'HSN Code', 'GST Rate', 'Active'];
  
  const rows = products.map(p => [
    p.sku,
    p.name,
    p.description || '',
    p.category_id || '',
    p.price_mrp,
    p.price_retail || '',
    p.price_wholesale || '',
    p.cost_price,
    p.current_stock,
    p.min_stock_threshold,
    p.unit,
    p.hsn_code || '',
    p.gst_rate,
    p.is_active ? 'Yes' : 'No',
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');
  
  return csvContent;
};

/**
 * Export sales to CSV.
 */
const exportSalesToCSV = async (shopId, startDate, endDate) => {
  const where = {
    shop_id: shopId,
    created_at: {
      [Op.gte]: new Date(startDate),
      [Op.lte]: new Date(endDate),
    },
  };
  
  const sales = await Sale.findAll({
    where,
    include: [{ model: SaleItem, as: 'items' }],
    order: [['created_at', 'DESC']],
  });
  
  const headers = ['Invoice No', 'Date', 'Customer Name', 'Customer Phone', 'Subtotal', 'Discount', 'Tax', 'Total', 'Profit', 'Payment Type', 'Status'];
  
  const rows = sales.map(s => [
    s.invoice_no,
    s.created_at.toISOString(),
    s.customer_info?.name || '',
    s.customer_info?.phone || '',
    s.subtotal,
    s.discount_amount,
    s.tax_amount,
    s.total_amount,
    s.profit,
    s.payment_type,
    s.status,
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');
  
  return csvContent;
};

/**
 * Export customers to CSV.
 */
const exportCustomersToCSV = async (shopId) => {
  const customers = await Customer.findAll({ where: { shop_id: shopId } });
  
  const headers = ['Name', 'Phone', 'Email', 'Address', 'GST Number', 'Credit Limit', 'Total Purchases', 'Active'];
  
  const rows = customers.map(c => [
    c.name,
    c.phone,
    c.email || '',
    c.address || '',
    c.gst_number || '',
    c.credit_limit,
    c.total_purchases,
    c.is_active ? 'Yes' : 'No',
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');
  
  return csvContent;
};

/**
 * Export suppliers to CSV.
 */
const exportSuppliersToCSV = async (shopId) => {
  const suppliers = await Supplier.findAll({ where: { shop_id: shopId } });
  
  const headers = ['Name', 'Company', 'Phone', 'Email', 'Address', 'GST Number', 'PAN Number', 'Payment Terms', 'Active'];
  
  const rows = suppliers.map(s => [
    s.name,
    s.company_name || '',
    s.phone,
    s.email || '',
    s.address || '',
    s.gst_number || '',
    s.pan_number || '',
    s.payment_terms || '',
    s.is_active ? 'Yes' : 'No',
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');
  
  return csvContent;
};

/**
 * Process export job.
 */
exportQueue.process(async (job) => {
  const { type, shopId, options } = job.data;
  
  console.log(`Processing ${type} export for shop ${shopId}`);
  
  let csvContent;
  let filename;
  
  switch (type) {
    case 'products':
      csvContent = await exportProductsToCSV(shopId, options.filters || {});
      filename = `products_${shopId}_${Date.now()}.csv`;
      break;
    case 'sales':
      csvContent = await exportSalesToCSV(shopId, options.startDate, options.endDate);
      filename = `sales_${shopId}_${Date.now()}.csv`;
      break;
    case 'customers':
      csvContent = await exportCustomersToCSV(shopId);
      filename = `customers_${shopId}_${Date.now()}.csv`;
      break;
    case 'suppliers':
      csvContent = await exportSuppliersToCSV(shopId);
      filename = `suppliers_${shopId}_${Date.now()}.csv`;
      break;
    default:
      throw new Error(`Unknown export type: ${type}`);
  }
  
  // Save to file
  const exportDir = path.join(config.fileUpload.uploadDir, 'exports');
  await fs.mkdir(exportDir, { recursive: true });
  
  const filePath = path.join(exportDir, filename);
  await fs.writeFile(filePath, csvContent);
  
  return {
    type,
    filename,
    filePath,
    size: Buffer.byteLength(csvContent, 'utf8'),
    generatedAt: new Date().toISOString(),
  };
});

/**
 * Queue an export job.
 */
const queueExportJob = async (type, shopId, userId, options = {}) => {
  const job = await exportQueue.add({
    type,
    shopId,
    userId,
    options,
  });
  
  return job.id;
};

/**
 * Get export job status.
 */
const getExportJobStatus = async (jobId) => {
  const job = await exportQueue.getJob(jobId);
  
  if (!job) {
    return null;
  }
  
  const state = await job.getState();
  const progress = job.progress();
  
  return {
    id: job.id,
    state,
    progress,
    data: job.data,
    result: job.returnvalue,
    failedReason: job.failedReason,
    createdAt: new Date(job.timestamp).toISOString(),
  };
};

// Event handlers
exportQueue.on('completed', (job, result) => {
  console.log(`Export job ${job.id} completed: ${result.filename}`);
});

exportQueue.on('failed', (job, err) => {
  console.error(`Export job ${job.id} failed:`, err.message);
});

module.exports = {
  exportQueue,
  exportProductsToCSV,
  exportSalesToCSV,
  exportCustomersToCSV,
  exportSuppliersToCSV,
  queueExportJob,
  getExportJobStatus,
};

