/**
 * Dashboard service.
 * Aggregates data from multiple sources for dashboard display.
 */
const { Op, fn, col, literal } = require('sequelize');
const { Sale, SaleItem, Product } = require('../models');
const { getCurrentStock } = require('../utils/ledger');
const { subDays, format, addDays, startOfDay, endOfDay } = require('date-fns');

/**
 * Get complete dashboard data including KPIs, trends, and alerts.
 */
const getDashboardData = async (shopId, startDate = null, endDate = null) => {
  // Set default date range (last 30 days)
  const end = endDate ? new Date(endDate) : new Date();
  const start = startDate ? new Date(startDate) : subDays(end, 30);
  
  // Previous period for comparison
  const periodDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  const prevStart = subDays(start, periodDays);
  const prevEnd = start;
  
  // Get current period sales
  const currentSales = await Sale.findAll({
    where: {
      shop_id: shopId,
      created_at: { [Op.between]: [startOfDay(start), endOfDay(end)] },
      status: { [Op.ne]: 'void' },
    },
  });
  
  const currentTotalSales = currentSales.reduce((sum, s) => sum + parseFloat(s.total_amount), 0);
  const currentTotalProfit = currentSales.reduce((sum, s) => sum + parseFloat(s.profit), 0);
  const currentOrderCount = currentSales.length;
  
  // Previous period sales
  const prevSales = await Sale.findAll({
    where: {
      shop_id: shopId,
      created_at: { [Op.between]: [startOfDay(prevStart), endOfDay(prevEnd)] },
      status: { [Op.ne]: 'void' },
    },
  });
  
  const prevTotalSales = prevSales.reduce((sum, s) => sum + parseFloat(s.total_amount), 0);
  const prevOrderCount = prevSales.length;
  
  // Calculate changes
  const salesChange = prevTotalSales > 0
    ? ((currentTotalSales - prevTotalSales) / prevTotalSales * 100)
    : 0;
  const ordersChange = prevOrderCount > 0
    ? ((currentOrderCount - prevOrderCount) / prevOrderCount * 100)
    : 0;
  
  const avgOrdersPerDay = periodDays > 0 ? currentOrderCount / periodDays : 0;
  
  // Get products
  const products = await Product.findAll({ where: { shop_id: shopId } });
  
  // Calculate stock value
  let totalStockValue = 0;
  const lowStockItems = [];
  const negativeStock = [];
  
  for (const product of products) {
    const stock = await getCurrentStock(product.id, shopId);
    totalStockValue += stock * parseFloat(product.cost_price);
    
    if (stock <= product.min_stock_threshold && stock > 0) {
      lowStockItems.push(product);
    }
    if (stock < 0) {
      negativeStock.push(product);
    }
  }
  
  // Sales trend (daily)
  const salesTrend = [];
  let currentDate = new Date(start);
  while (currentDate <= end) {
    const daySales = currentSales.filter(s => {
      const saleDate = new Date(s.created_at);
      return format(saleDate, 'yyyy-MM-dd') === format(currentDate, 'yyyy-MM-dd');
    });
    
    const dayTotal = daySales.reduce((sum, s) => sum + parseFloat(s.total_amount), 0);
    const dayProfit = daySales.reduce((sum, s) => sum + parseFloat(s.profit), 0);
    
    salesTrend.push({
      date: format(currentDate, 'yyyy-MM-dd'),
      sales: dayTotal,
      profit: dayProfit,
    });
    
    currentDate = addDays(currentDate, 1);
  }
  
  // Get alerts
  const alerts = [];
  
  if (lowStockItems.length > 0) {
    alerts.push({
      type: 'low_stock',
      message: `${lowStockItems.length} products are below stock threshold`,
      severity: 'warning',
      count: lowStockItems.length,
    });
  }
  
  if (negativeStock.length > 0) {
    alerts.push({
      type: 'negative_stock',
      message: `${negativeStock.length} products have negative stock`,
      severity: 'error',
      count: negativeStock.length,
    });
  }
  
  // Top selling products
  const topProducts = await SaleItem.findAll({
    attributes: [
      'product_id',
      [fn('SUM', col('quantity')), 'total_qty'],
    ],
    include: [{
      model: Sale,
      as: 'sale',
      where: {
        shop_id: shopId,
        created_at: { [Op.between]: [startOfDay(start), endOfDay(end)] },
        status: { [Op.ne]: 'void' },
      },
      attributes: [],
    }, {
      model: Product,
      as: 'product',
      attributes: ['name'],
    }],
    group: ['product_id', 'product.id', 'product.name'],
    order: [[literal('total_qty'), 'DESC']],
    limit: 5,
  });
  
  return {
    kpi_cards: [
      {
        title: 'Total Sales',
        value: currentTotalSales,
        change_percent: salesChange,
        change_label: 'vs last period',
      },
      {
        title: 'Net Profit',
        value: currentTotalProfit,
        change_percent: null,
        change_label: 'vs last period',
      },
      {
        title: 'Total Orders',
        value: currentOrderCount,
        change_percent: ordersChange,
        change_label: `Avg ${avgOrdersPerDay.toFixed(1)}/day`,
      },
      {
        title: 'Current Stock Value',
        value: totalStockValue,
        change_percent: null,
      },
      {
        title: 'Low Stock Items',
        value: lowStockItems.length,
        change_percent: null,
        severity: lowStockItems.length > 0 ? 'warning' : null,
      },
    ],
    sales_trend: salesTrend,
    profit_trend: salesTrend.map(s => ({ date: s.date, profit: s.profit })),
    category_sales: [],
    alerts,
    top_selling_products: topProducts.map(tp => ({
      name: tp.product?.name || 'Unknown',
      quantity: parseInt(tp.dataValues.total_qty, 10),
    })),
    date_range: {
      start: format(start, 'yyyy-MM-dd'),
      end: format(end, 'yyyy-MM-dd'),
    },
  };
};

module.exports = {
  getDashboardData,
};

