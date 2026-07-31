import React, { useState } from 'react';
import { Search, FileText } from 'lucide-react';
import { searchApi } from '../services/api';
import { SearchResult } from '../types';

export const SearchPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'hybrid' | 'semantic' | 'keyword'>('hybrid');
  const [results, setResults] = useState<SearchResult[]>([]);
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Document Passage Search</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Perform semantic, exact keyword, or hybrid document passage searches across your knowledge base.
        </p>
      </div>

      {/* Search Bar & Mode Selector */}
      <form onSubmit={handleSearch} className="space-y-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for terms, topics, or exact text..."
              className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-sm"
            />
          </div>

          <button
            type="submit"
            disabled={!query.trim() || searching}
            className="w-full sm:w-auto px-6 py-3 bg-sky-500 hover:bg-sky-400 text-white font-semibold text-sm rounded-2xl shadow-md shadow-sky-500/20 disabled:opacity-50 transition-all shrink-0"
          >
            {searching ? 'Searching...' : 'Search Index'}
          </button>
        </div>

        {/* Mode Selector Radio Pills */}
        <div className="flex items-center space-x-2 text-xs font-medium">
          <span className="text-slate-500 dark:text-slate-400 mr-2">Search Mode:</span>
          {(['hybrid', 'semantic', 'keyword'] as const).map((m) => (
            <button
              type="button"
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1.5 rounded-full capitalize transition-colors ${
                mode === m
                  ? 'bg-sky-500 text-white font-semibold shadow-sm'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700'
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
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Found {results.length} matching passage(s) using <span className="font-semibold capitalize text-sky-600 dark:text-sky-400">{mode}</span> mode.
          </p>
        )}

        {results.length === 0 && searched ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-800">
            <Search className="w-10 h-10 mx-auto text-slate-400 mb-2 opacity-50" />
            <p className="text-slate-700 dark:text-slate-300 font-medium">No matching passages found</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Try switching to Hybrid or Keyword search mode.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {results.map((res, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-sky-300 dark:hover:border-sky-800 transition-all space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 truncate">
                    <FileText className="w-4 h-4 text-sky-500 shrink-0" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                      {res.filename}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      Page {res.page_number}
                    </span>
                  </div>

                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                    {(res.score * 100).toFixed(0)}% Match
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed italic bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                  "{res.content}"
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
