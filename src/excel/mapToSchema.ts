import type { GuaranteeFormData } from '../form/schema';
import type { RawFields } from './parseExcel';

function toStr(v: unknown): string {
  return String(v ?? '').trim();
}

function toDateStr(v: unknown): string {
  if (v instanceof Date) {
    // format as YYYY-MM-DD in UTC to avoid timezone shifts
    return v.toISOString().slice(0, 10);
  }
  if (typeof v === 'number') {
    // Excel serial date: days since 1899-12-30
    const d = new Date(Math.round((v - 25569) * 86400 * 1000));
    return d.toISOString().slice(0, 10);
  }
  return toStr(v);
}

function toNumber(v: unknown): number {
  if (typeof v === 'number') return v;
  const n = Number(String(v ?? '').replace(/,/g, ''));
  return isNaN(n) ? 0 : n;
}

export function mapToSchema(raw: RawFields): GuaranteeFormData {
  return {
    guaranteeNumber: toStr(raw.guaranteeNumber),
    issuanceDate: toDateStr(raw.issuanceDate),
    agreementDate: toDateStr(raw.agreementDate),
    effectiveDate: toDateStr(raw.effectiveDate),
    expiryDate: toDateStr(raw.expiryDate),
    applicant: {
      name: toStr(raw.applicantName),
      address: toStr(raw.applicantAddress),
    },
    beneficiary: {
      name: toStr(raw.beneficiaryName),
      address: toStr(raw.beneficiaryAddress),
    },
    bank: {
      name: toStr(raw.bankName),
      registrationNumber: toStr(raw.bankRegistrationNumber),
      address: toStr(raw.bankAddress),
    },
    contractNature: toStr(raw.contractNature),
    guaranteedSum: {
      currency: toStr(raw.guaranteedSumCurrency),
      figures: toNumber(raw.guaranteedSumFigures),
      words: toStr(raw.guaranteedSumWords),
    },
    signatory: {
      name: toStr(raw.signatoryName),
      title: toStr(raw.signatoryTitle),
    },
  };
}
