import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';

export const metadata: Metadata = {
  title: 'ControlERP - Plataforma SaaS Multi-Giro',
  description: 'Sistema ERP Multiplataforma con control de crédito, inventarios multi-almacén, CxC, CxP y reportes mensuales',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="bg-slate-50 text-slate-900 min-h-screen antialiased flex flex-col">
        <AuthProvider>
          <Navbar />
          <div className="flex flex-1">
            <Sidebar />
            <main className="flex-1 p-6 overflow-y-auto max-h-[calc(100vh-4rem)]">
              {children}
            </main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
