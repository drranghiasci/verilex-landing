import { z } from 'zod';

export const CaseCreateSchema = z.object({
  client_first_name: z.string().trim().min(1, 'Client first name is required.'),
  client_last_name: z.string().trim().min(1, 'Client last name is required.'),
  client_email: z.string().trim().email('Enter a valid email.').optional().or(z.literal('')),
  client_phone: z.string().trim().optional().or(z.literal('')),
  title: z.string().trim().optional().or(z.literal('')),
  matter_type: z.string().trim().optional().default('Divorce'),
  status: z.string().trim().optional().default('open'),
  state: z.string().trim().optional().or(z.literal('')),
  county: z.string().trim().optional().or(z.literal('')),
  court_name: z.string().trim().optional().or(z.literal('')),
  case_number: z.string().trim().optional().or(z.literal('')),
  internal_notes: z.string().trim().optional().or(z.literal('')),
});

export type CaseCreateInput = z.infer<typeof CaseCreateSchema>;

export function buildCaseTitle(input: CaseCreateInput): string {
  const provided = (input.title ?? '').trim();
  if (provided) return provided;
  const matter = (input.matter_type ?? '').trim() || 'Matter';
  return `${input.client_last_name}, ${input.client_first_name} — ${matter}`;
}
