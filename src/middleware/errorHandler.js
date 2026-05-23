const logger   = require('../utils/logger');
const ApiError = require('../utils/ApiError');

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message    = err.message    || 'Internal server error';
  let errors     = err.errors     || [];

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message    = 'Validation error';
    errors     = Object.values(err.errors).map((e) => ({
      field:   e.path,
      message: e.message,
    }));
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyPattern)[0];
    message = `${field.charAt(0).toUpperCase() + field.slice(1)} already in use`;
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path}`;
  }

  // Log server errors
  if (statusCode >= 500) {
    logger.error(`${req.method} ${req.path} — ${message}`, { err });
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
