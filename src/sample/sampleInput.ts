import type { GuaranteeFormData } from '../form/schema';

export const sampleInput: GuaranteeFormData = {
  bgNumber: 'BG-2026-88910',
  issueDate: '2026-06-24',
  expiryDate: '2027-06-30',
  issuingBankName: 'Global Trade Bank Ltd',
  issuingBankSwift: 'GTBKSGSGXXX',
  applicantName: 'Apex Builders Pte Ltd',
  applicantAddress: '10 Marina Boulevard, Singapore 018983',
  beneficiaryName: 'Maritime Authority of Singapore',
  beneficiaryAddress: '456 Alexandra Road, Singapore 119962',
  underlyingContract: 'Tender Ref: MAS-2026-004',
  currency: 'SGD',
  amount: 500000,
  placeOfPresentation: 'Singapore Counter, 12 Marina Blvd',
};
