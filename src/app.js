const express = require('express');
const productRoutes = require('./routes/productRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/products', productRoutes);
app.use((_req, _res, next) => {
  const error = new Error('Route not found');
  error.status = 404;
  next(error);
});
app.use(errorHandler);

module.exports = app;
