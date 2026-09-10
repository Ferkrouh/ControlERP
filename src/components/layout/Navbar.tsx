'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { 
  Building2, 
  UserCircle, 
  ChevronDown, 
  ShieldCheck, 
  Sparkles,
  RefreshCw,
  Sliders,
  LogOut
} from 'lucide-react';
import Link from 'next/link';

export default function Navbar() {
  const { user, loading, switchUser, availableUsers, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  if (loading || !user) {
    return (
      <header className="h-16 bg-white border-b border-slate-200 flex items-center px-6 justify-between animate-pulse">
        <div className="h-6 w-48 bg-slate-200 rounded"></div>
        <div className="h-8 w-32 bg-slate-200 rounded"></div>
      </header>
    );
  }

  const isSuperadmin = user.rol === 'SUPERADMIN';
  const tenant = user.tenant;

  const getRoleBadge = (rol: string) => {
    switch (rol) {
      case 'SUPERADMIN':
        return <span className="bg-purple-100 text-purple-800 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-purple-300">👑 Superadmin SaaS</span>;
      case 'ADMIN':
        return <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-blue-300">👔 Admin Negocio</span>;
      case 'ENCARGADO':
        return <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-emerald-300">👤 Encargado</span>;
      case 'ALMACENISTA':
        return <span className="bg-amber-100 text-amber-800 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-amber-300">📦 Almacenista</span>;
      case 'AUDITOR':
        return <span className="bg-slate-100 text-slate-800 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-slate-300">🔍 Auditor Fiscal</span>;
      default:
        return <span className="bg-gray-100 text-gray-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">{rol}</span>;
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center px-4 sm:px-6 justify-between sticky top-0 z-30 shadow-sm">
      {/* Brand & Active Tenant */}
      <div className="flex items-center gap-3">
        <div 
          className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-white shadow-sm"
          style={{ backgroundColor: isSuperadmin ? '#7c3aed' : (tenant?.colorPrimario || '#2563eb') }}
        >
          {isSuperadmin ? 'SA' : (tenant?.nombreComercial ? tenant.nombreComercial.charAt(0) : 'ERP')}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-slate-900 text-base leading-tight">
              {isSuperadmin ? 'ControlERP Master Cloud' : (tenant?.nombreComercial || 'ControlERP')}
            </h1>
            {!isSuperadmin && tenant && (
              <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                {tenant.identificacionFiscal}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            {isSuperadmin ? 'Gestión Multi-Inquilino Global' : `Giro: ${tenant?.giro?.replace('_', ' ') || 'General'}`}
          </p>
        </div>
      </div>

      {/* Role Switcher & User Profile */}
      <div className="flex items-center gap-3">
        {/* Quick Switcher Selector (Demo Interactive Role Bar) */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-sm font-medium text-slate-700 shadow-sm"
            title="Cambiar rol o negocio de prueba"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500 animate-spin-slow" />
            <span className="hidden md:inline text-xs text-slate-500">Simular Rol:</span>
            {getRoleBadge(user.rol)}
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Cambio Rápido de Rol & Negocio
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Selecciona una cuenta para probar su dashboard y menú:
                </p>
              </div>

              <div className="max-h-72 overflow-y-auto py-1">
                {availableUsers.map((u) => {
                  const isSelected = u.email === user.email;
                  return (
                    <button
                      key={u.id}
                      onClick={() => {
                        switchUser(u.email);
                        setDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-50 transition-colors ${
                        isSelected ? 'bg-blue-50/70 border-l-4 border-blue-600' : ''
                      }`}
                    >
                      <div className="truncate pr-2">
                        <p className="text-sm font-medium text-slate-800 truncate">{u.nombre}</p>
                        <p className="text-xs text-slate-500 truncate">
                          {u.tenant ? u.tenant.nombreComercial : 'Plataforma Global'}
                        </p>
                      </div>
                      <div className="shrink-0">{getRoleBadge(u.rol)}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* User Identity Info */}
        <div className="hidden lg:flex items-center gap-2 border-l border-slate-200 pl-3">
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-semibold text-sm">
            {user.nombre.charAt(0)}
          </div>
          <div className="text-left">
            <p className="text-xs font-semibold text-slate-800 leading-tight">{user.nombre}</p>
            <p className="text-[11px] text-slate-500 leading-tight">{user.email}</p>
          </div>
        </div>

        {/* Link to Business Customization if Admin */}
        {user.rol === 'ADMIN' && (
          <Link
            href="/personalizacion"
            className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Personalizar mi negocio"
          >
            <Sliders className="w-4 h-4" />
          </Link>
        )}

        {/* Botón de Cerrar Sesión */}
        <button
          onClick={logout}
          className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
          title="Cerrar sesión"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
