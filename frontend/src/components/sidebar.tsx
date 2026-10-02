'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { LayoutDashboard, BedDouble, BarChart3, Menu, X, Stethoscope, CalendarClock, UsersRound, WalletCards, UserCog, SlidersHorizontal, PackageSearch } from 'lucide-react';

const navItems = [
  { href: '/',               label: 'Início',            icon: LayoutDashboard },
  { href: '/internacoes',    label: 'Internações',        icon: BedDouble },
  { href: '/leitos',         label: 'Leitos',             icon: BedDouble },
  { href: '/tutores',        label: 'Tutores',            icon: UsersRound },
  { href: '/financeiro',     label: 'Financeiro',         icon: WalletCards },
  { href: '/mapa',           label: 'Mapa de Execução',   icon: CalendarClock },
  { href: '/parametrizacao', label: 'Parametrização',    icon: SlidersHorizontal },
  { href: '/catalogo',        label: 'Medicamentos e Materiais', icon: PackageSearch },
  { href: '/usuarios',       label: 'Usuários',           icon: UserCog },
  { href: '/analytics',     label: 'Análise de Dados',   icon: BarChart3 },
];

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navContent = (
    <nav className="flex flex-1 flex-col gap-1 px-3">
      {navItems.map(({ href, label, icon: Icon }) => {
        const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              active
                ? 'bg-moss text-white'
                : 'text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Icon size={18} strokeWidth={1.8} />
            {label}
          </Link>
        );
      })}
    </nav>
  );

  const sidebarBody = (
    <div className="flex h-full flex-col bg-ink py-5">
      {/* Brand */}
      <div className="mb-6 px-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-moss">
            <Stethoscope size={16} className="text-white" strokeWidth={2} />
          </div>
          <div>
            <p className="text-sm font-bold tracking-widest text-white">CVET</p>
            <p className="text-[10px] text-slate-400">Gestão Veterinária</p>
          </div>
        </div>
      </div>

      {/* Nav links */}
      {navContent}

      {/* Footer badge */}
      <div className="mt-4 px-5">
        <span className="inline-block rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-medium text-slate-400">
          MVP · Projeto UNIVESP
        </span>
      </div>
    </div>
  );

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="hidden w-56 shrink-0 lg:block">
        {sidebarBody}
      </aside>

      {/* ── Mobile: hamburger button ── */}
      <button
        className="fixed left-4 top-4 z-50 flex h-9 w-9 items-center justify-center rounded-lg bg-ink text-white shadow-lg lg:hidden"
        onClick={() => setMobileOpen((v) => !v)}
        aria-label="Abrir menu"
      >
        {mobileOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* ── Mobile: overlay + drawer ── */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-56 lg:hidden">
            {sidebarBody}
          </aside>
        </>
      )}
    </>
  );
}
