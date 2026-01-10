import Select from '../../ui/Select';

type EnumOption = {
  value: string;
  label: string;
};

type EnumSelectProps = {
  label: string;
  value: string;
  options: EnumOption[];
  onChange: (value: string) => void;
  required?: boolean;
  helpText?: string;
  invalid?: boolean;
  disabled?: boolean;
};

export default function EnumSelect({
  label,
  value,
  options,
  onChange,
  required = false,
  helpText,
  invalid = false,
  disabled = false,
}: EnumSelectProps) {
  return (
    <div className={`field ${invalid ? 'field--invalid' : ''}`}>
      <label className="field__label">
        <span>{label}</span>
        {required && <span className="field__required">Required</span>}
      </label>
      <div className="field__control">
        <Select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          invalid={invalid}
        >
          <option value="">Select...</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>
      {helpText && <div className="field__notes">{helpText}</div>}
      {invalid && <div className="field__error">This field is required.</div>}
    </div>
  );
}
