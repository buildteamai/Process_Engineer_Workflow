import React, { useState } from 'react';

interface SaveToDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (fileName: string) => void;
  defaultFileName?: string;
  isSaving?: boolean;
}

const SaveToDriveModal = ({ isOpen, onClose, onSave, defaultFileName = 'smart-process-monitor-config', isSaving }: SaveToDriveModalProps): React.ReactNode => {
  const [fileName, setFileName] = useState(defaultFileName);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (fileName.trim()) {
      onSave(fileName.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm" onClick={onClose} aria-modal="true" role="dialog">
      <div className="bg-panel rounded-lg shadow-xl p-6 w-full max-w-md m-4" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-text-primary mb-4">Save to Google Drive</h2>
        <p className="text-text-secondary mb-6">Enter a file name for your configuration. After confirming, you will be prompted to select a folder in your Google Drive.</p>
        <form onSubmit={handleSubmit}>
          <div className="relative">
            <input
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              className="w-full border-2 border-border rounded-md p-3 pr-12 focus:ring-interactive focus:border-interactive"
              placeholder="Enter file name"
              aria-label="File name"
              autoFocus
            />
            <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-text-secondary">.json</span>
          </div>
          <div className="flex justify-end gap-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 text-text-primary font-semibold rounded-md hover:bg-slate-300 transition-colors"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-interactive text-white font-semibold rounded-md hover:bg-interactive-hover transition-colors flex items-center disabled:bg-slate-400"
              disabled={!fileName.trim() || isSaving}
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Saving...
                </>
              ) : (
                'Select Folder & Save'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SaveToDriveModal;
