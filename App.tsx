

import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { ProcessData, AIAnalysis, ChatMessage, AirSystemData, SubSystem, Zone, FanMotorData, DuctworkData, ChangeRequest } from './types';
import type { Chat } from '@google/genai';
import { BLANK_PROCESS_DATA } from './constants';
import { analyzeProcessData, initializeChatSession, querySmartAgent } from './services/geminiService';
import Header from './components/Header';
import SchematicDisplay from './components/SchematicDisplay';
import DataInputForm from './components/DataInputForm';
import AnalysisPanel from './components/AnalysisPanel';
import SmartAgentPanel from './components/SmartAgentPanel';
import ChangeManagementPanel from './components/ChangeManagementPanel';
import TrendChartModal from './components/TrendChartModal';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const LoginOverlay = ({ onLoginSuccess }: { onLoginSuccess: () => void }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    passwordRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'kb1970') {
      onLoginSuccess();
    } else {
      setError('Invalid password. Please try again.');
      setPassword('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm">
      <div className="bg-panel rounded-lg shadow-xl p-8 w-full max-w-sm m-4 text-center">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-interactive mx-auto mb-4"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path><path d="M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"></path><path d="M12 4v2"></path><path d="M12 18v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M20 12h-2"></path><path d="M6 12H4"></path><path d="m4.93 19.07 1.41-1.41"></path><path d="m17.66 6.34 1.41-1.41"></path></svg>
        <h1 className="text-2xl font-bold text-heading tracking-tight mb-2">
          Process Engineering Monitor
        </h1>
        <p className="text-text-secondary mb-6">Please enter the password to access the application.</p>
        <form onSubmit={handleSubmit}>
          <input
            ref={passwordRef}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border-2 border-border rounded-md p-3 text-center text-lg tracking-widest focus:ring-interactive focus:border-interactive"
            placeholder="******"
            aria-label="Password"
          />
          {error && <p className="text-danger text-sm mt-2">{error}</p>}
          <button
            type="submit"
            className="w-full mt-4 bg-interactive text-white font-bold py-3 px-4 rounded-lg hover:bg-interactive-hover transition duration-300"
          >
            Unlock
          </button>
        </form>
      </div>
    </div>
  );
};

export default function App(): React.ReactNode {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [baselineData, setBaselineData] = useState<ProcessData>(() => JSON.parse(JSON.stringify(BLANK_PROCESS_DATA)));
  const [historicalData, setHistoricalData] = useState<ProcessData[]>(() => [JSON.parse(JSON.stringify(BLANK_PROCESS_DATA))]);
  const [activeReadingIndex, setActiveReadingIndex] = useState<number>(0);
  const [problemStatement, setProblemStatement] = useState<string>('');

  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [highlightedZoneId, setHighlightedZoneId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);
  const chatRef = useRef<Chat | null>(null);
  
  const [isTrendChartVisible, setIsTrendChartVisible] = useState<boolean>(false);
  const [justLoaded, setJustLoaded] = useState<boolean>(false);
  const [activeView, setActiveView] = useState<'current' | 'baseline' | 'intake'>('intake');
  
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);


  const activeReading = historicalData[activeReadingIndex] || null;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (justLoaded) {
      window.scrollTo(0, 0);
      setJustLoaded(false); // Reset the flag
    }
  }, [justLoaded]);

  const handleAnalyze = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setAnalysis(null);
    try {
      // Ensure there's at least one historical reading to analyze
      if (historicalData.length === 0) {
        throw new Error("No current data available to analyze.");
      }
      const result = await analyzeProcessData(baselineData, historicalData, problemStatement);
      setAnalysis(result);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred during analysis.');
    } finally {
      setIsLoading(false);
    }
  }, [baselineData, historicalData, problemStatement]);

  const handleSaveConfiguration = () => {
    try {
      const dataToSave = JSON.stringify({
        baseline: baselineData,
        historical: historicalData,
        changeRequests: changeRequests,
        problemStatement: problemStatement,
      }, null, 2);
      const blob = new Blob([dataToSave], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'smart-process-monitor-config.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
       console.error("Failed to save configuration:", err);
       setError(err instanceof Error ? err.message : 'An unknown error occurred while saving the file.');
    }
  };

  const handleLoadConfiguration = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') {
          throw new Error("File content is not readable text.");
        }
        const data = JSON.parse(text);
        if (data.baseline && data.historical && Array.isArray(data.historical)) {
          setBaselineData(data.baseline);
          setHistoricalData(data.historical);
          setChangeRequests(data.changeRequests || []);
          setProblemStatement(data.problemStatement || '');
          setActiveReadingIndex(data.historical.length > 0 ? data.historical.length - 1 : 0);
          chatRef.current = null; // Reset chat session
          setChatHistory([]); // Clear chat history
          setError(null); // Clear previous errors
          setJustLoaded(true); // Trigger the useEffect to scroll to top
        } else {
          throw new Error("Invalid configuration file format. Missing 'baseline' or 'historical' data array.");
        }
      } catch (err) {
        console.error("Failed to load configuration:", err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred while loading the file.');
      }
    };
    reader.onerror = () => {
        setError("Failed to read the file.");
    };
    reader.readAsText(file);

    // Reset file input to allow loading the same file again
    if (event.target) {
        event.target.value = '';
    }
  };
  
  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleSendMessage = useCallback(async (message: string) => {
    setIsChatLoading(true);
    setChatHistory(prev => [...prev, { role: 'user', content: message }]);

    try {
        if (!chatRef.current) {
            chatRef.current = initializeChatSession(baselineData, historicalData, problemStatement);
        }
        const responseText = await querySmartAgent(chatRef.current, message);
        setChatHistory(prev => [...prev, { role: 'model', content: responseText }]);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setChatHistory(prev => [...prev, { role: 'model', content: `Sorry, I encountered an error: ${errorMessage}` }]);
    } finally {
        setIsChatLoading(false);
    }
  }, [baselineData, historicalData, problemStatement]);
  
  const handleCreateChangeRequest = useCallback((rca: AIAnalysis['rootCauseAnalysis'][0]) => {
    const newRequest: ChangeRequest = {
        id: crypto.randomUUID(),
        title: rca.cause,
        justification: rca.reasoning,
        recommendedAction: rca.recommendation,
        expectedResults: '',
        riskLevel: 'Low',
        riskDetails: '',
        estimatedCost: '',
        status: 'Draft',
    };
    setChangeRequests(prev => [...prev, newRequest]);
    // Scroll to the new panel
    setTimeout(() => {
        const element = document.getElementById('change-management-panel');
        element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }, []);

  const handleDownloadTemplate = () => {
    if (!baselineData) return;
  
    const styles = `
      <style>
        body { font-family: Arial, sans-serif; font-size: 10pt; }
        h1, h2, h3 { color: #1E40AF; }
        h1 { font-size: 16pt; text-align: center; margin-bottom: 20px; page-break-before: auto; }
        h2 { font-size: 14pt; border-bottom: 1px solid #cccccc; padding-bottom: 4px; margin-top: 20px; page-break-before: always; }
        h2:first-of-type { page-break-before: auto; }
        h3 { font-size: 12pt; margin-top: 15px; font-style: italic; color: #111827; }
        .subsystem-h3 { font-size: 11pt; margin-top: 15px; font-style: normal; color: #3B82F6; border-top: 1px dotted #ccc; padding-top: 8px; }
        table { border-collapse: collapse; width: 100%; margin-top: 10px; font-size: 10pt; page-break-inside: avoid; }
        th, td { border: 1px solid #999999; text-align: left; padding: 5px; vertical-align: top; }
        th { background-color: #E5E7EB; font-weight: bold; }
        .param-col { width: 35%; }
        .baseline-col { width: 25%; }
        .measured-col { width: 40%; }
        .notes-box { height: 80px; }
        .header-table td { border: none; padding: 2px 0; }
      </style>
    `;
  
    const renderParamRow = (label: string, unit: string, baselineValue: string | undefined) => {
      return `
        <tr>
          <td>${label} ${unit ? `(${unit})` : ''}</td>
          <td>${baselineValue || 'N/A'}</td>
          <td></td>
        </tr>
      `;
    };

    const renderFanMotor = (data: FanMotorData | undefined) => {
        if (!data) return '';
        return [
            data.hz !== undefined ? renderParamRow('Frequency', 'Hz', data.hz.value) : '',
            data.hp !== undefined ? renderParamRow('Horsepower', 'HP', data.hp.value) : '',
            data.fla !== undefined ? renderParamRow('Full Load Amps', 'A', data.fla.value) : '',
            data.rpm !== undefined ? renderParamRow('Speed', 'RPM', data.rpm.value) : '',
        ].filter(Boolean).join('');
    };
  
    const renderAirSystem = (title: string, data: DuctworkData | AirSystemData | undefined, isSubsystem: boolean = false) => {
        if (!data) return '';
        const rows = [
            renderParamRow('Airflow', 'CFM', data.airflow?.value),
            renderParamRow('Velocity', 'FPM', data.velocity?.value),
            data.staticPressure !== undefined ? renderParamRow('Static Pressure', 'in WC', data.staticPressure.value) : '',
            renderParamRow('Duct Length', 'in', data.ductLength?.value),
            renderParamRow('Duct Width', 'in', data.ductWidth?.value),
            'hz' in data ? renderFanMotor(data) : ''
        ].filter(Boolean).join('');
    
        if (!rows) return '';
    
        return `
          <h3 class="${isSubsystem ? 'subsystem-h3' : ''}">${title}</h3>
          <table>
            <thead>
              <tr><th class="param-col">Parameter</th><th class="baseline-col">Baseline Value</th><th class="measured-col">Measured Value</th></tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        `;
    };

    const renderSubSystems = (zone: Zone) => {
        if (!zone.subSystems || zone.subSystems.length === 0) return '';
        return zone.subSystems.map(sub => {
            switch (sub.type) {
                case 'HeaterBox':
                    const combustionFanTitle = sub.data.combustionFan ? `<tr><td colspan="3" style="padding-left: 15px; font-weight: bold; background-color: #F9FAFB;">Combustion Fan Motor</td></tr>` : '';
                    const circulationFanTitle = sub.data.circulationFan ? `<tr><td colspan="3" style="padding-left: 15px; font-weight: bold; background-color: #F9FAFB;">Circulation Fan Motor</td></tr>` : '';
                    return `
                        <h3 class="subsystem-h3">${sub.name}</h3>
                        <table><tbody>
                          ${renderParamRow('Burner Rating', 'MM BTU/Hr', sub.data.burnerRating?.value)}
                          ${combustionFanTitle}
                          ${renderFanMotor(sub.data.combustionFan)}
                          ${circulationFanTitle}
                          ${renderFanMotor(sub.data.circulationFan)}
                        </tbody></table>
                    `;
                case 'Cooler':
                    return `
                        <h3 class="subsystem-h3">${sub.name}</h3>
                        <table>
                            <thead><tr><th class="param-col">Parameter</th><th class="baseline-col">Baseline Value</th><th class="measured-col">Measured Value</th></tr></thead>
                            <tbody>
                                ${renderParamRow('Temp In', '°F', sub.data.chilledWaterCoil.tempIn?.value)}
                                ${renderParamRow('Pressure In', 'PSI', sub.data.chilledWaterCoil.pressureIn?.value)}
                                ${renderParamRow('Temp Out', '°F', sub.data.chilledWaterCoil.tempOut?.value)}
                                ${renderParamRow('Pressure Out', 'PSI', sub.data.chilledWaterCoil.pressureOut?.value)}
                                ${renderFanMotor(sub.data.fanMotor)}
                            </tbody>
                        </table>`;
                case 'AirSupplyHouse':
                    return renderAirSystem(sub.name, sub.data.airSystem, true);
                default:
                    return '';
            }
        }).join('');
    };
  
    const headerHtml = `
      <h1>Process Data Collection Sheet</h1>
      <table class="header-table">
        <tr>
          <td style="width: 20%;"><strong>Customer:</strong></td>
          <td style="width: 30%;">${baselineData.customerInfo?.name?.value || '________________'}</td>
          <td style="width: 20%;"><strong>Data Collection Date:</strong></td>
          <td style="width: 30%;">________________</td>
        </tr>
        <tr>
          <td><strong>Location / Site:</strong></td>
          <td>${baselineData.customerInfo?.location?.value || '________________'}</td>
          <td><strong>Time of Day:</strong></td>
          <td>________________</td>
        </tr>
        <tr>
          <td><strong>Contact Person:</strong></td>
          <td>${baselineData.customerInfo?.contactPerson?.value || '________________'}</td>
          <td><strong>Technician:</strong></td>
          <td>________________</td>
        </tr>
      </table>
  
      <h2>General Process Parameters</h2>
      <table>
        <thead>
          <tr><th class="param-col">Parameter</th><th class="baseline-col">Baseline Value</th><th class="measured-col">Measured Value</th></tr>
        </thead>
        <tbody>
          ${renderParamRow('Conveyor Speed', 'ft/min', baselineData.conveyorSpeed?.value)}
          ${renderParamRow('Product Size', '', baselineData.productSize)}
          ${renderParamRow('Outside Temperature', '°F', '')}
          ${renderParamRow('Outside Rel. Humidity', '%', '')}
        </tbody>
      </table>
    `;
  
    const zonesHtml = baselineData.zones.map(zone => `
      <h2>Process Stage: ${zone.name} (${zone.data.design})</h2>
      <h3>Core Parameters</h3>
      <table>
        <thead>
          <tr><th class="param-col">Parameter</th><th class="baseline-col">Baseline Value</th><th class="measured-col">Measured Value</th></tr>
        </thead>
        <tbody>
          ${renderParamRow('Temperature', '°F', zone.data.temperature?.value)}
          ${renderParamRow('Relative Humidity', '%', zone.data.relativeHumidity?.value)}
        </tbody>
      </table>
  
      ${renderAirSystem('Supply Duct', zone.data.supply)}
      ${renderAirSystem('Exhaust Duct', zone.data.exhaust)}
      ${renderSubSystems(zone)}
  
      ${(zone.data.infiltration || zone.data.exfiltration) ? `
        <h3>Air Leakage</h3>
        <table>
          <thead>
            <tr><th class="param-col">Parameter</th><th class="baseline-col">Baseline Value</th><th class="measured-col">Measured Value</th></tr>
          </thead>
          <tbody>
            ${zone.data.infiltration ? renderParamRow('Infiltration Volume', 'CFM', zone.data.infiltration.volume?.value) : ''}
            ${zone.data.infiltration ? renderParamRow('Infiltration Silhouette Size', 'sq ft', zone.data.infiltration.silhouetteSize?.value) : ''}
            ${zone.data.exfiltration ? renderParamRow('Exfiltration Volume', 'CFM', zone.data.exfiltration.volume?.value) : ''}
            ${zone.data.exfiltration ? renderParamRow('Exfiltration Silhouette Size', 'sq ft', zone.data.exfiltration.silhouetteSize?.value) : ''}
          </tbody>
        </table>
      ` : ''}
  
      <h3>Notes</h3>
      <table>
        <tr><td class="notes-box"></td></tr>
      </table>
    `).join('');
  
    const fullHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Process Data Collection Sheet</title>
          ${styles}
        </head>
        <body>
          ${headerHtml}
          ${zonesHtml}
        </body>
      </html>
    `;
  
    const blob = new Blob([fullHtml], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'process-data-collection-sheet.doc';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadProcessFlow = async () => {
    if (!baselineData || baselineData.zones.length === 0) {
      setError("No process data available to generate a flow document.");
      return;
    }
  
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'in', format: 'ledger' });
    const PAGE_WIDTH_IN = 17;
    const PAGE_HEIGHT_IN = 11;
    const MARGIN_IN = 0.5;
    const CONTENT_WIDTH_IN = PAGE_WIDTH_IN - (MARGIN_IN * 2);
    const DPI = 96; // Standard DPI for screen-to-print
    const CONTENT_WIDTH_PX = CONTENT_WIDTH_IN * DPI;
    
    // Increased padding and adjusted widths
    const CARD_WIDTH_PX = 320; 
    const ARROW_WIDTH_PX = 60;
    const GAP_PX = 48; // Increased gap for better spacing

    const getZoneInfo = (zone: Zone) => {
        const design = zone.data.design;
        const lowerCaseName = zone.name.toLowerCase();
        if (design === 'Heated') return { icon: `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4.5c.2-.5.2-1.1.1-1.6a2.4 2.4 0 00-1-1.5c-.8-.5-1.7-.6-2.6-.3-.9.3-1.6 1-2 1.8-.4.8-.6 1.7-.5 2.6.2.9.7 1.7 1.5 2.3.8.6 1.8.8 2.8.6 1-.2 1.9-.8 2.5-1.7.1-.2.2-.4.2-.6a1 1 0 00-1-1.2h-.2c-.3.2-.6.3-1 .4-1.1.2-2.2-.3-2.8-1.2-.6-1-.7-2.2-.3-3.3.4-1.1 1.5-1.8 2.6-1.8.6 0 1.2.2 1.6.6.4.4.6 1 .5 1.6-.2 1-1.2 1.8-2.2 1.8h-1"></path><path d="M4.5 11.5c.2-.5.2-1.1.1-1.6a2.4 2.4 0 00-1-1.5c-.8-.5-1.7-.6-2.6-.3-.9.3-1.6 1-2 1.8-.4.8-.6 1.7-.5 2.6.2.9.7 1.7 1.5 2.3.8.6 1.8.8 2.8.6 1-.2 1.9-.8 2.5-1.7.1-.2.2-.4.2-.6a1 1 0 00-1-1.2h-.2c-.3.2-.6.3-1 .4-1.1.2-2.2-.3-2.8-1.2-.6-1-.7-2.2-.3-3.3.4-1.1 1.5-1.8 2.6-1.8.6 0 1.2.2 1.6.6.4.4.6 1 .5 1.6-.2 1-1.2 1.8-2.2 1.8h-1"></path><path d="M14.5 15.5c0 .6.4 1.2.9 1.6.8.6 1.8.8 2.8.6 1-.2 1.9-.8 2.5-1.7.6-.9.8-2 .6-3-.2-1-.8-1.9-1.7-2.5-.9-.6-2-.8-3-.6-1 .2-1.9.8-2.5 1.7-.6.9-.8 2-.6 3 .2.5.5.9.9 1.2"></path><path d="M19 14.5c0-1.1-.4-2.2-1.2-2.8-.8-.7-1.9-1-3- .8-.5.2-1.1.2-1.6.1-1.1-.2-2.2.3-2.8 1.2-.7.8-1 2-1 3.1.1 1.1.5 2.1 1.2 2.8.7.7 1.8 1.1 2.8 1.1.6 0 1.2-.1 1.7-.4"></path></svg>` };
        if (design === 'Cooled') return { icon: `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12h20"></path><path d="M12 2v20"></path><path d="m4.93 4.93 14.14 14.14"></path><path d="m4.93 19.07 14.14-14.14"></path><path d="M12 16a4 4 0 000-8"></path><path d="M12 16a4 4 0 010-8"></path></svg>` };
        if (lowerCaseName.includes('settling')) return { icon: `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17.7 7.7a5 5 0 11-10 0"></path><path d="M12 12.5a5 5 0 100 10 5 5 0 100-10z"></path><path d="M12 2v2.5"></path><path d="M12 20v-2.5"></path><path d="M6.3 6.3l1.8 1.8"></path><path d="M15.9 15.9l1.8 1.8"></path><path d="M2 12h2.5"></path><path d="M20 12h-2.5"></path><path d="M6.3 17.7l1.8-1.8"></path><path d="m15.9 8.1 1.8-1.8"></path></svg>` };
        return { icon: `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>` };
    };
  
    // Group zones into pages
    const pages: Zone[][] = [];
    let currentPage: Zone[] = [];
    let currentWidth = 0;
    baselineData.zones.forEach((zone, index) => {
        const isLastZone = index === baselineData.zones.length - 1;
        const cardWidth = CARD_WIDTH_PX;
        const arrowAndGapWidth = isLastZone ? 0 : ARROW_WIDTH_PX + GAP_PX;
        
        if ((currentWidth + cardWidth + arrowAndGapWidth) > CONTENT_WIDTH_PX && currentPage.length > 0) {
            pages.push(currentPage);
            currentPage = [];
            currentWidth = 0;
        }
        currentPage.push(zone);
        currentWidth += cardWidth + (currentPage.length > 1 ? GAP_PX : 0);
    });
    if (currentPage.length > 0) {
        pages.push(currentPage);
    }
  
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = `${PAGE_WIDTH_IN * DPI}px`;
    container.style.height = `${PAGE_HEIGHT_IN * DPI}px`;
    container.style.backgroundColor = 'white';
    document.body.appendChild(container);
  
    const generatePageHtml = (zones: Zone[], pageNum: number, totalPages: number, isContinuation: boolean) => {
      const styles = `
        <style>
          * { box-sizing: border-box; }
          body { 
            font-family: 'Segoe UI', 'Roboto', Arial, sans-serif; 
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact; 
            margin: 0; 
            padding: 0; 
            background-color: #fff; 
            font-size: 11pt;
            line-height: 1.5;
          }
          .page-container { display: flex; flex-direction: column; width: ${PAGE_WIDTH_IN * DPI}px; height: ${PAGE_HEIGHT_IN * DPI}px; padding: ${MARGIN_IN * DPI}px; }
          .header { text-align: left; border-bottom: 2px solid #E5E7EB; padding-bottom: 16px; flex-shrink: 0; }
          h1 { font-size: 28pt; color: #1E40AF; margin: 0; font-weight: 700; }
          .subtitle { font-size: 14pt; color: #6B7280; margin: 4px 0 0 0; }
          .footer { text-align: right; border-top: 1px solid #E5E7EB; padding-top: 12px; margin-top: auto; font-size: 10pt; color: #6B7280; flex-shrink: 0; }
          .content-area { flex-grow: 1; display: flex; flex-direction: row; align-items: flex-start; justify-content: flex-start; gap: ${GAP_PX}px; width: 100%; padding-top: 48px; }
          .arrow { flex-shrink: 0; width: ${ARROW_WIDTH_PX}px; text-align: center; font-size: 48px; color: #D1D5DB; font-weight: 100; padding-top: 180px; }
          .stage-card {
            width: ${CARD_WIDTH_PX}px;
            border: 1px solid #cccccc;
            border-radius: 8px;
            background-color: #FFFFFF;
            display: flex;
            flex-direction: column;
            overflow: hidden;
          }
          .stage-header { display: flex; align-items: center; gap: 16px; padding: 24px; border-bottom: 1px solid #cccccc; background-color: #F9FAFB; }
          .stage-icon { flex-shrink: 0; }
          .stage-title { font-size: 16pt; font-weight: 600; color: #1E40AF; margin: 0; line-height: 1.2; word-wrap: break-word; }
          .stage-subtitle { font-size: 11pt; color: #6B7280; }
          .stage-body { padding: 24px; display: flex; flex-direction: column; gap: 28px; flex-grow: 1; }
          h3 { font-size: 12pt; font-weight: 600; color: #111827; margin: 0 0 12px 0; border-bottom: 1px solid #E5E7EB; padding-bottom: 8px; }
          .param-table { width: 100%; border-collapse: collapse; font-size: 10.5pt; }
          .param-table td { padding: 6px 4px; vertical-align: baseline; }
          .param-label { color: #6B7280; text-align: left; width: 65%; }
          .param-value { font-weight: 500; font-family: 'Consolas', 'Menlo', monospace; color: #1D4ED8; text-align: right; white-space: normal; }
          .subsystem-card { background-color: #F3F4F6; border: 1px solid #E5E7EB; border-radius: 8px; padding: 16px; }
          .subsystem-title { font-size: 11pt; font-weight: 600; color: #3B82F6; margin: 0 0 10px; }
          .purpose-notes { font-size: 10.5pt; color: #4B5563; font-style: italic; background-color: #F3F4F6; padding: 16px; border-radius: 6px; border-left: 4px solid #60A5FA; line-height: 1.6; }
        </style>
      `;
  
      const renderParamTable = (params: { label: string, value: string | undefined, unit: string }[]) => {
        const rows = params.map(({ label, value, unit }) => {
            if (value === undefined || value === null || value === '') return '';
            const fullValue = `${value} ${unit}`.trim();
            return `<tr>
                      <td class="param-label">${label}</td>
                      <td class="param-value">${fullValue}</td>
                    </tr>`;
        }).filter(Boolean).join('');

        if (!rows) return '';
        return `<table class="param-table"><tbody>${rows}</tbody></table>`;
      };
  
      const renderSubSystemFlow = (sub: SubSystem) => {
        let content = '', icon = '', params = [];
        switch(sub.type) {
            case 'HeaterBox': 
                icon = '🔥';
                params.push({ label: 'Burner Rating', value: sub.data.burnerRating.value, unit: 'MM BTU/Hr' });
                content = renderParamTable(params);
                break;
            case 'Cooler':
                icon = '❄️';
                const tempIn = parseFloat(sub.data.chilledWaterCoil.tempIn.value);
                const tempOut = parseFloat(sub.data.chilledWaterCoil.tempOut.value);
                const deltaT = (!isNaN(tempIn) && !isNaN(tempOut)) ? `${(tempOut - tempIn).toFixed(1)}` : 'N/A';
                params.push({ label: 'CW ΔT', value: deltaT, unit: '°F' });
                content = renderParamTable(params);
                break;
            case 'AirSupplyHouse':
                icon = '💨';
                params.push({ label: 'Supply Airflow', value: sub.data.airSystem.airflow.value, unit: 'CFM' });
                content = renderParamTable(params);
                break;
        }
        return `<div class="subsystem-card"><h4 class="subsystem-title">${icon} ${sub.name}</h4>${content}</div>`;
      };
  
      const headerHtml = `
        <div class="header">
          <h1>Process Flow Specification</h1>
          <p class="subtitle"><strong>Customer:</strong> ${baselineData.customerInfo?.name?.value || 'N/A'} | <strong>Location:</strong> ${baselineData.customerInfo?.location?.value || 'N/A'}</p>
        </div>`;
      
      const footerHtml = `
        <div class="footer">
          Generated on: ${new Date().toLocaleDateString()} | Page ${pageNum} of ${totalPages}
        </div>`;
  
      const zonesHtml = zones.map((zone, index) => {
        const { icon } = getZoneInfo(zone);
        const isLastCardOnPage = index === zones.length - 1;
        const showArrow = !isLastCardOnPage || (isLastCardOnPage && pageNum < totalPages);
        const processTime = ((parseFloat(zone.data.zoneLength.value) / parseFloat(baselineData.conveyorSpeed.value || '1')) || 0);

        const coreParams = renderParamTable([
            { label: 'Temperature', value: zone.data.temperature.value, unit: '°F' },
            { label: 'Rel. Humidity', value: zone.data.relativeHumidity.value, unit: '%' },
            { label: 'Process Time', value: processTime > 0 ? processTime.toFixed(2) : 'N/A', unit: 'min' }
        ]);

        const airSystemsParams = renderParamTable([
            { label: 'Supply Airflow', value: zone.data.supply.airflow.value, unit: 'CFM' },
            { label: 'Exhaust Airflow', value: zone.data.exhaust.airflow.value, unit: 'CFM' }
        ]);

        return `
          <div class="stage-card">
             <div class="stage-header">
                <div class="stage-icon">${icon}</div>
                <div>
                    <h2 class="stage-title">${zone.name}</h2>
                    <div class="stage-subtitle">${zone.data.design} Stage</div>
                </div>
            </div>
            <div class="stage-body">
                ${zone.data.purpose?.value ? `<div class="purpose-notes">${zone.data.purpose.value}</div>` : ''}
                ${coreParams ? `<div><h3>Core Parameters</h3>${coreParams}</div>` : ''}
                ${airSystemsParams ? `<div><h3>Air Systems</h3>${airSystemsParams}</div>` : ''}
                ${zone.subSystems.length > 0 ? `<div><h3>Sub-Systems</h3><div style="display: flex; flex-direction: column; gap: 12px;">
                    ${zone.subSystems.map(renderSubSystemFlow).join('')}
                </div></div>` : ''}
            </div>
          </div>
          ${showArrow ? '<div class="arrow">&rarr;</div>' : ''}
        `;
      }).join('');
  
      return `${styles}<div class="page-container">${headerHtml}<div class="content-area">${isContinuation ? '<div class="arrow">...&rarr;</div>' : ''}${zonesHtml}</div>${footerHtml}</div>`;
    };
  
    try {
      for (let i = 0; i < pages.length; i++) {
        const pageZones = pages[i];
        const isContinuation = i > 0;
        
        container.innerHTML = generatePageHtml(pageZones, i + 1, pages.length, isContinuation);
  
        const canvas = await html2canvas(container, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
  
        if (i > 0) {
          pdf.addPage();
        }
  
        pdf.addImage(imgData, 'PNG', 0, 0, PAGE_WIDTH_IN, PAGE_HEIGHT_IN);
      }
  
      const safeCustomerName = (baselineData.customerInfo?.name?.value || 'specification').replace(/[\s\W]+/g, '-').toLowerCase();
      pdf.save(`process-flow-${safeCustomerName}.pdf`);
  
    } catch (error) {
        console.error("Failed to generate PDF:", error);
        setError("An error occurred while generating the PDF. Please try again.");
    } finally {
        if (document.body.contains(container)) {
            document.body.removeChild(container);
        }
    }
  };

  if (!isAuthenticated) {
    return <LoginOverlay onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="min-h-screen bg-background font-sans">
      <Header 
        onSave={handleSaveConfiguration} 
        onLoad={triggerFileUpload} 
        onOpenTrendChart={() => setIsTrendChartVisible(true)}
        onDownloadTemplate={handleDownloadTemplate}
        onDownloadProcessFlow={handleDownloadProcessFlow}
      />
       <input
        type="file"
        ref={fileInputRef}
        onChange={handleLoadConfiguration}
        accept=".json"
        className="hidden"
      />
      <main className="p-4 lg:p-8">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          <div className="xl:col-span-4">
            <DataInputForm
              baselineData={baselineData}
              setBaselineData={setBaselineData}
              historicalData={historicalData}
              setHistoricalData={setHistoricalData}
              activeReadingIndex={activeReadingIndex}
              setActiveReadingIndex={setActiveReadingIndex}
              onAnalyze={handleAnalyze}
              isLoading={isLoading}
              highlightedZoneId={highlightedZoneId}
              setHighlightedZoneId={setHighlightedZoneId}
              activeTab={activeView}
              setActiveTab={setActiveView}
              problemStatement={problemStatement}
              setProblemStatement={setProblemStatement}
            />
          </div>
          <div className="xl:col-span-8 flex flex-col gap-8">
            <SchematicDisplay 
              currentData={activeReading} 
              baselineData={baselineData} 
              onZoneSelect={setHighlightedZoneId} 
              displayMode={activeView === 'current' ? 'live' : 'baseline'}
              setDisplayMode={(mode) => setActiveView(mode === 'live' ? 'current' : 'baseline')}
            />
            <AnalysisPanel 
                analysis={analysis} 
                isLoading={isLoading} 
                error={error} 
                currentData={activeReading} 
                onCreateChangeRequest={handleCreateChangeRequest}
            />
             <ChangeManagementPanel 
                changeRequests={changeRequests}
                setChangeRequests={setChangeRequests}
                customerInfo={baselineData.customerInfo}
                analysis={analysis}
                baselineData={baselineData}
                historicalData={historicalData}
                problemStatement={problemStatement}
             />
            <SmartAgentPanel 
                history={chatHistory} 
                onSendMessage={handleSendMessage} 
                isLoading={isChatLoading} 
            />
          </div>
        </div>
      </main>
      {isTrendChartVisible && (
        <TrendChartModal
          historicalData={historicalData}
          baselineData={baselineData}
          onClose={() => setIsTrendChartVisible(false)}
        />
      )}
    </div>
  );
}