import React, { useState } from 'react';
import { formatCurrency } from '../../lib/utils';
import { FiChevronLeft, FiChevronRight, FiTag } from 'react-icons/fi';

export interface Design {
  id: string;
  name: string;
  description?: string | null;
  category: string;
  images: string[];
  tags?: string | null;
  basePrice?: number | null;
  isActive: boolean;
  service: { id: string; name: string; basePrice: number; category: string };
}

interface DesignCardProps {
  design: Design;
  actionLabel?: string;
  onAction?: (design: Design) => void;
  selected?: boolean;
}

export function DesignCard({ design, actionLabel = 'Select', onAction, selected = false }: DesignCardProps) {
  const [imgIndex, setImgIndex] = useState(0);
  const images = design.images.length > 0 ? design.images : [];
  const price = design.basePrice ?? design.service.basePrice;

  function prev(e: React.MouseEvent) {
    e.stopPropagation();
    setImgIndex((i) => (i - 1 + images.length) % images.length);
  }

  function next(e: React.MouseEvent) {
    e.stopPropagation();
    setImgIndex((i) => (i + 1) % images.length);
  }

  return (
    <div
      className={`rounded-xl border-2 overflow-hidden bg-white transition-all duration-200 flex flex-col ${
        selected
          ? 'border-indigo-500 shadow-lg shadow-indigo-100'
          : 'border-gray-100 hover:border-indigo-200 hover:shadow-md'
      }`}
    >
      {/* Image area */}
      <div className="relative bg-gray-100 aspect-[4/3] overflow-hidden">
        {images.length > 0 ? (
          <img
            src={images[imgIndex]}
            alt={design.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 text-4xl">
            🧵
          </div>
        )}

        {/* Multi-image nav */}
        {images.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-1.5 top-1/2 -translate-y-1/2 w-7 h-7 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center transition-colors"
            >
              <FiChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={next}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center transition-colors"
            >
              <FiChevronRight className="w-4 h-4" />
            </button>
            {/* Dots */}
            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); setImgIndex(i); }}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${i === imgIndex ? 'bg-white' : 'bg-white/50'}`}
                />
              ))}
            </div>
          </>
        )}

        {/* Category badge */}
        <span className="absolute top-2 left-2 px-2 py-0.5 bg-black/50 text-white text-xs font-medium rounded-full backdrop-blur-sm">
          {design.category}
        </span>

        {selected && (
          <div className="absolute top-2 right-2 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3 flex flex-col gap-1.5 flex-1">
        <h3 className="font-semibold text-gray-900 text-sm leading-tight">{design.name}</h3>

        <div className="flex items-center gap-1 text-xs text-gray-500">
          <FiTag className="w-3 h-3" />
          <span>{design.service.name}</span>
        </div>

        {design.description && (
          <p className="text-xs text-gray-400 line-clamp-2">{design.description}</p>
        )}

        {design.tags && (
          <div className="flex flex-wrap gap-1 mt-0.5">
            {design.tags.split(',').slice(0, 3).map((tag) => (
              <span key={tag} className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] rounded-full">
                {tag.trim()}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mt-auto pt-2">
          <span className="text-sm font-bold text-indigo-600">{formatCurrency(price)}</span>
          {onAction && (
            <button
              onClick={() => onAction(design)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                selected
                  ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              {selected ? 'Selected' : actionLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default DesignCard;
