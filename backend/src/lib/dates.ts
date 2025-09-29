/**
 * Normalize date range with sensible defaults
 * @param range Object with optional from and to ISO date strings
 * @returns Tuple of [fromISO, toISO] in UTC
 */
export function normalizeRange(range: { from?: string; to?: string }): [string, string] {
  const now = new Date();
  
  // Default 'to' is end of current day in UTC
  const defaultTo = new Date(now);
  defaultTo.setUTCHours(23, 59, 59, 999);
  
  // Default 'from' is 30 days ago at start of day in UTC
  const defaultFrom = new Date(now);
  defaultFrom.setUTCDate(defaultFrom.getUTCDate() - 30);
  defaultFrom.setUTCHours(0, 0, 0, 0);
  
  const fromDate = range.from ? new Date(range.from) : defaultFrom;
  const toDate = range.to ? new Date(range.to) : defaultTo;
  
  // Ensure from is not after to
  if (fromDate > toDate) {
    throw new Error('From date cannot be after to date');
  }
  
  return [fromDate.toISOString(), toDate.toISOString()];
}
