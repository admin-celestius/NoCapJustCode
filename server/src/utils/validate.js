const { z } = require('zod');

const email = z
  .string()
  .trim()
  .toLowerCase()
  .email('Enter a valid email address')
  .refine((v) => v.endsWith('@citchennai.net'), {
    message: 'Only official @citchennai.net email addresses are permitted',
  });
const phone = z.string().trim()
  .transform((v) => v.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, ''))
  .pipe(z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number'));
const rollNo = z.string().trim().toUpperCase().min(1, 'Registration number is required').max(60);
const teamName = z.string().trim().min(2).max(60);

const memberSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email,
  phone,
  department: z.string().trim().min(2).max(100),
  year: z.union([z.number(), z.string()])
    .transform(Number)
    .pipe(
      z.number().int().refine((v) => v === 1, {
        message: 'Registration is strictly restricted to 1st-year students only',
      })
    ),
  rollNo,
});

const registrationSchema = z.object({
  teamName,
  members: z.array(memberSchema).length(2, 'Exactly 2 members are required'),
}).superRefine(({ members }, ctx) => {
  for (const field of ['email', 'phone', 'rollNo']) {
    if (members.length === 2 && members[0][field] === members[1][field]) {
      ctx.addIssue({ code: 'custom', path: ['members', 1, field], message: `Members must have different ${field === 'rollNo' ? 'registration numbers' : field + 's'}` });
    }
  }
});

const checkSchema = z.object({
  teamName: teamName.optional(),
  emails: z.array(email).max(2).default([]),
  phones: z.array(phone).max(2).default([]),
  rollNos: z.array(rollNo).max(2).default([]),
});

const paymentSchema = z.object({
  razorpay_order_id: z.string().regex(/^order_[A-Za-z0-9]+$/),
  razorpay_payment_id: z.string().regex(/^pay_[A-Za-z0-9]+$/),
  razorpay_signature: z.string().regex(/^[a-f0-9]{64}$/i),
});

const issues = (error) => error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message }));
function validateRegistration(body) {
  const result = registrationSchema.safeParse(body);
  return result.success ? { errors: [], data: result.data } : { errors: issues(result.error), data: null };
}

module.exports = { validateRegistration, registrationSchema, checkSchema, paymentSchema, issues };
