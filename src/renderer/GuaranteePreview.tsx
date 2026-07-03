import uobLogo from '../assets/uob-logo.png';

interface CredentialSubject {
  guaranteeNumber: string;
  issuanceDate: string;
  agreementDate: string;
  effectiveDate: string;
  expiryDate: string;
  applicant: { name: string; address: string };
  beneficiary: { name: string; address: string };
  bank: { name: string; registrationNumber: string; address: string };
  contractNature: string;
  guaranteedSum: { currency: string; figures: number; words: string };
  signatory: { name: string; title: string; signatureImage: string };
}

interface Props {
  subject: CredentialSubject;
  issuerDid?: string;
}

function fmt(n: number): string {
  return n.toLocaleString('en-SG');
}

function domainFromDid(did: string): string {
  return did.startsWith('did:web:') ? did.slice('did:web:'.length).replace(/:/g, '/') : did;
}

export default function GuaranteePreview({ subject, issuerDid }: Props) {
  const domain = issuerDid ? domainFromDid(issuerDid) : null;

  return (
    <div className="bg-white font-serif text-sm leading-relaxed text-black">
      <div className="max-w-3xl mx-auto px-12 py-10">
        {/* UOB logo — top right per UOB letter convention */}
        <div className="flex justify-end mb-8">
          <img src={uobLogo} alt="United Overseas Bank" className="h-12" />
        </div>

        <p className="mb-6 font-semibold">Guarantee No.: {subject.guaranteeNumber}</p>

        {/* To block */}
        <div className="mb-6">
          <p>To: {subject.beneficiary.name}</p>
          <p className="whitespace-pre-line">{subject.beneficiary.address}</p>
          <p>(hereafter referred to as &ldquo;you&rdquo;)</p>
        </div>

        {/* WHEREAS */}
        <p className="mb-6">
          WHEREAS an agreement dated {subject.agreementDate} was made between you and {subject.applicant.name} of{' '}
          {subject.applicant.address} (the &ldquo;Applicant&rdquo;) for {subject.contractNature} (the
          &ldquo;Contract&rdquo;).
        </p>

        {/* Clause 1 */}
        <div className="mb-4 space-y-3">
          <p>
            <span className="font-semibold">1.</span> Now we, {subject.bank.name} (company registration number{' '}
            {subject.bank.registrationNumber}) of {subject.bank.address} in consideration of the premises and at the
            request of the Applicant hereby guarantee payment to you of a sum or sums not exceeding the aggregate of{' '}
            {subject.guaranteedSum.words} only ({subject.guaranteedSum.currency} {fmt(subject.guaranteedSum.figures)}){' '}
            (the &ldquo;Guaranteed Sum&rdquo;) upon our receipt in Singapore of your written demand stating that the
            Applicant [is in breach of the Contract], such statement of demand shall be deemed final and conclusive
            without any further investigation on our part including as to the authenticity or authority of the signatory
            to such statement of demand.
          </p>
          <p className="pl-6">
            PROVIDED ALWAYS THAT the Guaranteed Sum shall be automatically reduced by the aggregate amount of any sums
            paid hereunder, and our total liability hereunder shall in no circumstance exceed the Guaranteed Sum.
          </p>
          <p className="pl-6">
            Our obligation to pay under this Guarantee is unconditional and arises upon a written demand (as described
            above) being received, without any regard to the terms and conditions of the Contract.
          </p>
        </div>

        {/* Clause 2 */}
        <div className="mb-4 space-y-2">
          <p>
            <span className="font-semibold">2.</span> This Guarantee shall be effective from {subject.effectiveDate}{' '}
            and shall expire on the earliest of the following dates (the &ldquo;Expiry Date&rdquo;):&mdash;
          </p>
          <div className="pl-6 space-y-1">
            <p>
              (i) {subject.expiryDate} provided that if such date is not a business day, then such date shall be deemed
              to fall on the following business day;
            </p>
            <p>(ii) the date the Guaranteed Sum is automatically reduced to zero hereunder;</p>
            <p>(iii) the date we receive the original of this Guarantee for cancellation; or</p>
            <p>(iv) the date you expressly discharge us from our obligations hereunder in writing.</p>
          </div>
          <p className="pl-6">
            PROVIDED ALWAYS THAT we may at any time without being required to do so pay to you the undrawn portion of
            the Guaranteed Sum in full, whereupon our liability hereunder shall immediately cease and determine.
          </p>
        </div>

        {/* Clause 3 */}
        <p className="mb-4">
          <span className="font-semibold">3.</span> All demands under this Guarantee must be received by us in
          Singapore on or before 4 p.m. of the Expiry Date (Singapore time), after which this Guarantee shall be null
          and void and our obligations shall cease, and no demand for payment shall be permitted or entertained by us
          notwithstanding that this Guarantee may not have been returned to us for cancellation.
        </p>

        {/* Clause 4 */}
        <p className="mb-4">
          <span className="font-semibold">4.</span> You may not assign the benefit of this Guarantee without our prior
          written consent. Any demand by an approved assignee must be accompanied by the original copy of this
          Guarantee. [We shall be entitled to assign or transfer any part or all of our rights and or obligations under
          this Guarantee and shall notify you in writing in the event of such assignment or transfer.]
        </p>

        {/* Clause 5 */}
        <p className="mb-4">
          <span className="font-semibold">5.</span> This Guarantee may be executed in any number of counterparts,
          each of which when executed and delivered is an original and all of which together evidence the same
          Guarantee.
        </p>

        {/* Clause 6 */}
        <p className="mb-4">
          <span className="font-semibold">6.</span> In addition to the rights conferred by any applicable laws, you
          consent to our disclosure of any information relating to this Guarantee where such disclosure may be required
          under any applicable law or regulation or by any governmental authority or body with whose requests we are
          accustomed to or required to comply.
        </p>

        {/* Clause 7 */}
        <p className="mb-4">
          <span className="font-semibold">7.</span> A person who is not a party to this Guarantee may not enforce any
          of its terms under the Contracts (Rights of Third Parties) Act 2001 of Singapore. Any amendment of any
          provision of this Guarantee will only be effective if made in writing and signed by both parties to this
          Guarantee.
        </p>

        {/* Clause 8 */}
        <p className="mb-8">
          <span className="font-semibold">8.</span> This Guarantee and all matters arising from this Guarantee shall
          be governed by and construed in accordance with the laws of the Republic of Singapore. By accepting this
          Guarantee, you hereby irrevocably submit to the exclusive jurisdiction of the courts of Singapore.
        </p>

        <p className="mb-10">Dated {subject.issuanceDate}</p>

        {/* Execution blocks */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div className="border border-black p-4">
            <p className="text-xs font-bold uppercase tracking-wide mb-4">Execution block of UOB</p>
            <img
              src={subject.signatory.signatureImage}
              alt="Authorised signatory"
              className="h-14 mb-2"
            />
            <div className="border-t border-black pt-2">
              <p className="font-semibold">{subject.signatory.name}</p>
              <p>{subject.signatory.title}</p>
            </div>
          </div>
          <div className="border border-black p-4">
            <p className="text-xs font-bold uppercase tracking-wide mb-4">
              Execution block of Beneficiary of Guarantee
            </p>
            <p className="text-xs text-gray-400 mt-8">(Customer to sign on a copy of the BG)</p>
          </div>
        </div>

        {/* Specimen footer */}
        <p className="text-xs text-gray-400 text-center border-t border-gray-200 pt-3 print:block">
          SPECIMEN — issued for demonstration under the IMDA TradeTrust eBG pilot. Not a valid instrument.
        </p>
      </div>

      {/* Issuer identity section — shown when issuerDid is provided (in-app preview and trustvc.io) */}
      {domain && (
        <div className="max-w-3xl mx-auto px-12 py-6 border-t-2 border-gray-200 font-sans text-sm">
          <p className="font-semibold text-base mb-2">
            Issued by:{' '}
            <span className="font-mono">{domain}</span>{' '}
            <span className="text-green-600">✓</span>
          </p>
          <details>
            <summary className="cursor-pointer text-blue-600 hover:underline">
              How do I know this is really from the bank?
            </summary>
            <ol className="mt-3 space-y-2 pl-5 list-decimal text-gray-700">
              <li>The document carries a digital signature created with the issuer&apos;s private key.</li>
              <li>
                The matching public key is published in a DID document at the issuer&apos;s own web domain
                (did:web). Only someone who controls that domain&apos;s web server can publish it — the trust
                anchor is domain control, same as the padlock in your browser.
              </li>
              <li>
                Verification = signature checks out against the key at that domain, and the document
                hasn&apos;t been altered since signing.
              </li>
              <li>
                In this demo the issuer is a placeholder domain. In a live pilot, the bank publishes one small
                file on its own domain (e.g. uob.com.sg) — that is the entire identity integration. A future
                step is an IMDA/MAS-maintained trusted-issuer list on top of this.
              </li>
            </ol>
          </details>
        </div>
      )}
    </div>
  );
}
