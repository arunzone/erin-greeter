import { z } from 'zod';

export const GreetingMessageSchema = z.object({
  userId: z.string().uuid(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  year: z.number().int().positive(),
});

export type GreetingMessage = z.infer<typeof GreetingMessageSchema>;
