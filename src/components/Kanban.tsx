import React from 'react';
import { useStore, ClientStatus, Client } from '../store';
import { cn } from '../lib/utils';
import { Mail, Clock, CheckCircle, Search, Target, MessageCircle, Send, Phone } from 'lucide-react';

const CONTACT_ICONS = {
  email: Mail,
  whatsapp: MessageCircle,
  messenger: MessageCircle,
  telegram: Send,
  phone: Phone,
};

const COLUMNS: ClientStatus[] = ['Leads', 'Contacted', 'Sample Sent', 'Negotiating', 'Closed Won'];

export function Kanban() {
  const { clients, selectClient, updateClientStatus } = useStore();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add('border-cyan-500/50', 'bg-cyan-950/10');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('border-cyan-500/50', 'bg-cyan-950/10');
  };

  const handleDrop = (e: React.DragEvent, status: ClientStatus) => {
    e.preventDefault();
    e.currentTarget.classList.remove('border-cyan-500/50', 'bg-cyan-950/10');
    const clientId = e.dataTransfer.getData('clientId');
    if (clientId) {
      updateClientStatus(clientId, status);
    }
  };

  return (
    <div className="flex-1 overflow-x-auto p-6 flex gap-4 overflow-y-hidden">
      {COLUMNS.map(col => {
        const columnClients = clients.filter(c => c.status === col);
        
        return (
          <div 
            key={col} 
            className="w-72 shrink-0 flex flex-col h-full bg-slate-800/30 rounded-xl border border-slate-800 p-3 transition-colors"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, col)}
          >
            <div className="flex items-center justify-between mb-4 px-1">
              <h3 className="font-bold text-slate-300 text-sm">{col}</h3>
              <span className="text-xs bg-slate-700 text-slate-300 py-0.5 px-2 rounded-full font-medium">
                {columnClients.length}
              </span>
            </div>
            
            <div className="flex flex-col gap-3 overflow-y-auto pb-2 scrollbar-thin flex-1">
              {columnClients.map(client => (
                <ClientCard key={client.id} client={client} onClick={() => selectClient(client.id)} />
              ))}
              {columnClients.length === 0 && (
                <div className="h-24 border-2 border-dashed border-slate-700/50 rounded-lg flex items-center justify-center text-slate-500 text-xs font-medium pointer-events-none">
                  Drop target
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ClientCard({ client, onClick }: { key?: string | number, client: Client, onClick: () => void }) {
  return (
    <div 
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('clientId', client.id);
        // Optional: slight opacity change when dragging
        setTimeout(() => {
          (e.target as HTMLElement).classList.add('opacity-50');
        }, 0);
      }}
      onDragEnd={(e) => {
        (e.target as HTMLElement).classList.remove('opacity-50');
      }}
      onClick={onClick}
      className={cn(
        "bg-slate-800 p-3 rounded-lg border border-slate-700 hover:border-cyan-500/50 cursor-pointer transition-all shadow-sm group",
        client.isDormant && "border-orange-500/30 bg-orange-950/10"
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="font-bold text-slate-200 text-sm group-hover:text-cyan-400 transition-colors">{client.name}</h4>
          <p className="text-xs text-slate-500 truncate max-w-[140px]">{client.company}</p>
        </div>
        {client.isDormant ? (
          <div className="bg-orange-500/20 text-orange-400 p-1 rounded-md" title="Dormant">
            <Clock className="w-3.5 h-3.5" />
          </div>
        ) : (
          <div className="bg-slate-700 text-slate-400 p-1 rounded-md">
            <Target className="w-3.5 h-3.5" />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-3">
        <div className="flex gap-1.5 flex-wrap">
          {client.tags.slice(0, 2).map(t => (
            <span key={t} className="text-[10px] font-medium bg-slate-900 border border-slate-700 text-slate-400 px-1.5 py-0.5 rounded">
              {t}
            </span>
          ))}
        </div>
        {client.contactMethods && client.contactMethods.length > 0 && (
          <div className="flex items-center gap-1 text-slate-500">
            {client.contactMethods.map((cm, idx) => {
              const Icon = CONTACT_ICONS[cm.type] || Mail;
              return (
                <span key={idx} title={`${cm.type}: ${cm.value}`} className="flex items-center">
                  <Icon className={cn("w-3.5 h-3.5", cm.type === 'whatsapp' && 'text-green-500')} />
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
