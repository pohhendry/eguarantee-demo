interface CredentialSubject {
  bgNumber: string;
  issueDate: string;
  issuingBank: { name: string; swift: string };
  applicant: { name: string; address: string };
  beneficiary: { name: string; address: string };
  underlyingContract: string;
  currency: string;
  amount: number;
  expiryDate: string;
  placeOfPresentation: string;
}

interface Props {
  subject: CredentialSubject;
}

export default function GuaranteePreview({ subject }: Props) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 font-serif text-sm leading-relaxed text-slate-800">
      <div className="text-center mb-4">
        <h1 className="font-bold text-base tracking-widest">BANKER&apos;S GUARANTEE</h1>
        <p className="text-xs text-slate-500">(FINANCIAL GUARANTEE)</p>
      </div>

      <div className="mb-4 space-y-1 text-sm">
        <p><span className="font-semibold">To:</span> {subject.beneficiary.name}</p>
        <p><span className="font-semibold">Address:</span> {subject.beneficiary.address}</p>
        <p>
          <span className="font-semibold">Date of Issue:</span> {subject.issueDate}
          &emsp;
          <span className="font-semibold">Guarantee No.:</span> {subject.bgNumber}
        </p>
      </div>

      <hr className="border-slate-200 my-4" />

      <div className="space-y-4 text-sm">
        <p>
          <span className="font-semibold">1. </span>
          We,{' '}
          <span className="text-indigo-600 font-medium">{subject.issuingBank.name}</span>
          {' '}(SWIFT:{' '}
          <span className="text-indigo-600 font-medium">{subject.issuingBank.swift}</span>
          ) (the &ldquo;Guarantor&rdquo;), have been informed that{' '}
          <span className="text-indigo-600 font-medium">{subject.applicant.name}</span>
          {' '}of{' '}
          <span className="text-indigo-600 font-medium">{subject.applicant.address}</span>
          {' '}(the &ldquo;Applicant&rdquo;) has entered into an underlying agreement/obligation under{' '}
          <span className="text-indigo-600 font-medium">{subject.underlyingContract}</span>
          {' '}with you.
        </p>

        <p>
          <span className="font-semibold">2. </span>
          At the request of the Applicant, we, the Guarantor, hereby irrevocably and unconditionally undertake to pay you, the Beneficiary, any sum or sums not exceeding in total an amount of{' '}
          <span className="text-indigo-600 font-medium">{subject.currency} {subject.amount}</span>
          {' '}upon receipt by us of your conforming demand in writing. Your demand must be accompanied by a signed statement stating that the Applicant is in breach of its financial obligations under the underlying agreement.
        </p>

        <p>
          <span className="font-semibold">3. </span>
          This Guarantee is subject to the Uniform Rules for Demand Guarantees (URDG) 2010 Revision, ICC Publication No. 758.
        </p>

        <p>
          <span className="font-semibold">4. </span>
          Any demand for payment under this Guarantee must be received by us on or before{' '}
          <span className="text-indigo-600 font-medium">{subject.expiryDate}</span>
          {' '}(the &ldquo;Expiry Date&rdquo;) at our counters located at{' '}
          <span className="text-indigo-600 font-medium">{subject.placeOfPresentation}</span>
          . After the Expiry Date, this Guarantee shall become completely null and void.
        </p>
      </div>

      <p className="mt-6 text-xs text-slate-400 font-sans">
        Draft only — legal wording must be confirmed by the bank&apos;s legal team before production use.
      </p>
    </div>
  );
}
