const winston = require('winston');
const path = require('path');

const transports = [
  new winston.transports.Console()
];

if (process.env.LOG_FILE) {
  const logDir = path.dirname(process.env.LOG_FILE);
  require('fs').mkdirSync(logDir, { recursive: true });
  transports.push(new winston.transports.File({ filename: process.env.LOG_FILE }));
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports
});

logger.stream = {
  write: (message) => logger.http(message.trimEnd())
};

module.exports = logger;
