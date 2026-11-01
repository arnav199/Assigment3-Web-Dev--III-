module.exports = function errorHandler(error, _req, res, _next) {
  let status = error.status || 500;
  let message = error.message || 'Internal server error';

  if (error.name === 'ValidationError') {
    status = 400;
    message = Object.values(error.errors).map((item) => item.message).join(', ');
  } else if (error.name === 'CastError') {
    status = 400;
    message = `Invalid value for ${error.path}`;
  } else if (error.code === 11000) {
    status = 409;
    message = 'A product with this SKU already exists';
  } else if (error.type === 'entity.parse.failed') {
    status = 400;
    message = 'Request body contains invalid JSON';
  }

  if (status >= 500) console.error(error);
  res.status(status).json({ error: message });
};
