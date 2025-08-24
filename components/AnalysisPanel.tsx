



import React, { useRef } from 'react';
import type { AIAnalysis, ProcessData } from '../types';

interface AnalysisPanelProps {
  analysis: AIAnalysis | null;
  isLoading: boolean;
  error: string | null;
  currentData: ProcessData | null;
  onCreateChangeRequest: (rca: AIAnalysis['rootCauseAnalysis'][0]) => void;
}

const StatusBadge = ({ status }: { status: 'In-Compliance' | 'Warning' | 'Critical' }): React.ReactNode => {
    const statusInfo = {
        'In-Compliance': { classes: 'bg-success text-white', text: 'In-Compliance' },
        'Warning': { classes: 'bg-warning text-white', text: 'Warning >5% Deviation' },
        'Critical': { classes: 'bg-danger text-white', text: 'Critical >10% Deviation' },
    };
    const currentStatus = statusInfo[status] || statusInfo['Warning']; // Fallback for safety
    return (
        <span className={`px-3 py-1 text-sm font-bold rounded-full ${currentStatus.classes}`}>
            {currentStatus.text}
        </span>
    );
}

const AnalysisPanel = ({ analysis, isLoading, error, currentData, onCreateChangeRequest }: AnalysisPanelProps): React.ReactNode => {
  const reportContentRef = useRef<HTMLDivElement>(null);
  
  const handleDownloadDoc = () => {
    if (!currentData || !analysis) return;

    const styles = `
      <style>
        body { font-family: Arial, sans-serif; font-size: 11pt; }
        h1, h2, h3 { color: #1E40AF; }
        h1 { font-size: 18pt; text-align: center; margin-bottom: 24px; }
        h2 { font-size: 14pt; border-bottom: 1px solid #cccccc; padding-bottom: 4px; margin-top: 20px; page-break-after: avoid; }
        table { border-collapse: collapse; width: 100%; margin-top: 10px; font-size: 10pt; }
        th, td { border: 1px solid #999999; text-align: left; padding: 6px; }
        th { background-color: #E5E7EB; font-weight: bold; }
        p { margin-top: 5px; }
        .no-faults { font-style: italic; color: #6B7280; }
        .rca-item { border: 1px solid #E5E7EB; padding: 10px; margin-bottom: 10px; page-break-inside: avoid; }
        .rca-cause { font-weight: bold; color: #3B82F6; font-size: 12pt; }
      </style>
    `;

    const detailsHtml = `
      <h2>Report Details</h2>
      <table>
        <tr>
          <td style="width:25%;"><strong>Customer:</strong></td>
          <td style="width:25%;">${currentData.customerInfo?.name?.value || 'N/A'}</td>
          <td style="width:25%;"><strong>Date of Collection:</strong></td>
          <td style="width:25%;">${currentData.collectionDate?.value || 'N/A'}</td>
        </tr>
        <tr>
          <td><strong>Location:</strong></td>
          <td>${currentData.customerInfo?.location?.value || 'N/A'}</td>
          <td><strong>Contact:</strong></td>
          <td>${currentData.customerInfo?.contactPerson?.value || 'N/A'}</td>
        </tr>
      </table>
    `;

    const faultsHtml = `
      <h2>Identified Faults (Latest Reading)</h2>
      ${analysis.faults.length === 0 ? '<p class="no-faults">No significant faults detected in the latest reading.</p>' : `
      <table>
        <thead>
          <tr>
            <th>Parameter</th>
            <th>Zone</th>
            <th>Baseline</th>
            <th>Current</th>
            <th>Deviation</th>
          </tr>
        </thead>
        <tbody>
          ${analysis.faults.map(f => `
            <tr>
              <td>${f.parameter}</td>
              <td>${f.zone}</td>
              <td>${f.baselineValue}</td>
              <td>${f.currentValue}</td>
              <td>${f.deviation}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>`}
    `;

    const trendsHtml = `
      <h2>Trend Analysis & Predictions</h2>
      ${analysis.trendAnalysis.length === 0 ? '<p class="no-faults">No significant trends detected across historical readings.</p>' : `
      <table>
        <thead>
          <tr>
            <th>Parameter</th>
            <th>Zone</th>
            <th>Trend Description</th>
            <th>Prediction</th>
          </tr>
        </thead>
        <tbody>
          ${analysis.trendAnalysis.map(t => `
            <tr>
              <td>${t.parameter}</td>
              <td>${t.zone}</td>
              <td>${t.trendDescription}</td>
              <td>${t.prediction}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>`}
    `;

    const rcaHtml = `
      <h2>Root Cause Analysis & Recommendations</h2>
      ${analysis.rootCauseAnalysis.map(rca => `
        <div class="rca-item">
          <p class="rca-cause">${rca.cause}</p>
          <p><strong>Reasoning:</strong> ${rca.reasoning}</p>
          <p><strong>Recommendation:</strong> ${rca.recommendation}</p>
        </div>
      `).join('')}
    `;

    const fullHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Process Analysis Report</title>
          ${styles}
        </head>
        <body>
          <h1>Process Analysis Report</h1>
          ${detailsHtml}
          ${faultsHtml}
          ${trendsHtml}
          ${rcaHtml}
        </body>
      </html>
    `;

    const blob = new Blob([fullHtml], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'process-analysis-report.doc';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };


  if (isLoading) {
    return (
        <div className="bg-panel p-6 rounded-lg shadow-md flex flex-col items-center justify-center min-h-[300px]">
            <svg className="animate-spin h-12 w-12 text-interactive mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <h2 className="text-xl font-semibold text-text-primary">Process Analysis in Progress...</h2>
            <p className="text-text-secondary">Analyzing trends and current data. Please wait.</p>
        </div>
    );
  }

  if (error) {
    return (
        <div className="bg-panel p-6 rounded-lg shadow-md min-h-[300px]">
            <h2 className="text-xl font-bold text-danger mb-2">Analysis Failed</h2>
            <p className="text-text-secondary mb-4">An error occurred during the analysis process:</p>
            <pre className="bg-background p-4 rounded-md text-danger whitespace-pre-wrap">{error}</pre>
        </div>
    );
  }

  if (!analysis) {
     return (
        <div className="bg-panel p-6 rounded-lg shadow-md flex flex-col items-center justify-center min-h-[300px]">
            <h2 className="text-xl font-semibold text-text-primary">Awaiting Analysis</h2>
            <p className="text-text-secondary text-center">Enter or load process data, then click "Run Process Analysis" to see results.</p>
        </div>
    );
  }

  return (
    <div className="bg-panel p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-text-primary">Process Analysis Report</h2>
          <div className="flex items-center gap-4">
             <StatusBadge status={analysis.overallStatus} />
             <button
                onClick={handleDownloadDoc}
                disabled={!currentData || !analysis}
                className="px-3 py-2 bg-slate-200 text-text-primary font-semibold rounded-md hover:bg-slate-300 transition-colors flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                title="Download Report as DOC"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                    <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
                </svg>
                <span>DOC</span>
            </button>
          </div>
      </div>

      <div ref={reportContentRef} className="space-y-8 bg-white p-4">
        <div>
            <h3 className="text-lg font-semibold text-heading border-b border-border pb-2 mb-3">Report Details</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-text-secondary">
                <div><span className="font-semibold text-text-primary">Customer:</span> {currentData?.customerInfo?.name?.value || 'N/A'}</div>
                <div><span className="font-semibold text-text-primary">Date of Latest Reading:</span> {currentData?.collectionDate?.value || 'N/A'}</div>
                <div><span className="font-semibold text-text-primary">Location:</span> {currentData?.customerInfo?.location?.value || 'N/A'}</div>
                <div><span className="font-semibold text-text-primary">Contact:</span> {currentData?.customerInfo?.contactPerson?.value || 'N/A'}</div>
            </div>
        </div>
        <div>
            <h3 className="text-lg font-semibold text-heading border-b border-border pb-2 mb-3">Identified Faults (Latest Reading)</h3>
            {analysis.faults.length === 0 ? <p className="text-text-secondary italic">No significant faults detected in the latest reading.</p> : (
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-100">
                        <tr>
                            <th className="p-2 font-semibold">Parameter</th>
                            <th className="p-2 font-semibold">Zone</th>
                            <th className="p-2 font-semibold">Baseline</th>
                            <th className="p-2 font-semibold">Current</th>
                            <th className="p-2 font-semibold">Deviation</th>
                        </tr>
                    </thead>
                    <tbody>
                        {analysis.faults.map((fault, index) => (
                            <tr key={index} className="border-b border-border">
                                <td className="p-2">{fault.parameter}</td>
                                <td className="p-2">{fault.zone}</td>
                                <td className="p-2 font-mono">{fault.baselineValue}</td>
                                <td className="p-2 font-mono text-danger font-semibold">{fault.currentValue}</td>
                                <td className="p-2">{fault.deviation}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            )}
        </div>
        <div>
            <h3 className="text-lg font-semibold text-heading border-b border-border pb-2 mb-3">Trend Analysis & Predictions</h3>
            {analysis.trendAnalysis.length === 0 ? <p className="text-text-secondary italic">No significant trends detected across historical readings.</p> : (
            <div className="overflow-x-auto">
                 <table className="w-full text-left">
                    <thead className="bg-slate-100">
                        <tr>
                            <th className="p-2 font-semibold">Parameter</th>
                            <th className="p-2 font-semibold">Zone</th>
                            <th className="p-2 font-semibold">Trend Description</th>
                            <th className="p-2 font-semibold">Prediction</th>
                        </tr>
                    </thead>
                    <tbody>
                        {analysis.trendAnalysis.map((trend, index) => (
                            <tr key={index} className="border-b border-border">
                                <td className="p-2">{trend.parameter}</td>
                                <td className="p-2">{trend.zone}</td>
                                <td className="p-2">{trend.trendDescription}</td>
                                <td className="p-2 text-warning font-semibold">{trend.prediction}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            )}
        </div>

        <div>
            <h3 className="text-lg font-semibold text-heading border-b border-border pb-2 mb-3">Root Cause Analysis & Recommendations</h3>
            <div className="space-y-4">
                 {analysis.rootCauseAnalysis.map((rca, index) => (
                    <div key={index} className="bg-slate-50 p-4 rounded-md border border-slate-200">
                        <h4 className="font-semibold text-interactive">{rca.cause}</h4>
                        <p className="text-sm mt-1"><span className="font-semibold text-text-secondary">Reasoning:</span> {rca.reasoning}</p>
                        <p className="text-sm mt-1"><span className="font-semibold text-text-secondary">Recommendation:</span> {rca.recommendation}</p>
                        <button
                          onClick={() => onCreateChangeRequest(rca)}
                          className="text-sm mt-3 bg-interactive/90 text-white font-semibold py-1 px-3 rounded-md hover:bg-interactive transition-colors"
                        >
                          + Create Change Request
                        </button>
                    </div>
                 ))}
            </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisPanel;