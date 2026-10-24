const env = require('../config/env');

function errorHandler(err, req, res, next) {
  console.error(`💥 [Error] ${req.method} ${req.originalUrl}:`, err);

  const statusCode = err.status || (res.statusCode !== 200 ? res.statusCode : 500);

  res.status(statusCode).json({
    message: err.message || 'An unexpected server error occurred.',
    errors: err.errors || undefined,
    stack: env.NODE_ENV === 'development' ? err.stack : undefined
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({
    message: `Resource not found: [${req.method}] ${req.originalUrl}`
  });
}

module.exports = { errorHandler, notFoundHandler };
