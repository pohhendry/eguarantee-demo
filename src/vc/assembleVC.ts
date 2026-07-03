import type { GuaranteeFormData } from '../form/schema';

const ALEXANDRA_TEO_SIGNATURE_SVG =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCAyMDAgNjAiPjxwYXRoIGQ9Ik04LDQ1IEMxNSwyMCAyOCw1MCA0MiwzMiBDNTYsMTQgNjgsNDggODUsMzggQzEwMiwyOCAxMTUsNTAgMTM1LDM1IEMxNTIsMjIgMTYyLDQ0IDE5MCwzOCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMWExYTRmIiBzdHJva2Utd2lkdGg9IjIuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PHBhdGggZD0iTTEyLDUyIEM1MCw1MiA5MCw1NCAxMzAsNTIgQzE2MCw1MCAxNzUsNTIgMTkyLDUyIiBmaWxsPSJub25lIiBzdHJva2U9IiMxYTFhNGYiIHN0cm9rZS13aWR0aD0iMSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+PC9zdmc+';

export function assembleVC(
  data: GuaranteeFormData,
  issuerDid: string,
  rendererUrl: string = 'https://eguarantee.hendrypoh.com/renderer',
) {
  return {
    '@context': [
      'https://www.w3.org/ns/credentials/v2',
      'https://trustvc.io/context/render-method-context-v2.json',
      { '@vocab': 'https://eguarantee.hendrypoh.com/vocab#' },
    ],
    type: ['VerifiableCredential'],
    issuer: issuerDid,
    validFrom: `${data.issuanceDate}T00:00:00Z`,
    validUntil: `${data.expiryDate}T00:00:00Z`,
    credentialSubject: {
      type: ['BankersGuarantee'],
      guaranteeNumber: data.guaranteeNumber,
      issuanceDate: data.issuanceDate,
      agreementDate: data.agreementDate,
      effectiveDate: data.effectiveDate,
      expiryDate: data.expiryDate,
      applicant: { name: data.applicant.name, address: data.applicant.address },
      beneficiary: { name: data.beneficiary.name, address: data.beneficiary.address },
      bank: {
        name: data.bank.name,
        registrationNumber: data.bank.registrationNumber,
        address: data.bank.address,
      },
      contractNature: data.contractNature,
      guaranteedSum: {
        currency: data.guaranteedSum.currency,
        figures: data.guaranteedSum.figures,
        words: data.guaranteedSum.words,
      },
      signatory: {
        name: data.signatory.name,
        title: data.signatory.title,
        signatureImage: ALEXANDRA_TEO_SIGNATURE_SVG,
      },
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
