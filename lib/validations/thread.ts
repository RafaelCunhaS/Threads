import * as z from 'zod'

export const threadValidation = z.object({
  thread: z.string().min(3, 'Minimum 3 characters').max(1000, 'Maximum 1000 characters'),
  accountId: z.string().min(1)
})

export const commentValidation = z.object({
  thread: z.string().min(3, 'Minimum 3 characters').max(1000, 'Maximum 1000 characters')
})
