class AppError extends Error {
    constructor(message, statusCode = 500, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

class ConfigError extends AppError {
    constructor(message) {
        super(message, 500, false);
        this.name = 'ConfigError';
    }
}

class CommandError extends AppError {
     constructor(message, { isUserFacing = true } = {}) {
        super(message, 400, true);
        this.name = 'CommandError';
        this.isUserFacing = isUserFacing;
    }
}

module.exports = { AppError, ConfigError, CommandError };