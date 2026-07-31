import React, { useState, useEffect } from 'react';
import {
  FileText,
  Upload,
  Trash2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
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
      setSuccess(`Successfully uploaded and indexed "${doc.filename}" (${doc.chunk_count} passages chunked)`);
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
    if (!window.confirm(`Are you sure you want to delete "${filename}"? This will remove its vectors from FAISS as well.`)) {
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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Document Repository</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage your knowledge base documents. Files are processed, chunked, and stored in FAISS vector index.
          </p>
        </div>
        <button
          onClick={fetchDocuments}
          className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-sm flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-xs underline font-semibold">
            Dismiss
          </button>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 text-sm flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="text-xs underline font-semibold">
            Dismiss
          </button>
        </div>
      )}

      {/* Upload Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all ${
          dragOver
            ? 'border-sky-500 bg-sky-50/50 dark:bg-sky-950/30 scale-[1.01]'
            : 'border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-400 dark:hover:border-slate-700'
        }`}
      >
        <div className="max-w-md mx-auto space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center shadow-inner">
            <Upload className={`w-7 h-7 ${uploading ? 'animate-bounce' : ''}`} />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
              {uploading ? 'Processing & Vectorizing File...' : 'Drag & drop your document here'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Supports PDF, DOCX, and TXT files up to 25MB
            </p>
          </div>

          <div>
            <label className="cursor-pointer inline-flex items-center px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-medium text-sm shadow-md shadow-sky-500/20 transition-all">
              <span>Browse Files</span>
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

      {/* Document List Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
            Uploaded Documents ({documents.length})
          </h3>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm">
            Loading document repository...
          </div>
        ) : documents.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400 text-sm">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium text-slate-700 dark:text-slate-300">No documents found</p>
            <p className="text-xs mt-1">Upload a PDF or DOCX file above to start questioning your docs.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Filename</th>
                  <th className="px-6 py-3.5">Type</th>
                  <th className="px-6 py-3.5">Size</th>
                  <th className="px-6 py-3.5">Chunks</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Uploaded</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 rounded-lg">
                          <FileText className="w-4 h-4" />
                        </div>
                        <span className="truncate max-w-xs" title={doc.filename}>
                          {doc.filename || 'Untitled'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded uppercase text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {doc.file_type || doc.filename?.split('.').pop() || 'file'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-xs">
                      {formatBytes(doc.file_size_bytes)}
                    </td>
                    <td className="px-6 py-4 text-slate-700 dark:text-slate-300 font-semibold text-xs">
                      {doc.chunk_count} passages
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 capitalize">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> {doc.status || 'Ready'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-xs">
                      {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString() : 'Just now'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(doc.id, doc.filename)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                        title="Delete Document & Remove Vectors"
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
