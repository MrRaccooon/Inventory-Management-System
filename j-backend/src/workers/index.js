/**
 * Workers index.
 */
const forecastWorker = require('./forecastWorker');
const exportWorker = require('./exportWorker');

module.exports = {
  forecastQueue: forecastWorker.forecastQueue,
  queueForecastJob: forecastWorker.queueForecastJob,
  queueAllProductForecasts: forecastWorker.queueAllProductForecasts,
  generateForecast: forecastWorker.generateForecast,
  
  exportQueue: exportWorker.exportQueue,
  queueExportJob: exportWorker.queueExportJob,
  getExportJobStatus: exportWorker.getExportJobStatus,
  exportProductsToCSV: exportWorker.exportProductsToCSV,
  exportSalesToCSV: exportWorker.exportSalesToCSV,
  exportCustomersToCSV: exportWorker.exportCustomersToCSV,
  exportSuppliersToCSV: exportWorker.exportSuppliersToCSV,
};

