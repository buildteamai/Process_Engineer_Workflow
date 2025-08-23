

import React from 'react';
import type { ProcessData, Zone as ZoneType, SubSystem } from '../types';

interface SchematicDisplayProps {
  currentData: ProcessData | null;
  baselineData: ProcessData;
  onZoneSelect: (zoneId: string) => void;
  displayMode: 'live' | 'baseline';
  setDisplayMode: (mode: 'live' | 'baseline') => void;
}

const getZoneInfo = (zone: ZoneType) => {
    const design = zone.data.design;
    const lowerCaseName = zone.name.toLowerCase();

    if (design === 'Heated') {
        return { 
            bgColor: 'bg-red-50 border-red-200',
            iconColor: 'text-red-500',
            icon: <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4.5c.2-.5.2-1.1.1-1.6a2.4 2.4 0 00-1-1.5c-.8-.5-1.7-.6-2.6-.3-.9.3-1.6 1-2 1.8-.4.8-.6 1.7-.5 2.6.2.9.7 1.7 1.5 2.3.8.6 1.8.8 2.8.6 1-.2 1.9-.8 2.5-1.7.1-.2.2-.4.2-.6a1 1 0 00-1-1.2h-.2c-.3.2-.6.3-1 .4-1.1.2-2.2-.3-2.8-1.2-.6-1-.7-2.2-.3-3.3.4-1.1 1.5-1.8 2.6-1.8.6 0 1.2.2 1.6.6.4.4.6 1 .5 1.6-.2 1-1.2 1.8-2.2 1.8h-1"></path><path d="M4.5 11.5c.2-.5.2-1.1.1-1.6a2.4 2.4 0 00-1-1.5c-.8-.5-1.7-.6-2.6-.3-.9.3-1.6 1-2 1.8-.4.8-.6 1.7-.5 2.6.2.9.7 1.7 1.5 2.3.8.6 1.8.8 2.8.6 1-.2 1.9-.8 2.5-1.7.1-.2.2-.4.2-.6a1 1 0 00-1-1.2h-.2c-.3.2-.6.3-1 .4-1.1.2-2.2-.3-2.8-1.2-.6-1-.7-2.2-.3-3.3.4-1.1 1.5-1.8 2.6-1.8.6 0 1.2.2 1.6.6.4.4.6 1 .5 1.6-.2 1-1.2 1.8-2.2 1.8h-1"></path><path d="M14.5 15.5c0 .6.4 1.2.9 1.6.8.6 1.8.8 2.8.6 1-.2 1.9-.8 2.5-1.7.6-.9.8-2 .6-3-.2-1-.8-1.9-1.7-2.5-.9-.6-2-.8-3-.6-1 .2-1.9.8-2.5 1.7-.6.9-.8 2-.6 3 .2.5.5.9.9 1.2"></path><path d="M19 14.5c0-1.1-.4-2.2-1.2-2.8-.8-.7-1.9-1-3- .8-.5.2-1.1.2-1.6.1-1.1-.2-2.2.3-2.8 1.2-.7.8-1 2-1 3.1.1 1.1.5 2.1 1.2 2.8.7.7 1.8 1.1 2.8 1.1.6 0 1.2-.1 1.7-.4"></path></svg>
        };
    }
    if (design === 'Cooled') {
        return { 
            bgColor: 'bg-blue-50 border-blue-200',
            iconColor: 'text-blue-500',
            icon: <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h20"></path><path d="M12 2v20"></path><path d="m4.93 4.93 14.14 14.14"></path><path d="m4.93 19.07 14.14-14.14"></path><path d="M12 16a4 4 0 000-8"></path><path d="M12 16a4 4 0 010-8"></path></svg>
        };
    }
    if (lowerCaseName.includes('settling')) {
        return {
            bgColor: 'bg-slate-50 border-slate-200',
            iconColor: 'text-slate-500',
            icon: <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17.7 7.7a5 5 0 11-10 0"></path><path d="M12 12.5a5 5 0 100 10 5 5 0 100-10z"></path><path d="M12 2v2.5"></path><path d="M12 20v-2.5"></path><path d="M6.3 6.3l1.8 1.8"></path><path d="M15.9 15.9l1.8 1.8"></path><path d="M2 12h2.5"></path><path d="M20 12h-2.5"></path><path d="M6.3 17.7l1.8-1.8"></path><path d="m15.9 8.1 1.8-1.8"></path></svg>
        };
    }
    // Final Transit
    return { 
        bgColor: 'bg-slate-50 border-slate-200',
        iconColor: 'text-slate-500',
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
    };
};

const SubSystemCard = ({ subSystem }: { subSystem: SubSystem }): React.ReactNode => {
    let icon, label, value;
    switch (subSystem.type) {
        case 'HeaterBox':
            icon = '🔥';
            label = 'Burner:';
            value = `${subSystem.data.burnerRating.value || 'N/A'} MMBTU`;
            break;
        case 'Cooler':
            icon = '❄️';
            label = 'CW ΔT:';
            const tempIn = parseFloat(subSystem.data.chilledWaterCoil.tempIn.value);
            const tempOut = parseFloat(subSystem.data.chilledWaterCoil.tempOut.value);
            value = (!isNaN(tempIn) && !isNaN(tempOut)) ? `${(tempOut - tempIn).toFixed(1)}°F` : 'N/A';
            break;
        case 'AirSupplyHouse':
            icon = '💨';
            label = 'Supply:';
            value = `${subSystem.data.airSystem.airflow.value || 'N/A'} CFM`;
            break;
        default:
            return null;
    }
    return (
        <div className="bg-white/70 border border-slate-200 rounded-md p-2 text-xs shadow-sm w-full" title={subSystem.name}>
            <div className="font-semibold text-text-secondary truncate">{icon} {subSystem.name}</div>
            <div className="flex justify-between mt-1">
                <span>{label}</span>
                <span className="font-mono text-code">{value}</span>
            </div>
        </div>
    );
};

const Zone = ({ zone, onZoneSelect }: { zone: ZoneType; onZoneSelect: (zoneId: string) => void; }): React.ReactNode => {
    const { bgColor, icon, iconColor } = getZoneInfo(zone);
    const data = zone.data;

    return (
      <button 
        onClick={() => onZoneSelect(zone.id)}
        className={`flex-1 ${bgColor} p-4 border rounded-lg shadow-sm flex flex-col items-center min-w-[200px] text-left
                   cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-interactive focus:ring-offset-2`}
        aria-label={`View details for ${zone.name}`}
      >
        <div className={`w-12 h-12 ${iconColor} mb-2`}>{icon}</div>
        <h3 className="text-center font-bold text-heading text-lg mb-3 truncate w-full" title={zone.name}>{zone.name}</h3>
        <div className="text-sm grid grid-cols-1 gap-1 w-full bg-white/50 p-2 rounded-md border border-black/5">
            {/* Core Params */}
            <div className="flex justify-between"><span>Temp:</span> <span className="font-mono text-code">{data.temperature.value || 'N/A'}°F</span></div>
            <div className="flex justify-between"><span>RH:</span> <span className="font-mono text-code">{data.relativeHumidity.value || 'N/A'}%</span></div>

            {/* Air Volumes */}
            <hr className="my-1 border-slate-200" />
            <div className="flex justify-between"><span>Supply Duct:</span> <span className="font-mono text-code">{data.supply.airflow.value || 'N/A'} CFM</span></div>
            <div className="flex justify-between"><span>Exhaust Duct:</span> <span className="font-mono text-code">{data.exhaust.airflow.value || 'N/A'} CFM</span></div>
            {data.infiltration?.volume.value && (
                 <div className="flex justify-between"><span>Infiltration:</span> <span className="font-mono text-code">{data.infiltration.volume.value} CFM</span></div>
            )}
             {data.exfiltration?.volume.value && (
                 <div className="flex justify-between"><span>Exfiltration:</span> <span className="font-mono text-code">{data.exfiltration.volume.value} CFM</span></div>
            )}
        </div>
      </button>
    );
};

const Arrow = (): React.ReactNode => (
    <div className="flex-shrink-0 self-start pt-24 text-4xl text-text-secondary mx-2">
        →
    </div>
);


const SchematicDisplay = ({ currentData, baselineData, onZoneSelect, displayMode, setDisplayMode }: SchematicDisplayProps): React.ReactNode => {
  const dataToShow = displayMode === 'live' ? currentData : baselineData;
  const title = displayMode === 'live' ? 'Process Flow & Live Data' : 'Process Flow & Baseline Design';

  if (!dataToShow) {
    return (
        <div className="bg-panel p-4 rounded-lg shadow-md flex items-center justify-center min-h-[150px]">
            <p className="text-text-secondary">No data to display. Please select or add a reading.</p>
        </div>
    );
  }

  return (
    <div className="bg-panel p-4 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-text-primary">{title}</h2>
            <div className="flex-shrink-0 bg-slate-200 p-1 rounded-md">
                <button
                    onClick={() => setDisplayMode('live')}
                    className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${
                        displayMode === 'live' ? 'bg-white shadow-sm text-interactive' : 'text-text-secondary hover:bg-slate-300'
                    }`}
                >
                    Live Data
                </button>
                <button
                    onClick={() => setDisplayMode('baseline')}
                    className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${
                        displayMode === 'baseline' ? 'bg-white shadow-sm text-interactive' : 'text-text-secondary hover:bg-slate-300'
                    }`}
                >
                    Baseline Design
                </button>
            </div>
        </div>

        <div className="bg-background p-4 rounded-md overflow-x-auto">
            {dataToShow.zones.length > 0 ? (
                <div className="flex flex-row items-start justify-start gap-2 min-w-max">
                    {dataToShow.zones.map((zone, index) => (
                        <React.Fragment key={zone.id}>
                            <div className="flex flex-col items-center gap-2">
                                <Zone zone={zone} onZoneSelect={onZoneSelect} />
                                {zone.subSystems && zone.subSystems.length > 0 && (
                                     <>
                                        <div className="text-2xl text-text-secondary leading-none -my-1">↓</div>
                                        <div className="flex flex-col gap-1.5 w-[200px]">
                                            {zone.subSystems.map(sub => (
                                                <SubSystemCard key={sub.id} subSystem={sub} />
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                            {index < dataToShow.zones.length - 1 && <Arrow />}
                        </React.Fragment>
                    ))}
                </div>
            ) : (
                <div className="flex items-center justify-center min-h-[100px]">
                    <p className="text-text-secondary">No process stages defined. Add a stage in the 'Baseline Design Data' tab to begin.</p>
                </div>
            )}
            <div className="text-center mt-4 text-text-secondary">
                Conveyor Speed: <span className="font-mono text-code">{dataToShow.conveyorSpeed.value || 'N/A'} ft/min</span> | Product Size: <span className="font-mono text-code">{dataToShow.productSize || 'N/A'}</span>
            </div>
        </div>
    </div>
  );
};

export default SchematicDisplay;