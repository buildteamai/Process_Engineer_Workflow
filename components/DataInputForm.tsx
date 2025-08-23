
import React, { useState, useRef, useEffect } from 'react';
import type { ProcessData, ZoneData, Zone, AirSystemData, CustomerInfo, SubSystem, DuctworkData } from '../types';
import { NEW_ZONE_TEMPLATE, BLANK_PROCESS_DATA } from '../constants';
import ParameterInput from './ParameterInput';
import ConfirmationModal from './ConfirmationModal';
import AirSystemSection from './AirSystemSection';
import FanMotorSection from './FanMotorSection';

interface DataInputFormProps {
  baselineData: ProcessData;
  setBaselineData: React.Dispatch<React.SetStateAction<ProcessData>>;
  historicalData: ProcessData[];
  setHistoricalData: React.Dispatch<React.SetStateAction<ProcessData[]>>;
  activeReadingIndex: number;
  setActiveReadingIndex: React.Dispatch<React.SetStateAction<number>>;
  onAnalyze: () => void;
  isLoading: boolean;
  highlightedZoneId: string | null;
  setHighlightedZoneId: (id: string | null) => void;
  activeTab: DataType;
  setActiveTab: React.Dispatch<React.SetStateAction<DataType>>;
}

type DataType = 'baseline' | 'current';

const SubSystemSection = ({ subSystem, baselineSubSystem, onNameChange, onRemove, onDataChange, dataType, isEditable }: {
    subSystem: SubSystem;
    baselineSubSystem?: SubSystem;
    onNameChange: (value: string) => void;
    onRemove: () => void;
    onDataChange: (path: string, value: string) => void;
    dataType: DataType;
    isEditable: boolean;
}) => {
    const [isOpen, setIsOpen] = useState(true);

    const getBaselineData = (path: string) => {
        if (!baselineSubSystem) return undefined;
        // Simple property access for now, can be expanded if paths get more complex
        const keys = path.split('.');
        let current: any = baselineSubSystem.data;
        for (const key of keys) {
            if (current === undefined) return undefined;
            current = current[key];
        }
        return current?.value;
    };
    
    const isCwTempInvalid = React.useMemo(() => {
        if (dataType !== 'current' || subSystem.type !== 'Cooler') return false;
        const tempIn = parseFloat(subSystem.data.chilledWaterCoil.tempIn.value);
        const tempOut = parseFloat(subSystem.data.chilledWaterCoil.tempOut.value);
        return !isNaN(tempIn) && !isNaN(tempOut) && tempOut > tempIn;
    }, [dataType, subSystem]);

    const renderSubSystemData = () => {
        switch(subSystem.type) {
            case 'HeaterBox':
                return (
                    <>
                        <ParameterInput label="Burner Rating" unit="MM BTU/Hr" value={subSystem.data.burnerRating.value} onChange={(e) => onDataChange('burnerRating', e.target.value)} dataType={dataType} baselineValue={getBaselineData('burnerRating')} />
                        {subSystem.data.combustionFan && (
                             <FanMotorSection
                                title="Combustion Fan Motor"
                                data={subSystem.data.combustionFan}
                                onChange={(field, value) => onDataChange(`combustionFan.${field}`, value)}
                                dataType={dataType}
                                baselineData={ (baselineSubSystem?.type === 'HeaterBox') ? baselineSubSystem.data.combustionFan : undefined}
                             />
                        )}
                        {subSystem.data.circulationFan && (
                            <FanMotorSection
                               title="Circulation Fan Motor"
                               data={subSystem.data.circulationFan}
                               onChange={(field, value) => onDataChange(`circulationFan.${field}`, value)}
                               dataType={dataType}
                               baselineData={ (baselineSubSystem?.type === 'HeaterBox') ? baselineSubSystem.data.circulationFan : undefined}
                            />
                       )}
                    </>
                );
            case 'Cooler':
                return (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <ParameterInput label="CW Temp In" unit="°F" value={subSystem.data.chilledWaterCoil.tempIn.value} onChange={(e) => onDataChange('chilledWaterCoil.tempIn', e.target.value)} dataType={dataType} baselineValue={getBaselineData('chilledWaterCoil.tempIn')} hasError={isCwTempInvalid} />
                            <ParameterInput label="CW Pressure In" unit="PSI" value={subSystem.data.chilledWaterCoil.pressureIn.value} onChange={(e) => onDataChange('chilledWaterCoil.pressureIn', e.target.value)} dataType={dataType} baselineValue={getBaselineData('chilledWaterCoil.pressureIn')} />
                            <ParameterInput label="CW Temp Out" unit="°F" value={subSystem.data.chilledWaterCoil.tempOut.value} onChange={(e) => onDataChange('chilledWaterCoil.tempOut', e.target.value)} dataType={dataType} baselineValue={getBaselineData('chilledWaterCoil.tempOut')} hasError={isCwTempInvalid} />
                            <ParameterInput label="CW Pressure Out" unit="PSI" value={subSystem.data.chilledWaterCoil.pressureOut.value} onChange={(e) => onDataChange('chilledWaterCoil.pressureOut', e.target.value)} dataType={dataType} baselineValue={getBaselineData('chilledWaterCoil.pressureOut')} />
                        </div>
                         {subSystem.data.fanMotor && (
                             <FanMotorSection
                                title="Circulation Fan Motor"
                                data={subSystem.data.fanMotor}
                                onChange={(field, value) => onDataChange(`fanMotor.${field}`, value)}
                                dataType={dataType}
                                baselineData={ (baselineSubSystem?.type === 'Cooler') ? baselineSubSystem.data.fanMotor : undefined}
                             />
                        )}
                    </>
                );
            case 'AirSupplyHouse':
                return <AirSystemSection title="Air System Details" data={subSystem.data.airSystem} onChange={(field, value) => onDataChange(`airSystem.${field}`, value)} dataType={dataType} baselineData={ (baselineSubSystem?.type === 'AirSupplyHouse') ? baselineSubSystem.data.airSystem : undefined } />;
            default:
                return null;
        }
    }
    
    return (
        <div className="border border-interactive/50 rounded-lg mt-3 bg-blue-50/30 overflow-hidden">
            <div className="p-3 flex justify-between items-center cursor-pointer hover:bg-blue-100/50" onClick={() => setIsOpen(!isOpen)}>
                <div className="flex items-center gap-2">
                    <span className="text-lg">{subSystem.type === 'HeaterBox' ? '🔥' : subSystem.type === 'Cooler' ? '❄️' : '💨'}</span>
                    <input 
                        type="text"
                        value={subSystem.name}
                        onChange={(e) => onNameChange(e.target.value)}
                        readOnly={!isEditable}
                        onClick={(e) => e.stopPropagation()}
                        className={`font-semibold bg-transparent border-0 text-interactive p-1 rounded-md focus:ring-1 focus:ring-interactive ${isEditable ? 'hover:bg-white/50' : 'cursor-not-allowed'}`}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={(e) => { e.stopPropagation(); onRemove(); }} disabled={!isEditable} className="text-lg font-bold text-danger hover:text-red-700 disabled:text-slate-400">&times;</button>
                    <span className={`transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                         <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="text-text-secondary"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                    </span>
                </div>
            </div>
             <div className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[2000px]' : 'max-h-0'}`}>
                <div className="p-4 pt-2 border-t border-interactive/20">
                    {renderSubSystemData()}
                </div>
            </div>
        </div>
    );
}

const ZoneSection = ({ zone, baselineZone, conveyorSpeed, handleChange, handleNameChange, handleDesignChange, handleRemove, handleSubSystemAction, isEditable, dataType, highlightedZoneId }: {
    zone: Zone;
    baselineZone: Zone;
    conveyorSpeed: string;
    handleChange: (path: string, value: string) => void;
    handleNameChange: (value: string) => void;
    handleDesignChange: (value: string) => void;
    handleRemove: () => void;
    handleSubSystemAction: (action: 'add' | 'remove' | 'change' | 'name_change', payload: any) => void;
    isEditable: boolean;
    dataType: DataType;
    highlightedZoneId: string | null;
}): React.ReactNode => {
    const data = zone.data;
    const [isZoneOpen, setIsZoneOpen] = useState(true);
    const [isOtherParamsOpen, setIsOtherParamsOpen] = useState(false);
    const [showAddSubSystem, setShowAddSubSystem] = useState(false);

    const availableSubSystems = [
        { type: 'HeaterBox', label: 'Heater Box', designs: ['Heated'] },
        { type: 'Cooler', label: 'Cooler', designs: ['Cooled'] },
        { type: 'AirSupplyHouse', label: 'Air Supply House', designs: ['Booth', 'Heated', 'Cooled', 'Ambient'] },
    ].filter(s => s.designs.includes(data.design));

    const handleRemoveClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        handleRemove();
    }
    
    const processTime = React.useMemo(() => {
        const length = parseFloat(zone.data.zoneLength.value);
        const speed = parseFloat(conveyorSpeed);
        if (!isNaN(length) && !isNaN(speed) && speed > 0) {
            return (length / speed).toFixed(2);
        }
        return '---';
    }, [zone.data.zoneLength.value, conveyorSpeed]);
    
    useEffect(() => {
        if (highlightedZoneId === zone.id) setIsZoneOpen(true);
    }, [highlightedZoneId, zone.id]);

    return (
        <div className="border border-border rounded-lg mt-4 bg-slate-50/50 overflow-hidden">
            <div className="p-4 flex justify-between items-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => setIsZoneOpen(!isZoneOpen)} role="button" aria-expanded={isZoneOpen} aria-controls={`zone-content-${zone.id}`}>
                <h4 className="font-semibold text-heading truncate pr-2" title={zone.name}>{zone.name}</h4>
                <div className="flex items-center gap-2">
                    <button onClick={handleRemoveClick} disabled={!isEditable} className="text-xl font-bold leading-none text-danger hover:text-red-700 disabled:text-slate-400 disabled:cursor-not-allowed" aria-label="Remove Stage" title={isEditable ? 'Remove Stage' : 'Process stages can only be removed from the Baseline Design Data tab.'}>&times;</button>
                    <span className={`transform transition-transform duration-200 ${isZoneOpen ? 'rotate-180' : ''}`}>
                        <svg width="24" height="24" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="text-text-secondary"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                    </span>
                </div>
            </div>

            <div id={`zone-content-${zone.id}`} className={`transition-all duration-500 ease-in-out ${isZoneOpen ? 'max-h-[4000px]' : 'max-h-0'}`}>
                <div className="p-4 pt-2 border-t border-border">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                         <div className="col-span-full"><label className="block text-sm font-medium text-text-secondary mb-1">Stage Name</label><input type="text" value={zone.name} onChange={(e) => handleNameChange(e.target.value)} readOnly={!isEditable} className={`w-full bg-background border border-border text-heading font-semibold rounded-md p-2 focus:ring-interactive focus:border-interactive ${!isEditable ? 'bg-slate-100 cursor-not-allowed text-text-secondary' : ''}`} /></div>
                        <div className="col-span-full"><label className="block text-sm font-medium text-text-secondary mb-1">Design Category</label><select value={data.design} onChange={(e) => handleDesignChange(e.target.value)} disabled={!isEditable} className={`w-full bg-background border border-border text-text-primary rounded-md p-2 focus:ring-interactive focus:border-interactive ${!isEditable ? 'bg-slate-100 cursor-not-allowed' : ''}`}><option value="Booth">Booth</option><option value="Heated">Heated</option><option value="Cooled">Cooled</option><option value="Ambient">Ambient</option></select></div>
                        <div className="col-span-full"><label htmlFor={`purpose-${zone.id}`} className="block text-sm font-medium text-text-secondary mb-1">Stage Purpose</label><textarea id={`purpose-${zone.id}`} value={data.purpose?.value || ''} onChange={(e) => handleChange('purpose', e.target.value)} readOnly={!isEditable} rows={4} placeholder="e.g., Initial dehydration of waterborne primer..." className={`w-full border border-border text-text-primary rounded-md p-2 focus:ring-interactive focus:border-interactive placeholder:italic placeholder:text-slate-400 ${!isEditable ? 'bg-slate-100 cursor-not-allowed' : 'bg-background'}`} /></div>
                        <div className="col-span-full grid grid-cols-1 sm:grid-cols-4 gap-4">
                           <ParameterInput label="Zone Length" unit="ft" value={data.zoneLength.value} onChange={(e) => handleChange('zoneLength', e.target.value)} dataType={dataType} readOnly={dataType === 'current'} baselineValue={baselineZone.data.zoneLength.value} />
                           <ParameterInput label="Internal Width" unit="ft" value={data.internalWidth.value} onChange={(e) => handleChange('internalWidth', e.target.value)} dataType={dataType} readOnly={dataType === 'current'} baselineValue={baselineZone.data.internalWidth.value} />
                           <ParameterInput label="Internal Height" unit="ft" value={data.internalHeight.value} onChange={(e) => handleChange('internalHeight', e.target.value)} dataType={dataType} readOnly={dataType === 'current'} baselineValue={baselineZone.data.internalHeight.value} />
                           <div><label className="block text-sm font-medium text-text-secondary mb-1">Process Time</label><div className="flex items-center"><input type="text" value={processTime} readOnly className="w-full border-2 text-text-secondary bg-slate-100 cursor-not-allowed rounded-md p-2 focus:ring-2 border-border" title="Calculated from Zone Length and Conveyor Speed" /><span className="ml-2 text-text-secondary">min</span></div></div>
                        </div>
                        <ParameterInput label="Temperature" unit="°F" value={data.temperature.value} onChange={(e) => handleChange('temperature', e.target.value)} dataType={dataType} baselineValue={baselineZone.data.temperature.value} />
                        <ParameterInput label="Rel. Humidity" unit="%" value={data.relativeHumidity.value} onChange={(e) => handleChange('relativeHumidity', e.target.value)} dataType={dataType} baselineValue={baselineZone.data.relativeHumidity.value} />
                        <AirSystemSection title="Supply Duct" data={data.supply} onChange={(field, value) => handleChange(`supply.${field}`, value)} dataType={dataType} baselineData={baselineZone.data.supply} />
                        <AirSystemSection title="Exhaust Duct" data={data.exhaust} onChange={(field, value) => handleChange(`exhaust.${field}`, value)} dataType={dataType} baselineData={baselineZone.data.exhaust} />
                        
                        <div className="col-span-full mt-2">
                             <button onClick={() => setIsOtherParamsOpen(!isOtherParamsOpen)} className="w-full flex justify-between items-center font-medium text-text-secondary border-b border-border pb-1 text-left" aria-expanded={isOtherParamsOpen}><span>Other Parameters</span><span className={`transform transition-transform duration-200 ${isOtherParamsOpen ? 'rotate-180' : ''}`}><svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg></span></button>
                            <div className={`transition-all duration-300 ease-in-out overflow-hidden grid grid-cols-1 sm:grid-cols-2 gap-4 ${isOtherParamsOpen ? 'max-h-[1000px] pt-4' : 'max-h-0'}`}>
                                {data.design !== 'Ambient' && data.infiltration !== undefined && (<><ParameterInput label="Infiltration Vol." unit="CFM" value={data.infiltration.volume.value} onChange={(e) => handleChange('infiltration.volume', e.target.value)} dataType={dataType} baselineValue={baselineZone.data.infiltration?.volume.value}/><ParameterInput label="Infiltration Size" unit="sq ft" value={data.infiltration.silhouetteSize.value} onChange={(e) => handleChange('infiltration.silhouetteSize', e.target.value)} dataType={dataType} baselineValue={baselineZone.data.infiltration?.silhouetteSize.value}/></>)}
                                {data.design !== 'Ambient' && data.exfiltration !== undefined && (<><ParameterInput label="Exfiltration Vol." unit="CFM" value={data.exfiltration.volume.value} onChange={(e) => handleChange('exfiltration.volume', e.target.value)} dataType={dataType} baselineValue={baselineZone.data.exfiltration?.volume.value} /><ParameterInput label="Exfiltration Size" unit="sq ft" value={data.exfiltration.silhouetteSize.value} onChange={(e) => handleChange('exfiltration.silhouetteSize', e.target.value)} dataType={dataType} baselineValue={baselineZone.data.exfiltration?.silhouetteSize.value} /></>)}
                            </div>
                        </div>

                         <div className="col-span-full mt-2">
                            <h5 className="font-semibold text-text-secondary border-b border-border pb-1">Sub-Systems</h5>
                            {zone.subSystems.map(ss => (
                                <SubSystemSection 
                                    key={ss.id} 
                                    subSystem={ss}
                                    baselineSubSystem={baselineZone.subSystems.find(bss => bss.id === ss.id)}
                                    onRemove={() => handleSubSystemAction('remove', { subSystemId: ss.id })}
                                    onDataChange={(path, value) => handleSubSystemAction('change', { subSystemId: ss.id, path, value })}
                                    onNameChange={(value) => handleSubSystemAction('name_change', { subSystemId: ss.id, value })}
                                    dataType={dataType}
                                    isEditable={isEditable}
                                />
                            ))}
                            {isEditable && availableSubSystems.length > 0 && (
                                <div className="relative mt-2">
                                    <button onClick={() => setShowAddSubSystem(!showAddSubSystem)} className="w-full text-sm bg-slate-200 text-text-primary font-semibold py-2 px-4 rounded-lg hover:bg-slate-300 transition duration-300">+ Add Sub-System</button>
                                    {showAddSubSystem && (
                                        <div className="absolute z-10 mt-1 w-full bg-panel border border-border rounded-md shadow-lg">
                                            {availableSubSystems.map(s => (
                                                <button key={s.type} onClick={() => { handleSubSystemAction('add', { type: s.type, name: s.label }); setShowAddSubSystem(false); }} className="block w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-slate-100">{s.label}</button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        
                        <div className="col-span-full mt-2"><label htmlFor={`notes-${zone.id}`} className="block text-sm font-medium text-text-secondary mb-1">Notes</label><textarea id={`notes-${zone.id}`} value={data.notes?.value || ''} onChange={(e) => handleChange('notes', e.target.value)} rows={3} placeholder="Add any relevant design notes or current observations..." className={`w-full border border-border text-text-primary rounded-md p-2 focus:ring-interactive focus:border-interactive placeholder:italic placeholder:text-slate-400`} /></div>
                    </div>
                </div>
            </div>
        </div>
    )
}


const DataInputForm = ({ baselineData, setBaselineData, historicalData, setHistoricalData, activeReadingIndex, setActiveReadingIndex, onAnalyze, isLoading, highlightedZoneId, setHighlightedZoneId, activeTab, setActiveTab }: DataInputFormProps): React.ReactNode => {
  const [zoneToDelete, setZoneToDelete] = useState<Zone | null>(null);
  const zoneRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const data = activeTab === 'baseline' ? baselineData : historicalData[activeReadingIndex];
  const bgClass = activeTab === 'current' ? 'bg-emerald-50 focus:bg-emerald-100' : 'bg-background';
  
  useEffect(() => {
    zoneRefs.current = {};
  }, [baselineData.zones]);

  useEffect(() => {
    if (highlightedZoneId && zoneRefs.current[highlightedZoneId]) {
        setTimeout(() => {
            const element = zoneRefs.current[highlightedZoneId];
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                element.classList.add('ring-2', 'ring-interactive', 'ring-offset-2', 'transition-shadow', 'duration-1000', 'rounded-lg');
                setTimeout(() => {
                    element.classList.remove('ring-2', 'ring-interactive', 'ring-offset-2', 'rounded-lg');
                    setHighlightedZoneId(null);
                }, 2000);
            } else { setHighlightedZoneId(null); }
        }, 100);
    }
  }, [highlightedZoneId, setHighlightedZoneId]);

  const updateHistoricalData = (index: number, updatedData: ProcessData) => {
    setHistoricalData(prev => prev.map((item, i) => (i === index ? updatedData : item)));
  };

  const handleConveyorSpeedChange = (value: string) => {
    if (activeTab === 'baseline') {
      setBaselineData(prev => ({ ...prev, conveyorSpeed: { value } }));
    } else {
      const newData = { ...data, conveyorSpeed: { value } };
      updateHistoricalData(activeReadingIndex, newData);
    }
  };
  
  const handleCollectionDateChange = (value: string) => {
    const newData = { ...data, collectionDate: { value } };
    updateHistoricalData(activeReadingIndex, newData);
  };
  
  const handleGeneralFieldChange = (field: keyof Pick<ProcessData, 'timeOfDay' | 'outsideTemperature' | 'outsideRelativeHumidity'>, value: string) => {
    const newData = { ...data, [field]: { value } };
    updateHistoricalData(activeReadingIndex, newData);
  };

  const handleCustomerInfoChange = (field: keyof CustomerInfo, value: string) => {
    const updater = (prev: ProcessData) => ({ ...prev, customerInfo: { ...(prev.customerInfo || { name: { value: '' }, location: { value: '' }, contactPerson: { value: '' } }), [field]: { value } } });
    setBaselineData(updater);
    setHistoricalData(prev => prev.map(item => updater(item)));
  };

  const handleProductSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as 'Car' | 'SUV' | '';
     if (activeTab === 'baseline') {
      setBaselineData(prev => ({ ...prev, productSize: value }));
    } else {
      const newData = { ...data, productSize: value };
      updateHistoricalData(activeReadingIndex, newData);
    }
  }

  const handleZoneChange = (zoneId: string, path: string, value: string) => {
    const updateLogic = (prev: ProcessData) => {
        const newZones = prev.zones.map(zone => {
            if (zone.id !== zoneId) return zone;
            const newZone = JSON.parse(JSON.stringify(zone));
            const keys = path.split('.');
            let currentLevel: any = newZone.data;
            for (let i = 0; i < keys.length - 1; i++) currentLevel = currentLevel[keys[i]];
            currentLevel[keys[keys.length - 1]] = { value };
            return newZone;
        });
        return { ...prev, zones: newZones };
    };

    if (activeTab === 'baseline') {
        setBaselineData(updateLogic);
        const constantFields = ['zoneLength', 'internalWidth', 'internalHeight', 'purpose'];
        if (constantFields.includes(path)) {
            setHistoricalData(prev => prev.map(item => updateLogic(item)));
        }
    } else {
        updateHistoricalData(activeReadingIndex, updateLogic(data));
    }
  };
  
  const handleZoneNameChange = (zoneId: string, newName: string) => {
    const updater = (prev: ProcessData) => ({ ...prev, zones: prev.zones.map(z => z.id === zoneId ? { ...z, name: newName } : z) });
    setBaselineData(updater);
    setHistoricalData(prev => prev.map(item => updater(item)));
  };

  const handleZoneDesignChange = (zoneId: string, newDesign: string) => {
    const designValue = newDesign as ZoneData['design'];
    const updater = (prev: ProcessData) => ({ ...prev, zones: prev.zones.map(z => z.id === zoneId ? { ...z, data: { ...z.data, design: designValue }, subSystems: [] } : z) }); // Reset subsystems on design change
    setBaselineData(updater);
    setHistoricalData(prev => prev.map(item => updater(item)));
  };

  const handleAddZone = () => {
    const newZoneId = crypto.randomUUID();
    const newZoneTemplate = JSON.parse(JSON.stringify(NEW_ZONE_TEMPLATE));
    const newZone: Zone = { id: newZoneId, ...newZoneTemplate };
    const baselineUpdater = (prev: ProcessData) => ({ ...prev, zones: [...prev.zones, newZone] });
    setBaselineData(baselineUpdater);
    setHistoricalData(prev => prev.map(item => baselineUpdater(item)));
  };
  
  const handleRequestRemoveZone = (zone: Zone) => setZoneToDelete(zone);

  const handleConfirmRemoveZone = () => {
    if (!zoneToDelete) return;
    const updater = (prev: ProcessData) => ({ ...prev, zones: prev.zones.filter(z => z.id !== zoneToDelete.id) });
    setBaselineData(updater);
    setHistoricalData(prev => prev.map(item => updater(item)));
    setZoneToDelete(null);
  };

  const handleSubSystemAction = (zoneId: string, action: 'add' | 'remove' | 'change' | 'name_change', payload: any) => {
      const getNewSubSystem = (type: SubSystem['type'], name: string): SubSystem => {
        const base = { id: crypto.randomUUID(), name };
        const fanMotorData = { hz: { value: '' }, hp: { value: '' }, fla: { value: '' }, rpm: { value: '' } };
        switch(type) {
            case 'HeaterBox': return { ...base, type, data: { burnerRating: { value: '' }, combustionFan: { ...fanMotorData }, circulationFan: { ...fanMotorData } } };
            case 'Cooler': return { ...base, type, data: { chilledWaterCoil: { tempIn: { value: '' }, pressureIn: { value: '' }, tempOut: { value: '' }, pressureOut: { value: '' } }, fanMotor: { ...fanMotorData } } };
            case 'AirSupplyHouse': return { ...base, type, data: { airSystem: { airflow: { value: '' }, hz: { value: '' }, hp: { value: '' }, fla: { value: '' }, rpm: { value: '' }, staticPressure: { value: '' }, ductLength: { value: '' }, ductWidth: { value: '' }, velocity: { value: '' } } } };
        }
      };

      const updater = (prev: ProcessData) => {
          return {
              ...prev,
              zones: prev.zones.map(z => {
                  if (z.id !== zoneId) return z;
                  let newSubSystems = [...z.subSystems];
                  switch(action) {
                      case 'add': newSubSystems.push(getNewSubSystem(payload.type, payload.name)); break;
                      case 'remove': newSubSystems = newSubSystems.filter(ss => ss.id !== payload.subSystemId); break;
                      case 'name_change': newSubSystems = newSubSystems.map(ss => ss.id === payload.subSystemId ? { ...ss, name: payload.value } : ss); break;
                      case 'change':
                          newSubSystems = newSubSystems.map(ss => {
                            if (ss.id !== payload.subSystemId) return ss;
                            const newSS = JSON.parse(JSON.stringify(ss));
                            const keys = payload.path.split('.');
                            let currentLevel: any = newSS.data;
                            for (let i = 0; i < keys.length - 1; i++) currentLevel = currentLevel[keys[i]];
                            currentLevel[keys[keys.length - 1]] = { value: payload.value };
                            return newSS;
                          });
                          break;
                  }
                  return { ...z, subSystems: newSubSystems };
              })
          }
      };
      
      if (activeTab === 'baseline') {
          setBaselineData(updater);
          // Sync adds/removes/name changes to historical data
          if (action === 'add' || action === 'remove' || action === 'name_change') {
            setHistoricalData(prev => prev.map(item => updater(item)));
          }
      } else {
        updateHistoricalData(activeReadingIndex, updater(data));
      }
  };

  const handleAddNewReading = () => {
    const lastReading = historicalData.length > 0 ? historicalData[historicalData.length - 1] : BLANK_PROCESS_DATA;
    const newReading = JSON.parse(JSON.stringify(lastReading));
    const now = new Date();
    newReading.collectionDate.value = now.toISOString().split('T')[0];
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    if (!newReading.timeOfDay) newReading.timeOfDay = { value: '' };
    newReading.timeOfDay.value = `${hours}:${minutes}`;
    setHistoricalData(prev => [...prev, newReading]);
    setActiveReadingIndex(historicalData.length);
  };

  const handleDeleteReading = () => {
    if (historicalData.length <= 1) {
      alert("Cannot delete the last reading.");
      return;
    }
    const newHistoricalData = historicalData.filter((_, i) => i !== activeReadingIndex);
    setHistoricalData(newHistoricalData);
    setActiveReadingIndex(Math.max(0, activeReadingIndex - 1));
  };

  if (!data && activeTab === 'current') {
    return ( <div className="bg-panel p-4 rounded-lg shadow-md h-full flex flex-col items-center justify-center"><p className="text-text-secondary mb-4">No data readings available.</p><button onClick={handleAddNewReading} className="bg-interactive text-white font-bold py-2 px-4 rounded-lg hover:bg-interactive-hover">Add First Reading</button></div>);
  }

  return (
    <div className="bg-panel p-4 rounded-lg shadow-md h-full flex flex-col">
      <div className="flex-shrink-0">
        <div className="flex border-b border-border mb-4"><button className={`py-2 px-4 font-semibold ${activeTab === 'current' ? 'text-interactive border-b-2 border-interactive' : 'text-text-secondary'}`} onClick={() => setActiveTab('current')}>Measured Data</button><button className={`py-2 px-4 font-semibold ${activeTab === 'baseline' ? 'text-interactive border-b-2 border-interactive' : 'text-text-secondary'}`} onClick={() => setActiveTab('baseline')}>Baseline Design Data</button></div>
      </div>
      
      {activeTab === 'current' && ( <div className="flex-shrink-0 bg-slate-100 p-3 rounded-lg mb-4 space-y-2"><div><label className="block text-sm font-medium text-text-secondary">Readings Manager</label><div className="flex gap-2 mt-1"><select value={activeReadingIndex} onChange={(e) => setActiveReadingIndex(Number(e.target.value))} className="flex-grow w-full bg-background border border-border rounded-md p-2 focus:ring-interactive focus:border-interactive">{historicalData.map((reading, index) => (<option key={index} value={index}>Reading from: {reading.collectionDate.value || `Reading ${index + 1}`}</option>))}</select><button onClick={handleAddNewReading} className="px-3 py-2 bg-slate-200 text-text-primary font-semibold rounded-md hover:bg-slate-300 text-sm" title="Add New Reading">+</button><button onClick={handleDeleteReading} className="px-3 py-2 bg-slate-200 text-danger font-semibold rounded-md hover:bg-red-200 text-sm" title="Delete Selected Reading">-</button></div></div><div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary pt-2"><div className="flex items-center gap-1.5"><span className="w-3 h-3 border-2 border-success rounded-sm"></span><span>In-Compliance</span></div><div className="flex items-center gap-1.5"><span className="w-3 h-3 border-2 border-warning rounded-sm"></span><span>Warning (&gt;5% dev.)</span></div><div className="flex items-center gap-1.5"><span className="w-3 h-3 border-2 border-danger rounded-sm"></span><span>Critical (&gt;10% dev.)</span></div></div></div>)}

      <div className="flex-shrink-0 border-b border-border pb-4 mb-4 space-y-2">
        <button onClick={onAnalyze} disabled={isLoading || historicalData.length === 0} className="w-full bg-interactive text-white font-bold py-3 px-4 rounded-lg hover:bg-interactive-hover transition duration-300 disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center justify-center">{isLoading ? (<><svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Analyzing...</>) : ('Run Process Analysis')}</button>
         {activeTab === 'baseline' && <button onClick={handleAddZone} className="w-full bg-slate-200 text-text-primary font-bold py-2 px-4 rounded-lg hover:bg-slate-300 transition duration-300 flex items-center justify-center">+ Add Process Stage</button>}
      </div>

      <div className="flex-grow overflow-y-auto pr-2 space-y-6">
        <div><h4 className="col-span-full font-semibold text-heading border-b border-border pb-1">Customer Information</h4><div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4"><div className="sm:col-span-2"><ParameterInput label="Customer Name" unit="" value={data.customerInfo?.name?.value || ''} onChange={(e) => handleCustomerInfoChange('name', e.target.value)} dataType={activeTab} type="text" readOnly={activeTab === 'current'}/></div><ParameterInput label="Location / Site" unit="" value={data.customerInfo?.location?.value || ''} onChange={(e) => handleCustomerInfoChange('location', e.target.value)} dataType={activeTab} type="text" readOnly={activeTab === 'current'}/><ParameterInput label="Contact Person" unit="" value={data.customerInfo?.contactPerson?.value || ''} onChange={(e) => handleCustomerInfoChange('contactPerson', e.target.value)} dataType={activeTab} type="text" readOnly={activeTab === 'current'}/></div></div>
        <div><h4 className="col-span-full font-semibold text-heading border-b border-border pb-1">General Process</h4><div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">{activeTab === 'current' && (<><ParameterInput label="Data Collection Date" unit="" value={data.collectionDate.value} onChange={(e) => handleCollectionDateChange(e.target.value)} dataType="current" type="date"/><ParameterInput label="Time of Day" unit="" value={data.timeOfDay?.value || ''} onChange={(e) => handleGeneralFieldChange('timeOfDay', e.target.value)} dataType="current" type="time"/></>)}<ParameterInput label="Conveyor Speed" unit="ft/min" value={data.conveyorSpeed.value} onChange={(e) => handleConveyorSpeedChange(e.target.value)} dataType={activeTab} baselineValue={baselineData.conveyorSpeed.value} /><div><label className="block text-sm font-medium text-text-secondary mb-1">Product Size</label><select value={data.productSize} onChange={handleProductSizeChange} className={`w-full bg-background border border-border rounded-md p-2 focus:ring-interactive focus:border-interactive ${!data.productSize ? 'text-slate-400 italic' : 'text-text-primary'} ${bgClass}`}><option value="" disabled>Select Size</option><option value="Car">Car</option><option value="SUV">SUV</option></select></div>{activeTab === 'current' && (<><ParameterInput label="Outside Temperature" unit="°F" value={data.outsideTemperature?.value || ''} onChange={(e) => handleGeneralFieldChange('outsideTemperature', e.target.value)} dataType="current" /><ParameterInput label="Outside Rel. Humidity" unit="%" value={data.outsideRelativeHumidity?.value || ''} onChange={(e) => handleGeneralFieldChange('outsideRelativeHumidity', e.target.value)} dataType="current" /></>)}</div></div>
        <div>
            <h4 className="col-span-full font-semibold text-heading mt-4 border-b border-border pb-1">Process Stages</h4>
            {baselineData.zones.map((baselineZone) => {
                const zoneForDisplay = activeTab === 'baseline' ? baselineZone : (data.zones.find(z => z.id === baselineZone.id) || baselineZone);
                return (
                    <div key={baselineZone.id} ref={el => { zoneRefs.current[baselineZone.id] = el; }}>
                        <ZoneSection
                            zone={zoneForDisplay}
                            baselineZone={baselineZone}
                            conveyorSpeed={baselineData.conveyorSpeed.value}
                            handleChange={(path, value) => handleZoneChange(baselineZone.id, path, value)}
                            handleNameChange={(value) => handleZoneNameChange(baselineZone.id, value)}
                            handleDesignChange={(value) => handleZoneDesignChange(baselineZone.id, value)}
                            handleRemove={() => handleRequestRemoveZone(baselineZone)}
                            handleSubSystemAction={(action, payload) => handleSubSystemAction(baselineZone.id, action, payload)}
                            isEditable={activeTab === 'baseline'}
                            dataType={activeTab}
                            highlightedZoneId={highlightedZoneId}
                        />
                    </div>
                );
            })}
        </div>
      </div>
      <ConfirmationModal isOpen={!!zoneToDelete} onClose={() => setZoneToDelete(null)} onConfirm={handleConfirmRemoveZone} title="Delete Process Stage?"><p>Are you sure you want to permanently delete the <strong className="text-text-primary">{zoneToDelete?.name}</strong> stage?</p><p className="mt-2 text-sm">This action cannot be undone and will remove it from all data sets.</p></ConfirmationModal>
    </div>
  );
};

export default DataInputForm;
