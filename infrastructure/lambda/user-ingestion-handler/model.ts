import { z } from 'zod';
export const UserDataSchema = z.object({
  id: z.uuid(),
  firstName: z.string().min(1).max(255),
  lastName: z.string().min(1).max(255),
  timeZone: z.string(),
  birthday: z.iso.datetime().optional(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const UserMessageSchema = z.object({
  eventType: z.enum(['created', 'updated', 'deleted']),
  user: UserDataSchema,
  timestamp: z.iso.datetime(),
});

export type UserMessage = z.infer<typeof UserMessageSchema>;
export type UserData = z.infer<typeof UserDataSchema>;
