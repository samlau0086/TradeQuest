import React, { useState } from 'react';
import { Settings } from 'lucide-react';
import { Client, useStore } from '../store';
import { cn } from '../lib/utils';
import { getCustomerOutputLanguage } from '../lib/language';
import { WorkflowConfigModal } from './WorkflowConfigModal';

interface ClientAgentSettingsModalProps {
  client: Client;
  onClose: () => void;
}

export function ClientAgentSettingsModal({ client, onClose }: ClientAgentSettingsModalProps) {
  const { editClient, agentWorkflows, addQuest, emails } = useStore();
  const [enabled, setEnabled] = useState(client.agentEnabled || false);
  const [mode, setMode] = useState<'manual'|'auto_email'>(client.agentMode || 'manual');
  const [context, setContext] = useState(client.agentContext || '');
  const [workflowId, setWorkflowId] = useState(client.agentWorkflowId || agentWorkflows[0]?.id || '');
  const [showWfManager, setShowWfManager] = useState(false);

  const selectedWf = agentWorkflows.find(wf => wf.id === workflowId);
  const hasNonEmailSteps = selectedWf?.steps.some(s => s.type !== 'email');

  const handleSave = () => {
    editClient(client.id, {
      agentEnabled: enabled,
      agentMode: mode,
      agentContext: context,
      agentWorkflowId: workflowId
    });

    if (enabled && mode === 'auto_email' && selectedWf && hasNonEmailSteps) {
      const latestCustomerEmail = emails
        .filter(e => e.clientId === client.id && (e.type === 'inbox' || e.type === 'inbound'))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
      const customerLanguage = getCustomerOutputLanguage({
        lastCommunicationText: latestCustomerEmail?.body,
        preferredLanguage: client.preferredLanguage,
        country: client.country,
      });
      selectedWf.steps.filter(s => s.type !== 'email').forEach((step) => {
        const languageInstruction = `Language: Write customer-facing outbound content in ${customerLanguage}. This was resolved by priority: last customer communication language > client preferred language > official country/region language > English.`;

        addQuest({
          title: `[Agent] Follow up via ${step.type} (${client.name})`,
          description: `Agent drafted instructions based on communication habits:\n\n"${step.templatePrompt}\n\n${languageInstruction}"\n\nPlease manually draft and send via ${step.type}. Draft will open when you execute this task.`,
          expReward: 15
        });
      });
    }

    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
        <div className="bg-slate-900 border border-indigo-900/50 p-6 rounded-xl shadow-2xl max-w-md w-full relative max-h-[90vh] flex flex-col">
          <h3 className="text-lg font-bold text-indigo-400 mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5" /> AI Agent Setup
          </h3>

          <div className="space-y-4 overflow-y-auto min-h-0 pr-2 pb-4 flex-1">
            <div className="flex items-center justify-between bg-slate-950 p-3 rounded-lg border border-slate-800">
              <div>
                <div className="text-sm font-bold text-white">Enable Auto Agent</div>
                <div className="text-xs text-slate-400">Allow AI to analyze and follow up.</div>
              </div>
              <button
                onClick={() => setEnabled(!enabled)}
                className={cn("w-10 h-5 rounded-full relative transition-colors", enabled ? "bg-indigo-600" : "bg-slate-700")}
              >
                <div className={cn("w-3.5 h-3.5 bg-white rounded-full absolute top-0.5 transition-transform", enabled ? "translate-x-5" : "translate-x-1")} />
              </button>
            </div>

            <div className={cn("space-y-4 transition-opacity", !enabled && "opacity-50 pointer-events-none")}>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">Follow-up Mode</label>
                <select
                  value={mode}
                  onChange={(event) => setMode(event.target.value as 'manual' | 'auto_email')}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500"
                >
                  <option value="manual">Prompt Only (Suggest next step)</option>
                  <option value="auto_email">Auto Execute (Auto email + Manual Tasks)</option>
                </select>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-400 uppercase">Workflow Preset</label>
                  <button onClick={() => setShowWfManager(true)} className="text-xs text-indigo-400 hover:text-indigo-300">
                    Manage Workflows
                  </button>
                </div>
                <select
                  value={workflowId}
                  onChange={(event) => setWorkflowId(event.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500"
                >
                  {agentWorkflows.map(wf => (
                    <option key={wf.id} value={wf.id}>{wf.name}</option>
                  ))}
                </select>

                {selectedWf && (
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 mt-2 space-y-2">
                    <div className="text-xs font-bold text-indigo-300 mb-1">Preview Follow-up Plan</div>
                    {selectedWf.steps.map((step, index) => (
                      <div key={index} className="flex gap-2 text-xs">
                        <span className="text-slate-500 font-mono w-12 shrink-0">Day {step.delayDays}</span>
                        <span className={cn("px-1.5 py-0.5 rounded uppercase font-bold text-[9px]", step.type === 'email' ? "bg-blue-900/40 text-blue-400" : "bg-orange-900/40 text-orange-400")}>{step.type}</span>
                        <span className="text-slate-300 truncate">{step.templatePrompt}</span>
                      </div>
                    ))}
                  </div>
                )}

                {mode === 'auto_email' && hasNonEmailSteps && (
                  <div className="p-3 bg-orange-900/30 border border-orange-900/50 rounded-lg text-xs leading-relaxed text-orange-200 mt-2">
                    <span className="font-bold">Note:</span> WhatsApp workflow steps can be sent automatically through WhatsApp Actor Hub when the client has a WhatsApp/phone contact and Hub is configured. Call/Other steps still generate task reminders.
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">Agent Instructions / Context</label>
                <textarea
                  value={context}
                  onChange={(event) => setContext(event.target.value)}
                  placeholder="e.g. This client is very price-sensitive. Focus on ROI and value. Do not offer discounts upfront."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500 min-h-[100px] resize-none scrollbar-thin"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-800 shrink-0">
            <button onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white transition-colors text-sm">Cancel</button>
            <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow font-medium transition-colors text-sm">Save Configuration</button>
          </div>
        </div>
      </div>
      {showWfManager && <WorkflowConfigModal clientId={client.id} onClose={() => setShowWfManager(false)} />}
    </>
  );
}
