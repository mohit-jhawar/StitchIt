import React, { useState, useEffect } from 'react';
import { DesignCard } from './DesignCard';
import type { Design } from './DesignCard';
import { FiSearch, FiGrid } from 'react-icons/fi';

const CATEGORIES = ['All', 'Formal', 'Ethnic', 'Casual', 'Bridal', 'Kids'];

interface DesignCatalogProps {
  selectedId?: string;
  onSelect?: (design: Design) => void;
  /** If true, shows admin controls (inactive designs + edit links) */
  adminMode?: boolean;
}

export function DesignCatalog({ selectedId, onSelect, adminMode = false }: DesignCatalogProps) {
  const [designs, setDesigns] = useState<Design[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [category, search]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '12' });
    if (category !== 'All') params.set('category', category);
    if (!adminMode) params.set('active', 'true');

    fetch(`/api/designs?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setDesigns(data.designs || []);
        setTotalPages(data.totalPages || 1);
      })
      .catch(() => setDesigns([]))
      .finally(() => setLoading(false));
  }, [category, page, adminMode]);

  const filtered = search
    ? designs.filter(
        (d) =>
          d.name.toLowerCase().includes(search.toLowerCase()) ||
          d.category.toLowerCase().includes(search.toLowerCase()) ||
          d.service.name.toLowerCase().includes(search.toLowerCase()) ||
          (d.tags || '').toLowerCase().includes(search.toLowerCase())
      )
    : designs;

  return (
    <div className="space-y-4">
      {/* Search + Category filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search designs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                category === cat
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-gray-100 overflow-hidden animate-pulse">
              <div className="aspect-[4/3] bg-gray-200" />
              <div className="p-3 space-y-2">
                <div className="h-3 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FiGrid className="w-10 h-10 text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No designs found</p>
          <p className="text-gray-400 text-sm mt-1">
            {adminMode ? 'Add your first design using the button above.' : 'Try a different category or search term.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((design) => (
            <DesignCard
              key={design.id}
              design={design}
              selected={selectedId === design.id}
              actionLabel={onSelect ? (adminMode ? 'Edit' : 'Select') : undefined}
              onAction={onSelect}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && !search && (
        <div className="flex justify-center gap-2 pt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
          >
            Previous
          </button>
          <span className="px-3 py-1.5 text-sm text-gray-500">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

export default DesignCatalog;
