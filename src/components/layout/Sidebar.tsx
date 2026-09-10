'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { 
  LayoutDashboard, 
  Users, 
  CreditCard, 
  Truck, 
  Receipt, 
  Boxes, 
  ArrowLeftRight, 
  BarChart3, 
  Settings, 
  ShieldAlert, 
  Sliders, 
  Building2, 
  FileText,
  Lock,
  Eye,
  History,
  ShoppingCart
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const { user, loading } = useAuth();

  if (loading || !user) {
    return (
      <aside className="w-64 bg-slate-900 text-white min-h-[calc(100vh-4rem)] p-4 flex flex-col gap-2">
        <div className="h-8 bg-slate-800 rounded animate-pulse"></div>
        <div className="h-8 bg-slate-800 rounded animate-pulse"></div>
        <div className="h-8 bg-slate-800 rounded animate-pulse"></div>
      </aside>
    );
  }

  const { rol, tenant } = user;
  const isSuperadmin = rol === 'SUPERADMIN';

  // Helper para verificar rutas activas
  const isActive = (path: string) => pathname === path;

  return (
    <aside className="w-64 bg-slate-950 text-slate-300 min-h-[calc(100vh-4rem)] flex flex-col justify-between border-r border-slate-800 shrink-0">
      <div className="p-4 space-y-6">
        {/* Encabezado del Menú según Rol */}
        <div>
          <div className="flex items-center gap-2 px-2 py-1 mb-2">
            {isSuperadmin ? (
              <span className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" /> Menú Plataforma SaaS
              </span>
            ) : (
              <span className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" /> Menú de Operación
              </span>
            )}
          </div>

          <nav className="space-y-1">
            {/* 1. Dashboard Principal (Específico por rol) */}
            <Link
              href="/"
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/') 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'hover:bg-slate-900 text-slate-300 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>
                {isSuperadmin && 'Dashboard SaaS Master'}
                {rol === 'ADMIN' && 'Dashboard Ejecutivo'}
                {rol === 'ENCARGADO' && 'Dashboard Operativo'}
                {rol === 'ALMACENISTA' && 'Dashboard Almacén'}
                {rol === 'AUDITOR' && 'Dashboard Auditoría'}
              </span>
            </Link>

            {/* VISTAS EXCLUSIVAS DEL SUPERADMIN */}
            {isSuperadmin && (
              <>
                <div className="pt-4 pb-1 px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Gestión Multi-Inquilino
                </div>
                <Link
                  href="/negocios"
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/negocios') ? 'bg-purple-600 text-white' : 'hover:bg-slate-900 hover:text-white'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  <span>Negocios & Módulos</span>
                </Link>
                <Link
                  href="/auditoria"
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/auditoria') ? 'bg-purple-600 text-white' : 'hover:bg-slate-900 hover:text-white'
                  }`}
                >
                  <History className="w-4 h-4" />
                  <span>Bitácora de Auditoría</span>
                </Link>
              </>
            )}

            {/* VISTAS DEL ADMIN (Personalización y Usuarios) */}
            {rol === 'ADMIN' && (
              <>
                <div className="pt-4 pb-1 px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Configuración del Negocio
                </div>
                <Link
                  href="/personalizacion"
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/personalizacion') ? 'bg-blue-600 text-white' : 'hover:bg-slate-900 hover:text-white'
                  }`}
                >
                  <Sliders className="w-4 h-4" />
                  <span>Personalizar Negocio</span>
                </Link>
                <Link
                  href="/usuarios"
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/usuarios') ? 'bg-blue-600 text-white' : 'hover:bg-slate-900 hover:text-white'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Gestión de Usuarios</span>
                </Link>
              </>
            )}

            {/* MÓDULOS OPERATIVOS DEL NEGOCIO (Admin, Encargado, Auditor) */}
            {!isSuperadmin && rol !== 'ALMACENISTA' && (
              <>
                <div className="pt-4 pb-1 px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Área Comercial & Crédito
                </div>

                {/* Ventas & Facturación */}
                <Link
                  href="/ventas"
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/ventas') ? 'bg-blue-600 text-white' : 'hover:bg-slate-900 hover:text-white'
                  }`}
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>Ventas & Facturación</span>
                  {rol === 'AUDITOR' && <Eye className="w-3.5 h-3.5 ml-auto text-slate-400" />}
                </Link>

                {/* Cartera de Clientes & Límite de Crédito */}
                <Link
                  href="/clientes"
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/clientes') ? 'bg-blue-600 text-white' : 'hover:bg-slate-900 hover:text-white'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Clientes & Crédito</span>
                  {rol === 'AUDITOR' && <Eye className="w-3.5 h-3.5 ml-auto text-slate-400" />}
                </Link>

                {/* Cuentas por Cobrar (CxC) - Solo si habilitado */}
                {tenant?.moduloCxC && (
                  <Link
                    href="/cxc"
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive('/cxc') ? 'bg-blue-600 text-white' : 'hover:bg-slate-900 hover:text-white'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Cuentas por Cobrar (CxC)</span>
                    {rol === 'AUDITOR' && <Eye className="w-3.5 h-3.5 ml-auto text-slate-400" />}
                  </Link>
                )}

                <div className="pt-4 pb-1 px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Compras & Proveedores
                </div>

                {/* Recepción de Compras */}
                <Link
                  href="/compras"
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/compras') ? 'bg-blue-600 text-white' : 'hover:bg-slate-900 hover:text-white'
                  }`}
                >
                  <Truck className="w-4 h-4" />
                  <span>Recepción de Compras</span>
                  {rol === 'AUDITOR' && <Eye className="w-3.5 h-3.5 ml-auto text-slate-400" />}
                </Link>

                {/* Proveedores */}
                {tenant?.moduloProveedores && (
                  <Link
                    href="/proveedores"
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive('/proveedores') ? 'bg-blue-600 text-white' : 'hover:bg-slate-900 hover:text-white'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    <span>Catálogo Proveedores</span>
                    {rol === 'AUDITOR' && <Eye className="w-3.5 h-3.5 ml-auto text-slate-400" />}
                  </Link>
                )}

                {/* Cuentas por Pagar (CxP) */}
                {tenant?.moduloCxP && (
                  <Link
                    href="/cxp"
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive('/cxp') ? 'bg-blue-600 text-white' : 'hover:bg-slate-900 hover:text-white'
                    }`}
                  >
                    <Receipt className="w-4 h-4" />
                    <span>Cuentas por Pagar (CxP)</span>
                    {rol === 'AUDITOR' && <Eye className="w-3.5 h-3.5 ml-auto text-slate-400" />}
                  </Link>
                )}
              </>
            )}

            {/* MÓDULOS DE INVENTARIO Y ALMACÉN (Admin, Encargado, Almacenista, Auditor) */}
            {!isSuperadmin && (
              <>
                <div className="pt-4 pb-1 px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Inventario & Logística
                </div>

                <Link
                  href="/inventarios"
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/inventarios') ? 'bg-blue-600 text-white' : 'hover:bg-slate-900 hover:text-white'
                  }`}
                >
                  <Boxes className="w-4 h-4" />
                  <span>
                    {rol === 'ALMACENISTA' ? 'Existencias & Kárdex' : 'Catálogo & Almacenes'}
                  </span>
                </Link>

                {/* Traspasos entre almacenes (Si el Superadmin lo activó para este tenant) */}
                {tenant?.moduloTraspasos && (
                  <Link
                    href="/traspasos"
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive('/traspasos') ? 'bg-blue-600 text-white' : 'hover:bg-slate-900 hover:text-white'
                    }`}
                  >
                    <ArrowLeftRight className="w-4 h-4" />
                    <span>Traspasos de Almacén</span>
                  </Link>
                )}
              </>
            )}

            {/* REPORTES Y AUDITORÍA (Admin y Auditor) */}
            {!isSuperadmin && (rol === 'ADMIN' || rol === 'AUDITOR') && tenant?.moduloReportes && (
              <>
                <div className="pt-4 pb-1 px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Reportes & Auditoría
                </div>

                <Link
                  href="/reportes"
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/reportes') ? 'bg-blue-600 text-white' : 'hover:bg-slate-900 hover:text-white'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>Reportes Mensuales</span>
                </Link>

                {rol === 'AUDITOR' && (
                  <Link
                    href="/auditoria"
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive('/auditoria') ? 'bg-blue-600 text-white' : 'hover:bg-slate-900 hover:text-white'
                    }`}
                  >
                    <History className="w-4 h-4" />
                    <span>Bitácora de Auditoría</span>
                  </Link>
                )}
              </>
            )}
          </nav>
        </div>
      </div>

      {/* Pie del Sidebar: Indicador de Seguridad y Restricciones */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/60">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Lock className="w-3.5 h-3.5 text-slate-500" />
          <span>Acceso: {rol}</span>
        </div>
        {rol === 'AUDITOR' && (
          <p className="text-[11px] text-amber-400 mt-1 font-medium flex items-center gap-1">
            <Eye className="w-3 h-3" /> Modo Auditoría (Solo Lectura)
          </p>
        )}
        {rol === 'ALMACENISTA' && (
          <p className="text-[11px] text-blue-400 mt-1">
            Restringido a control físico de stock
          </p>
        )}
      </div>
    </aside>
  );
}
