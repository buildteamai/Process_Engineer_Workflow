

import React, { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '../types';

interface SmartAgentPanelProps {
  history: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

const SmartAgentPanel = ({ history, onSendMessage, isLoading }: SmartAgentPanelProps): React.ReactNode => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [history]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  return (
    <div className="bg-panel p-6 rounded-lg shadow-md flex flex-col h-[600px]">
      <h2 className="text-2xl font-bold text-text-primary mb-4 flex-shrink-0">Diagnostic Assistant</h2>
      
      <div className="flex-grow overflow-y-auto pr-2 space-y-4 mb-4">
        {history.length === 0 && (
            <div className="text-center text-text-secondary h-full flex items-center justify-center">
                <p>Ask a question about process data or trends to get started.</p>
            </div>
        )}
        {history.map((msg, index) => (
          <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xl lg:max-w-2xl px-4 py-2 rounded-lg ${msg.role === 'user' ? 'bg-interactive text-white' : 'bg-slate-100 text-text-primary'}`}>
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}
        {isLoading && (
            <div className="flex justify-start">
                <div className="max-w-xl lg:max-w-2xl px-4 py-2 rounded-lg bg-slate-100 text-text-primary">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-text-secondary rounded-full animate-pulse"></div>
                        <div className="w-2 h-2 bg-text-secondary rounded-full animate-pulse [animation-delay:0.2s]"></div>
                        <div className="w-2 h-2 bg-text-secondary rounded-full animate-pulse [animation-delay:0.4s]"></div>
                    </div>
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex-shrink-0">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g., 'What is the temperature trend in the First Stage?'"
            className="flex-grow border border-border rounded-md p-2 focus:ring-interactive focus:border-interactive"
            disabled={isLoading}
            aria-label="Ask the diagnostic assistant a question"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-4 py-2 bg-interactive text-white font-semibold rounded-md hover:bg-interactive-hover transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed"
            aria-label="Send message"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default SmartAgentPanel;