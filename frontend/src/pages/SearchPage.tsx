import React, { useState } from 'react';
import { Search, FileText } from 'lucide-react';
import { searchApi } from '../services/api';
import { SearchResultItem } from '../types';

export const SearchPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'hybrid' | 'semantic' | 'keyword'>('hybrid');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || searching) return;

    setSearching(true);
    setSearched(true);

    try {
      const data = await searchApi.search(query, mode, 15);
      setResults(data);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-24 md:pb-8">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2">
          <Search className="w-5 h-5 text-royal-sky" />
          <h1 className="text-2xl font-bold font-display text-white">Hybrid Passage Search Engine</h1>
        </div>
        <p className="text-xs font-mono text-slate-400 mt-1">
          Perform FAISS L2 vector similarity, exact SQL keyword matching, or hybrid dense-sparse searches.
        </p>
      </div>

      {/* Search Bar & Mode Selector */}
      <form onSubmit={handleSearch} className="space-y-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-royal-sky" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for terms, topics, or exact text..."
              className="glass-input w-full pl-11 pr-4 py-3.5 rounded-2xl text-white font-sans text-sm focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={!query.trim() || searching}
            className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-royal-violet to-royal-sky text-white font-semibold text-xs rounded-2xl shadow-[0_0_20px_rgba(79,70,229,0.4)] disabled:opacity-50 transition-all shrink-0"
          >
            {searching ? 'Searching FAISS...' : 'Search Index'}
          </button>
        </div>

        {/* Mode Selector Radio Pills */}
        <div className="flex items-center space-x-2 text-xs font-mono">
          <span className="text-slate-400 mr-2">Search Mode:</span>
          {(['hybrid', 'semantic', 'keyword'] as const).map((m) => (
            <button
              type="button"
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1.5 rounded-xl capitalize transition-all ${
                mode === m
                  ? 'bg-royal-sky/20 text-royal-sky border border-royal-sky/40 font-bold shadow-[0_0_12px_rgba(56,189,248,0.2)]'
                  : 'bg-[#0E1422] text-slate-400 hover:text-slate-200 border border-white/5'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </form>

      {/* Results Grid */}
      <div className="space-y-4">
        {searched && (
          <p className="text-xs font-mono text-slate-400">
            Found <span className="text-royal-sky font-bold">{results.length}</span> matching passage(s) using <span className="capitalize font-bold text-white">{mode}</span> mode.
          </p>
        )}

        {results.length === 0 && searched ? (
          <div className="glass-panel rounded-2xl p-12 text-center border border-white/10 space-y-2">
            <Search className="w-10 h-10 mx-auto text-slate-600 mb-2 opacity-50" />
            <p className="text-slate-300 font-semibold text-sm">No matching passages found</p>
            <p className="text-xs font-mono text-slate-400">Try adjusting your query or switching to Hybrid search mode.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {results.map((res, idx) => (
              <div
                key={idx}
                className="glass-panel-interactive rounded-2xl p-5 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 truncate font-mono text-xs">
                    <FileText className="w-4 h-4 text-royal-sky shrink-0" />
                    <span className="font-bold text-slate-200 truncate max-w-[180px]">
                      {res.filename}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-slate-400">
                      Page {res.page_number || 1}
                    </span>
                  </div>

                  <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-royal-sky/15 text-royal-sky border border-royal-sky/30">
                    {(res.score * 100).toFixed(0)}% MATCH ({res.match_type.toUpperCase()})
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed italic bg-black/40 p-3 rounded-xl border border-white/5 font-sans">
                  "{res.excerpt}"
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
