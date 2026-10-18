'use client';

import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';

export type AutocompleteOption = {
  value: string;
  label: string;
  description?: string;
};

type Props = {
  label: string;
  value: string;
  options: AutocompleteOption[];
  onChange: (value: string) => void;
  placeholder: string;
  emptyMessage: string;
  required?: boolean;
};

export function AutocompleteSelect({ label, value, options, onChange, placeholder, emptyMessage, required = false }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);
  const filtered = options.filter((option) => `${option.label} ${option.description ?? ''}`.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR'))).slice(0, 8);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza texto com a opção selecionada
  useEffect(() => { setQuery(selected?.label ?? ''); }, [selected?.label]);

  function select(option: AutocompleteOption) {
    onChange(option.value);
    setQuery(option.label);
    setOpen(false);
  }

  return <label className="grid gap-1 text-xs font-medium text-slate-600">
    {label}
    <span className="relative">
      <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        value={query}
        required={required}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onChange={(event) => { setQuery(event.target.value); onChange(''); setOpen(true); }}
        placeholder={placeholder}
        className="h-10 w-full rounded-md border border-slate-300 bg-white py-1 pl-8 pr-8 text-sm text-ink outline-none transition focus:border-moss focus:ring-2 focus:ring-moss/15"
      />
      {query && <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { setQuery(''); onChange(''); setOpen(true); }} title={`Limpar ${label.toLocaleLowerCase('pt-BR')}`} className="absolute right-1 top-1 inline-flex h-8 w-8 items-center justify-center rounded text-slate-400 hover:bg-slate-100"><X size={14} /></button>}
      {open && <span className="absolute z-30 mt-1 block w-full overflow-hidden rounded-md border border-slate-200 bg-white py-1 shadow-lg">{filtered.length ? filtered.map((option) => <button key={option.value} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => select(option)} className="block w-full px-3 py-2 text-left hover:bg-moss/5"><span className="block text-sm font-medium text-ink">{option.label}</span>{option.description && <span className="block text-xs text-slate-500">{option.description}</span>}</button>) : <span className="block px-3 py-2 text-xs text-slate-500">{emptyMessage}</span>}</span>}
    </span>
  </label>;
}