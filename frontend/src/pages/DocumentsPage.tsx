import React, { useState, useEffect } from 'react';
import {
  FileText,
  Upload,
  Trash2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Layers,
  UploadCloud,
  FileCode,
  FileSpreadsheet,
} from 'lucide-react';
import { documentApi } from '../services/api';
import { Document } from '../types';

export const DocumentsPage: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const data = await documentApi.list();
      setDocuments(data);
    } catch (err) {
      console.error('Failed to fetch document repository:', err);
      setError('Failed to fetch document repository.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleFileUpload = async (file: File) => {
    setError(null);
    setSuccess(null);
    setUploading(true);

    try {
      const doc = await documentApi.upload(file);
      setSuccess(`Successfully uploaded and vectorized "${doc.filename}" (${doc.chunk_count} passages indexed)`);
      await fetchDocuments();
    } catch (err: any) {
      console.error('Upload failed:', err);
      const detail = err.response?.data?.detail;
      if (typeof detail === 'string') {
        setError(detail);
      } else if (Array.isArray(detail) && detail.length > 0) {
        setError(detail.map((item: any) => item.msg || JSON.stringify(item)).join('. '));
      } else {
        setError('Document upload failed. Ensure the file is a PDF, DOCX, or TXT under 25MB.');
      }
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleDelete = async (id: string, filename: string) => {
    if (!window.confirm(`Are you sure you want to delete "${filename}"? This will purge vectors from FAISS.`)) {
      return;
    }

    try {
      await documentApi.delete(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      setSuccess(`Deleted "${filename}".`);
    } catch (err) {
      console.error('Failed to delete document:', err);
      setError(`Failed to delete "${filename}".`);
    }
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Layers className="w-5 h-5 text-royal-sky" />
            <h1 className="text-2xl font-bold font-display text-white">Document Repository Vault</h1>
          </div>
          <p className="text-xs font-mono text-slate-400 mt-1">
            Files are sliced into 500-char passages and stored within FAISS L2 vector embedding space.
          </p>
        </div>

        <button
          onClick={fetchDocuments}
          className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-[#0E1422] border border-white/10 text-slate-300 text-xs font-mono hover:border-royal-sky/40 transition-all shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-royal-sky' : ''}`} />
          <span>Refresh Index</span>
        </button>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="underline font-bold">
            Dismiss
          </button>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-2xl bg-royal-mint/10 border border-royal-mint/30 text-royal-mint text-xs font-mono flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="underline font-bold">
            Dismiss
          </button>
        </div>
      )}

      {/* Animated Upload Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-3xl p-8 text-center transition-all overflow-hidden ${
          dragOver
            ? 'border-royal-sky bg-royal-sky/10 scale-[1.01]'
            : 'border-white/15 bg-glass-panel-interactive hover:border-white/30'
        }`}
      >
        {uploading && <div className="laser-beam animate-laser-scan" />}

        <div className="max-w-md mx-auto space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-royal-sky/10 border border-royal-sky/30 text-royal-sky flex items-center justify-center shadow-[0_0_25px_rgba(56,189,248,0.3)]">
            <UploadCloud className={`w-7 h-7 ${uploading ? 'animate-bounce' : ''}`} />
          </div>
          <div>
            <h3 className="text-base font-bold font-display text-white">
              {uploading ? 'Scanning & Vectorizing Document...' : 'Drag & Drop Document to Index'}
            </h3>
            <p className="text-xs font-mono text-slate-400 mt-1">
              Supports PDF, DOCX, and TXT files up to 25MB • Automated Chunking
            </p>
          </div>

          <div>
            <label className="cursor-pointer inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-royal-violet to-royal-sky text-white font-semibold text-xs shadow-[0_0_20px_rgba(79,70,229,0.4)] transition-all">
              <Upload className="w-4 h-4" />
              <span>Select File from Machine</span>
              <input
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={handleFileChange}
                disabled={uploading}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Document Vault Table */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-[#0B0F1B]">
          <h3 className="font-bold font-display text-slate-200 text-xs uppercase tracking-wider font-mono">
            Vault Index ({documents.length} Files)
          </h3>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 font-mono text-xs">
            Querying document repository database...
          </div>
        ) : documents.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs font-mono space-y-2">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-30 text-royal-sky" />
            <p className="font-semibold text-slate-300">Vault is empty</p>
            <p className="text-slate-400">Upload a PDF or DOCX above to begin parsing vector embeddings.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#070A11] text-slate-400 uppercase text-[10px] tracking-wider border-b border-white/5">
                <tr>
                  <th className="px-6 py-3.5">Filename</th>
                  <th className="px-6 py-3.5">Type</th>
                  <th className="px-6 py-3.5">Size</th>
                  <th className="px-6 py-3.5">Passage Chunks</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Uploaded</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-200">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-royal-sky/10 rounded-lg text-royal-sky border border-royal-sky/20">
                          {doc.file_type === 'pdf' ? (
                            <FileText className="w-4 h-4 text-rose-400" />
                          ) : doc.file_type === 'docx' ? (
                            <FileSpreadsheet className="w-4 h-4 text-blue-400" />
                          ) : (
                            <FileCode className="w-4 h-4 text-royal-mint" />
                          )}
                        </div>
                        <span className="truncate max-w-xs font-sans text-xs" title={doc.filename}>
                          {doc.filename || 'Untitled'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded uppercase text-[10px] font-bold bg-white/10 text-slate-300">
                        {doc.file_type || 'file'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {formatBytes(doc.file_size_bytes)}
                    </td>
                    <td className="px-6 py-4 text-royal-sky font-bold">
                      {doc.chunk_count} passages
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-royal-mint/10 text-royal-mint border border-royal-mint/30">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> {doc.status || 'READY'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString() : 'Just now'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(doc.id, doc.filename)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Purge Document & FAISS Vectors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
