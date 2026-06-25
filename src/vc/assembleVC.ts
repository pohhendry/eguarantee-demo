import type { GuaranteeFormData } from '../form/schema';

export function assembleVC(
  data: GuaranteeFormData,
  issuerDid: string,
  rendererUrl: string = 'https://eguarantee.fyntech.io/renderer',
) {
  return {
    '@context': [
      'https://www.w3.org/ns/credentials/v2',
      'https://trustvc.io/context/render-method-context-v2.json',
    ],
    type: ['VerifiableCredential'],
    issuer: issuerDid,
    validFrom: `${data.issueDate}T00:00:00Z`,
    validUntil: `${data.expiryDate}T00:00:00Z`,
    credentialSubject: {
      type: ['BankersGuarantee'],
      bgNumber: data.bgNumber,
      issueDate: data.issueDate,
      issuingBank: { name: data.issuingBankName, swift: data.issuingBankSwift },
      applicant: { name: data.applicantName, address: data.applicantAddress },
      beneficiary: { name: data.beneficiaryName, address: data.beneficiaryAddress },
      underlyingContract: data.underlyingContract,
      currency: data.currency,
      amount: data.amount,
      expiryDate: data.expiryDate,
      placeOfPresentation: data.placeOfPresentation,
      governingRules: 'URDG758',
    },
    renderMethod: [
      {
        id: rendererUrl,
        type: 'EMBEDDED_RENDERER',
        templateName: 'EBG',
      },
    ],
  };
}
