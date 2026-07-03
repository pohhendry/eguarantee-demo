import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import GuaranteePreview from './GuaranteePreview';

const subject = {
  guaranteeNumber: 'BG-UOB-2026-00123',
  issuanceDate: '2026-07-03',
  agreementDate: '2026-05-15',
  effectiveDate: '2026-07-03',
  expiryDate: '2027-07-02',
  applicant: { name: 'Tan Chong Construction Pte Ltd', address: '10 Tuas South Street 2, Singapore 637542' },
  beneficiary: { name: 'Housing & Development Board', address: 'HDB Hub, 480 Lorong 6 Toa Payoh, Singapore 310480' },
  bank: {
    name: 'United Overseas Bank Limited',
    registrationNumber: '193500026Z',
    address: '80 Raffles Place, UOB Plaza, Singapore 048624',
  },
  contractNature: 'construction services',
  guaranteedSum: { currency: 'SGD', figures: 750000, words: 'Seven Hundred and Fifty Thousand' },
  signatory: {
    name: 'Alexandra Teo',
    title: 'Vice President, Trade Finance Operations',
    signatureImage: 'data:image/svg+xml;base64,PHN2Zy8+',
  },
};

describe('GuaranteePreview', () => {
  it('renders the guarantee number', () => {
    render(<GuaranteePreview subject={subject} />);
    expect(screen.getByText(/BG-UOB-2026-00123/)).toBeInTheDocument();
  });

  it('renders beneficiary name in the To block', () => {
    render(<GuaranteePreview subject={subject} />);
    expect(screen.getByText(/Housing & Development Board/)).toBeInTheDocument();
  });

  it('renders bank name and registration number in clause 1', () => {
    render(<GuaranteePreview subject={subject} />);
    expect(screen.getByText(/United Overseas Bank Limited/)).toBeInTheDocument();
    expect(screen.getByText(/193500026Z/)).toBeInTheDocument();
  });

  it('renders guaranteed sum words and comma-formatted figures', () => {
    render(<GuaranteePreview subject={subject} />);
    expect(screen.getByText(/Seven Hundred and Fifty Thousand/)).toBeInTheDocument();
    expect(screen.getByText(/750,000/)).toBeInTheDocument();
  });

  it('renders expiry date in clause 2', () => {
    render(<GuaranteePreview subject={subject} />);
    expect(screen.getByText(/2027-07-02/)).toBeInTheDocument();
  });

  it('renders 4 p.m. Singapore time cut-off in clause 3', () => {
    render(<GuaranteePreview subject={subject} />);
    expect(screen.getByText(/4 p\.m\./)).toBeInTheDocument();
    expect(screen.getByText(/Singapore time/)).toBeInTheDocument();
  });

  it('renders signatory name in execution block', () => {
    render(<GuaranteePreview subject={subject} />);
    expect(screen.getByText(/Alexandra Teo/)).toBeInTheDocument();
  });

  it('renders SPECIMEN footer', () => {
    render(<GuaranteePreview subject={subject} />);
    expect(screen.getByText(/SPECIMEN/)).toBeInTheDocument();
    expect(screen.getByText(/IMDA TradeTrust eBG pilot/)).toBeInTheDocument();
  });

  it('does not render issuer section when issuerDid is omitted', () => {
    const { container } = render(<GuaranteePreview subject={subject} />);
    expect(container.textContent).not.toContain('Issued by:');
  });

  it('renders issuer domain and explainer when issuerDid is provided', () => {
    const { container } = render(
      <GuaranteePreview subject={subject} issuerDid="did:web:eguarantee.hendrypoh.com" />,
    );
    expect(container.textContent).toContain('eguarantee.hendrypoh.com');
    expect(container.textContent).toContain('How do I know this is really from the bank?');
  });
});
