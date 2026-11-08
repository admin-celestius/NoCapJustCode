// client/src/components/Register/registrationSchema.js
import { z } from 'zod';

export const memberSchema = z.object({
  fullName: z
    .string({ error: 'You missed a spot, chief. Full name is required.' })
    .trim()
    .min(2, 'You missed a spot, chief. Enter your full name (2+ characters).')
    .max(100, "That's a paragraph, not a name. Keep it under 100 characters."),
  email: z
    .string({ error: 'You missed a spot, chief. Email is required.' })
    .trim()
    .email("Bro, that email ain't emailing. Use a format like name@example.com."),
  phone: z
    .string({ error: 'You missed a spot, chief. Phone number is required.' })
    .trim()
    .transform((val) => val.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, ''))
    .refine((val) => /^[6-9]\d{9}$/.test(val), {
      message: "Those digits ain't adding up. Enter a valid 10-digit mobile number.",
    }),
  department: z
    .string({ error: 'You missed a spot, chief. Department is required.' })
    .trim()
    .min(2, 'You missed a spot, chief. Department is required.').max(100),
  rollNo: z.string().trim().toUpperCase().min(1, 'Drop your registration number, chief.').max(60),
  year: z.enum(['1', '2', '3', '4', '5'], { error: 'Pick your current year of study.' }),
});

export const registrationSchema = z
  .object({
    pairName: z
      .string()
      .trim()
      .min(2, 'Your duo needs a name, chief. Use at least 2 characters.')
      .max(60, 'Keep the duo name under 60 characters, chief.'),
    members: z
      .array(memberSchema)
      .length(2, 'A duo means exactly 2 players.'),
  })
  .superRefine((data, ctx) => {
    if (data.members && data.members.length === 2) {
      const [m1, m2] = data.members;

      if (m1.rollNo === m2.rollNo) {
        ctx.addIssue({ code: 'custom', path: ['members', 1, 'rollNo'], message: "You can't clone yourself, chief. Player Two needs a different registration number." });
      }

      // Unique emails check
      if (
        m1.email &&
        m2.email &&
        m1.email.toLowerCase().trim() === m2.email.toLowerCase().trim()
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "You can't clone yourself, chief. Player Two needs a different email.",
          path: ['members', 1, 'email'],
        });
      }

      // Unique phones check (normalized)
      const p1 = (m1.phone || '').replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
      const p2 = (m2.phone || '').replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
      if (p1 && p2 && p1 === p2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "You can't clone yourself, chief. Player Two needs a different phone number.",
          path: ['members', 1, 'phone'],
        });
      }
    }
  });
