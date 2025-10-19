import { z } from 'zod';

export const uuidSchema = z.string().uuid();

export const idParamSchema = z.object({ id: uuidSchema });

export const userCreateSchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1).optional(),
});

export type UUID = z.infer<typeof uuidSchema>;
export type IdParam = z.infer<typeof idParamSchema>;
export type UserCreateInput = z.infer<typeof userCreateSchema>;
