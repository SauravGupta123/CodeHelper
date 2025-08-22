import React from 'react';

interface PlanningOverlayProps {
  visible: boolean;
  status: string;
}

export const PlanningOverlay: React.FC<PlanningOverlayProps> = ({ visible, status }) => {
  if (!visible) return null;

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl mx-auto rounded-xl border border-vscode-border bg-vscode-surface/90 p-5 shadow-xl">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-vscode-accent text-white flex items-center justify-center">⚙️</div>
          <div className="text-lg font-semibold text-vscode-accent">Plan Specification</div>
        </div>
        <div className="flex items-start gap-4">
          <div className="mt-1 flex h-5 w-5 items-center justify-center">
            <span className="animate-pulse inline-block h-3 w-3 rounded-full bg-vscode-accent" />
          </div>
          <div className="flex-1">
            <div className="text-vscode-text mb-2">{status || 'Thinking…'}</div>
            <ul className="list-disc list-inside text-vscode-muted space-y-1">
              <li>Analyzing code and context</li>
              <li>Mapping dependencies and constraints</li>
              <li>Drafting step-by-step execution plan</li>
              <li>Preparing rationale and risks</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};



