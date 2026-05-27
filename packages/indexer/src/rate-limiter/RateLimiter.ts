/**
 * Issue #37 – RateLimiter implements a fixed window rate limiter for Horizon API calls.
 * Horizon typically allows 2000 requests per minute.
 */
export class RateLimiter {
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private requests: number[];
  private readonly horizonName: string;

  constructor(options: {
    maxRequestsPerWindow: number;
    windowMs: number;
    horizonName: string;
  }) {
    this.maxRequests = options.maxRequestsPerWindow;
    this.windowMs = options.windowMs;
    this.horizonName = options.horizonName;
    this.requests = [];
  }

  /**
   * Consumes a request slot, waiting if necessary.
   * @returns Promise that resolves when the request is allowed
   */
  async consume(): Promise<void> {
    // Remove old requests outside the window
    const cutoff = Date.now() - this.windowMs;
    this.requests = this.requests.filter(timestamp => timestamp > cutoff);

    if (this.requests.length >= this.maxRequests) {
      // Issue #37 – Calculate time to wait until oldest request expires
      const oldestRequest = Math.min(...this.requests);
      const waitTime = this.windowMs - (Date.now() - oldestRequest);
      
      if (waitTime > 0) {
        // Issue #37 – Log rate limit events
        console.log(`[rate-limiter] ${this.horizonName} rate limit reached, waiting ${waitTime}ms`);
        console.log(`[rate-limiter] ${this.horizonName} current usage: ${this.requests.length}/${this.maxRequests} requests in window`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        // After waiting, clean up again
        return this.consume();
      }
    }

    this.requests.push(Date.now());
  }

  /**
   * Get current rate limit stats for monitoring
   */
  getStats(): {
    requestsInWindow: number;
    maxRequests: number;
    windowMs: number;
    horizonName: string;
  } {
    const cutoff = Date.now() - this.windowMs;
    const recentRequests = this.requests.filter(timestamp => timestamp > cutoff);
    return {
      requestsInWindow: recentRequests.length,
      maxRequests: this.maxRequests,
      windowMs: this.windowMs,
      horizonName: this.horizonName
    };
  }
}