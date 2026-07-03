import { z } from 'zod';

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD')
  .refine((d) => !isNaN(Date.parse(d)), 'Must be a valid date');

const party = z.object({
  name: z.string().min(1, 'Required'),
  address: z.string().min(1, 'Required'),
});

export const guaranteeSchema = z
  .object({
    guaranteeNumber: z.string().min(1, 'Required'),
    issuanceDate: isoDate,
    agreementDate: isoDate,
    effectiveDate: isoDate,
    expiryDate: isoDate,
    applicant: party,
    beneficiary: party,
    bank: z.object({
      name: z.string().min(1, 'Required'),
      registrationNumber: z.string().min(1, 'Required'),
      address: z.string().min(1, 'Required'),
    }),
    contractNature: z.string().min(1, 'Required'),
    guaranteedSum: z.object({
      currency: z.string().regex(/^[A-Z]{3}$/, 'Must be 3 uppercase letters (ISO 4217)'),
      figures: z.number().positive('Must be greater than 0'),
      words: z.string().min(1, 'Required'),
    }),
    signatory: z.object({
      name: z.string().min(1, 'Required'),
      title: z.string().min(1, 'Required'),
    }),
  })
  .superRefine((data, ctx) => {
    if (data.issuanceDate && data.expiryDate && data.expiryDate <= data.issuanceDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Expiry date must be after issuance date',
        path: ['expiryDate'],
      });
    }
    if (data.effectiveDate && data.expiryDate && data.effectiveDate > data.expiryDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Effective date must be on or before expiry date',
        path: ['effectiveDate'],
      });
    }
  });

export type GuaranteeFormData = z.infer<typeof guaranteeSchema>;
