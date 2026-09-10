'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { 
  Building2, 
  UserCircle, 
  ChevronDown, 
  ShieldCheck, 
  Sparkles, 
  RefreshCw, 
  Sliders, 
  LogOut,
  Bell,
  AlertTriangle,
  Clock,
  ArrowRight,
  CreditCard,
  Receipt
} from 'lucide-react';
import Link from 'next/link';

export default function Navbar() {
  const { user, loading, switchUser, availableUsers, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [alertasData, setAlertasData] = useState<any>(null);

  useEffect(() => {
    if (!user || user.rol === 'SUPERADMIN') return;

    const fetchAlertas = async () => {
      try {
        const res = await fetch('/api/cartera/alertas');
        if (res.ok) {
          const data = await res.json();
          setAlertasData(data);
        }
      } catch (err) {
        console.error('Error cargando alertas de cartera:', err);
      }
    };

    fetchAlertas();
    // Consultar cada 60 segundos
    const interval = setInterval(fetchAlertas, 60000);
    return () => clearInterval(interval);
  }, [user]);

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

        {/* Campana de Alertas de Cartera (CxC & CxP) */}
        {!isSuperadmin && (
          <div className="relative">
            <button
              onClick={() => {
                setBellOpen(!bellOpen);
                setDropdownOpen(false);
              }}
              className={`relative p-2 rounded-xl border transition-all ${
                alertasData?.resumen?.totalAlertas > 0
                  ? alertasData?.resumen?.tieneCriticas
                    ? 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100 shadow-xs'
                    : 'bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100 shadow-xs'
                  : 'border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}
              title="Alertas de Vencimiento de Cartera (CxC y CxP)"
            >
              <Bell className="w-4 h-4" />
              {alertasData?.resumen?.totalAlertas > 0 && (
                <span className={`absolute -top-1 -right-1 w-5 h-5 rounded-full text-[10px] font-bold text-white flex items-center justify-center animate-pulse ${
                  alertasData?.resumen?.tieneCriticas ? 'bg-rose-600' : 'bg-amber-500'
                }`}>
                  {alertasData?.resumen?.totalAlertas}
                </span>
              )}
            </button>

            {bellOpen && (
              <div className="absolute right-0 mt-2 w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 py-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-4 pb-3 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 leading-tight">Mesa de Control de Cartera</h4>
                      <p className="text-[11px] text-slate-500">Alertas de cobros y pagos programados</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {alertasData?.resumen?.totalAlertas || 0} avisos
                  </span>
                </div>

                {/* Resumen Métricas Rápidas */}
                <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 border-b border-slate-100 text-xs">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
                    <p className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                      <CreditCard className="w-3 h-3 text-blue-600" /> Cobros (CxC)
                    </p>
                    <p className="text-xs font-bold text-rose-600 mt-1">
                      ${alertasData?.resumen?.cxc?.montoVencido?.toLocaleString('es-MX', { minimumFractionDigits: 2 }) || '0.00'}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {alertasData?.resumen?.cxc?.totalVencidas || 0} vencidas • {alertasData?.resumen?.cxc?.totalPorVencer || 0} por vencer
                    </p>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
                    <p className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                      <Receipt className="w-3 h-3 text-purple-600" /> Pagos (CxP)
                    </p>
                    <p className="text-xs font-bold text-rose-600 mt-1">
                      ${alertasData?.resumen?.cxp?.montoVencido?.toLocaleString('es-MX', { minimumFractionDigits: 2 }) || '0.00'}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {alertasData?.resumen?.cxp?.totalVencidas || 0} vencidas • {alertasData?.resumen?.cxp?.totalPorVencer || 0} por vencer
                    </p>
                  </div>
                </div>

                {/* Lista de Alertas Críticas */}
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                  {alertasData?.resumen?.totalAlertas === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-xs">
                      <Clock className="w-8 h-8 mx-auto mb-1.5 text-emerald-500" />
                      ¡Todo en orden! No hay cuentas vencidas ni por vencer en este momento.
                    </div>
                  ) : (
                    <>
                      {/* CxC Vencidas */}
                      {alertasData?.alertas?.cxcVencidas?.map((item: any) => (
                        <div key={item.id} className="p-3 hover:bg-slate-50 transition-colors flex items-start justify-between gap-2 text-xs">
                          <div className="space-y-0.5">
                            <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-1.5 py-0.5 rounded">
                              Cobro Vencido (+{item.diasVencido}d)
                            </span>
                            <p className="font-bold text-slate-900 leading-snug">{item.entidad}</p>
                            <p className="font-mono text-[10px] text-slate-400">Folio: {item.folio}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-mono font-bold text-rose-600">${item.saldoPendiente?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                            <Link
                              href="/cxc"
                              onClick={() => setBellOpen(false)}
                              className="text-[10px] text-blue-600 hover:underline font-bold inline-flex items-center gap-0.5 mt-1"
                            >
                              Cobrar <ArrowRight className="w-2.5 h-2.5" />
                            </Link>
                          </div>
                        </div>
                      ))}

                      {/* CxP Vencidas */}
                      {alertasData?.alertas?.cxpVencidas?.map((item: any) => (
                        <div key={item.id} className="p-3 hover:bg-slate-50 transition-colors flex items-start justify-between gap-2 text-xs">
                          <div className="space-y-0.5">
                            <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-1.5 py-0.5 rounded">
                              Pago a Proveedor Vencido (+{item.diasVencido}d)
                            </span>
                            <p className="font-bold text-slate-900 leading-snug">{item.entidad}</p>
                            <p className="font-mono text-[10px] text-slate-400">Factura: {item.folio}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-mono font-bold text-rose-600">${item.saldoPendiente?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                            <Link
                              href="/cxp"
                              onClick={() => setBellOpen(false)}
                              className="text-[10px] text-purple-600 hover:underline font-bold inline-flex items-center gap-0.5 mt-1"
                            >
                              Liquidar <ArrowRight className="w-2.5 h-2.5" />
                            </Link>
                          </div>
                        </div>
                      ))}

                      {/* CxC Por Vencer */}
                      {alertasData?.alertas?.cxcPorVencer?.map((item: any) => (
                        <div key={item.id} className="p-3 hover:bg-slate-50 transition-colors flex items-start justify-between gap-2 text-xs">
                          <div className="space-y-0.5">
                            <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded">
                              Cobro Por Vencer (En {item.diasRestantes}d)
                            </span>
                            <p className="font-semibold text-slate-800 leading-snug">{item.entidad}</p>
                            <p className="font-mono text-[10px] text-slate-400">Folio: {item.folio}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-mono font-bold text-slate-900">${item.saldoPendiente?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                            <Link
                              href="/cxc"
                              onClick={() => setBellOpen(false)}
                              className="text-[10px] text-blue-600 hover:underline font-semibold inline-flex items-center gap-0.5 mt-1"
                            >
                              Ver <ArrowRight className="w-2.5 h-2.5" />
                            </Link>
                          </div>
                        </div>
                      ))}

                      {/* CxP Por Vencer */}
                      {alertasData?.alertas?.cxpPorVencer?.map((item: any) => (
                        <div key={item.id} className="p-3 hover:bg-slate-50 transition-colors flex items-start justify-between gap-2 text-xs">
                          <div className="space-y-0.5">
                            <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded">
                              Pago Por Vencer (En {item.diasRestantes}d)
                            </span>
                            <p className="font-semibold text-slate-800 leading-snug">{item.entidad}</p>
                            <p className="font-mono text-[10px] text-slate-400">Factura: {item.folio}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-mono font-bold text-slate-900">${item.saldoPendiente?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                            <Link
                              href="/cxp"
                              onClick={() => setBellOpen(false)}
                              className="text-[10px] text-purple-600 hover:underline font-semibold inline-flex items-center gap-0.5 mt-1"
                            >
                              Programar <ArrowRight className="w-2.5 h-2.5" />
                            </Link>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>

                {/* Footer del Drawer */}
                <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs font-bold">
                  <Link
                    href="/cxc"
                    onClick={() => setBellOpen(false)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    Ir a Cobranza (CxC)
                  </Link>
                  <Link
                    href="/cxp"
                    onClick={() => setBellOpen(false)}
                    className="text-purple-600 hover:text-purple-800"
                  >
                    Ir a Pagos (CxP)
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

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
