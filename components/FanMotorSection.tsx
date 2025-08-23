import React, { useState } from 'react';
import type { FanMotorData } from '../types';
import ParameterInput from './ParameterInput';

interface FanMotorSectionProps {
  title: string;
  data: FanMotorData;
  onChange: (field: keyof FanMotorData, value: string) => void;
  dataType: 'baseline' | 'current';
  baselineData?: FanMotorData;
}

const FanMotorSection = ({ title, data, onChange, dataType, baselineData }: FanMotorSectionProps): React.ReactNode => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="col-span-full mt-2">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center text-sm font-medium text-text-secondary border-b border-border pb-1 text-left"
                aria-expanded={isOpen}
            >
                <span>{title}</span>
                <span className={`transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                </span>
            </button>
            <div className={`transition-all duration-300 ease-in-out overflow-hidden grid grid-cols-1 sm:grid-cols-2 gap-4 ${isOpen ? 'max-h-[1000px] pt-4' : 'max-h-0'}`}>
                {data.hz !== undefined && <ParameterInput label="Frequency" unit="Hz" value={data.hz.value} onChange={(e) => onChange('hz', e.target.value)} dataType={dataType} baselineValue={baselineData?.hz?.value} />}
                {data.hp !== undefined && <ParameterInput label="Horsepower" unit="HP" value={data.hp.value} onChange={(e) => onChange('hp', e.target.value)} dataType={dataType} baselineValue={baselineData?.hp?.value} />}
                {data.fla !== undefined && <ParameterInput label="Full Load Amps" unit="A" value={data.fla.value} onChange={(e) => onChange('fla', e.target.value)} dataType={dataType} baselineValue={baselineData?.fla?.value} />}
                {data.rpm !== undefined && <ParameterInput label="Speed" unit="RPM" value={data.rpm.value} onChange={(e) => onChange('rpm', e.target.value)} dataType={dataType} baselineValue={baselineData?.rpm?.value} />}
            </div>
        </div>
    );
}

export default FanMotorSection;
