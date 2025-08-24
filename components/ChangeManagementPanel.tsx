
import React, { useState, useEffect } from 'react';
import type { ChangeRequest, CustomerInfo, AIAnalysis, ProcessData } from '../types';
import { suggestChangeRequest } from '../services/geminiService';

interface ChangeManagementPanelProps {
  changeRequests: ChangeRequest[];
  setChangeRequests: React.Dispatch<React.SetStateAction<ChangeRequest[]>>;
  customerInfo: CustomerInfo;
  analysis: AIAnalysis | null;
  baselineData: ProcessData;
  historicalData: ProcessData[];
}

const ChangeManagementPanel = ({ changeRequests, setChangeRequests, customerInfo, analysis, baselineData, historicalData }: ChangeManagementPanelProps): React.ReactNode => {
    const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
    const [isSuggesting, setIsSuggesting] = useState<boolean>(false);

    const activeRequest = changeRequests.find(req => req.id === activeRequestId);

    useEffect(() => {
        if (!activeRequestId && changeRequests.length > 0) {
            setActiveRequestId(changeRequests[changeRequests.length - 1].id);
        }
        if (activeRequestId && !changeRequests.some(req => req.id === activeRequestId)) {
            setActiveRequestId(changeRequests.length > 0 ? changeRequests[0].id : null);
        }
    }, [changeRequests, activeRequestId]);

    const handleUpdate = (field: keyof ChangeRequest, value: any) => {
        if (!activeRequestId) return;
        setChangeRequests(prev => 
            prev.map(req => req.id === activeRequestId ? { ...req, [field]: value } : req)
        );
    };

    const handleSuggestNew = async () => {
        if (!analysis) {
            alert("Please run an analysis first to suggest a new change request.");
            return;
        }
        setIsSuggesting(true);
        try {
            const suggestion = await suggestChangeRequest(analysis, baselineData, historicalData);
            const newRequest: ChangeRequest = {
                ...suggestion,
                id: crypto.randomUUID(),
                status: 'Draft',
            };
            setChangeRequests(prev => [...prev, newRequest]);
            setActiveRequestId(newRequest.id);
        } catch (error) {
            console.error("Failed to suggest change request:", error);
            alert(`Sorry, there was an error suggesting a change request: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsSuggesting(false);
        }
    };
    
    const handleAddNewManually = () => {
        const newRequest: ChangeRequest = {
            id: crypto.randomUUID(),
            title: 'New Change Request',
            justification: '',
            recommendedAction: '',
            expectedResults: '',
            riskLevel: 'Low',
            riskDetails: '',
            estimatedCost: '',
            status: 'Draft',
        };
        setChangeRequests(prev => [...prev, newRequest]);
        setActiveRequestId(newRequest.id);
    };

    const handleDownloadDoc = () => {
        if (!activeRequest) return;
    
        const styles = `
          <style>
            body { font-family: Arial, sans-serif; font-size: 11pt; color: #333; }
            h1, h2, h3 { color: #1E40AF; }
            h1 { font-size: 20pt; text-align: center; margin-bottom: 24px; }
            h2 { font-size: 14pt; border-bottom: 2px solid #1E40AF; padding-bottom: 4px; margin-top: 24px; }
            .section { margin-bottom: 16px; }
            .section-title { font-weight: bold; color: #111827; font-size: 12pt; margin-bottom: 6px; }
            .section-content { background-color: #F9FAFB; border: 1px solid #E5E7EB; padding: 10px; border-radius: 4px; min-height: 40px; }
            table { border-collapse: collapse; width: 100%; margin-top: 10px; }
            td, th { border: 1px solid #D1D5DB; text-align: left; padding: 8px; }
            th { background-color: #F3F4F6; font-weight: bold; }
            .approval-table { margin-top: 40px; }
            .approval-table td { height: 60px; vertical-align: bottom; }
          </style>
        `;
    
        const fullHtml = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <title>Process Change Request</title>
              ${styles}
            </head>
            <body>
              <h1>Process Change Request Form</h1>
              
              <h2>Project Details</h2>
              <table>
                <tr>
                  <th style="width:25%;">Customer:</th>
                  <td>${customerInfo?.name?.value || 'N/A'}</td>
                </tr>
                <tr>
                  <th>Location / Site:</th>
                  <td>${customerInfo?.location?.value || 'N/A'}</td>
                </tr>
                 <tr>
                  <th>Date Prepared:</th>
                  <td>${new Date().toLocaleDateString()}</td>
                </tr>
              </table>
    
              <h2>Change Request Details</h2>
              <table>
                 <tr>
                  <th style="width:25%;">Change Title:</th>
                  <td>${activeRequest.title}</td>
                </tr>
                <tr>
                  <th>Status:</th>
                  <td>${activeRequest.status}</td>
                </tr>
              </table>
              
              <div class="section">
                <p class="section-title">Justification / Problem Description:</p>
                <div class="section-content">${activeRequest.justification.replace(/\n/g, '<br/>')}</div>
              </div>
              
              <div class="section">
                <p class="section-title">Recommended Action:</p>
                <div class="section-content">${activeRequest.recommendedAction.replace(/\n/g, '<br/>')}</div>
              </div>

              <div class="section">
                <p class="section-title">Expected Results / Benefits:</p>
                <div class="section-content">${activeRequest.expectedResults.replace(/\n/g, '<br/>')}</div>
              </div>

              <h2>Impact & Cost Analysis</h2>
               <table>
                 <tr>
                  <th style="width:25%;">Risk Level:</th>
                  <td>${activeRequest.riskLevel}</td>
                </tr>
                 <tr>
                  <th>Risk Details / Mitigation Plan:</th>
                  <td>${activeRequest.riskDetails.replace(/\n/g, '<br/>')}</td>
                </tr>
                <tr>
                  <th>Estimated Cost:</th>
                  <td>${activeRequest.estimatedCost}</td>
                </tr>
              </table>

              <h2>Approval</h2>
              <table class="approval-table">
                <tr>
                    <td style="width:50%;"><strong>Approved By (Customer):</strong></td>
                    <td style="width:50%;"><strong>Approved By (Technician):</strong></td>
                </tr>
                <tr>
                    <td><strong>Date:</strong></td>
                    <td><strong>Date:</strong></td>
                </tr>
              </table>
            </body>
          </html>
        `;
    
        const blob = new Blob([fullHtml], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const safeTitle = activeRequest.title.replace(/[\s\W]+/g, '-').toLowerCase();
        link.download = `change-request-${safeTitle}.doc`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    if (changeRequests.length === 0) {
        return (
            <div id="change-management-panel" className="bg-panel p-6 rounded-lg shadow-md flex flex-col items-center justify-center min-h-[200px]">
                 <h2 className="text-2xl font-bold text-text-primary mb-4 text-center">Change Management & Action Plan</h2>
                 <p className="text-text-secondary mb-4 text-center">No change requests have been created yet.</p>
                 <div className="flex items-center gap-4">
                    <button 
                        onClick={handleSuggestNew} 
                        disabled={isSuggesting || !analysis} 
                        className="px-4 py-2 bg-interactive text-white font-semibold rounded-md hover:bg-interactive-hover transition-colors flex items-center gap-2 disabled:bg-slate-400 disabled:cursor-not-allowed" 
                        title={!analysis ? "Run an analysis to enable suggestions" : "Suggest a change request based on the latest analysis"}
                    >
                        {isSuggesting ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                Suggesting...
                            </>
                        ) : (
                            <>
                               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M11.251.068a.5.5 0 0 1 .227.58L9.677 6.5H13a.5.5 0 0 1 .364.843l-8 8.5a.5.5 0 0 1-.842-.49L6.323 9.5H3a.5.5 0 0 1-.364-.843l8-8.5a.5.5 0 0 1 .615-.032zM6.636 10.07l-3.232 3.449 6.25-6.6-3.232-3.449-6.25 6.6z"/><path d="M4.157 8.012a.5.5 0 0 1 .58.227l-2.45 4.898a.5.5 0 1 1-.894-.448l2.45-4.898a.5.5 0 0 1 .314-.227z"/></svg>
                                Suggest with AI
                            </>
                        )}
                    </button>
                    <button
                        onClick={handleAddNewManually}
                        className="px-4 py-2 bg-slate-200 text-text-primary font-semibold rounded-md hover:bg-slate-300 transition-colors"
                        title="Add a new blank change request"
                    >
                        + Add Manually
                    </button>
                 </div>
            </div>
        );
    }

    return (
        <div id="change-management-panel" className="bg-panel p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold text-text-primary mb-4">Change Management & Action Plan</h2>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 min-h-[400px]">
                <div className="md:col-span-4 lg:col-span-3 border-r border-border pr-4">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="font-semibold text-text-primary">Requests</h3>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleAddNewManually}
                                className="text-sm bg-slate-200 text-text-primary font-semibold py-1 px-2 rounded-md hover:bg-slate-300 transition-colors"
                                title="Add a new change request manually"
                            >
                                + Add
                            </button>
                            <button 
                                onClick={handleSuggestNew} 
                                disabled={isSuggesting || !analysis} 
                                className="text-sm bg-interactive/10 text-interactive font-semibold py-1 px-2 rounded-md hover:bg-interactive/20 transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed" 
                                title={!analysis ? "Run an analysis to enable suggestions" : "Suggest a new change request based on the latest analysis"}
                            >
                                 <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M11.251.068a.5.5 0 0 1 .227.58L9.677 6.5H13a.5.5 0 0 1 .364.843l-8 8.5a.5.5 0 0 1-.842-.49L6.323 9.5H3a.5.5 0 0 1-.364-.843l8-8.5a.5.5 0 0 1 .615-.032zM6.636 10.07l-3.232 3.449 6.25-6.6-3.232-3.449-6.25 6.6z"/><path d="M4.157 8.012a.5.5 0 0 1 .58.227l-2.45 4.898a.5.5 0 1 1-.894-.448l2.45-4.898a.5.5 0 0 1 .314-.227z"/></svg>
                                {isSuggesting ? '...' : 'Suggest'}
                            </button>
                        </div>
                    </div>
                    <ul className="space-y-1">
                        {changeRequests.map(req => (
                            <li key={req.id}>
                                <button
                                    onClick={() => setActiveRequestId(req.id)}
                                    className={`w-full text-left p-2 rounded-md text-sm truncate ${
                                        activeRequestId === req.id 
                                        ? 'bg-interactive text-white font-semibold' 
                                        : 'text-text-primary hover:bg-slate-100'
                                    }`}
                                >
                                    {req.title}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="md:col-span-8 lg:col-span-9">
                    {!activeRequest ? (
                        <div className="flex items-center justify-center h-full text-text-secondary">
                            <p>Select a change request to view its details.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">Change Title</label>
                                <input type="text" value={activeRequest.title} onChange={e => handleUpdate('title', e.target.value)} className="w-full bg-background border border-border text-text-primary font-semibold rounded-md p-2 focus:ring-interactive focus:border-interactive" />
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">Justification / Problem Description</label>
                                <textarea rows={4} value={activeRequest.justification} onChange={e => handleUpdate('justification', e.target.value)} className="w-full bg-background border border-border text-text-primary rounded-md p-2 focus:ring-interactive focus:border-interactive" />
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">Recommended Action</label>
                                <textarea rows={4} value={activeRequest.recommendedAction} onChange={e => handleUpdate('recommendedAction', e.target.value)} className="w-full bg-background border border-border text-text-primary rounded-md p-2 focus:ring-interactive focus:border-interactive" />
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">Expected Results / Benefits</label>
                                <textarea rows={2} value={activeRequest.expectedResults} onChange={e => handleUpdate('expectedResults', e.target.value)} placeholder="e.g., Reduce temperature deviation to <2%, improve surface finish..." className="w-full bg-background border border-border text-text-primary rounded-md p-2 focus:ring-interactive focus:border-interactive placeholder:italic" />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-1">Risk Level</label>
                                    <select value={activeRequest.riskLevel} onChange={e => handleUpdate('riskLevel', e.target.value)} className="w-full bg-background border border-border rounded-md p-2 focus:ring-interactive focus:border-interactive">
                                        <option>Low</option>
                                        <option>Medium</option>
                                        <option>High</option>
                                    </select>
                                </div>
                                 <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-1">Estimated Cost</label>
                                    <input type="text" value={activeRequest.estimatedCost} onChange={e => handleUpdate('estimatedCost', e.target.value)} placeholder="$0.00" className="w-full bg-background border border-border text-text-primary rounded-md p-2 focus:ring-interactive focus:border-interactive" />
                                </div>
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">Risk Details / Mitigation Plan</label>
                                <textarea rows={2} value={activeRequest.riskDetails} onChange={e => handleUpdate('riskDetails', e.target.value)} placeholder="e.g., Minimal risk of production downtime. Change can be performed during scheduled maintenance..." className="w-full bg-background border border-border text-text-primary rounded-md p-2 focus:ring-interactive focus:border-interactive placeholder:italic" />
                            </div>
                            <div className="flex justify-between items-center pt-4 border-t border-border">
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-1">Status</label>
                                    <select value={activeRequest.status} onChange={e => handleUpdate('status', e.target.value)} className="w-full bg-background border border-border rounded-md p-2 focus:ring-interactive focus:border-interactive">
                                        <option>Draft</option>
                                        <option>Pending Approval</option>
                                        <option>Approved</option>
                                    </select>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={handleDownloadDoc} className="px-3 py-2 bg-interactive text-white font-semibold rounded-md hover:bg-interactive-hover transition-colors flex items-center gap-2 text-sm">
                                         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/><path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/></svg>
                                        Download .doc
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChangeManagementPanel;
