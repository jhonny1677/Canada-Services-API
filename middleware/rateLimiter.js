const rateLimit = require('express-rate-limit');

function createLimiter(max, windowMs) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: true,
    handler: (_req, res, _next, options) => {
      res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil(options.windowMs / 1000)
      });
    }
  });
}

module.exports = { createLimiter };
