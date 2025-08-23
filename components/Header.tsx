import React from 'react';

interface HeaderProps {
  onSave: () => void;
  onLoad: () => void;
  onOpenTrendChart: () => void;
  onDownloadTemplate: () => void;
  onDownloadProcessFlow: () => void;
}

const Header = ({ onSave, onLoad, onOpenTrendChart, onDownloadTemplate, onDownloadProcessFlow }: HeaderProps): React.ReactNode => {
  return (
    <header className="bg-panel py-3 px-6 shadow-md border-b border-border sticky top-0 z-10">
      <div className="flex justify-between items-center max-w-screen-2xl mx-auto">
        {/* Left Side: Title and Subtitle */}
        <div className="flex items-center gap-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-interactive flex-shrink-0"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path><path d="M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"></path><path d="M12 4v2"></path><path d="M12 18v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M20 12h-2"></path><path d="M6 12H4"></path><path d="m4.93 19.07 1.41-1.41"></path><path d="m17.66 6.34 1.41-1.41"></path></svg>
          <div>
            <h1 className="text-2xl font-bold text-heading tracking-tight">
              Process Engineering Monitor
            </h1>
            <p className="text-sm text-text-secondary">Process Data Analysis & Diagnostics</p>
          </div>
        </div>
        
        {/* Right Side: Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenTrendChart}
            className="px-4 py-2 bg-white text-text-primary font-semibold rounded-md border border-border hover:bg-slate-50 hover:border-slate-300 transition-colors text-sm"
            title="Visualize data trends over time"
          >
            Trend Chart
          </button>
          <button
            onClick={onDownloadProcessFlow}
            className="px-4 py-2 bg-white text-text-primary font-semibold rounded-md border border-border hover:bg-slate-50 hover:border-slate-300 transition-colors text-sm"
            title="Download a customer-facing process flow document"
          >
            Process Flow
          </button>
          <button
            onClick={onDownloadTemplate}
            className="px-4 py-2 bg-white text-text-primary font-semibold rounded-md border border-border hover:bg-slate-50 hover:border-slate-300 transition-colors text-sm"
            title="Download a blank data collection sheet"
          >
            Template
          </button>
          
          <div className="h-6 w-px bg-border mx-2"></div> {/* Vertical separator */}

          <button 
            onClick={onSave} 
            className="px-4 py-2 bg-white text-text-primary font-semibold rounded-md border border-border hover:bg-slate-50 hover:border-slate-300 transition-colors text-sm"
            title="Save current and baseline data to a file"
          >
            Save
          </button>
          <button 
            onClick={onLoad} 
            className="px-4 py-2 bg-white text-text-primary font-semibold rounded-md border border-border hover:bg-slate-50 hover:border-slate-300 transition-colors text-sm"
            title="Load current and baseline data from a file"
          >
            Load
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;