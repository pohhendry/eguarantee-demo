import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ExcelUpload from './ExcelUpload';
import * as parseExcelModule from '../excel/parseExcel';
import * as mapToSchemaModule from '../excel/mapToSchema';

const VALID_DATA = {
  guaranteeNumber: 'BG-TEST-001',
  issuanceDate: '2026-07-07',
  agreementDate: '2026-06-01',
  effectiveDate: '2026-07-07',
  expiryDate: '2027-07-06',
  applicant: { name: 'York Construction Pte. Ltd.', address: '100 York Road, Singapore 123456' },
  beneficiary: { name: 'Ministry of Development', address: '5 Maxwell Road, Singapore 069110' },
  bank: { name: 'United Overseas Bank Limited', registrationNumber: '193500026Z', address: '80 Raffles Place, UOB Plaza, Singapore 048624' },
  contractNature: 'construction of a residential complex',
  guaranteedSum: { currency: 'SGD', figures: 750000, words: 'Seven Hundred and Fifty Thousand Dollars only' },
  signatory: { name: 'Tan Wei Liang', title: 'Vice President, Trade Finance' },
};

function makeXlsxFile(name = 'test.xlsx'): File {
  return new File(['dummy'], name, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

describe('ExcelUpload', () => {
  const onSubmit = vi.fn();
  const onValidChange = vi.fn();

  beforeEach(() => {
    vi.restoreAllMocks();
    onSubmit.mockClear();
    onValidChange.mockClear();
  });

  it('renders template download link and drop zone', () => {
    render(<ExcelUpload onSubmit={onSubmit} onValidChange={onValidChange} isSubmitting={false} />);
    expect(screen.getByText(/download excel template/i)).toBeInTheDocument();
    expect(screen.getByText(/drag.*drop/i)).toBeInTheDocument();
  });

  it('shows error when a non-.xlsx file is uploaded', async () => {
    render(<ExcelUpload onSubmit={onSubmit} onValidChange={onValidChange} isSubmitting={false} />);
    const input = document.getElementById('excel-input') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['x'], 'data.csv', { type: 'text/csv' })] } });
    await waitFor(() => expect(screen.getByText(/must be a .xlsx/i)).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /generate/i })).not.toBeInTheDocument();
  });

  it('shows error when file exceeds 1 MB', async () => {
    render(<ExcelUpload onSubmit={onSubmit} onValidChange={onValidChange} isSubmitting={false} />);
    const big = new File([new ArrayBuffer(1_100_000)], 'big.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const input = document.getElementById('excel-input') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [big] } });
    await waitFor(() => expect(screen.getByText(/under 1 mb/i)).toBeInTheDocument());
  });

  it('shows zod errors when parsed data is invalid', async () => {
    vi.spyOn(parseExcelModule, 'parseExcel').mockResolvedValue({} as never);
    vi.spyOn(mapToSchemaModule, 'mapToSchema').mockReturnValue({
      ...VALID_DATA,
      guaranteeNumber: '',  // triggers zod error
    });
    render(<ExcelUpload onSubmit={onSubmit} onValidChange={onValidChange} isSubmitting={false} />);
    const input = document.getElementById('excel-input') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeXlsxFile()] } });
    await waitFor(() => expect(screen.getByText(/guaranteeNumber/i)).toBeInTheDocument());
  });

  it('shows proceed button and calls onValidChange when file is valid', async () => {
    vi.spyOn(parseExcelModule, 'parseExcel').mockResolvedValue({} as never);
    vi.spyOn(mapToSchemaModule, 'mapToSchema').mockReturnValue(VALID_DATA);
    render(<ExcelUpload onSubmit={onSubmit} onValidChange={onValidChange} isSubmitting={false} />);
    const input = document.getElementById('excel-input') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeXlsxFile()] } });
    await waitFor(() => expect(screen.getByRole('button', { name: /generate & sign/i })).toBeInTheDocument());
    expect(onValidChange).toHaveBeenCalledWith(true, VALID_DATA);
  });

  it('calls onSubmit when proceed button is clicked', async () => {
    vi.spyOn(parseExcelModule, 'parseExcel').mockResolvedValue({} as never);
    vi.spyOn(mapToSchemaModule, 'mapToSchema').mockReturnValue(VALID_DATA);
    render(<ExcelUpload onSubmit={onSubmit} onValidChange={onValidChange} isSubmitting={false} />);
    const input = document.getElementById('excel-input') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeXlsxFile()] } });
    const btn = await screen.findByRole('button', { name: /generate & sign/i });
    fireEvent.click(btn);
    expect(onSubmit).toHaveBeenCalledWith(VALID_DATA);
  });

  it('disables proceed button while submitting', async () => {
    vi.spyOn(parseExcelModule, 'parseExcel').mockResolvedValue({} as never);
    vi.spyOn(mapToSchemaModule, 'mapToSchema').mockReturnValue(VALID_DATA);
    render(<ExcelUpload onSubmit={onSubmit} onValidChange={onValidChange} isSubmitting={true} />);
    const input = document.getElementById('excel-input') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeXlsxFile()] } });
    const btn = await screen.findByRole('button', { name: /signing/i });
    expect(btn).toBeDisabled();
  });
});
