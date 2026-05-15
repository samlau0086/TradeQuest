import React, { useState } from 'react';
import { useStore, Client, DormantClientAnalysis } from '../store';
import { Briefcase, Clock, Activity, Wand2, Loader2, Mail, Users, UserPlus, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';

export function ActionableClients() {
  const { 
    view, 
    clients, 
    dormantAnalysisList, 
    setDormantAnalysisList, 
    leadsAnalysisList, 
    setLeadsAnalysisList, 
    followupsAnalysisList, 
    setFollowupsAnalysisList, 
    setView, 
    selectClient,
    llmConfigs,
    activeLLMId,
    llmMappings
  } = useStore();
  
  const [analyzing, setAnalyzing] = useState(false);
  const activeLLMConfig = llmConfigs.find(l => l.id === (llmMappings['analysis'] || activeLLMId)) || null;

  let targetClients: Client[] = [];
  let title = '';
  let description = '';
  let analysisList: DormantClientAnalysis[] | null = null;
  let setAnalysisList: (list: DormantClientAnalysis[]) => void = () => {};
  let emptyMessage = '';
  let Icon = Users;

  if (view === 'dormant') {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    targetClients = clients.filter(c => {
      if (c.isDormant) return true;
      const lastContact = new Date(c.lastContact);
      return lastContact < thirtyDaysAgo;
    });
    title = 'Dormant Clients';
    description = 'Clients with no activity in over 30 days. Awaken them to win rewards!';
    analysisList = dormantAnalysisList;
    setAnalysisList = setDormantAnalysisList;
    emptyMessage = 'No dormant clients found. Good job!';
  } else if (view === 'leads') {
    targetClients = clients.filter(c => c.status === 'Leads');
    title = 'New Leads';
    description = 'Fresh leads waiting to hear from you. Secure your first blood!';
    analysisList = leadsAnalysisList;
    setAnalysisList = setLeadsAnalysisList;
    emptyMessage = 'No new leads at the moment.';
    Icon = UserPlus;
  } else if (view === 'followups') {
    // Just find people who have been contacted or sent samples but not won/lost, and contacted more than 3 days ago maybe?
    // Let's just track whoever is Contacted/Sample Sent/Negotiating
    targetClients = clients.filter(c => ['Contacted', 'Sample Sent', 'Negotiating'].includes(c.status));
    title = 'Follow-ups Needed';
    description = 'Clients currently in the pipeline. Keep the conversation going!';
    analysisList = followupsAnalysisList;
    setAnalysisList = setFollowupsAnalysisList;
    emptyMessage = 'No pending follow-ups.';
    Icon = RefreshCw;
  }

  const handleAIAnalyze = async () => {
    setAnalyzing(true);
    try {
      let analysisContext = "analyze these clients";
      if (view === 'dormant') {
        analysisContext = "describe why they might be dormant and suggest an action to wake them up.";
      } else if (view === 'leads') {
        analysisContext = "analyze these new leads and suggest an engaging initial outreach strategy or angle.";
      } else if (view === 'followups') {
        analysisContext = "analyze these pipeline clients and suggest the best next follow-up action to move them forward.";
      }

      const prompt = `Analyze the following clients and ${analysisContext}
      Clients:
      ${targetClients.map(c => `- ID: ${c.id}, Name: ${c.name} (${c.company}) from ${c.country}. Status: ${c.status}. Tags: ${c.tags.join(', ')}. Last contact: ${c.lastContact}`).join('\n')}
      
      Output exactly as a JSON array (no markdown code blocks, just raw JSON) of objects with keys: "clientId" (matching the given ID), "reason" (short string), "suggestedAction" (short string).
      `;
      
      const res = await fetch('/api/chat/magic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          command: prompt, 
          context: {},
          llmConfig: activeLLMConfig
        })
      });

      if (!res.ok) throw new Error('Failed to analyze');
      const data = await res.json();
      let jsonData = data.response.trim();
      if (jsonData.startsWith('\`\`\`json')) jsonData = jsonData.slice(7);
      if (jsonData.endsWith('\`\`\`')) jsonData = jsonData.slice(0, -3);
      
      const parsed = JSON.parse(jsonData) as DormantClientAnalysis[];
      setAnalysisList(parsed);
    } catch(err) {
      console.error(err);
      alert('Failed to analyze clients.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleClientClick = (clientId: string) => {
    selectClient(clientId);
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin bg-slate-900 border-t border-slate-800 p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-8 rounded-2xl border border-slate-700/50 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                <Icon className="w-8 h-8 text-indigo-400" />
                {title}
              </h1>
              <p className="text-slate-400">{description}</p>
            </div>
            <button 
              onClick={handleAIAnalyze}
              disabled={analyzing || targetClients.length === 0}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold rounded-xl shadow-lg transition-colors"
            >
              {analyzing ? <Loader2 className="w-5 h-5 animate-spin"/> : <Wand2 className="w-5 h-5"/>}
              AI Analysis
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {targetClients.length === 0 && (
            <div className="col-span-full text-center text-slate-500 py-12">
              {emptyMessage}
            </div>
          )}
          
          {targetClients.map(client => {
            const analysis = analysisList?.find(a => a.clientId === client.id);
            return (
              <div 
                key={client.id} 
                className="bg-slate-950/50 rounded-2xl p-6 border border-slate-800 hover:border-indigo-500/30 transition-all shadow-sm"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-lg text-white mb-1 cursor-pointer hover:underline" onClick={() => handleClientClick(client.id)}>
                      {client.name}
                    </h3>
                    <div className="text-sm font-medium text-indigo-400 flex items-center gap-1">
                      <Briefcase className="w-4 h-4" /> {client.company}
                    </div>
                  </div>
                  <div className="px-3 py-1 bg-slate-800 text-slate-300 text-xs rounded-full font-bold">
                    {client.status}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-semibold text-slate-400 mb-6">
                  <div className="flex items-center gap-1 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 cursor-help" title={`Last contacted: ${client.lastContact}`}>
                    <Clock className="w-4 h-4 text-slate-500" />
                    {new Date(client.lastContact).toLocaleDateString()}
                  </div>
                </div>

                {analysis && (
                  <div className="bg-indigo-950/20 rounded-xl border border-indigo-900/50 p-4 space-y-3">
                    <div className="text-xs">
                      <div className="font-bold text-indigo-400 mb-1 uppercase tracking-wider">Analysis</div>
                      <div className="text-slate-300">{analysis.reason}</div>
                    </div>
                    <div className="text-xs">
                      <div className="font-bold text-emerald-400 mb-1 uppercase tracking-wider flex items-center gap-1">
                        <Activity className="w-3 h-3" /> Recommended Action
                      </div>
                      <div className="text-slate-300">{analysis.suggestedAction}</div>
                    </div>
                  </div>
                )}
                
                <div className="mt-6 flex justify-end gap-2">
                  <button 
                    onClick={() => {
                        selectClient(client.id);
                    }}
                    className="flex-1 py-2 font-bold text-sm bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    View Details
                  </button>
                  <button 
                    onClick={() => {
                        setView('inbox');
                    }}
                    className="flex-1 py-2 font-bold text-sm bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                   <Mail className="w-4 h-4" /> Message
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
