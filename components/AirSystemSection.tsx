import React, { useState, useEffect, useCallback } from 'react';
import type { DuctworkData, AirSystemData, FanMotorData } from '../types';
import ParameterInput from './ParameterInput';
import FanMotorSection from './FanMotorSection';

interface AirSystemSectionProps {
  title: string;
  data: DuctworkData | AirSystemData;
  onChange: (field: keyof AirSystemData, value: string) => void;
  dataType: 'baseline' | 'current';
  baselineData?: DuctworkData | AirSystemData;
}

type LastEdited = 'airflow' | 'velocity' | 'duct';

const AirSystemSection = ({ title, data, onChange, dataType, baselineData }: AirSystemSectionProps): React.ReactNode => {
    const [isMainOpen, setIsMainOpen] = useState(false);
    const [lastEditedBy, setLastEditedBy] = useState<LastEdited | null>(null);
    
    const memoizedOnChange = useCallback(onChange, []);
    
    useEffect(() => {
        if (dataType !== 'current' || !lastEditedBy) return;

        const L = parseFloat(data.ductLength.value);
        const W = parseFloat(data.ductWidth.value);
        const airflow = parseFloat(data.airflow.value);
        const velocity = parseFloat(data.velocity.value);
        
        if (isNaN(L) || isNaN(W) || L <= 0 || W <= 0) return;

        const area = (L * W) / 144;
        
        if (lastEditedBy === 'velocity' && !isNaN(velocity)) {
            const newAirflow = (velocity * area).toFixed(0);
            if (newAirflow !== data.airflow.value) {
                memoizedOnChange('airflow', newAirflow);
            }
        } 
        else if ((lastEditedBy === 'airflow' || lastEditedBy === 'duct') && !isNaN(airflow)) {
            const calculatedVelocity = airflow / area;
            if (isFinite(calculatedVelocity)) {
                const newVelocity = calculatedVelocity.toFixed(0);
                if (newVelocity !== data.velocity.value) {
                    memoizedOnChange('velocity', newVelocity);
                }
            }
        }
    }, [data.airflow.value, data.velocity.value, data.ductLength.value, data.ductWidth.value, lastEditedBy, dataType, memoizedOnChange, data]);


    const handleChange = (field: keyof AirSystemData, value: string) => {
        if (field === 'airflow') setLastEditedBy('airflow');
        else if (field === 'velocity') setLastEditedBy('velocity');
        else if (field === 'ductLength' || field === 'ductWidth') setLastEditedBy('duct');
        
        onChange(field, value);
    };

    const hasFanMotor = 'hz' in data;

    return (
        <div className="col-span-full mt-2">
            <button 
                onClick={() => setIsMainOpen(!isMainOpen)} 
                className="w-full flex justify-between items-center font-medium text-text-secondary border-b border-border pb-1 text-left"
                aria-expanded={isMainOpen}
            >
                <span>{title}</span>
                <span className={`transform transition-transform duration-200 ${isMainOpen ? 'rotate-180' : ''}`}>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                </span>
            </button>
            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isMainOpen ? 'max-h-[2000px] pt-4' : 'max-h-0'}`}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <ParameterInput label="Airflow" unit="CFM" value={data.airflow.value} onChange={(e) => handleChange('airflow', e.target.value)} dataType={dataType} baselineValue={baselineData?.airflow.value} />
                    <ParameterInput label="Velocity" unit="FPM" value={data.velocity.value} onChange={(e) => handleChange('velocity', e.target.value)} dataType={dataType} baselineValue={baselineData?.velocity.value} />
                    <ParameterInput label="Duct Length" unit="in" value={data.ductLength.value} onChange={(e) => handleChange('ductLength', e.target.value)} dataType={dataType} readOnly={dataType === 'current'} baselineValue={baselineData?.ductLength.value} />
                    <ParameterInput label="Duct Width" unit="in" value={data.ductWidth.value} onChange={(e) => handleChange('ductWidth', e.target.value)} dataType={dataType} readOnly={dataType === 'current'} baselineValue={baselineData?.ductWidth.value} />
                    {data.staticPressure !== undefined && <ParameterInput label="Static Pressure" unit="in WC" value={data.staticPressure.value} onChange={(e) => handleChange('staticPressure', e.target.value)} dataType={dataType} baselineValue={baselineData?.staticPressure?.value} />}
                    {hasFanMotor && (
                        <FanMotorSection
                            title="Fan Motor Details"
                            data={data as FanMotorData}
                            onChange={(field, value) => handleChange(field, value)}
                            dataType={dataType}
                            baselineData={baselineData as FanMotorData | undefined}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default AirSystemSection;