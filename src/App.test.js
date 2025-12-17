import { describe, it, expect } from 'vitest';

/**
 * --- HELPERS TO TEST ---
 * (Copying helper logic here for unit testing isolation)
 */
const sanitizeName = (val) => val.replace(/[^a-zA-Z\s'-]/g, '').slice(0, 40);
const sanitizeEmail = (val) => val.replace(/[^\w.@+-]/g, '').slice(0, 60);

const AnalyticsService = {
  calculateStats: (orders) => {
    const totalValue = orders.reduce((acc, ord) => acc + (ord.amount || 0), 0);
    const fulfilled = orders.filter(o => o.status === 'fulfilled').length;
    return { totalValue, totalOrders: orders.length, fulfilled };
  }
};

/**
 * --- TESTS ---
 */
describe('Security & Sanitization', () => {
  it('removes dangerous characters from names', () => {
    const dirtyInput = "John <script>alert('xss')</script>";
    const clean = sanitizeName(dirtyInput);
    expect(clean).toBe("John alertxss");
    expect(clean).not.toContain("<");
    expect(clean).not.toContain(">");
  });

  it('limits name length to 40 chars', () => {
    const longName = "Christopher Jonathan Washington Smithsonian the Third";
    expect(sanitizeName(longName).length).toBeLessThanOrEqual(40);
  });

  it('removes invalid characters from emails', () => {
    const dirtyEmail = "user@domain.com; DROP TABLE users";
    const clean = sanitizeEmail(dirtyEmail);
    expect(clean).toBe("user@domain.comDROPTABLEusers"); // Basic stripping
    expect(clean).not.toContain(";");
    expect(clean).not.toContain(" ");
  });
});

describe('Analytics Logic', () => {
  const mockOrders = [
    { id: 1, amount: 100.00, status: 'fulfilled' },
    { id: 2, amount: 50.50, status: 'unfulfilled' },
    { id: 3, amount: 200.00, status: 'fulfilled' },
  ];

  it('calculates total sales value correctly', () => {
    const stats = AnalyticsService.calculateStats(mockOrders);
    expect(stats.totalValue).toBe(350.50);
  });

  it('counts fulfilled orders correctly', () => {
    const stats = AnalyticsService.calculateStats(mockOrders);
    expect(stats.fulfilled).toBe(2);
  });
  
  it('handles empty order lists gracefully', () => {
    const stats = AnalyticsService.calculateStats([]);
    expect(stats.totalValue).toBe(0);
    expect(stats.totalOrders).toBe(0);
  });
});