import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../../types/index.ts';
import {
  MessageSquare,
  Sparkles,
  Send,
  X,
  Maximize2,
  Minimize2,
  Bot,
  User,
  CheckCircle2
} from 'lucide-react';

interface TAIAssistantProps {
  onRefreshData: () => Promise<void>;
}

export const TAIAssistant: React.FC<TAIAssistantProps> = ({ onRefreshData }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Ciao! Sono il **T&A Assistant**. Conosco l\'intero processo end-to-end del lavoro Technology & Architecture, i tool esistenti, le idee in valutazione e le esigenze aperte.\n\nPosso rispondere alle tue domande o **creare direttamente nuovi tool, idee ed esigenze** nella mappa.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg.content }),
      });

      if (!res.ok) {
        throw new Error('Errore durante la comunicazione con l\'assistente');
      }

      const data = await res.json();

      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now()}-ai`,
        role: 'assistant',
        content: data.reply,
        actionSummary: data.actionSummary,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages(prev => [...prev, assistantMsg]);

      // If a database modification was triggered, refresh the graph!
      if (data.actionSummary || data.createdItem || data.createdPhase) {
        await onRefreshData();
      }
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: `msg-${Date.now()}-err`,
          role: 'assistant',
          content: 'Si è verificato un errore nel processare la richiesta. Verifica la connessione e riprova.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts = [
    'Che tool abbiamo per Assessment?',
    'Quali tool coprono più fasi?',
    'Quali tool sono da generalizzare?',
    'Ci sono esigenze scoperte?',
    'Aggiungi un\'esigenza a Readiness: Generazione moduli Terraform',
    'Aggiungi come idea un MCP per Kubernetes',
  ];

  return (
    <>
      {/* Floating Action Button (Spec 31) */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 px-4 py-3 rounded-full bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-800 hover:to-indigo-700 text-white font-semibold text-xs shadow-lg shadow-purple-500/30 hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2 group cursor-pointer"
        >
          <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <span>T&A Assistant</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </button>
      )}

      {/* Slide-over / Floating Chat Window */}
      {isOpen && (
        <div
          className={`fixed z-50 bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden transition-all duration-200 ${
            isExpanded
              ? 'inset-6 max-w-4xl mx-auto'
              : 'bottom-6 right-6 w-[390px] h-[580px] max-h-[90vh]'
          }`}
        >
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-purple-800 to-indigo-700 text-white flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-purple-200" />
              </div>
              <div>
                <h3 className="font-bold text-xs flex items-center gap-1.5">
                  <span>T&A Assistant</span>
                  <span className="text-[9px] bg-emerald-500/30 text-emerald-200 px-1.5 py-0.2 rounded-full font-medium">
                    online
                  </span>
                </h3>
                <p className="text-[10px] text-purple-200">AI Knowledge & Graph Copilot</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 text-purple-200 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                title={isExpanded ? 'Riduci' : 'Espandi'}
              >
                {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-purple-200 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                title="Chiudi chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Prompts Bar */}
          <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {quickPrompts.map((qp, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(qp)}
                disabled={isLoading}
                className="whitespace-nowrap px-2.5 py-1 rounded-full bg-white border border-slate-200 hover:border-purple-300 text-[10px] font-medium text-slate-700 hover:text-purple-700 shadow-2xs hover:bg-purple-50/50 transition-all shrink-0"
              >
                {qp}
              </button>
            ))}
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs bg-[#FAFBFD]">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 mt-0.5 border border-purple-200">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-2xs ${
                    msg.role === 'user'
                      ? 'bg-purple-600 text-white rounded-tr-xs'
                      : 'bg-white border border-slate-200 text-slate-800 rounded-tl-xs'
                  }`}
                >
                  {/* Action Summary Pill (if a mutation took place) */}
                  {msg.actionSummary && (
                    <div className="mb-2 flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-semibold">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span>{msg.actionSummary}</span>
                    </div>
                  )}

                  <div className="whitespace-pre-line leading-relaxed text-xs">
                    {msg.content}
                  </div>

                  <div
                    className={`text-[9px] mt-1 text-right ${
                      msg.role === 'user' ? 'text-purple-200' : 'text-slate-400'
                    }`}
                  >
                    {msg.timestamp}
                  </div>
                </div>

                {msg.role === 'user' && (
                  <div className="w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center shrink-0 mt-0.5 text-[9px] font-bold">
                    CB
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-2.5 items-center text-slate-400 text-xs">
                <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center border border-purple-200">
                  <Bot className="w-3.5 h-3.5 animate-bounce" />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl px-3 py-2 flex items-center gap-1.5 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse delay-100" />
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse delay-200" />
                  <span className="text-[11px] text-slate-500 ml-1">L'assistente sta analizzando...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Box */}
          <div className="p-3 border-t border-slate-200 bg-white">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Scrivi un messaggio o chiedi di creare un tool/esigenza..."
                disabled={isLoading}
                className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 text-xs bg-slate-50 focus:bg-white text-slate-800 transition-colors"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="p-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-40 transition-colors shadow-xs"
                title="Invia"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
