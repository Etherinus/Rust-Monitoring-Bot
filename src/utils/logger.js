const winston = require('winston');
const path = require('path');

const logFormat = winston.format.printf(({ level, message, timestamp, stack, service }) => {
    const serviceLabel = service ? `[${service}] ` : '';
    return `${timestamp} ${level}: ${serviceLabel}${stack || message}`;
});

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        logFormat
    ),
    defaultMeta: { service: 'discord-bot' },
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: path.resolve(__dirname, '../../logs/error.log'), level: 'error' }),
        new winston.transports.File({ filename: path.resolve(__dirname, '../../logs/combined.log') }),
    ],
    exceptionHandlers: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: path.resolve(__dirname, '../../logs/exceptions.log') })
    ],
    rejectionHandlers: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: path.resolve(__dirname, '../../logs/rejections.log') })
    ]
});

module.exports = logger;