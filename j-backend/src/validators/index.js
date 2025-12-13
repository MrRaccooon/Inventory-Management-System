/**
 * Validators index.
 */
const authValidators = require('./auth');
const productValidators = require('./product');
const saleValidators = require('./sale');
const categoryValidators = require('./category');
const customerValidators = require('./customer');
const supplierValidators = require('./supplier');
const shopValidators = require('./shop');
const notificationValidators = require('./notification');

module.exports = {
  ...authValidators,
  ...productValidators,
  ...saleValidators,
  ...categoryValidators,
  ...customerValidators,
  ...supplierValidators,
  ...shopValidators,
  ...notificationValidators,
};

