class AppError extends Error {
  constructor(message, statusCode = 400, errors = undefined) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors; // Optional payload (e.g., validation issues)
  }
}

module.exports = AppError;
