import React, { useState } from 'react';
import { useStore, AgentWorkflow, WorkflowStep } from '../store';
import { X, Plus, Trash2, Edit2, Check, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuthStore } from '../authStore';
import { getCustomerOutputLanguage } from '../lib/language';

export function WorkflowConfigModal({ onClose, clientId }: { onClose: () => void, clientId?: string }) {
  const { agentWorkflows, addAgentWorkflow, updateAgentWorkflow, deleteAgentWorkflow, llmConfigs, activeLLMId, clients, emails } = useStore();
  const [editingWfId, setEditingWfId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<AgentWorkflow>>({});
  
  const [showAiPrompt, setShowAiPrompt] = useState(false);
  const [aiPromptText, setAiPromptText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const client = clientId ? clients.find(c => c.id === clientId) : null;

  const handleAiGenerate = async () => {
    if (!aiPromptText.trim()) return;
    setIsGenerating(true);
    try {
      let clientContext = '';
      if (client) {
        const methods = client.contactMethods || [];
        const hasEmail = methods.some(m => m.type === 'email' && m.value);
        const hasPhone = methods.some(m => ['whatsapp', 'phone', 'call', 'mobile', 'wechat'].includes(m.type) && m.value);
        const latestCustomerEmail = emails
          .filter(e => e.clientId === client.id && (e.type === 'inbox' || e.type === 'inbound'))
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
        const customerLanguage = getCustomerOutputLanguage({
          lastCommunicationText: latestCustomerEmail?.body,
          preferredLanguage: client.preferredLanguage,
          country: client.country,
        });
        clientContext = `CRITICAL ASSISTANT RULE: You are planning a workflow tailored for a specific client.
The client has the following contact methods: Email (${hasEmail ? 'Yes' : 'No'}), Phone/WhatsApp (${hasPhone ? 'Yes' : 'No'}). If they do not have a phone/WhatsApp contact, you MUST NOT include 'call' or 'whatsapp' steps. Only include steps for contact methods they actually have.
Customer-facing output language for this client: ${customerLanguage}
Language priority used for customer-facing content: last customer communication language > client preferred language > official country/region language > English.
Client's Preferred Communication Time: ${client.preferredTimeRange || 'Any time'} (in Client's Local Time)
When outputting steps, take the client's language and preferred time range into account. IMPORTANT: All time references and the 'sendTime' provided MUST be strictly planned in the Client's Local Time, NOT Beijing time. The step's 'sendTime' should try to match the preferred communication time if applicable. If 'sendTime' is provided, format it as "HH:mm".`;
      }

      const activeLlm = llmConfigs.find(c => c.id === activeLLMId) || llmConfigs[0];
      const res = await fetch('/api/ai/plan-workflow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ prompt: aiPromptText, llmConfig: activeLlm, clientContext })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.steps && Array.isArray(data.steps)) {
          const generatedSteps = data.steps.map((s: any, idx: number) => ({
            id: `s_ai_${Date.now()}_${idx}`,
            type: s.type || 'email',
            delayDays: s.delayDays || 1,
            templatePrompt: s.templatePrompt || '',
            sendTime: s.sendTime || ''
          }));
          setFormData(prev => ({
            ...prev,
            steps: [...(prev.steps || []), ...generatedSteps]
          }));
          setAiPromptText('');
          setShowAiPrompt(false);
        }
      }
    } catch(e) {
      console.error(e);
    }
    setIsGenerating(false);
  };


  const handleEdit = (wf: AgentWorkflow) => {
    setEditingWfId(wf.id);
    setFormData(wf);
  };

  const handleSave = () => {
    if (editingWfId === 'new') {
      addAgentWorkflow(formData as Omit<AgentWorkflow, 'id'>);
    } else if (editingWfId) {
      updateAgentWorkflow(editingWfId, formData);
    }
    setEditingWfId(null);
  };

  const handleAddStep = () => {
    const newStep: WorkflowStep = {
      id: `s_${Date.now()}`,
      type: 'email',
      delayDays: 1,
      templatePrompt: 'Write a follow-up...',
    };
    setFormData(prev => ({ ...prev, steps: [...(prev.steps || []), newStep] }));
  };

  const handleUpdateStep = (id: string, updates: Partial<WorkflowStep>) => {
    setFormData(prev => ({
      ...prev,
      steps: prev.steps?.map(step => step.id === id ? { ...step, ...updates } : step)
    }));
  };

  const handleRemoveStep = (id: string) => {
    setFormData(prev => ({
      ...prev,
      steps: prev.steps?.filter(s => s.id !== id)
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[60]">
      <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[80vh]">
        <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
          <h2 className="text-xl font-bold text-white">Agent Workflows</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 space-y-4 pr-2">
          {editingWfId ? (
            <div className="space-y-4 bg-slate-800 p-4 rounded-lg">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">Workflow Name</label>
                <input 
                  type="text" 
                  value={formData.name || ''} 
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">Description</label>
                <input 
                  type="text" 
                  value={formData.description || ''} 
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" 
                />
              </div>

              <div className="flex items-center gap-2 mt-4 bg-slate-950/50 p-3 rounded-lg border border-slate-700/50">
                <input 
                  type="checkbox" 
                  id="stopOnReply"
                  checked={!!formData.stopOnMeaningfulReply}
                  onChange={(e) => setFormData({ ...formData, stopOnMeaningfulReply: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-700 text-indigo-600 focus:ring-indigo-600/20 bg-slate-900"
                />
                <label htmlFor="stopOnReply" className="text-sm font-medium text-slate-300 cursor-pointer">
                  Stop workflow when client makes a meaningful reply
                </label>
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">Follow-up Steps</h3>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setShowAiPrompt(!showAiPrompt)} className="flex items-center gap-1 text-xs font-medium text-cyan-400 hover:text-cyan-300">
                      <Sparkles className="w-3 h-3" /> Auto-Plan AI
                    </button>
                    <button onClick={handleAddStep} className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300">
                      <Plus className="w-3 h-3" /> Add Step
                    </button>
                  </div>
                </div>
                {showAiPrompt && (
                  <div className="flex gap-2 p-3 bg-cyan-950/30 border border-cyan-800/50 rounded-lg">
                    <input 
                      type="text" 
                      value={aiPromptText}
                      onChange={e => setAiPromptText(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAiGenerate()}
                      placeholder="e.g. 3 week follow up for cold leads starting tomorrow at 9am..."
                      className="flex-1 bg-slate-900 border border-slate-700/50 rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                    <button 
                      onClick={handleAiGenerate}
                      disabled={isGenerating || !aiPromptText.trim()}
                      className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1 shrink-0"
                    >
                      {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      Generate
                    </button>
                  </div>
                )}
                {formData.steps?.map((step, idx) => (
                  <div key={step.id} className="p-3 bg-slate-950 rounded-lg space-y-3 relative group">
                    <div className="flex items-center gap-3">
                      <span className="text-slate-500 font-bold text-xs w-6">#{idx + 1}</span>
                      <select 
                        value={step.type} 
                        onChange={e => handleUpdateStep(step.id, { type: e.target.value as any })}
                        className="bg-slate-900 border border-slate-700 rounded text-xs text-white p-1"
                      >
                        <option value="email">Email</option>
                        <option value="whatsapp">WhatsApp</option>
                        <option value="call">Call</option>
                        <option value="other">Other</option>
                      </select>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-400">Delay:</span>
                        <input 
                          type="number"
                          value={step.delayDays}
                          onChange={e => handleUpdateStep(step.id, { delayDays: parseInt(e.target.value) || 0 })}
                          className="w-12 bg-slate-900 border border-slate-700 rounded text-xs text-white px-2 py-1 text-center"
                        />
                        <span className="text-xs text-slate-400 mr-1">days</span>
                        
                        <span className="text-xs text-slate-400">at</span>
                        <input 
                          type="time"
                          value={step.sendTime || ''}
                          onChange={e => handleUpdateStep(step.id, { sendTime: e.target.value })}
                          className="w-20 bg-slate-900 border border-slate-700 rounded text-xs text-white px-2 py-1 text-center"
                        />
                      </div>
                      <button 
                        onClick={() => handleRemoveStep(step.id)}
                        className="opacity-0 group-hover:opacity-100 absolute top-3 right-3 text-red-400 hover:text-red-300 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <textarea 
                      value={step.templatePrompt}
                      onChange={e => handleUpdateStep(step.id, { templatePrompt: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-white resize-none h-16"
                      placeholder="Prompt to generate message..."
                    />
                  </div>
                ))}
                {!formData.steps?.length && (
                  <div className="text-xs text-slate-500 italic text-center py-4">No steps added.</div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-slate-700">
                <button onClick={() => setEditingWfId(null)} className="px-4 py-2 text-xs text-slate-400 hover:text-white">Cancel</button>
                <button onClick={handleSave} className="flex items-center gap-1 px-4 py-2 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded">
                  <Check className="w-4 h-4" /> Save Workflow
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <button 
                onClick={() => {
                  setEditingWfId('new');
                  setFormData({ name: '', description: '', steps: [] });
                }}
                className="w-full border border-dashed border-slate-600 rounded-lg p-4 text-slate-400 hover:text-white hover:border-slate-400 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" /> Create New Workflow
              </button>
              
              {agentWorkflows.map(wf => (
                <div key={wf.id} className="bg-slate-800 border border-slate-700 p-4 rounded-lg flex items-center justify-between group">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-white font-bold">{wf.name}</h3>
                      {wf.stopOnMeaningfulReply && (
                        <span className="bg-indigo-900/30 text-indigo-400 border border-indigo-700/50 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider">
                          Stops on Reply
                        </span>
                      )}
                    </div>
                    <p className="text-slate-400 text-xs mt-1">{wf.description}</p>
                    <div className="flex gap-2 mt-2">
                      {wf.steps.map((s, i) => (
                        <span key={i} className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] text-slate-300 uppercase tracking-wider">
                          +{s.delayDays}d {s.sendTime ? `@ ${s.sendTime}` : ''} {s.type}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEdit(wf)} className="p-2 text-slate-400 hover:text-white bg-slate-900 rounded">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteAgentWorkflow(wf.id)} className="p-2 text-slate-400 hover:text-red-400 bg-slate-900 rounded">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
