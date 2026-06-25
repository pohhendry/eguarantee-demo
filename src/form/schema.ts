import { z } from 'zod';

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD')
  .refine((d) => !isNaN(Date.parse(d)), 'Must be a valid date');

export const guaranteeSchema = z
  .object({
    bgNumber: z.string().min(1, 'Required'),
    issueDate: isoDate,
    expiryDate: isoDate,
    issuingBankName: z.string().min(1, 'Required'),
    issuingBankSwift: z
      .string()
      .regex(/^[A-Z0-9]{8}([A-Z0-9]{3})?$/, 'Must be 8 or 11 uppercase alphanumeric characters'),
    applicantName: z.string().min(1, 'Required'),
    applicantAddress: z.string().min(1, 'Required'),
    beneficiaryName: z.string().min(1, 'Required'),
    beneficiaryAddress: z.string().min(1, 'Required'),
    underlyingContract: z.string().min(1, 'Required'),
    currency: z.string().regex(/^[A-Z]{3}$/, 'Must be 3 uppercase letters (ISO 4217)'),
    amount: z.number().positive('Must be greater than 0'),
    placeOfPresentation: z.string().min(1, 'Required'),
  })
  .superRefine((data, ctx) => {
    if (data.issueDate && data.expiryDate && data.expiryDate <= data.issueDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Expiry date must be after issue date',
        path: ['expiryDate'],
      });
    }
  });

export type GuaranteeFormData = z.infer<typeof guaranteeSchema>;
