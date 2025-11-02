const ErrorHandler = require('../../src/shared/services/web-scraper/error-handler');

describe('ErrorHandler Tests', () => {
  let errorHandler;

  beforeEach(() => {
    errorHandler = new ErrorHandler();
  });

  afterEach(() => {
    if (errorHandler && typeof errorHandler.destroy === 'function') {
      errorHandler.destroy();
    }
  });

  test('should classify different error types', () => {
    const rateLimitError = new Error('Rate limit exceeded');
    const networkError = new Error('Network timeout');
    const parsingError = new Error('JSON parse error');
    const blockedError = new Error('Access denied');

    expect(errorHandler.classifyError(rateLimitError)).toBe('rateLimit');
    expect(errorHandler.classifyError(networkError)).toBe('network');
    expect(errorHandler.classifyError(parsingError)).toBe('parsing');
    expect(errorHandler.classifyError(blockedError)).toBe('blocked');
  });

  test('should detect rate limit errors correctly', () => {
    const rateLimitError = new Error('Too many requests');
    rateLimitError.status = 429;

    expect(errorHandler.isRateLimitError(rateLimitError)).toBe(true);
    expect(errorHandler.isRateLimitError(new Error('Normal error'))).toBe(false);
  });

  test('should calculate retry delays correctly', () => {
    const config = {
      retryDelay: 1000,
      backoffMultiplier: 2,
      maxDelay: 10000
    };

    expect(errorHandler.calculateRetryDelay(0, config)).toBe(1000);
    expect(errorHandler.calculateRetryDelay(1, config)).toBe(2000);
    expect(errorHandler.calculateRetryDelay(2, config)).toBe(4000);
    expect(errorHandler.calculateRetryDelay(3, config)).toBe(8000);
    expect(errorHandler.calculateRetryDelay(4, config)).toBe(10000); // Max delay
  });
});