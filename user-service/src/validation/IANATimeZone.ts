import { z } from 'zod';

const isIanaTimeZone = (tz: string) => {
  try {
    // Throws RangeError if invalid IANA tz
    new Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

export const ianaTimeZoneSchema = z
  .string()
  .trim()
  .min(3)
  .refine(isIanaTimeZone, { message: 'Invalid IANA time zone' });
