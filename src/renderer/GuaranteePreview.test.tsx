import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import GuaranteePreview from './GuaranteePreview';

const subject = {
  type: ['BankersGuarantee'],
  bgNumber: 'BG-2026-88910',
  issueDate: '2026-06-24',
  issuingBank: { name: 'Global Trade Bank Ltd', swift: 'GTBKSGSGXXX' },
  applicant: { name: 'Apex Builders Pte Ltd', address: '10 Marina Boulevard, Singapore 018983' },
  beneficiary: { name: 'Maritime Authority of Singapore', address: '456 Alexandra Road, Singapore 119962' },
  underlyingContract: 'Tender Ref: MAS-2026-004',
  currency: 'SGD',
  amount: 500000,
  expiryDate: '2027-06-30',
  placeOfPresentation: 'Singapore Counter, 12 Marina Blvd',
  governingRules: 'URDG758',
};

describe('GuaranteePreview', () => {
  it('renders the document title', () => {
    render(<GuaranteePreview subject={subject} />);
    expect(screen.getByText("BANKER'S GUARANTEE")).toBeInTheDocument();
  });

  it('renders the beneficiary name', () => {
    render(<GuaranteePreview subject={subject} />);
    expect(screen.getByText(/Maritime Authority of Singapore/)).toBeInTheDocument();
  });

  it('renders the issuing bank name in clause 1', () => {
    render(<GuaranteePreview subject={subject} />);
    expect(screen.getByText(/Global Trade Bank Ltd/)).toBeInTheDocument();
  });

  it('renders the amount and currency in clause 2', () => {
    render(<GuaranteePreview subject={subject} />);
    expect(screen.getByText(/SGD 500000/)).toBeInTheDocument();
  });

  it('renders URDG reference in clause 3', () => {
    render(<GuaranteePreview subject={subject} />);
    expect(screen.getByText(/URDG.*758/i)).toBeInTheDocument();
  });

  it('renders expiry date in clause 4', () => {
    render(<GuaranteePreview subject={subject} />);
    expect(screen.getByText(/2027-06-30/)).toBeInTheDocument();
  });

  it('renders the guarantee number', () => {
    render(<GuaranteePreview subject={subject} />);
    expect(screen.getByText(/BG-2026-88910/)).toBeInTheDocument();
  });
});
