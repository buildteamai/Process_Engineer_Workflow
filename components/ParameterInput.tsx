import React, { useMemo } from 'react';

interface ParameterInputProps {
  label: string;
  unit: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  dataType?: 'baseline' | 'current';
  type?: 'number' | 'text' | 'date' | 'time';
  readOnly?: boolean;
  baselineValue?: string;
  hasError?: boolean;
}

const ParameterInput = ({ label, unit, value, onChange, dataType, type = 'number', readOnly = false, baselineValue, hasError = false }: ParameterInputProps): React.ReactNode => {
  const bgClass = dataType === 'current' ? 'bg-emerald-50 focus:bg-emerald-100' : 'bg-background';

  const { status, deviationText } = useMemo(() => {
    if (dataType !== 'current' || readOnly || !baselineValue || type !== 'number' || hasError || !value) {
        return { status: 'none', deviationText: '' };
    }

    const current = parseFloat(value);
    const baseline = parseFloat(baselineValue);

    if (isNaN(current) || isNaN(baseline)) {
        return { status: 'none', deviationText: '' };
    }

    if (baseline === 0) {
        const text = 'Deviation from zero baseline';
        return { status: current === 0 ? 'in-compliance' : 'warning', deviationText: current === 0 ? '' : text };
    }

    const deviationPercent = ((current - baseline) / baseline) * 100;
    const deviationText = `${deviationPercent > 0 ? '+' : ''}${deviationPercent.toFixed(1)}% vs baseline`;

    if (Math.abs(deviationPercent) > 10) {
        return { status: 'critical', deviationText };
    }
    if (Math.abs(deviationPercent) > 5) {
        return { status: 'warning', deviationText };
    }

    return { status: 'in-compliance', deviationText };
  }, [value, baselineValue, dataType, readOnly, type, hasError]);

  const borderClass = useMemo(() => {
    if (hasError) return 'border-danger focus:border-danger focus:ring-danger/50';
    
    switch(status) {
        case 'critical':
            return 'border-danger focus:border-danger focus:ring-danger/50';
        case 'warning':
            return 'border-warning focus:border-warning focus:ring-warning/50';
        case 'in-compliance':
            return 'border-success focus:border-success focus:ring-success/50';
        default: // 'none'
            return 'border-border focus:border-interactive focus:ring-interactive/50';
    }
  }, [status, hasError]);

  const titleText = hasError ? "Invalid value based on other parameters." : deviationText;

  return (
    <div>
      <label className="block text-sm font-medium text-text-secondary mb-1">{label}</label>
      <div className="flex items-center">
        <input
          type={type}
          value={value}
          onChange={onChange}
          readOnly={readOnly}
          placeholder="User Input"
          title={titleText}
          className={`w-full border-2 text-text-primary rounded-md p-2 focus:ring-2 placeholder:italic placeholder:text-slate-400 transition-colors ${borderClass} ${readOnly ? 'bg-slate-100 text-text-secondary cursor-not-allowed' : bgClass}`}
        />
        {unit && <span className="ml-2 text-text-secondary">{unit}</span>}
      </div>
    </div>
  );
};

export default ParameterInput;