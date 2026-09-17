'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import CopilotWidget from '@/components/ai/CopilotWidget';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();
  const isLoginPage = pathname === '/login';
  const isExpiredPage = pathname === '/suscripcion-vencida';

  React.useEffect(() => {
    if (!loading) {
      if (!user && !isLoginPage && !isExpiredPage) {
        router.push('/login');
        return;
      }

      // Bloqueo explícito administrativo en tiempo de ejecución de interfaz
      if (user && user.rol !== 'SUPERADMIN' && user.tenant) {
        if (user.tenant.bloqueadoPorSuscripcion && !isExpiredPage) {
          router.push('/suscripcion-vencida');
        }
      }
    }
  }, [loading, user, isLoginPage, isExpiredPage, router]);

  // Si estamos en login o pantalla de suscripción vencida, no renderizar ni el Navbar ni el Sidebar
  if (isLoginPage || isExpiredPage) {
    return <main className="min-h-screen w-full">{children}</main>;
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 relative">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-6 overflow-y-auto max-h-[calc(100vh-4rem)] bg-slate-50">
          {children}
        </main>
      </div>
      {/* Copilot Inteligente Global */}
      <CopilotWidget />
    </div>
  );
}
