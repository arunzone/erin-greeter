import { z } from 'zod';

export const uuidSchema = z.string().uuid();

export const idParamSchema = z.object({ id: uuidSchema });

const isIanaTimeZone = (tz: string) => {
  try {
    // Throws RangeError if invalid IANA tz
    new Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

export const userCreateSchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1).optional(),
  timeZone: z
    .string()
    .trim()
    .min(1)
    .refine(isIanaTimeZone, { message: 'Invalid IANA time zone' }),
});

export type UUID = z.infer<typeof uuidSchema>;
export type IdParam = z.infer<typeof idParamSchema>;
export type UserCreateInput = z.infer<typeof userCreateSchema>;
