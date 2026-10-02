'use client';

import { ReactNode, useEffect, useRef } from 'react';
import { X, Printer } from 'lucide-react';

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
};

export function PrintModal({ open, onClose, title, children }: Props) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  function handlePrint() {
    window.print();
  }

  return (
    <div className="print-modal-backdrop fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8">
      <div className="print-modal-container relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl">
        {/* Header — escondido na impressão */}
        <div className="print-hide flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-bold text-ink">{title}</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-lg bg-moss px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-moss/90 transition"
            >
              <Printer size={14} />
              Imprimir
            </button>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Conteúdo imprimível */}
        <div ref={contentRef} className="print-content p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

