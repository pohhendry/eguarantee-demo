# YORK credentialSubject Schema

This file documents every field in `credentialSubject` for the UOB Banker's Guarantee VC.
It is the canonical reference for the Excel front-end re-templating pass.

All field names follow JSON dot-notation paths relative to `credentialSubject`.

| Field | Type | Required | Description | UOB clause / slot |
|---|---|---|---|---|
| `guaranteeNumber` | string | yes | Bank-assigned guarantee reference number | Header "Guarantee No." |
| `issuanceDate` | string (YYYY-MM-DD) | yes | Date the guarantee is issued and signed | "Dated ___" |
| `agreementDate` | string (YYYY-MM-DD) | yes | Date of the underlying contract | "WHEREAS an agreement dated ___" |
| `effectiveDate` | string (YYYY-MM-DD) | yes | Date from which the guarantee is in force | Clause 2 "effective from ___" |
| `expiryDate` | string (YYYY-MM-DD) | yes | Specific calendar expiry date | Clause 2(i) |
| `applicant.name` | string | yes | Full legal name of the applicant (contractor/buyer) | "made between you and ___ (the 'Applicant')" |
| `applicant.address` | string | yes | Registered address of the applicant | "of [address]" |
| `beneficiary.name` | string | yes | Full legal name of the guarantee beneficiary | "To: [Beneficiary of Guarantee]" |
| `beneficiary.address` | string | yes | Registered address of the beneficiary | To block |
| `bank.name` | string | yes | Full legal name of the issuing bank | Clause 1 "we, [BANK]" |
| `bank.registrationNumber` | string | yes | ACRA registration number of the bank | Clause 1 "(company registration number [•])" |
| `bank.address` | string | yes | Registered address of the bank | Clause 1 "of [address]" |
| `contractNature` | string | yes | Plain-language description of the contract type | WHEREAS "[state nature of contract]" |
| `guaranteedSum.currency` | string (ISO 4217) | yes | Currency code, e.g. "SGD" | Clause 1 amount |
| `guaranteedSum.figures` | number | yes | Guarantee amount as a number, e.g. 750000 | Clause 1 "($___)" |
| `guaranteedSum.words` | string | yes | Amount in English words — operator-supplied, not auto-generated | Clause 1 "___ only" |
| `signatory.name` | string | yes | Name of the authorised bank signatory | Execution block |
| `signatory.title` | string | yes | Job title of the authorised bank signatory | Execution block |
| `signatory.signatureImage` | string (data URI) | yes | Base64-encoded SVG/PNG handwriting signature | Execution block (above printed name) |

## Notes

- `guaranteedSum.words` must be supplied by the operator. The renderer does not auto-convert figures to words.
- `signatory.signatureImage` is currently injected as a static constant in `assembleVC.ts`. In a production deployment, the bank would supply a real image.
- All dates must be `YYYY-MM-DD` (ISO 8601 date only, no time component).
- `expiryDate` must be strictly after `issuanceDate`. `effectiveDate` must be on or before `expiryDate`.
