import React from 'react';

interface HeaderProps {
  onSave: () => void;
  onLoad: () => void;
  onOpenTrendChart: () => void;
  onDownloadTemplate: () => void;
  onDownloadProcessFlow: () => void;
  onSaveToDrive: () => void;
  onLoadFromDrive: () => void;
  onSignIn: () => void;
  onSignOut: () => void;
  isSignedIn: boolean;
  isGoogleDriveConfigured: boolean;
}

const GoogleIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
);


const Header = ({ onSave, onLoad, onOpenTrendChart, onDownloadTemplate, onDownloadProcessFlow, onSaveToDrive, onLoadFromDrive, onSignIn, onSignOut, isSignedIn, isGoogleDriveConfigured }: HeaderProps): React.ReactNode => {
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
          
          <div className="h-6 w-px bg-border mx-2"></div>

          <button 
            onClick={onSave} 
            className="px-4 py-2 bg-white text-text-primary font-semibold rounded-md border border-border hover:bg-slate-50 hover:border-slate-300 transition-colors text-sm"
            title="Save current data to a local file"
          >
            Save Local
          </button>
          <button 
            onClick={onLoad} 
            className="px-4 py-2 bg-white text-text-primary font-semibold rounded-md border border-border hover:bg-slate-50 hover:border-slate-300 transition-colors text-sm"
            title="Load data from a local file"
          >
            Load Local
          </button>
          
          {isGoogleDriveConfigured && (
            <>
              <div className="h-6 w-px bg-border mx-2"></div>
              {isSignedIn ? (
                <>
                  <button 
                    onClick={onSaveToDrive} 
                    className="px-4 py-2 bg-white text-text-primary font-semibold rounded-md border border-border hover:bg-slate-50 hover:border-slate-300 transition-colors text-sm"
                    title="Save configuration to Google Drive"
                  >
                    Save to Drive
                  </button>
                  <button 
                    onClick={onLoadFromDrive} 
                    className="px-4 py-2 bg-white text-text-primary font-semibold rounded-md border border-border hover:bg-slate-50 hover:border-slate-300 transition-colors text-sm"
                    title="Load configuration from Google Drive"
                  >
                    Load from Drive
                  </button>
                  <button
                    onClick={onSignOut}
                    className="px-4 py-2 bg-slate-200 text-text-secondary font-semibold rounded-md hover:bg-slate-300 transition-colors text-sm"
                    title="Sign out from Google"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <button
                  onClick={onSignIn}
                  className="px-4 py-2 bg-white text-text-primary font-semibold rounded-md border border-border hover:bg-slate-50 hover:border-slate-300 transition-colors text-sm flex items-center gap-2"
                  title="Sign in with Google to save/load from Drive"
                >
                  <GoogleIcon />
                  Sign in with Google
                </button>
              )}
            </>
          )}

        </div>
      </div>
    </header>
  );
};

export default Header;