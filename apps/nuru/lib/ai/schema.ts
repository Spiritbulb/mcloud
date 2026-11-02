import { z } from 'zod'

export const StudyOutputSchema = z.object({
  notes: z.array(
    z.object({
      heading: z.string(),
      points: z.array(z.object({ text: z.string(), pages: z.array(z.number().int()) })),
    }),
  ),
  questions: z.array(z.object({ question: z.string(), answer: z.string(), pages: z.array(z.number().int()) })),
})

export type StudyOutput = z.infer<typeof StudyOutputSchema>

export const WhySchema = z.object({
  items: z.array(z.object({ id: z.number().int(), why: z.string().nullable() })),
})
