import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Chart, LineController, LineElement, PointElement, LinearScale, TimeScale, Title, Tooltip, Legend, Filler, ChartOptions, CartesianScaleOptions } from 'chart.js';
import 'chartjs-adapter-date-fns';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { ProcessData } from '../types';

Chart.register(LineController, LineElement, PointElement, LinearScale, TimeScale, Title, Tooltip, Legend, Filler);

interface TrendChartModalProps {
  historicalData: ProcessData[];
  baselineData: ProcessData;
  onClose: () => void;
}

const PALETTE = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6',
];

const selectableParameters: { label: string; path: string; unit: string }[] = [
    { label: 'Temperature', path: 'data.temperature.value', unit: '°F' },
    { label: 'Relative Humidity', path: 'data.relativeHumidity.value', unit: '%' },
    { label: 'Supply Airflow', path: 'data.supply.airflow.value', unit: 'CFM' },
    { label: 'Supply Static Pressure', path: 'data.supply.staticPressure.value', unit: 'in WC' },
    { label: 'Exhaust Airflow', path: 'data.exhaust.airflow.value', unit: 'CFM' },
    { label: 'Exhaust Static Pressure', path: 'data.exhaust.staticPressure.value', unit: 'in WC' },
    { label: 'Infiltration Volume', path: 'data.infiltration.volume.value', unit: 'CFM' },
    { label: 'Exfiltration Volume', path: 'data.exfiltration.volume.value', unit: 'CFM' },
    // NOTE: Fan motor and Chilled Water Coil parameters have been removed as they are now in sub-systems.
    // A future update could add logic to dynamically discover and chart sub-system parameters.
];

const getValueByPath = (obj: any, path: string): number | null => {
  try {
    const value = path.split('.').reduce((acc, part) => acc && acc[part], obj);
    if (value && typeof value === 'string') {
        const num = parseFloat(value);
        return isNaN(num) ? null : num;
    }
    return null;
  } catch (e) {
    return null;
  }
};

const getTimestamp = (reading: ProcessData): number | null => {
    const dateStr = reading.collectionDate?.value;
    const timeStr = reading.timeOfDay?.value;

    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return null; // Invalid or missing date
    }
    
    const validTimeStr = (timeStr && /^\d{2}:\d{2}$/.test(timeStr)) ? timeStr : '00:00';
    const date = new Date(`${dateStr}T${validTimeStr}`);
    
    if (isNaN(date.getTime())) {
        return null; // Invalid date object
    }
    return date.getTime();
};

const pdfCaptureStyles = `
  .pdf-capture .hide-on-capture {
    display: none !important;
  }
  .pdf-capture .show-on-capture {
    display: block !important;
  }
  .show-on-capture {
    display: none;
  }
`;

const TrendChartModal = ({ historicalData, baselineData, onClose }: TrendChartModalProps): React.ReactNode => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chartInstanceRef = useRef<Chart | null>(null);
    const reportContentRef = useRef<HTMLDivElement>(null);

    const [selectedZoneId, setSelectedZoneId] = useState<string>('');
    const [selectedParamPaths, setSelectedParamPaths] = useState<string[]>([]);
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');

    // Effect for initializing state and chart instance
    useEffect(() => {
        if (baselineData.zones.length > 0) {
            setSelectedZoneId(baselineData.zones[0].id);
        }
        if (selectableParameters.length > 0) {
            setSelectedParamPaths([selectableParameters[0].path]);
        }
        
        const validTimestamps = historicalData.map(getTimestamp).filter((t): t is number => t !== null);

        if (validTimestamps.length > 0) {
            const minDate = new Date(Math.min(...validTimestamps));
            const maxDate = new Date(Math.max(...validTimestamps));
            setStartDate(minDate.toISOString().split('T')[0]);
            setEndDate(maxDate.toISOString().split('T')[0]);
        }

        if (canvasRef.current && !chartInstanceRef.current) {
            chartInstanceRef.current = new Chart(canvasRef.current, {
                type: 'line',
                data: { datasets: [] },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: { type: 'time', time: { unit: 'day', tooltipFormat: 'PPpp' }, title: { display: true, text: 'Date & Time' }},
                        y: { title: { display: true, text: 'Value' }, beginAtZero: false }
                    },
                    plugins: {
                        legend: { position: 'top' },
                        title: { display: true, text: 'Parameter Trend Analysis' }
                    }
                }
            });
        }
        return () => {
            chartInstanceRef.current?.destroy();
            chartInstanceRef.current = null;
        }
    }, [historicalData, baselineData]); // Rerun only when data props change

    // Memoized calculation for chart datasets
    const chartDataSets = useMemo(() => {
        if (!selectedZoneId || selectedParamPaths.length === 0 || historicalData.length === 0) {
            return [];
        }

        const dateRangeStart = startDate ? new Date(startDate).getTime() : -Infinity;
        const dateRangeEnd = endDate ? new Date(endDate).getTime() + (24 * 60 * 60 * 1000 - 1) : Infinity;

        const validReadings = historicalData
            .map(reading => ({ reading, timestamp: getTimestamp(reading) }))
            .filter((item): item is { reading: ProcessData; timestamp: number } => 
                item.timestamp !== null && item.timestamp >= dateRangeStart && item.timestamp <= dateRangeEnd
            )
            .sort((a, b) => a.timestamp - b.timestamp);
        
        if (validReadings.length === 0) return [];
        
        const datasets: any[] = [];
        
        selectedParamPaths.forEach((paramPath, index) => {
            const selectedParam = selectableParameters.find(p => p.path === paramPath);
            if (!selectedParam) return;

            const color = PALETTE[index % PALETTE.length];
            
            const seriesData = validReadings.map(({ reading, timestamp }) => {
                const zone = reading.zones.find(z => z.id === selectedZoneId);
                return {
                    x: timestamp,
                    y: zone ? getValueByPath(zone, paramPath) : null,
                };
            }).filter(d => d.y !== null && isFinite(d.y));

            if (seriesData.length > 0) {
                datasets.push({
                    label: `${selectedParam.label} (${selectedParam.unit})`,
                    data: seriesData,
                    borderColor: color,
                    backgroundColor: `${color}33`,
                    tension: 0.1,
                    fill: false,
                });
                
                const baselineZone = baselineData.zones.find(z => z.id === selectedZoneId);
                const baselineValue = baselineZone ? getValueByPath(baselineZone, paramPath) : null;
                
                if (baselineValue !== null && isFinite(baselineValue)) {
                    datasets.push({
                        label: `${selectedParam.label} - Baseline`,
                        data: seriesData.map(d => ({ x: d.x, y: baselineValue })),
                        borderColor: color,
                        borderDash: [5, 5],
                        backgroundColor: 'transparent',
                        pointRadius: 0,
                        fill: false,
                        tooltip: { callbacks: { label: (ctx: any) => `Baseline: ${ctx.parsed.y} ${selectedParam.unit}` } }
                    });
                }
            }
        });
        
        return datasets;
    }, [selectedZoneId, selectedParamPaths, startDate, endDate, historicalData, baselineData]);

    // Effect for updating the chart when data or options change
    useEffect(() => {
        const chart = chartInstanceRef.current;
        if (!chart) return;
        
        const selectedZone = baselineData.zones.find(z => z.id === selectedZoneId);
        if (chart.options.plugins?.title) {
            chart.options.plugins.title.text = `Trend Analysis for ${selectedZone?.name || 'Select a Stage'}`;
        }
        
        const uniqueUnits = [...new Set(selectedParamPaths
            .map(path => selectableParameters.find(p => p.path === path)?.unit)
            .filter(Boolean)
        )];

        if (chart.options.scales?.y) {
            const yAxis = chart.options.scales.y as CartesianScaleOptions;
            if (yAxis.title) {
                yAxis.title.text = uniqueUnits.join(', ');
            }
        }
        
        chart.data.datasets = chartDataSets;
        chart.update();

    }, [chartDataSets, baselineData, selectedZoneId, selectedParamPaths]);
    
    const handleParamChange = (path: string) => {
        setSelectedParamPaths(prev => 
            prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]
        );
    };

    const handleDownloadPdf = () => {
        const content = reportContentRef.current;
        if (!content) return;

        content.classList.add('pdf-capture');

        html2canvas(content, { scale: 2 }).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
            const margin = 40;
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const canvasAspectRatio = canvas.width / canvas.height;
            const finalWidth = pdfWidth - 2 * margin;
            let finalHeight = finalWidth / canvasAspectRatio;

            if (finalHeight > pdfHeight - 2 * margin) {
                finalHeight = pdfHeight - 2 * margin;
            }

            const y = (pdfHeight - finalHeight) / 2;

            pdf.addImage(imgData, 'PNG', margin, y, finalWidth, finalHeight);
            pdf.save('trend-chart-report.pdf');
        }).finally(() => {
            content.classList.remove('pdf-capture');
        });
    };
    
    const isChartReady = selectedZoneId && selectedParamPaths.length > 0 && chartDataSets.length > 0;
    const selectedParameterNames = selectedParamPaths
      .map(path => selectableParameters.find(p => p.path === path)?.label)
      .filter(Boolean)
      .join(', ');

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" onClick={onClose} role="dialog" aria-modal="true">
            <style>{pdfCaptureStyles}</style>
            <div className="bg-panel rounded-lg shadow-2xl max-w-7xl w-full h-full max-h-[95vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div ref={reportContentRef} className="flex-grow flex flex-col bg-white rounded-lg">
                    <div className="flex justify-between items-center p-4 border-b border-border flex-shrink-0">
                        <h2 className="text-xl font-bold text-text-primary">Trend Analysis Report</h2>
                        <button onClick={onClose} className="text-2xl font-bold leading-none p-1 text-text-secondary hover:text-text-primary hide-on-capture" aria-label="Close modal">&times;</button>
                    </div>

                    <div className="p-4 flex-shrink-0 space-y-4 bg-slate-50/50 border-b border-border">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                             <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">Process Stage</label>
                                <select value={selectedZoneId} onChange={e => setSelectedZoneId(e.target.value)} className="w-full bg-background border border-border rounded-md p-2 focus:ring-interactive focus:border-interactive hide-on-capture">
                                    <option value="" disabled>Select a Stage</option>
                                    {baselineData.zones.map(zone => <option key={zone.id} value={zone.id}>{zone.name}</option>)}
                                </select>
                                <div className="show-on-capture w-full bg-background border border-border rounded-md p-2 text-text-primary min-h-[42px] flex items-center">
                                    {baselineData.zones.find(z => z.id === selectedZoneId)?.name || 'N/A'}
                                </div>
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">Start Date</label>
                                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-background border border-border rounded-md p-2 focus:ring-interactive focus:border-interactive hide-on-capture" />
                                <div className="show-on-capture w-full bg-background border border-border rounded-md p-2 text-text-primary min-h-[42px] flex items-center">
                                    {startDate || 'Not set'}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">End Date</label>
                                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-background border border-border rounded-md p-2 focus:ring-interactive focus:border-interactive hide-on-capture" />
                                 <div className="show-on-capture w-full bg-background border border-border rounded-md p-2 text-text-primary min-h-[42px] flex items-center">
                                    {endDate || 'Not set'}
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1">Parameters</label>
                            <div className="max-h-32 overflow-y-auto p-2 border border-border rounded-md bg-background grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-2 hide-on-capture">
                                {selectableParameters.map(param => (
                                    <label key={param.path} className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
                                        <input type="checkbox" checked={selectedParamPaths.includes(param.path)} onChange={() => handleParamChange(param.path)} className="h-4 w-4 rounded border-gray-300 text-interactive focus:ring-interactive" disabled={!selectedZoneId} />
                                        {param.label}
                                    </label>
                                ))}
                            </div>
                            <div className="show-on-capture p-2 border border-border rounded-md bg-background text-text-primary text-sm">
                                {selectedParameterNames || 'None selected'}
                            </div>
                        </div>
                    </div>

                    <div className="p-4 flex-grow relative">
                        <canvas ref={canvasRef}></canvas>
                         {!isChartReady && (
                            <div className="absolute inset-0 flex items-center justify-center text-text-secondary bg-slate-50/70 rounded-md m-4">
                                <p className="text-center p-4">
                                    {historicalData.length === 0 
                                        ? "No historical data available to display."
                                        : "No data available for the selected stage, parameters, or date range."
                                    }
                                </p>
                            </div>
                        )}
                    </div>
                </div>
                 <div className="p-4 border-t border-border flex justify-end flex-shrink-0 bg-slate-50/50">
                    <button onClick={handleDownloadPdf} className="px-4 py-2 bg-interactive text-white font-semibold rounded-md hover:bg-interactive-hover transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed" disabled={!isChartReady}>
                         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                            <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
                        </svg>
                        Download PDF
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TrendChartModal;