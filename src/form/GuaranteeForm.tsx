import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { guaranteeSchema, type GuaranteeFormData } from './schema';
import { sampleInput } from '../sample/sampleInput';
import InputField from './fields/InputField';
import DateField from './fields/DateField';
import NumberField from './fields/NumberField';
import TextareaField from './fields/TextareaField';

interface Props {
  onSubmit: (data: GuaranteeFormData) => void;
  onValidChange: (isValid: boolean, data: GuaranteeFormData) => void;
  isSubmitting: boolean;
}

export default function GuaranteeForm({ onSubmit, onValidChange, isSubmitting }: Props) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid },
  } = useForm<GuaranteeFormData>({
    resolver: zodResolver(guaranteeSchema),
    mode: 'onChange',
  });

  const formValues = watch();

  useEffect(() => {
    onValidChange(isValid, formValues);
  }, [isValid, JSON.stringify(formValues)]);

  function fillSample() {
    (Object.keys(sampleInput) as (keyof GuaranteeFormData)[]).forEach((key) => {
      setValue(key, sampleInput[key] as never, { shouldValidate: true });
    });
  }

  const sectionClass = 'flex flex-col gap-3';
  const headingClass = 'text-xs font-bold uppercase tracking-wide text-indigo-500 mt-4 first:mt-0';

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3 pb-4">
      <button
        type="button"
        onClick={fillSample}
        className="self-start rounded-md border border-indigo-300 px-3 py-1 text-xs text-indigo-600 hover:bg-indigo-50"
      >
        Fill sample data
      </button>

      {/* Guarantee Details */}
      <div className={sectionClass}>
        <h3 className={headingClass}>Guarantee Details</h3>
        <InputField
          label="Guarantee Reference Number"
          placeholder="BG-2026-88910"
          error={errors.bgNumber?.message}
          {...register('bgNumber')}
        />
        <div className="grid grid-cols-2 gap-3">
          <DateField
            label="Date of Issue"
            error={errors.issueDate?.message}
            {...register('issueDate')}
          />
          <DateField
            label="Expiry Date"
            error={errors.expiryDate?.message}
            {...register('expiryDate')}
          />
        </div>
      </div>

      {/* Issuing Bank */}
      <div className={sectionClass}>
        <h3 className={headingClass}>Issuing Bank</h3>
        <InputField
          label="Bank Full Legal Name"
          placeholder="Global Trade Bank Ltd"
          error={errors.issuingBankName?.message}
          {...register('issuingBankName')}
        />
        <InputField
          label="SWIFT / BIC"
          placeholder="GTBKSGSGXXX"
          error={errors.issuingBankSwift?.message}
          {...register('issuingBankSwift')}
        />
      </div>

      {/* Applicant */}
      <div className={sectionClass}>
        <h3 className={headingClass}>Applicant</h3>
        <InputField
          label="Full Legal Name"
          placeholder="Apex Builders Pte Ltd"
          error={errors.applicantName?.message}
          {...register('applicantName')}
        />
        <TextareaField
          label="Registered Address"
          placeholder="10 Marina Boulevard, Singapore 018983"
          error={errors.applicantAddress?.message}
          {...register('applicantAddress')}
        />
      </div>

      {/* Beneficiary */}
      <div className={sectionClass}>
        <h3 className={headingClass}>Beneficiary</h3>
        <InputField
          label="Full Legal Name"
          placeholder="Maritime Authority of Singapore"
          error={errors.beneficiaryName?.message}
          {...register('beneficiaryName')}
        />
        <TextareaField
          label="Registered Address"
          placeholder="456 Alexandra Road, Singapore 119962"
          error={errors.beneficiaryAddress?.message}
          {...register('beneficiaryAddress')}
        />
      </div>

      {/* Financial Terms */}
      <div className={sectionClass}>
        <h3 className={headingClass}>Financial Terms</h3>
        <div className="grid grid-cols-3 gap-3">
          <InputField
            label="Currency"
            placeholder="SGD"
            maxLength={3}
            error={errors.currency?.message}
            {...register('currency')}
          />
          <div className="col-span-2">
            <NumberField
              label="Guarantee Amount"
              placeholder="500000"
              error={errors.amount?.message}
              {...register('amount', { valueAsNumber: true })}
            />
          </div>
        </div>
        <InputField
          label="Underlying Contract / Tender Reference"
          placeholder="Tender Ref: MAS-2026-004"
          error={errors.underlyingContract?.message}
          {...register('underlyingContract')}
        />
        <InputField
          label="Place of Presentation"
          placeholder="Singapore Counter, 12 Marina Blvd"
          error={errors.placeOfPresentation?.message}
          {...register('placeOfPresentation')}
        />
      </div>

      <button
        type="submit"
        disabled={!isValid || isSubmitting}
        className="mt-4 w-full rounded-md bg-indigo-500 py-2.5 text-sm font-semibold text-white hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isSubmitting ? 'Signing…' : 'Sign & Download VC'}
      </button>
    </form>
  );
}
