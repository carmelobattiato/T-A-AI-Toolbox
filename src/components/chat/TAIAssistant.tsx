import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, PendingAction } from '../../types/index.ts';
import { MarkdownContent } from './MarkdownContent.tsx';
import { CHART_LABELS, GROUP_BY_LABELS, SORT_BY_LABELS, TYPE_LABELS, describeWhere } from '../../utils/dashboard.ts';
import {
  Sparkles,
  Send,
  X,
  Maximize2,
  Minimize2,
  Bot,
  User,
  CheckCircle2,
  AlertTriangle,
  Check,
  Trash2,
  Edit3
} from 'lucide-react';

const CREATE_FIELD_LABELS: Record<string, string> = {
  title: 'Title',
  description: 'Description',
  summary: 'Summary',
  owner: 'Owner',
  problem: 'Problem',
  requirements: 'Requirements',
  expectedBenefit: 'Expected benefit',
  currentProcess: 'Current process',
  desiredTool: 'Desired tool',
  desiredOutcome: 'Expected outcome',
  generalizationRequired: 'To be generalized',
  activities: 'Activities',
  targetIndex: 'Position',
  githubUrl: 'GitHub',
  catalogUrl: 'Catalog',
  demoUrl: 'Demo',
  slot: 'Tile N°',
  chart: 'Chart',
  groupBy: 'X axis',
  itemTypes: 'Items',
  where: 'Filters',
  sortBy: 'Sort by',
  order: 'Order',
  limit: 'How many to show',
};

function formatFieldValue(key: string, value: unknown): string {
  if (key === 'chart') return CHART_LABELS[value as keyof typeof CHART_LABELS] ?? String(value);
  if (key === 'groupBy') return GROUP_BY_LABELS[value as keyof typeof GROUP_BY_LABELS] ?? String(value);
  if (key === 'sortBy') return SORT_BY_LABELS[value as keyof typeof SORT_BY_LABELS] ?? String(value);
  if (key === 'order') return value === 'asc' ? 'Ascending (priority: highest first)' : 'Descending';
  if (key === 'where') return describeWhere(value as Parameters<typeof describeWhere>[0]);
  if (key === 'itemTypes' && Array.isArray(value)) {
    return value.map(t => TYPE_LABELS[t as keyof typeof TYPE_LABELS] ?? String(t)).join(', ');
  }
  return Array.isArray(value) ? value.join(', ') : String(value);
}

interface TAIAssistantProps {
  onRefreshData: () => Promise<void>;
  isDrawerOpen?: boolean;
  presetRequest?: { text: string; nonce: number } | null;
  // Map the assistant works on, and whether the user may change it
  practiceId: string;
  practiceName: string;
  canEdit: boolean;
}

export const TAIAssistant: React.FC<TAIAssistantProps> = ({ onRefreshData, isDrawerOpen, presetRequest, practiceId, practiceName, canEdit }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Hi! I\'m the **ADM Assistant**. I know the end-to-end process of the practice you are working on, the existing tools, the WiPs under evaluation and the open needs.\n\nI can answer your questions or **create, edit and delete items** on the map (with prior confirmation).',
      timestamp: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [input]);

  useEffect(() => {
    if (!presetRequest) return;
    setIsOpen(true);
    setInput(presetRequest.text);
    const frame = requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    });
    return () => cancelAnimationFrame(frame);
  }, [presetRequest]);

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg.content, practiceId }),
      });

      if (!res.ok) {
        throw new Error('Error communicating with the assistant');
      }

      const data = await res.json();

      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now()}-ai`,
        role: 'assistant',
        content: data.reply,
        actionSummary: data.actionSummary,
        pendingAction: data.pendingAction,
        timestamp: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages(prev => [...prev, assistantMsg]);

      // If a database modification was triggered directly, refresh the graph!
      if (data.actionSummary || data.createdItem || data.createdPhase) {
        await onRefreshData();
      }
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: `msg-${Date.now()}-err`,
          role: 'assistant',
          content: 'An error occurred while processing the request. Check your connection and try again.',
          timestamp: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Confirm pending action
  const handleConfirmAction = async (action: PendingAction, messageId: string) => {
    if (isLoading) return;
    setIsLoading(true);

    // Update message state locally so buttons are disabled
    setMessages(prev =>
      prev.map(m =>
        m.id === messageId && m.pendingAction
          ? { ...m, pendingAction: { ...m.pendingAction, status: 'CONFIRMED' } }
          : m
      )
    );

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Confirm operation',
          practiceId,
          confirmedAction: action,
        }),
      });

      if (!res.ok) throw new Error('Error confirming the operation');
      const data = await res.json();

      const confirmReplyMsg: ChatMessage = {
        id: `msg-${Date.now()}-confirmed`,
        role: 'assistant',
        content: data.reply,
        actionSummary: data.actionSummary,
        timestamp: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages(prev => [...prev, confirmReplyMsg]);
      await onRefreshData();
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: `msg-${Date.now()}-err`,
          role: 'assistant',
          content: 'Error while executing the confirmed action.',
          timestamp: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Cancel pending action
  const handleCancelAction = async (action: PendingAction, messageId: string) => {
    if (isLoading) return;
    setIsLoading(true);

    setMessages(prev =>
      prev.map(m =>
        m.id === messageId && m.pendingAction
          ? { ...m, pendingAction: { ...m.pendingAction, status: 'CANCELLED' } }
          : m
      )
    );

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Cancel operation',
          practiceId,
          cancelAction: true,
        }),
      });

      if (!res.ok) throw new Error('Error while cancelling');
      const data = await res.json();

      const cancelReplyMsg: ChatMessage = {
        id: `msg-${Date.now()}-cancelled`,
        role: 'assistant',
        content: data.reply,
        timestamp: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages(prev => [...prev, cancelReplyMsg]);
    } catch (err: any) {
      // Local cancel fallback
      setMessages(prev => [
        ...prev,
        {
          id: `msg-${Date.now()}-cancelled`,
          role: 'assistant',
          content: `Operation cancelled. No changes were made to **"${action.targetTitle}"**.`,
          timestamp: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts = [
    'Which tools do we have for Assessment?',
    'Which tools cover multiple phases?',
    'Which tools need to be generalized?',
    'Are there uncovered needs?',
    'Add a need to Readiness: automated Terraform',
    'Add as WiP an MCP for Kubernetes',
  ];

  return (
    <>
      {/* Floating Action Button (Spec 31) - Positioned safely away from the drawer */}
      {!isOpen && (
        <button
          type="button"
          data-tour="assistant"
          onClick={() => setIsOpen(true)}
          className={`fixed bottom-6 z-40 px-4 py-3 rounded-full bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-800 hover:to-indigo-700 text-white font-semibold text-xs shadow-lg shadow-purple-500/30 hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center gap-2 group cursor-pointer ${
            isDrawerOpen ? 'right-[440px] md:right-[480px]' : 'right-6'
          }`}
        >
          <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <span>ADM Assistant</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </button>
      )}

      {/* Slide-over / Floating Chat Window - Safely positioned outside drawer */}
      {isOpen && (
        <div
          className={`fixed z-50 bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden transition-all duration-300 ${
            isExpanded
              ? 'inset-6 max-w-4xl mx-auto'
              : `bottom-6 w-[400px] h-[580px] max-h-[90vh] ${
                  isDrawerOpen ? 'right-[440px] md:right-[480px]' : 'right-6'
                }`
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
                  <span>ADM Assistant</span>
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
                className="p-1.5 text-purple-200 hover:text-white hover:bg-white/10 rounded-md transition-colors cursor-pointer"
                title={isExpanded ? 'Collapse' : 'Expand'}
              >
                {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-purple-200 hover:text-white hover:bg-white/10 rounded-md transition-colors cursor-pointer"
                title="Close chat"
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
                className="whitespace-nowrap px-2.5 py-1 rounded-full bg-white border border-slate-200 hover:border-purple-300 text-[10px] font-medium text-slate-700 hover:text-purple-700 shadow-2xs hover:bg-purple-50/50 transition-all shrink-0 cursor-pointer disabled:opacity-50"
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
                  className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 shadow-2xs ${
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

                  {/* Markdown formatted content */}
                  <MarkdownContent content={msg.content} isUser={msg.role === 'user'} />

                  {/* Confirmation Card for Pending Deletions or Modifications */}
                  {msg.pendingAction && msg.pendingAction.status === 'PENDING' && (
                    <div className="mt-3 p-3 bg-amber-50/90 rounded-xl border border-amber-300 text-amber-950 space-y-2.5 shadow-xs">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-900">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>
                          {msg.pendingAction.type === 'DELETE_ITEM'
                            ? 'Confirm item deletion'
                            : msg.pendingAction.type === 'CREATE_ITEM'
                            ? 'Confirm item creation'
                            : msg.pendingAction.type === 'CREATE_PHASE'
                            ? 'Confirm phase creation'
                            : msg.pendingAction.type === 'CREATE_TILE'
                            ? 'Confirm tile configuration'
                            : 'Confirm item edit'}
                        </span>
                      </div>
                      <div className="text-[11px] leading-snug text-slate-800 bg-white/70 p-2 rounded-lg border border-amber-200">
                        {msg.pendingAction.type === 'CREATE_ITEM' || msg.pendingAction.type === 'CREATE_PHASE' || msg.pendingAction.type === 'CREATE_TILE' ? (
                          <>
                            {Object.entries(msg.pendingAction.payload?.fields || {})
                              .filter(([key, value]) => key !== 'phaseIds' && key !== 'type' && value !== undefined && value !== '')
                              .map(([key, value]) => (
                                <div key={key} className="mt-1 first:mt-0 text-slate-600">
                                  {CREATE_FIELD_LABELS[key] || key}:{' '}
                                  <strong className="text-slate-900">{formatFieldValue(key, value)}</strong>
                                </div>
                              ))}
                            {msg.pendingAction.payload?.replaces && (
                              <div className="mt-1 text-[10px] text-amber-700 font-medium">
                                Replaces the current tile "{msg.pendingAction.payload.replaces}".
                              </div>
                            )}
                            {msg.pendingAction.payload?.phaseTitles?.length > 0 && (
                              <div className="mt-1 text-slate-600">
                                Phases: <strong className="text-slate-900">{msg.pendingAction.payload.phaseTitles.join(', ')}</strong>
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            <div>
                              Target item: <strong>{msg.pendingAction.targetTitle}</strong>
                            </div>
                            {msg.pendingAction.payload?.title && (
                              <div className="mt-1 text-slate-600">
                                New title: <strong className="text-slate-900">{msg.pendingAction.payload.title}</strong>
                              </div>
                            )}
                            {msg.pendingAction.type === 'DELETE_ITEM' && (
                              <div className="mt-1 text-[10px] text-red-600 font-medium">
                                The item and its relations will be removed from the map.
                              </div>
                            )}
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2 pt-0.5">
                        <button
                          type="button"
                          onClick={() => handleConfirmAction(msg.pendingAction!, msg.id)}
                          disabled={isLoading}
                          className={`px-3 py-1.5 rounded-lg text-white font-semibold text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 ${
                            msg.pendingAction.type === 'DELETE_ITEM'
                              ? 'bg-red-600 hover:bg-red-700'
                              : 'bg-purple-600 hover:bg-purple-700'
                          }`}
                        >
                          {msg.pendingAction.type === 'DELETE_ITEM' ? (
                            <Trash2 className="w-3.5 h-3.5" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                          <span>
                            {msg.pendingAction.type === 'DELETE_ITEM'
                              ? 'Confirm deletion'
                              : msg.pendingAction.type === 'CREATE_ITEM' || msg.pendingAction.type === 'CREATE_PHASE'
                              ? 'Confirm creation'
                              : msg.pendingAction.type === 'CREATE_TILE'
                              ? 'Confirm tile'
                              : 'Confirm edit'}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCancelAction(msg.pendingAction!, msg.id)}
                          disabled={isLoading}
                          className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs shadow-xs flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Cancel</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {msg.pendingAction && msg.pendingAction.status === 'CONFIRMED' && (
                    <div className="mt-2.5 px-2.5 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-[10px] text-emerald-800 font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Operation confirmed and executed successfully</span>
                    </div>
                  )}

                  {msg.pendingAction && msg.pendingAction.status === 'CANCELLED' && (
                    <div className="mt-2.5 px-2.5 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-[10px] text-slate-600 font-semibold flex items-center gap-1.5">
                      <X className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Operation cancelled by the user</span>
                    </div>
                  )}

                  <div
                    className={`text-[9px] mt-1 text-right ${
                      msg.role === 'user' ? 'text-purple-200' : 'text-slate-400'
                    }`}
                  >
                    {msg.timestamp}
                  </div>
                </div>

                {msg.role === 'user' && (
                  <div className="w-6 h-6 rounded-full bg-purple-700 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs" title="You">
                    <User className="w-3.5 h-3.5" />
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
                  <span className="text-[11px] text-slate-500 ml-1">The assistant is working...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Box */}
          <div className="p-3 border-t border-slate-200 bg-white">
            {!canEdit && (
              <p className="mb-2 rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-1.5 text-[10px] text-amber-800">
                Read-only on <strong>{practiceName}</strong>: I can answer questions and record new <strong>needs</strong>; to create or edit other items you need to sign in with an authorised user.
              </p>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask a question, or type 'delete [name]' or 'edit'..."
                disabled={isLoading}
                className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 text-xs bg-slate-50 focus:bg-white text-slate-800 transition-colors resize-none overflow-y-auto max-h-[100px] leading-snug"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="p-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-40 transition-colors shadow-xs cursor-pointer"
                title="Send"
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
