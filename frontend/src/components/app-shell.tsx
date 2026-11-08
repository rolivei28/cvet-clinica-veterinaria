'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/sidebar';
import { MedicacaoLembretes } from '@/components/medicacao-lembretes';

const SESSION_KEY = 'cvet-user';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const authenticated = Boolean(localStorage.getItem(SESSION_KEY));
    if (!authenticated && pathname !== '/login') router.replace('/login');
    if (authenticated && pathname === '/login') router.replace('/internacoes');
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage só existe no cliente
    setCheckingSession(false);
  }, [pathname, router]);

  if (checkingSession) return null;
  if (pathname === '/login') return <>{children}</>;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <div className="flex-1 overflow-y-auto">{children}</div>
      <MedicacaoLembretes />
    </div>
  );
}