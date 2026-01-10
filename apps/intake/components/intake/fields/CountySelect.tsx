import { useEffect, useMemo, useState } from 'react';
import Select from '../../ui/Select';

type CountyOption = {
  value: string;
  label: string;
  slug?: string;
  fips?: string;
  name?: string;
};

type CountySelectProps = {
  value: string;
  onChange: (value: string) => void;
  label: string;
  required?: boolean;
  notes?: string;
  invalid?: boolean;
  disabled?: boolean;
};

export default function CountySelect({
  value,
  onChange,
  label,
  required = false,
  notes,
  invalid = false,
  disabled = false,
}: CountySelectProps) {
  const [options, setOptions] = useState<CountyOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadCounties = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/intake/counties');
        const data = (await response.json()) as { counties?: CountyOption[]; error?: string };
        if (!response.ok) {
          throw new Error(data.error || 'Unable to load counties');
        }
        if (active) {
          setOptions(Array.isArray(data.counties) ? data.counties : []);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Unable to load counties');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadCounties();

    return () => {
      active = false;
    };
  }, []);

  const sortedOptions = useMemo(() => {
    const sorted = [...options].sort((a, b) =>
      a.label.localeCompare(b.label, 'en', { sensitivity: 'base' }),
    );
    if (value && !sorted.some((option) => option.value === value)) {
      sorted.unshift({ value, label: value });
    }
    return sorted;
  }, [options, value]);

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
          disabled={disabled || loading}
          invalid={invalid}
        >
          <option value="">{loading ? 'Loading counties...' : 'Select...'}</option>
          {sortedOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>
      {notes && <div className="field__notes">{notes}</div>}
      {error && <div className="field__notes">{error}</div>}
      {invalid && <div className="field__error">This field is required.</div>}
    </div>
  );
}
