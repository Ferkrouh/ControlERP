'use client';

import React from 'react';
import { useAuth } from '@/lib/auth-context';
import SuperadminDashboard from '@/components/dashboards/SuperadminDashboard';
import AdminDashboard from '@/components/dashboards/AdminDashboard';
import EncargadoDashboard from '@/components/dashboards/EncargadoDashboard';
import AlmacenistaDashboard from '@/components/dashboards/AlmacenistaDashboard';
import AuditorDashboard from '@/components/dashboards/AuditorDashboard';

export default function HomePage() {
  const { user, loading } = useAuth();

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-slate-500 font-medium">Cargando espacio de trabajo...</p>
        </div>
      </div>
    );
  }

  // Renderizado condicional del Dashboard correspondiente según el Rol
  switch (user.rol) {
    case 'SUPERADMIN':
      return <SuperadminDashboard />;
    case 'ADMIN':
      return <AdminDashboard />;
    case 'ENCARGADO':
      return <EncargadoDashboard />;
    case 'ALMACENISTA':
      return <AlmacenistaDashboard />;
    case 'AUDITOR':
      return <AuditorDashboard />;
    default:
      return <AdminDashboard />;
  }
}
