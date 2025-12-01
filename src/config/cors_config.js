require('dotenv').config();
const messages = require('@constants/app-messages');

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',');

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log(`${messages.CORS_BLOCKED} ${origin}`);
      callback(null, true);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  maxAge: 86400
};

module.exports = corsOptions;
