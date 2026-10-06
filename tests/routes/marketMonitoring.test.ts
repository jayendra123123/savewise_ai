import { TwelveDataService, TwelveDataLimitReachedError } from '../../src/services/twelveDataService';
import { getCurrentUtcDateString } from '../../src/models/TwelveDataUsage';

describe('Market Monitoring & Twelve Data 700-Credit Safety Limit', () => {
  it('should correctly calculate credit cost for single and multi-symbol requests', () => {
    expect(TwelveDataService.calculateRequestCost('quote', ['AAPL'])).toBe(1);
    expect(TwelveDataService.calculateRequestCost('quote', ['AAPL', 'MSFT', 'GOOGL'])).toBe(3);
    expect(TwelveDataService.calculateRequestCost('price', ['XAU'])).toBe(1);
    expect(TwelveDataService.calculateRequestCost('quote', ['TSLA', 'NVDA'])).toBe(2);
  });

  it('should return a valid UTC date format YYYY-MM-DD', () => {
    const utcDate = getCurrentUtcDateString();
    expect(utcDate).toMatch(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/);
  });

  it('should throw TwelveDataLimitReachedError when the 700-credit safety limit is reached', () => {
    const error = new TwelveDataLimitReachedError(
      'Twelve Data daily limit reached. Market-data requests are paused until the next UTC day.',
      {
        allowed: false,
        currentUsage: 700,
        remainingCredits: 0,
        limit: 700,
        utcDate: '2026-10-06',
        blockedRequests: 1
      }
    );

    expect(error.status).toBe(429);
    expect(error.message).toBe(
      'Twelve Data daily limit reached. Market-data requests are paused until the next UTC day.'
    );
    expect(error.details.currentUsage).toBe(700);
    expect(error.details.remainingCredits).toBe(0);
    expect(error.details.limit).toBe(700);
  });
});
