const EventEmitter = require('eventemitter3');

class ErrorHandler extends EventEmitter {
  constructor(config = {}) {
    super();
    this.retryConfig = {
      maxRetries: 3,
      retryDelay: 1000,
      backoffMultiplier: 2,
      maxDelay: 10000
    };
    
    this.rateLimitConfig = {
      requestsPerSecond: 2,
      burstSize: 5,
      cooldownPeriod: 60000
    };
    
    this.errorStats = {
      totalErrors: 0,
      rateLimitHits: 0,
      networkErrors: 0,
      parsingErrors: 0,
      retryAttempts: 0
    };
    
    this.requestQueue = [];
    this.lastRequestTime = 0;
    this.requestCount = 0;
    this.cooldownStart = 0;
  }

  classifyError(error) {
    if (this.isRateLimitError(error)) {
      return 'rateLimit';
    } else if (this.isNetworkError(error)) {
      return 'network';
    } else if (this.isParsingError(error)) {
      return 'parsing';
    } else if (this.isBlockedError(error)) {
      return 'blocked';
    } else {
      return 'unknown';
    }
  }

  isRateLimitError(error) {
    const message = error.message.toLowerCase();
    return message.includes('rate limit') || 
           message.includes('too many requests') ||
           error.status === 429 ||
           (error.response && error.response.status === 429) ||
           false;
  }

  isNetworkError(error) {
    const message = error.message.toLowerCase();
    return message.includes('network') ||
           message.includes('timeout') ||
           message.includes('econnrefused') ||
           message.includes('enotfound') ||
           error.code === 'ECONNREFUSED' ||
           error.code === 'ENOTFOUND' ||
           error.code === 'ETIMEDOUT';
  }

  isParsingError(error) {
    const message = error.message.toLowerCase();
    return message.includes('parse') ||
           message.includes('json') ||
           message.includes('syntax') ||
           error.name === 'SyntaxError';
  }

  isBlockedError(error) {
    const message = error.message.toLowerCase();
    return message.includes('blocked') ||
           message.includes('forbidden') ||
           message.includes('access denied') ||
           error.status === 403 ||
           (error.response && error.response.status === 403);
  }

  calculateRetryDelay(attempt, config) {
    const baseDelay = config.retryDelay || this.retryConfig.retryDelay;
    const multiplier = config.backoffMultiplier || this.retryConfig.backoffMultiplier;
    const maxDelay = config.maxDelay || this.retryConfig.maxDelay;
    
    const delay = baseDelay * Math.pow(multiplier, attempt);
    return Math.min(delay, maxDelay);
  }

  destroy() {
    this.requestQueue = [];
    this.lastRequestTime = 0;
    this.requestCount = 0;
    this.cooldownStart = 0;
    if (this.removeAllListeners) {
      this.removeAllListeners();
    }
  }
}

module.exports = ErrorHandler;