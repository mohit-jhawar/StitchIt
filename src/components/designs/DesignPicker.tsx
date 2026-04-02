import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { DesignCatalog } from './DesignCatalog';
import type { Design } from './DesignCard';
import { FiImage, FiX } from 'react-icons/fi';
import { formatCurrency } from '../../lib/utils';

interface DesignPickerProps {
  selectedDesign: Design | null;
  onSelect: (design: Design | null) => void;
}

export function DesignPicker({ selectedDesign, onSelect }: DesignPickerProps) {
  const [open, setOpen] = useState(false);

  function handleSelect(design: Design) {
    onSelect(design);
    setOpen(false);
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onSelect(null);
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700 block">
        Design Template <span className="text-gray-400 font-normal">(optional)</span>
      </label>

      {selectedDesign ? (
        <div className="flex items-center gap-3 p-3 border-2 border-indigo-200 bg-indigo-50 rounded-xl">
          {selectedDesign.images[0] ? (
            <img
              src={selectedDesign.images[0]}
              alt={selectedDesign.name}
              className="w-14 h-14 object-cover rounded-lg flex-shrink-0"
            />
          ) : (
            <div className="w-14 h-14 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0 text-2xl">
              🧵
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm truncate">{selectedDesign.name}</p>
            <p className="text-xs text-gray-500">{selectedDesign.service.name} · {selectedDesign.category}</p>
            <p className="text-xs font-bold text-indigo-600 mt-0.5">
              {formatCurrency(selectedDesign.basePrice ?? selectedDesign.service.basePrice)}
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="px-2.5 py-1.5 text-xs font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
            >
              Change
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
            >
              <FiX className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full flex items-center gap-3 p-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/50 transition-all"
        >
          <FiImage className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">Browse Design Catalog</span>
        </button>
      )}

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Choose a Design" size="xl">
        <DesignCatalog
          selectedId={selectedDesign?.id}
          onSelect={handleSelect}
        />
      </Modal>
    </div>
  );
}

export default DesignPicker;
