import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
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
    reset,
    control,
    formState: { errors, isValid },
  } = useForm<GuaranteeFormData>({
    resolver: zodResolver(guaranteeSchema),
    mode: 'onChange',
  });

  const formValues = useWatch({ control });

  useEffect(() => {
    onValidChange(isValid, formValues as GuaranteeFormData);
  }, [isValid, formValues, onValidChange]);

  function fillSample() {
    reset(sampleInput);
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
          placeholder="BG-UOB-2026-00123"
          error={errors.guaranteeNumber?.message}
          {...register('guaranteeNumber')}
        />
        <div className="grid grid-cols-2 gap-3">
          <DateField label="Date of Issuance" error={errors.issuanceDate?.message} {...register('issuanceDate')} />
          <DateField label="Agreement Date" error={errors.agreementDate?.message} {...register('agreementDate')} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <DateField label="Effective Date" error={errors.effectiveDate?.message} {...register('effectiveDate')} />
          <DateField label="Expiry Date" error={errors.expiryDate?.message} {...register('expiryDate')} />
        </div>
      </div>

      {/* Issuing Bank */}
      <div className={sectionClass}>
        <h3 className={headingClass}>Issuing Bank</h3>
        <InputField
          label="Bank Full Legal Name"
          placeholder="United Overseas Bank Limited"
          error={errors.bank?.name?.message}
          {...register('bank.name')}
        />
        <InputField
          label="Company Registration Number"
          placeholder="193500026Z"
          error={errors.bank?.registrationNumber?.message}
          {...register('bank.registrationNumber')}
        />
        <TextareaField
          label="Registered Address"
          placeholder="80 Raffles Place, UOB Plaza, Singapore 048624"
          error={errors.bank?.address?.message}
          {...register('bank.address')}
        />
      </div>

      {/* Applicant */}
      <div className={sectionClass}>
        <h3 className={headingClass}>Applicant</h3>
        <InputField
          label="Full Legal Name"
          placeholder="Tan Chong Construction Pte Ltd"
          error={errors.applicant?.name?.message}
          {...register('applicant.name')}
        />
        <TextareaField
          label="Registered Address"
          placeholder="10 Tuas South Street 2, Singapore 637542"
          error={errors.applicant?.address?.message}
          {...register('applicant.address')}
        />
      </div>

      {/* Beneficiary */}
      <div className={sectionClass}>
        <h3 className={headingClass}>Beneficiary</h3>
        <InputField
          label="Full Legal Name"
          placeholder="Housing & Development Board"
          error={errors.beneficiary?.name?.message}
          {...register('beneficiary.name')}
        />
        <TextareaField
          label="Registered Address"
          placeholder="HDB Hub, 480 Lorong 6 Toa Payoh, Singapore 310480"
          error={errors.beneficiary?.address?.message}
          {...register('beneficiary.address')}
        />
      </div>

      {/* Contract */}
      <div className={sectionClass}>
        <h3 className={headingClass}>Contract</h3>
        <TextareaField
          label="Nature of Contract"
          placeholder="supply and installation of precast structural components under HDB Tender Ref HDB-CONST-2026-0441"
          error={errors.contractNature?.message}
          {...register('contractNature')}
        />
      </div>

      {/* Guaranteed Sum */}
      <div className={sectionClass}>
        <h3 className={headingClass}>Guaranteed Sum</h3>
        <div className="grid grid-cols-3 gap-3">
          <InputField
            label="Currency"
            placeholder="SGD"
            maxLength={3}
            error={errors.guaranteedSum?.currency?.message}
            {...register('guaranteedSum.currency')}
          />
          <div className="col-span-2">
            <NumberField
              label="Amount (figures)"
              placeholder="750000"
              error={errors.guaranteedSum?.figures?.message}
              {...register('guaranteedSum.figures', { valueAsNumber: true })}
            />
          </div>
        </div>
        <TextareaField
          label="Amount in Words"
          placeholder="Seven Hundred and Fifty Thousand"
          error={errors.guaranteedSum?.words?.message}
          {...register('guaranteedSum.words')}
        />
      </div>

      {/* Signatory */}
      <div className={sectionClass}>
        <h3 className={headingClass}>Signatory</h3>
        <InputField
          label="Name"
          placeholder="Alexandra Teo"
          error={errors.signatory?.name?.message}
          {...register('signatory.name')}
        />
        <InputField
          label="Title"
          placeholder="Vice President, Trade Finance Operations"
          error={errors.signatory?.title?.message}
          {...register('signatory.title')}
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
