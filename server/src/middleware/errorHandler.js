const env = require('../config/env');

function errorHandler(err, req, res, next) {
  console.error(`💥 [Error] ${req.method} ${req.originalUrl}:`, err.message || err);

  // Mongoose bad ObjectId / CastError
  if (err.name === 'CastError') {
    return res.status(400).json({
      message: `Invalid format for field '${err.path}': value '${err.value}' is not a valid ObjectId identifier.`,
      error: 'BadRequest'
    });
  }

  // Mongoose Schema Validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors || {}).map((e) => e.message);
    return res.status(400).json({
      message: 'Schema validation error.',
      errors: messages
    });
  }

  // Malformed JSON request body
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      message: 'Malformed JSON payload in request body.'
    });
  }

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
