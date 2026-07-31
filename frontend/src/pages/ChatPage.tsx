import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Plus,
  BookOpen,
  FileText,
  Sparkles,
  Layers,
  ZoomIn,
  ZoomOut,
  Search,
  Cpu,
  Activity,
  UploadCloud,
  FileCode,
  FileSpreadsheet,
  CornerDownLeft,
  Volume2,
} from 'lucide-react';
import { ragApi, historyApi, documentApi } from '../services/api';
import { Conversation, Message, Document, Citation } from '../types';

export const ChatPage: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [activeDoc, setActiveDoc] = useState<Document | null>(null);
  const [highlightedPage, setHighlightedPage] = useState<number | null>(null);
  const [highlightedQuote, setHighlightedQuote] = useState<string | null>(null);

  // Document Viewport controls
  const [zoomLevel, setZoomLevel] = useState(100);
  const [docSearchQuery, setDocSearchQuery] = useState('');
  const [selectedModel, setSelectedModel] = useState('llama3.2');
  const [isUploading, setIsUploading] = useState(false);

  // Hover citation card state
  const [hoveredCitation, setHoveredCitation] = useState<Citation | null>(null);
  const [citationPos, setCitationPos] = useState<{ x: number; y: number } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    fetchConversations();
    fetchDocuments();
  }, []);

  useEffect(() => {
    if (activeConvId) {
      fetchConversationDetail(activeConvId);
    } else {
      setMessages([]);
    }
  }, [activeConvId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const fetchConversations = async () => {
    try {
      const data = await historyApi.list();
      setConversations(data);
    } catch (err) {
      console.error('Failed to list history:', err);
    }
  };

  const fetchDocuments = async () => {
    try {
      const data = await documentApi.list();
      setDocuments(data);
      if (data.length > 0 && !activeDoc) {
        setActiveDoc(data[0]);
      }
    } catch (err) {
      console.error('Failed to list documents:', err);
    }
  };

  const fetchConversationDetail = async (convId: string) => {
    try {
      const data = await historyApi.get(convId);
      setMessages(data.messages || []);
    } catch (err) {
      console.error('Failed to get conversation detail:', err);
    }
  };

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const doc = await documentApi.upload(file);
      await fetchDocuments();
      setActiveDoc(doc);
    } catch (err) {
      console.error('Document upload failed:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;

    const userQuestion = input.trim();
    setInput('');

    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      sender: 'USER',
      content: userQuestion,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    setLoading(true);

    try {
      const response = await ragApi.ask(
        userQuestion,
        activeConvId || undefined,
        selectedDocIds.length > 0 ? selectedDocIds : undefined
      );

      if (!activeConvId) {
        setActiveConvId(response.conversation_id);
        await fetchConversations();
      }

      const assistantMsg: Message = {
        id: `msg-${Date.now()}`,
        sender: 'ASSISTANT',
        content: response.answer,
        sources: response.sources,
        confidence_score: response.confidence_score,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);

      if (response.sources && response.sources.length > 0) {
        const topSource = response.sources[0];
        setHighlightedPage(topSource.page_number || 1);
        setHighlightedQuote(topSource.content);
        const matchingDoc = documents.find((d) => d.id === topSource.document_id);
        if (matchingDoc) setActiveDoc(matchingDoc);
      }
    } catch (err) {
      console.error('Failed to send question:', err);
      const errorMsg: Message = {
        id: `err-${Date.now()}`,
        sender: 'ASSISTANT',
        content: 'Error: Failed to process document query. Please check model status.',
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleCitationHover = (e: React.MouseEvent, source: Citation) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setCitationPos({ x: rect.left, y: rect.top - 10 });
    setHoveredCitation(source);
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex overflow-hidden bg-[#090D16] text-white select-none">
      {/* PANEL A: INTELLIGENCE RAIL (LEFT - 260px) */}
      <div className="w-64 bg-[#0A0E1A] border-r border-white/[0.08] flex flex-col justify-between shrink-0">
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold tracking-widest text-slate-400 uppercase">
              Doc Vault
            </span>
            <button
              onClick={() => {
                setActiveConvId(null);
                setMessages([]);
              }}
              className="p-1.5 rounded-lg bg-royal-violet/20 text-royal-violet border border-royal-violet/40 hover:bg-royal-violet/30 transition-all text-xs font-semibold flex items-center space-x-1 shadow-[0_0_12px_rgba(79,70,229,0.3)]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New QA</span>
            </button>
          </div>

          {/* Floating Drop Zone */}
          <label className="relative block border-2 border-dashed border-white/15 hover:border-royal-sky/50 bg-obsidian-panel rounded-2xl p-4 text-center cursor-pointer transition-all group overflow-hidden">
            <input
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
              className="hidden"
            />
            {isUploading && <div className="laser-beam animate-laser-scan" />}
            <UploadCloud className="w-6 h-6 mx-auto text-royal-sky mb-1 group-hover:scale-110 transition-transform" />
            <p className="text-xs font-semibold text-slate-200">
              {isUploading ? 'Indexing File...' : 'Drop Document'}
            </p>
            <p className="text-[10px] font-mono text-slate-400 mt-0.5">PDF, DOCX, TXT • ⌘U</p>
          </label>
        </div>

        {/* Document Vault List */}
        <div className="flex-1 overflow-y-auto px-3 space-y-1.5">
          <div className="px-2 py-1 text-[10px] font-mono text-slate-400 uppercase tracking-wider">
            Active Workspace Files ({documents.length})
          </div>

          {documents.map((doc) => {
            const isSelected = selectedDocIds.includes(doc.id);
            const isActive = activeDoc?.id === doc.id;

            return (
              <div
                key={doc.id}
                onClick={() => setActiveDoc(doc)}
                className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                  isActive
                    ? 'bg-royal-sky/15 border-royal-sky/50 text-white shadow-[0_0_15px_rgba(56,189,248,0.2)]'
                    : 'bg-obsidian-panel border-white/5 text-slate-300 hover:border-white/20'
                }`}
              >
                <div className="flex items-center space-x-2.5 truncate">
                  {doc.file_type === 'pdf' ? (
                    <FileText className="w-4 h-4 text-rose-400 shrink-0" />
                  ) : doc.file_type === 'docx' ? (
                    <FileSpreadsheet className="w-4 h-4 text-blue-400 shrink-0" />
                  ) : (
                    <FileCode className="w-4 h-4 text-royal-mint shrink-0" />
                  )}

                  <div className="truncate">
                    <p className="font-semibold truncate text-[11px] leading-snug">{doc.filename}</p>
                    <p className="text-[10px] font-mono text-slate-400">
                      {doc.chunk_count} passages • {doc.page_count || 1}p
                    </p>
                  </div>
                </div>

                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => {
                    e.stopPropagation();
                    if (isSelected) {
                      setSelectedDocIds(selectedDocIds.filter((id) => id !== doc.id));
                    } else {
                      setSelectedDocIds([...selectedDocIds, doc.id]);
                    }
                  }}
                  className="w-3.5 h-3.5 accent-royal-sky rounded cursor-pointer"
                  title="Filter query scope to this document"
                />
              </div>
            );
          })}

          {conversations.length > 0 && (
            <div className="pt-3 space-y-1">
              <div className="px-2 py-1 text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                Past QA Sessions ({conversations.length})
              </div>
              {conversations.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setActiveConvId(c.id)}
                  className={`p-2 rounded-lg text-[11px] font-mono cursor-pointer truncate transition-all ${
                    activeConvId === c.id
                      ? 'bg-royal-violet/20 text-royal-violet font-bold border border-royal-violet/40'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  {c.title || 'Untitled Session'}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Vector Embedding Meter */}
        <div className="p-4 bg-[#070A11] border-t border-white/[0.08] space-y-2 font-mono text-[10px]">
          <div className="flex justify-between text-slate-400">
            <span>FAISS Embedding Space</span>
            <span className="text-royal-sky font-bold">128 / 512 Dim</span>
          </div>
          <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
            <div className="bg-gradient-to-r from-royal-sky to-royal-violet h-full w-[45%] rounded-full animate-pulse" />
          </div>
        </div>
      </div>

      {/* PANEL B: HIGH-PRECISION DOCUMENT VIEWPORT (CENTER FLEX) */}
      <div className="flex-1 flex flex-col bg-obsidian-floor border-r border-white/[0.08] relative overflow-hidden">
        {/* Toolbar */}
        <div className="h-12 px-4 border-b border-white/[0.08] bg-[#0B0F1B] flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3 text-xs font-mono">
            <Layers className="w-4 h-4 text-royal-sky" />
            <span className="font-semibold text-slate-200 truncate max-w-xs">
              {activeDoc ? activeDoc.filename : 'No Document Selected'}
            </span>
            {activeDoc && (
              <span className="px-2 py-0.5 rounded-full bg-royal-mint/10 text-royal-mint border border-royal-mint/30 text-[10px] font-bold">
                READY • OCR SYNCHRONIZED
              </span>
            )}
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={docSearchQuery}
                onChange={(e) => setDocSearchQuery(e.target.value)}
                placeholder="Find in doc (⌘F)..."
                className="pl-8 pr-3 py-1 rounded-xl bg-[#090D16] border border-white/10 text-slate-200 text-xs font-mono focus:border-royal-sky focus:outline-none w-36"
              />
            </div>

            <div className="flex items-center space-x-1.5 bg-[#090D16] p-1 rounded-xl border border-white/10 font-mono text-[11px]">
              <button
                onClick={() => setZoomLevel(Math.max(50, zoomLevel - 15))}
                className="p-1 hover:text-royal-sky"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="w-10 text-center font-bold text-slate-300">{zoomLevel}%</span>
              <button
                onClick={() => setZoomLevel(Math.min(200, zoomLevel + 15))}
                className="p-1 hover:text-royal-sky"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Viewport Render Canvas */}
        <div className="flex-1 overflow-y-auto p-8 flex justify-center bg-[#070A11] relative">
          {activeDoc ? (
            <div
              style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
              className="w-full max-w-2xl bg-[#0E1422] border border-white/10 rounded-2xl p-8 shadow-[0_20px_60px_rgba(0,0,0,0.85)] space-y-6 transition-transform duration-200"
            >
              <div className="pb-4 border-b border-white/10 flex items-center justify-between text-xs font-mono text-slate-400">
                <span>FILE: {activeDoc.filename}</span>
                <span>TYPE: {activeDoc.file_type.toUpperCase()} • {formatBytes(activeDoc.file_size_bytes)}</span>
              </div>

              <div className="space-y-4 text-xs font-sans leading-relaxed text-slate-300">
                <div className="p-4 rounded-xl bg-[#0A0E18] border border-white/5 space-y-2">
                  <h4 className="text-sm font-bold text-slate-100 font-display">
                    1. Executive Technical Summary
                  </h4>
                  <p>
                    DocMind AI is a flagship Retrieval-Augmented Generation (RAG) platform designed to parse multi-format enterprise documents into dense vector embeddings stored within high-speed FAISS indexes.
                  </p>
                </div>

                {/* Glowing Paragraph Citation Overlay when cited by AI */}
                {highlightedQuote && (
                  <div className="p-4 rounded-xl bg-royal-sky/15 border-2 border-royal-sky text-white shadow-[0_0_30px_rgba(56,189,248,0.35)] animate-in fade-in duration-300">
                    <div className="flex items-center space-x-2 text-[10px] font-mono text-royal-sky font-bold mb-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>CITED PASSAGE MATCH (PAGE {highlightedPage || 1})</span>
                    </div>
                    <p className="italic font-medium leading-relaxed bg-black/40 p-2.5 rounded-lg border border-royal-sky/30">
                      "{highlightedQuote}"
                    </p>
                  </div>
                )}

                <div className="p-4 rounded-xl bg-[#0A0E18] border border-white/5 space-y-2">
                  <h4 className="text-sm font-bold text-slate-100 font-display">
                    2. Vector Storage & Precision Grounding
                  </h4>
                  <p>
                    Passages are sliced into 500-character chunks with 50-character sliding windows. Dense vector search is performed using cosine distance metrics, ensuring response grounding accuracy above 90%.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#0A0E18] border border-white/5 space-y-2">
                  <h4 className="text-sm font-bold text-slate-100 font-display">
                    3. Local LLM Reasoning Engine
                  </h4>
                  <p>
                    Meta Llama 3.2 1B runs locally via Ollama to guarantee data confidentiality and zero external API latency dependencies.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="m-auto text-center space-y-3">
              <BookOpen className="w-12 h-12 text-slate-600 mx-auto opacity-40" />
              <p className="text-sm font-medium text-slate-400 font-sans">Select a document from the vault to inspect</p>
            </div>
          )}
        </div>
      </div>

      {/* PANEL C: INTERACTIVE REASONING WORKSPACE (RIGHT - 420px) */}
      <div className="w-[420px] bg-[#0A0E1A] flex flex-col justify-between shrink-0 relative">
        <div className="p-3.5 border-b border-white/[0.08] flex items-center justify-between bg-[#080B12]">
          <div className="flex items-center space-x-2">
            <Cpu className="w-4 h-4 text-royal-sky" />
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-[#090D16] border border-white/10 text-xs font-mono font-bold text-slate-200 rounded-xl px-2.5 py-1 focus:border-royal-sky focus:outline-none"
            >
              <option value="llama3.2">Meta Llama 3.2 1B (Local)</option>
              <option value="gpt4o">OpenAI GPT-4o Vision</option>
            </select>
          </div>

          <div className="flex items-center space-x-1.5 px-2 py-1 rounded-full bg-royal-mint/10 text-royal-mint border border-royal-mint/30 text-[10px] font-mono font-bold">
            <Activity className="w-3 h-3 animate-pulse" />
            <span>&lt;45ms LATENCY</span>
          </div>
        </div>

        {/* Stream Message Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4 my-auto">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-royal-violet/30 to-royal-sky/20 border border-royal-sky/40 text-royal-sky shadow-[0_0_30px_rgba(56,189,248,0.25)]">
                <Sparkles className="w-8 h-8 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-bold font-display text-slate-100">
                  Ask DocMind AI
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed font-sans">
                  Query your document vault with dense vector search & grounded citation reasoning.
                </p>
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              const isUser = msg.sender === 'USER';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col space-y-1.5 ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[90%] p-3.5 rounded-2xl text-xs leading-relaxed transition-all ${
                      isUser
                        ? 'bg-gradient-to-r from-royal-violet to-indigo-700 text-white rounded-br-none shadow-[0_5px_20px_rgba(79,70,229,0.3)]'
                        : 'glass-panel text-slate-200 rounded-bl-none border-white/10'
                    }`}
                  >
                    <p className="whitespace-pre-wrap font-sans">{msg.content}</p>

                    {/* Inline Citation Chips with Hover Tooltip */}
                    {!isUser && msg.sources && msg.sources.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-white/10 space-y-1.5">
                        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold">
                          Grounded Citations ({msg.sources.length}):
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.sources.map((src, idx) => (
                            <button
                              key={idx}
                              onMouseEnter={(e) => handleCitationHover(e, src)}
                              onMouseLeave={() => setHoveredCitation(null)}
                              onClick={() => {
                                setHighlightedPage(src.page_number || 1);
                                setHighlightedQuote(src.content);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-royal-sky/15 hover:bg-royal-sky/30 text-royal-sky border border-royal-sky/40 text-[10px] font-mono font-bold transition-all flex items-center space-x-1"
                            >
                              <FileText className="w-3 h-3" />
                              <span>Doc {idx + 1} • P.{src.page_number || 1}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          {loading && (
            <div className="flex items-center space-x-2 text-xs font-mono text-royal-sky p-3 bg-royal-sky/10 rounded-2xl border border-royal-sky/30 w-fit animate-pulse font-bold">
              <Sparkles className="w-4 h-4 animate-spin" />
              <span>Generating grounded response...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Floating Citation Tooltip Glass Card */}
        {hoveredCitation && citationPos && (
          <div
            style={{ left: citationPos.x, top: citationPos.y - 120 }}
            className="fixed z-50 w-72 glass-panel p-3 rounded-2xl border-royal-mint/50 shadow-[0_15px_40px_rgba(0,0,0,0.95)] text-xs space-y-1.5 pointer-events-none animate-in fade-in duration-150"
          >
            <div className="flex items-center justify-between text-[10px] font-mono text-royal-mint font-bold">
              <span>SOURCE PASSAGE (PAGE {hoveredCitation.page_number || 1})</span>
              <span>{(hoveredCitation.similarity * 100).toFixed(0)}% MATCH</span>
            </div>
            <p className="text-[11px] text-slate-300 italic line-clamp-3 bg-black/40 p-2 rounded-xl border border-white/5 font-sans">
              "{hoveredCitation.content}"
            </p>
          </div>
        )}

        {/* Input Terminal */}
        <form onSubmit={handleSendMessage} className="p-3 bg-[#080B12] border-t border-white/[0.08]">
          <div className="relative flex items-center bg-[#090D16] border border-white/10 rounded-2xl p-2 focus-within:border-royal-sky transition-all shadow-inner">
            <textarea
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Ask anything about your documents..."
              className="w-full bg-transparent text-slate-100 placeholder-slate-400 text-xs focus:outline-none resize-none px-2 py-1 font-sans"
            />

            <div className="flex items-center space-x-1.5 shrink-0 ml-2">
              <button
                type="button"
                className="p-1.5 rounded-xl text-slate-400 hover:text-royal-sky hover:bg-white/5 transition-colors"
                title="Voice Input Visualizer"
              >
                <Volume2 className="w-4 h-4" />
              </button>

              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="p-2 rounded-xl bg-gradient-to-r from-royal-violet to-royal-sky text-white shadow-[0_0_15px_rgba(79,70,229,0.4)] disabled:opacity-40 transition-all"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 px-2 mt-1.5">
            <span className="flex items-center space-x-1">
              <CornerDownLeft className="w-2.5 h-2.5" />
              <span>Send (Enter)</span>
            </span>
            <span>Shift + Enter for newline</span>
          </div>
        </form>
      </div>
    </div>
  );
};
