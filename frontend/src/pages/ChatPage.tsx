import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Plus,
  Trash2,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  FileText,
  ChevronDown,
  Sparkles,
  Layers,
} from 'lucide-react';
import { historyApi, ragApi, documentApi } from '../services/api';
import { Conversation, Message, Document, Citation } from '../types';

export const ChatPage: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [inputQuestion, setInputQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});

  const chatEndRef = useRef<HTMLDivElement>(null);

  const fetchConversations = async () => {
    try {
      const data = await historyApi.list();
      setConversations(data);
    } catch (err) {
      console.error('Failed to load conversation history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchDocs = async () => {
    try {
      const data = await documentApi.list();
      setDocuments(data);
    } catch (err) {
      console.error('Failed to load documents for chat scoping:', err);
    }
  };

  useEffect(() => {
    fetchConversations();
    fetchDocs();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversation?.messages, asking]);

  const loadConversationDetail = async (id: string) => {
    try {
      const detail = await historyApi.get(id);
      setActiveConversation(detail);
    } catch (err) {
      console.error('Failed to load conversation detail:', err);
    }
  };

  const handleStartNewChat = () => {
    setActiveConversation(null);
    setSelectedDocIds([]);
    setInputQuestion('');
  };

  const handleSendQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputQuestion.trim() || asking) return;

    const questionText = inputQuestion.trim();
    setInputQuestion('');
    setAsking(true);

    // Optimistically add user message to state
    const userMsg: Message = {
      id: `temp-${Date.now()}`,
      sender: 'USER',
      content: questionText,
      created_at: new Date().toISOString(),
    };

    setActiveConversation((prev) => ({
      id: prev?.id || '',
      user_id: prev?.user_id || '',
      title: prev?.title || questionText.slice(0, 30),
      created_at: prev?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      messages: [...(prev?.messages || []), userMsg],
    }));

    try {
      const res = await ragApi.ask(
        questionText,
        activeConversation?.id,
        selectedDocIds.length > 0 ? selectedDocIds : undefined
      );

      // Refresh conversation detail from backend
      await loadConversationDetail(res.conversation_id);
      await fetchConversations();
    } catch (err: any) {
      console.error('Error submitting question to RAG pipeline:', err);
      const assistantErr: Message = {
        id: `err-${Date.now()}`,
        sender: 'ASSISTANT',
        content: 'An error occurred while processing your question against the index.',
        created_at: new Date().toISOString(),
      };
      setActiveConversation((prev) => ({
        ...prev!,
        messages: [...(prev?.messages || []), assistantErr],
      }));
    } finally {
      setAsking(false);
    }
  };

  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await historyApi.delete(id);
      if (activeConversation?.id === id) {
        setActiveConversation(null);
      }
      setConversations((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  const handleClearAllHistory = async () => {
    if (!window.confirm('Clear all conversation history?')) return;
    try {
      await historyApi.clearAll();
      setConversations([]);
      setActiveConversation(null);
    } catch (err) {
      console.error('Failed to clear history:', err);
    }
  };

  const toggleSourceExpansion = (msgId: string) => {
    setExpandedSources((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  const getConfidenceBadge = (score?: number | null) => {
    if (score === null || score === undefined) return null;
    const percentage = Math.round(score * 100);

    if (percentage >= 70) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          High Grounding ({percentage}%)
        </span>
      );
    } else if (percentage >= 40) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Moderate Match ({percentage}%)
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
          <HelpCircle className="w-3 h-3 mr-1" />
          Low Confidence ({percentage}%)
        </span>
      );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 h-[calc(100vh-5rem)]">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
        
        {/* Left Sidebar: Conversations & Document Scoping */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col justify-between overflow-hidden shadow-sm">
          <div className="space-y-4 overflow-y-auto pr-1">
            
            {/* New Chat Button */}
            <button
              onClick={handleStartNewChat}
              className="w-full py-2.5 px-4 bg-sky-500 hover:bg-sky-400 text-white font-medium rounded-xl shadow-md shadow-sky-500/20 flex items-center justify-center space-x-2 transition-all text-sm"
            >
              <Plus className="w-4 h-4" />
              <span>New QA Session</span>
            </button>

            {/* Document Filter Scope */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center">
                <Layers className="w-3.5 h-3.5 mr-1" /> Document Scope
              </label>
              {documents.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No documents uploaded yet</p>
              ) : (
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {documents.map((doc) => {
                    const isSelected = selectedDocIds.includes(doc.id);
                    return (
                      <button
                        key={doc.id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedDocIds(selectedDocIds.filter((id) => id !== doc.id));
                          } else {
                            setSelectedDocIds([...selectedDocIds, doc.id]);
                          }
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                          isSelected
                            ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-medium'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span className="truncate max-w-[140px]">{doc.filename}</span>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-sky-500 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <hr className="border-slate-200 dark:border-slate-800" />

            {/* History List */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Chat History
                </span>
                {conversations.length > 0 && (
                  <button
                    onClick={handleClearAllHistory}
                    className="text-[10px] text-slate-400 hover:text-rose-500 transition-colors"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {loadingHistory ? (
                <p className="text-xs text-slate-400">Loading history...</p>
              ) : conversations.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No past sessions</p>
              ) : (
                <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
                  {conversations.map((c) => {
                    const isActive = activeConversation?.id === c.id;
                    return (
                      <div
                        key={c.id}
                        onClick={() => loadConversationDetail(c.id)}
                        className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer transition-colors ${
                          isActive
                            ? 'bg-sky-500 text-white font-medium shadow-sm'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span className="truncate max-w-[150px]">{c.title || 'Untitled Session'}</span>
                        <button
                          onClick={(e) => handleDeleteConversation(c.id, e)}
                          className={`p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                            isActive ? 'text-white/80 hover:text-white' : 'text-slate-400 hover:text-rose-500'
                          }`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Main Chat Window */}
        <div className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between overflow-hidden shadow-sm">
          
          {/* Active Header */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 rounded-xl">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                  {activeConversation?.title || 'New Q&A Session'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedDocIds.length > 0
                    ? `Scoped to ${selectedDocIds.length} selected document(s)`
                    : 'Searching across all uploaded documents'}
                </p>
              </div>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 p-6 overflow-y-auto space-y-6">
            {!activeConversation?.messages || activeConversation.messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
                <BookOpen className="w-12 h-12 mb-3 text-sky-500/40 animate-pulse" />
                <h4 className="text-base font-semibold text-slate-700 dark:text-slate-300">
                  Ask Anything About Your Documents
                </h4>
                <p className="text-xs max-w-sm mt-1 text-slate-500">
                  DocMind AI will search vector passages in FAISS and synthesize precise answers backed by exact page citations.
                </p>
              </div>
            ) : (
              activeConversation.messages.map((msg) => {
                const isUser = msg.sender === 'USER';
                const isExpanded = expandedSources[msg.id];

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-2`}
                  >
                    <div
                      className={`max-w-2xl rounded-2xl p-4 text-sm leading-relaxed ${
                        isUser
                          ? 'bg-sky-500 text-white shadow-md'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200/60 dark:border-slate-700/60'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>

                    {/* Citations & Sources (Assistant Only) */}
                    {!isUser && msg.sources && msg.sources.length > 0 && (
                      <div className="max-w-2xl w-full text-xs space-y-2">
                        <div className="flex items-center justify-between">
                          {getConfidenceBadge(msg.confidence_score)}
                          <button
                            onClick={() => toggleSourceExpansion(msg.id)}
                            className="text-sky-600 dark:text-sky-400 font-medium flex items-center space-x-1 hover:underline"
                          >
                            <span>{msg.sources.length} Cited Source(s)</span>
                            <ChevronDown
                              className={`w-3.5 h-3.5 transform transition-transform ${
                                isExpanded ? 'rotate-180' : ''
                              }`}
                            />
                          </button>
                        </div>

                        {isExpanded && (
                          <div className="space-y-2 mt-2">
                            {msg.sources.map((src: Citation, idx: number) => (
                              <div
                                key={idx}
                                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                              >
                                <div className="flex items-center justify-between font-semibold text-[11px] text-slate-800 dark:text-slate-200 mb-1">
                                  <span className="flex items-center">
                                    <FileText className="w-3.5 h-3.5 mr-1 text-sky-500" />
                                    {src.filename} (Page {src.page_number})
                                  </span>
                                  <span className="text-slate-400 text-[10px]">
                                    Match Score: {(src.similarity * 100).toFixed(1)}%
                                  </span>
                                </div>
                                <p className="text-xs italic bg-white dark:bg-slate-900/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                                  "{src.content}"
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {asking && (
              <div className="flex items-center space-x-2 text-slate-400 text-xs py-2">
                <Sparkles className="w-4 h-4 text-sky-500 animate-spin" />
                <span>Searching vector passages & synthesizing answer...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Question Input Form */}
          <form onSubmit={handleSendQuestion} className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="relative">
              <input
                type="text"
                value={inputQuestion}
                onChange={(e) => setInputQuestion(e.target.value)}
                placeholder="Ask a question about your documents..."
                disabled={asking}
                className="w-full pl-4 pr-12 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-sm transition-all"
              />
              <button
                type="submit"
                disabled={!inputQuestion.trim() || asking}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-sky-500 hover:bg-sky-400 text-white rounded-lg disabled:opacity-40 transition-all"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
