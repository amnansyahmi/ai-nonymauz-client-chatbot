import { z } from 'zod';

export const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().max(8000)
});

export const plannerContextSchema = z
  .object({
    groomName: z.string().max(120).optional(),
    brideName: z.string().max(120).optional(),
    majlisDate: z.string().max(40).optional(),
    negeri: z.string().max(80).optional(),
    totalBudget: z.number().nonnegative().max(10_000_000).optional(),
    guestTarget: z.number().int().nonnegative().max(100_000).optional(),
    daysLeft: z.number().int().optional(),
    stateSummary: z.string().max(2000).optional(),
    checklistSummary: z.string().max(4000).optional(),
    budgetSummary: z.array(z.string().max(160)).max(50).optional(),
    upcomingAppointments: z
      .array(
        z.object({
          title: z.string().max(160),
          date: z.string().max(40),
          time: z.string().max(20).optional(),
          vendor: z.string().max(160).optional(),
          location: z.string().max(160).optional()
        })
      )
      .max(20)
      .optional()
  })
  .partial();

export const chatRequestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(40),
  language: z.enum(['ms', 'en']).default('ms'),
  plannerContext: plannerContextSchema.optional(),
  voiceMode: z.boolean().optional()
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;
