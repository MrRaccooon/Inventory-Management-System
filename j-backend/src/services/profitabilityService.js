/**
 * Profitability analysis service.
 * Analyzes profit margins, trends, and identifies loss-making items.
 */
const { Op, fn, col, literal } = require('sequelize');
const { Sale, SaleItem, Product, User } = require('../models');
const { subMonths, startOfMonth, endOfMonth, format } = require('date-fns');

/**
 * Get complete profitability analysis.
 */
const getProfitabilityAnalysis = async (shopId, startDate = null, endDate = null) => {
  const end = endDate ? new Date(endDate) : new Date();
  const start = startDate ? new Date(startDate) : startOfMonth(end);
  
  // Get sales in period
  const sales = await Sale.findAll({
    where: {
      shop_id: shopId,
      created_at: { [Op.between]: [start, end] },
      status: { [Op.ne]: 'void' },
    },
  });
  
  const grossProfit = sales.reduce((sum, s) => sum + parseFloat(s.profit), 0);
  const totalSales = sales.reduce((sum, s) => sum + parseFloat(s.total_amount), 0);
  const netProfit = grossProfit;
  const profitMargin = totalSales > 0 ? (netProfit / totalSales * 100) : 0;
  
  // Item profitability
  const itemProfitability = await SaleItem.findAll({
    attributes: [
      'product_id',
      [fn('SUM', literal('line_total - (quantity * unit_cost)')), 'total_profit'],
      [fn('SUM', col('line_total')), 'total_sales'],
      [fn('SUM', col('quantity')), 'total_qty'],
    ],
    include: [{
      model: Sale,
      as: 'sale',
      where: {
        shop_id: shopId,
        created_at: { [Op.between]: [start, end] },
        status: { [Op.ne]: 'void' },
      },
      attributes: [],
    }, {
      model: Product,
      as: 'product',
      attributes: ['name'],
    }],
    group: ['product_id', 'product.id', 'product.name'],
    order: [[literal('total_profit'), 'DESC']],
    raw: true,
    nest: true,
  });
  
  const mostProfitable = itemProfitability.slice(0, 10).map(ip => ({
    product_id: ip.product_id,
    product_name: ip.product?.name || 'Unknown',
    total_profit: parseFloat(ip.total_profit),
    total_sales: parseFloat(ip.total_sales),
    quantity: parseInt(ip.total_qty, 10),
    margin: parseFloat(ip.total_sales) > 0
      ? (parseFloat(ip.total_profit) / parseFloat(ip.total_sales) * 100)
      : 0,
  }));
  
  const leastProfitable = itemProfitability.slice(-10).map(ip => ({
    product_id: ip.product_id,
    product_name: ip.product?.name || 'Unknown',
    total_profit: parseFloat(ip.total_profit),
    total_sales: parseFloat(ip.total_sales),
    quantity: parseInt(ip.total_qty, 10),
    margin: parseFloat(ip.total_sales) > 0
      ? (parseFloat(ip.total_profit) / parseFloat(ip.total_sales) * 100)
      : 0,
  }));
  
  // Profit trend (6 months)
  const profitTrend = [];
  for (let i = 5; i >= 0; i--) {
    const monthDate = subMonths(end, i);
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);
    
    const monthSales = await Sale.findAll({
      where: {
        shop_id: shopId,
        created_at: { [Op.between]: [monthStart, monthEnd] },
        status: { [Op.ne]: 'void' },
      },
    });
    
    const monthGross = monthSales.reduce((sum, s) => sum + parseFloat(s.profit), 0);
    const monthTotal = monthSales.reduce((sum, s) => sum + parseFloat(s.total_amount), 0);
    const monthMargin = monthTotal > 0 ? (monthGross / monthTotal * 100) : 0;
    
    profitTrend.push({
      date: format(monthStart, 'yyyy-MM-dd'),
      gross_profit: monthGross,
      net_profit: monthGross,
      profit_margin: monthMargin,
    });
  }
  
  // Loss-making items
  const lossMakingItems = itemProfitability
    .filter(ip => parseFloat(ip.total_profit) < 0)
    .map(ip => ({
      product_id: ip.product_id,
      product_name: ip.product?.name || 'Unknown',
      category: null,
      cost_price: 0,
      sold_price: parseInt(ip.total_qty, 10) > 0
        ? parseFloat(ip.total_sales) / parseInt(ip.total_qty, 10)
        : 0,
      loss: parseFloat(ip.total_profit),
      quantity_sold: parseInt(ip.total_qty, 10),
      status: 'clearance',
    }));
  
  // Profit by employee
  const employeeProfit = await Sale.findAll({
    attributes: [
      'created_by',
      [fn('SUM', col('profit')), 'total_profit'],
      [fn('SUM', col('total_amount')), 'total_sales'],
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
    order: [[literal('total_profit'), 'DESC']],
    raw: true,
    nest: true,
  });
  
  const profitByEmployee = employeeProfit.map(ep => ({
    employee_id: ep.created_by,
    employee_name: ep.createdByUser?.name || 'Unknown',
    total_profit: parseFloat(ep.total_profit),
    total_sales: parseFloat(ep.total_sales),
    margin_percentage: parseFloat(ep.total_sales) > 0
      ? (parseFloat(ep.total_profit) / parseFloat(ep.total_sales) * 100)
      : 0,
    order_count: parseInt(ep.order_count, 10),
  }));
  
  return {
    gross_profit: grossProfit,
    net_profit: netProfit,
    profit_margin: profitMargin,
    most_profitable_items: mostProfitable,
    least_profitable_items: leastProfitable,
    profit_trend: profitTrend,
    profit_by_category: [],
    margin_comparison: [],
    loss_making_items: lossMakingItems,
    profit_by_employee: profitByEmployee,
  };
};

module.exports = {
  getProfitabilityAnalysis,
};

