/**
 * Reports service.
 * Generates comprehensive reports for sales, inventory, and performance analysis.
 */
const { Op, fn, col, literal } = require('sequelize');
const { Sale, Product, User } = require('../models');
const { getCurrentStock } = require('../utils/ledger');
const { subDays, addDays, format, startOfMonth } = require('date-fns');

/**
 * Get complete reports data.
 */
const getReportsData = async (shopId, startDate = null, endDate = null) => {
  const end = endDate ? new Date(endDate) : new Date();
  const start = startDate ? new Date(startDate) : startOfMonth(end);
  
  // Previous month for comparison
  const prevStart = new Date(start);
  prevStart.setMonth(prevStart.getMonth() - 1);
  const prevEnd = new Date(start);
  prevEnd.setDate(prevEnd.getDate() - 1);
  
  // Current period sales
  const currentSales = await Sale.findAll({
    where: {
      shop_id: shopId,
      created_at: { [Op.between]: [start, end] },
      status: { [Op.ne]: 'void' },
    },
  });
  
  const salesThisMonth = currentSales.reduce((sum, s) => sum + parseFloat(s.total_amount), 0);
  const profitThisMonth = currentSales.reduce((sum, s) => sum + parseFloat(s.profit), 0);
  
  // Previous month sales
  const prevSales = await Sale.findAll({
    where: {
      shop_id: shopId,
      created_at: { [Op.between]: [prevStart, prevEnd] },
      status: { [Op.ne]: 'void' },
    },
  });
  
  const prevSalesTotal = prevSales.reduce((sum, s) => sum + parseFloat(s.total_amount), 0);
  const monthlyGrowth = prevSalesTotal > 0
    ? ((salesThisMonth - prevSalesTotal) / prevSalesTotal * 100)
    : 0;
  
  // Sales vs Profit comparison
  const salesVsProfit = [];
  let currentDate = new Date(start);
  while (currentDate <= end) {
    const daySales = currentSales.filter(s => {
      const saleDate = new Date(s.created_at);
      return format(saleDate, 'yyyy-MM-dd') === format(currentDate, 'yyyy-MM-dd');
    });
    
    salesVsProfit.push({
      date: format(currentDate, 'yyyy-MM-dd'),
      sales: daySales.reduce((sum, s) => sum + parseFloat(s.total_amount), 0),
      profit: daySales.reduce((sum, s) => sum + parseFloat(s.profit), 0),
    });
    
    currentDate = addDays(currentDate, 1);
  }
  
  // Daily sales heatmap
  const heatmapStart = subDays(end, 28);
  const dailySalesHeatmap = [];
  currentDate = new Date(heatmapStart);
  while (currentDate <= end) {
    const daySales = currentSales.filter(s => {
      const saleDate = new Date(s.created_at);
      return format(saleDate, 'yyyy-MM-dd') === format(currentDate, 'yyyy-MM-dd');
    });
    
    dailySalesHeatmap.push({
      date: format(currentDate, 'yyyy-MM-dd'),
      sales: daySales.reduce((sum, s) => sum + parseFloat(s.total_amount), 0),
      day_of_week: currentDate.getDay(),
      week_number: Math.ceil((currentDate.getDate()) / 7),
    });
    
    currentDate = addDays(currentDate, 1);
  }
  
  // Inventory aging
  const products = await Product.findAll({ where: { shop_id: shopId } });
  const inventoryAging = [];
  
  for (const product of products) {
    const stock = await getCurrentStock(product.id, shopId);
    if (stock > 0) {
      const daysInStock = Math.ceil((new Date() - new Date(product.created_at)) / (1000 * 60 * 60 * 24));
      let ageBucket;
      if (daysInStock <= 30) ageBucket = '0-30';
      else if (daysInStock <= 60) ageBucket = '31-60';
      else if (daysInStock <= 90) ageBucket = '61-90';
      else ageBucket = '90+';
      
      inventoryAging.push({
        product_id: product.id,
        product_name: product.name,
        days_in_stock: daysInStock,
        quantity: stock,
        value: stock * parseFloat(product.cost_price),
        age_bucket: ageBucket,
      });
    }
  }
  
  // Top employees by sales
  const employeeSales = await Sale.findAll({
    attributes: [
      'created_by',
      [fn('SUM', col('total_amount')), 'total_sales'],
      [fn('SUM', col('profit')), 'total_profit'],
      [fn('COUNT', col('Sale.id')), 'order_count'],
    ],
    include: [{
      model: User,
      as: 'createdByUser',
      attributes: ['name'],
    }],
    where: {
      shop_id: shopId,
      created_at: { [Op.between]: [start, end] },
      status: { [Op.ne]: 'void' },
    },
    group: ['created_by', 'createdByUser.id', 'createdByUser.name'],
    order: [[literal('total_sales'), 'DESC']],
    raw: true,
    nest: true,
  });
  
  const topEmployees = employeeSales.map(es => ({
    employee_id: es.created_by,
    employee_name: es.createdByUser?.name || 'Unknown',
    total_sales: parseFloat(es.total_sales),
    total_profit: parseFloat(es.total_profit),
    order_count: parseInt(es.order_count, 10),
    avg_order_value: parseInt(es.order_count, 10) > 0
      ? parseFloat(es.total_sales) / parseInt(es.order_count, 10)
      : 0,
  }));
  
  return {
    sales_this_month: salesThisMonth,
    profit_this_month: profitThisMonth,
    monthly_growth: monthlyGrowth,
    top_categories: [],
    best_selling_product: {},
    worst_selling_product: {},
    sales_vs_profit: salesVsProfit,
    category_distribution: [],
    daily_sales_heatmap: dailySalesHeatmap,
    inventory_aging: inventoryAging,
    top_employees: topEmployees,
  };
};

module.exports = {
  getReportsData,
};

