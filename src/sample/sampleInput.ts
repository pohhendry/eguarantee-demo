import type { GuaranteeFormData } from '../form/schema';

export const sampleInput: GuaranteeFormData = {
  guaranteeNumber: 'BG-UOB-2026-00123',
  issuanceDate: '2026-07-03',
  agreementDate: '2026-05-15',
  effectiveDate: '2026-07-03',
  expiryDate: '2027-07-02',
  applicant: {
    name: 'Tan Chong Construction Pte Ltd',
    address: '10 Tuas South Street 2, Singapore 637542',
  },
  beneficiary: {
    name: 'Housing & Development Board',
    address: 'HDB Hub, 480 Lorong 6 Toa Payoh, Singapore 310480',
  },
  bank: {
    name: 'United Overseas Bank Limited',
    registrationNumber: '193500026Z',
    address: '80 Raffles Place, UOB Plaza, Singapore 048624',
  },
  contractNature:
    'supply and installation of precast structural components under HDB Tender Ref HDB-CONST-2026-0441',
  guaranteedSum: {
    currency: 'SGD',
    figures: 750000,
    words: 'Seven Hundred and Fifty Thousand',
  },
  signatory: {
    name: 'Alexandra Teo',
    title: 'Vice President, Trade Finance Operations',
  },
};
