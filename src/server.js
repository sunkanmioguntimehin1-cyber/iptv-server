require('dotenv').config();
require('express-async-errors');

const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');

const connectDB      = require('./config/db');
const errorHandler   = require('./middleware/errorHandler');
const logger         = require('./utils/logger');

// ─── Route imports ────────────────────────────────────────────────────────────
const authRoutes         = require('./routes/auth.routes');
const planRoutes         = require('./routes/plan.routes');
const subscriptionRoutes = require('./routes/subscription.routes');
const webhookRoutes      = require('./routes/webhook.routes');
const paymentRoutes      = require('./routes/payment.routes');

const app = express();

// ─── Connect Database ─────────────────────────────────────────────────────────
connectDB();

// ─── Security middleware ──────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true,
}));

// ─── IMPORTANT: Stripe webhook needs raw body ─────────────────────────────────
// Must be registered BEFORE express.json()
app.use(
  '/api/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  (req, res, next) => {
    req.rawBody = req.body;
    next();
  }
);

// ─── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Logging ──────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: { write: (msg) => logger.info(msg.trim()) },
  }));
}

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/plans',         planRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/webhooks',      webhookRoutes);
app.use('/payment',           paymentRoutes);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) =>
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
);

// ─── 404 handler ─────────────────────────────────────────────────────────────
app.use((req, res) =>
  res.status(404).json({ success: false, message: 'Route not found' })
);

// ─── Global error handler ─────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
});

module.exports = app;
