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
  ShieldAlert, 
  Sliders, 
  Building2, 
  FileText,
  Lock,
  Eye,
  History,
  ShoppingCart,
  Zap,
  Landmark,
  Factory,
  Kanban,
  BookOpen,
  UserCheck
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
    <aside className="w-64 bg-slate-950 text-slate-300 min-h-[calc(100vh-4rem)] flex flex-col justify-between border-r border-slate-800 shrink-0 select-none">
      <div className="p-3 space-y-5 overflow-y-auto max-h-[calc(100vh-8rem)]">
        {/* PLATAFORMA SAAS (SUPERADMIN EXCLUSIVO) */}
        {isSuperadmin && (
          <div>
            <div className="flex items-center gap-1.5 px-3 py-1 mb-2 text-xs font-bold uppercase tracking-wider text-purple-400">
              <ShieldAlert className="w-3.5 h-3.5" /> Administración SaaS
            </div>
            <nav className="space-y-1">
              <Link
                href="/"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/') ? 'bg-purple-600 text-white shadow-sm' : 'hover:bg-slate-900 text-slate-300 hover:text-white'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard SaaS Master</span>
              </Link>
              <Link
                href="/negocios"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/negocios') ? 'bg-purple-600 text-white' : 'hover:bg-slate-900 text-slate-300 hover:text-white'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>Negocios & Inquilinos</span>
              </Link>
              <Link
                href="/auditoria"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/auditoria') ? 'bg-purple-600 text-white' : 'hover:bg-slate-900 text-slate-300 hover:text-white'
                }`}
              >
                <History className="w-4 h-4" />
                <span>Bitácora de Auditoría</span>
              </Link>
            </nav>
          </div>
        )}

        {/* NAVEGACIÓN PARA EMPRESAS / TENANTS */}
        {!isSuperadmin && (
          <div className="space-y-5">
            {/* 1. Menú Operación */}
            <div>
              <div className="px-3 py-1 mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                1. Operación
              </div>
              <nav className="space-y-1">
                <Link
                  href="/"
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/') ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-slate-900 text-slate-300 hover:text-white'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Dashboard</span>
                </Link>
              </nav>
            </div>

            {/* 2. Área Comercial (Admin, Encargado, Auditor) */}
            {rol !== 'ALMACENISTA' && (
              <div>
                <div className="px-3 py-1 mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  2. Área Comercial
                </div>
                <nav className="space-y-1">
                  <Link
                    href="/pos"
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive('/pos') ? 'bg-emerald-600 text-white shadow-sm' : 'hover:bg-slate-900 text-slate-300 hover:text-white'
                    }`}
                  >
                    <Zap className="w-4 h-4 text-emerald-400" />
                    <span>Punto de Venta</span>
                  </Link>

                  <Link
                    href="/cotizaciones"
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive('/cotizaciones') ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-slate-900 text-slate-300 hover:text-white'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>Cotizaciones</span>
                    {rol === 'AUDITOR' && <Eye className="w-3.5 h-3.5 ml-auto text-slate-400" />}
                  </Link>

                  <Link
                    href="/ventas"
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive('/ventas') ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-slate-900 text-slate-300 hover:text-white'
                    }`}
                  >
                    <ShoppingCart className="w-4 h-4" />
                    <span>Ventas y Facturación</span>
                    {rol === 'AUDITOR' && <Eye className="w-3.5 h-3.5 ml-auto text-slate-400" />}
                  </Link>

                  {tenant?.moduloCredito && (
                    <Link
                      href="/clientes"
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive('/clientes') ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-slate-900 text-slate-300 hover:text-white'
                      }`}
                    >
                      <Users className="w-4 h-4" />
                      <span>Clientes y Crédito</span>
                      {rol === 'AUDITOR' && <Eye className="w-3.5 h-3.5 ml-auto text-slate-400" />}
                    </Link>
                  )}

                  {tenant?.moduloCxC && (
                    <Link
                      href="/cxc"
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive('/cxc') ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-slate-900 text-slate-300 hover:text-white'
                      }`}
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Cuentas por Cobrar</span>
                      {rol === 'AUDITOR' && <Eye className="w-3.5 h-3.5 ml-auto text-slate-400" />}
                    </Link>
                  )}
                </nav>
              </div>
            )}

            {/* 3. Compras y Proveedores */}
            <div>
              <div className="px-3 py-1 mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                3. Compras y Proveedores
              </div>
              <nav className="space-y-1">
                {rol !== 'ALMACENISTA' && (
                  <Link
                    href="/ordenes-compra"
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive('/ordenes-compra') ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-slate-900 text-slate-300 hover:text-white'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>Órdenes de Compra</span>
                    {rol === 'AUDITOR' && <Eye className="w-3.5 h-3.5 ml-auto text-slate-400" />}
                  </Link>
                )}

                {/* Recepción de compras disponible también para Almacenistas */}
                <Link
                  href="/compras"
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/compras') ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-slate-900 text-slate-300 hover:text-white'
                  }`}
                >
                  <Truck className="w-4 h-4" />
                  <span>Recepción de Compras</span>
                  {rol === 'AUDITOR' && <Eye className="w-3.5 h-3.5 ml-auto text-slate-400" />}
                </Link>

                {rol !== 'ALMACENISTA' && tenant?.moduloProveedores && (
                  <Link
                    href="/proveedores"
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive('/proveedores') ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-slate-900 text-slate-300 hover:text-white'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    <span>Catálogo Proveedores</span>
                    {rol === 'AUDITOR' && <Eye className="w-3.5 h-3.5 ml-auto text-slate-400" />}
                  </Link>
                )}

                {rol !== 'ALMACENISTA' && tenant?.moduloCxP && (
                  <Link
                    href="/cxp"
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive('/cxp') ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-slate-900 text-slate-300 hover:text-white'
                    }`}
                  >
                    <Receipt className="w-4 h-4" />
                    <span>Cuentas por Pagar</span>
                    {rol === 'AUDITOR' && <Eye className="w-3.5 h-3.5 ml-auto text-slate-400" />}
                  </Link>
                )}

                {rol !== 'ALMACENISTA' && tenant?.moduloTesoreria && (
                  <Link
                    href="/tesoreria"
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive('/tesoreria') ? 'bg-emerald-600 text-white shadow-sm' : 'hover:bg-slate-900 text-slate-300 hover:text-white'
                    }`}
                  >
                    <Landmark className="w-4 h-4 text-emerald-400" />
                    <span>Tesorería y Bancos</span>
                    {rol === 'AUDITOR' && <Eye className="w-3.5 h-3.5 ml-auto text-slate-400" />}
                  </Link>
                )}

                {rol !== 'ALMACENISTA' && tenant?.moduloCrm && (
                  <Link
                    href="/crm"
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive('/crm') ? 'bg-indigo-600 text-white shadow-sm' : 'hover:bg-slate-900 text-slate-300 hover:text-white'
                    }`}
                  >
                    <Kanban className="w-4 h-4 text-indigo-400" />
                    <span>CRM y Pipeline</span>
                    {rol === 'AUDITOR' && <Eye className="w-3.5 h-3.5 ml-auto text-slate-400" />}
                  </Link>
                )}

                {tenant?.moduloManufactura && (rol === 'ADMIN' || rol === 'ALMACENISTA' || rol === 'AUDITOR') && (
                  <Link
                    href="/manufactura"
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive('/manufactura') ? 'bg-indigo-600 text-white shadow-sm' : 'hover:bg-slate-900 text-slate-300 hover:text-white'
                    }`}
                  >
                    <Factory className="w-4 h-4 text-indigo-400" />
                    <span>Manufactura</span>
                    {rol === 'AUDITOR' && <Eye className="w-3.5 h-3.5 ml-auto text-slate-400" />}
                  </Link>
                )}
              </nav>
            </div>

            {/* 4. Inventario y Logística */}
            <div>
              <div className="px-3 py-1 mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                4. Inventario y Logística
              </div>
              <nav className="space-y-1">
                <Link
                  href="/inventarios"
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/inventarios') ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-slate-900 text-slate-300 hover:text-white'
                  }`}
                >
                  <Boxes className="w-4 h-4" />
                  <span>Catálogo y Almacenes</span>
                </Link>

                {tenant?.moduloTraspasos && (
                  <Link
                    href="/traspasos"
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive('/traspasos') ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-slate-900 text-slate-300 hover:text-white'
                    }`}
                  >
                    <ArrowLeftRight className="w-4 h-4" />
                    <span>Traspasos de Almacén</span>
                  </Link>
                )}
              </nav>
            </div>

            {/* 5. Finanzas y Fiscal (Admin y Auditor) */}
            {(rol === 'ADMIN' || rol === 'AUDITOR') && (
              <div>
                <div className="px-3 py-1 mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  5. Finanzas y Fiscal
                </div>
                <nav className="space-y-1">
                  {tenant?.moduloContabilidad && (
                    <Link
                      href="/contabilidad"
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive('/contabilidad') ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-slate-900 text-slate-300 hover:text-white'
                      }`}
                    >
                      <BookOpen className="w-4 h-4 text-blue-400" />
                      <span>Contabilidad</span>
                      {rol === 'AUDITOR' && <Eye className="w-3.5 h-3.5 ml-auto text-slate-400" />}
                    </Link>
                  )}

                  {tenant?.moduloNomina && (
                    <Link
                      href="/nomina"
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive('/nomina') ? 'bg-indigo-600 text-white shadow-sm' : 'hover:bg-slate-900 text-slate-300 hover:text-white'
                      }`}
                    >
                      <UserCheck className="w-4 h-4 text-indigo-400" />
                      <span>Nómina</span>
                      {rol === 'AUDITOR' && <Eye className="w-3.5 h-3.5 ml-auto text-slate-400" />}
                    </Link>
                  )}
                </nav>
              </div>
            )}

            {/* 6. Reportes */}
            {(rol === 'ADMIN' || rol === 'AUDITOR') && tenant?.moduloReportes && (
              <div>
                <div className="px-3 py-1 mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  6. Reportes
                </div>
                <nav className="space-y-1">
                  <Link
                    href="/reportes"
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive('/reportes') ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-slate-900 text-slate-300 hover:text-white'
                    }`}
                  >
                    <BarChart3 className="w-4 h-4" />
                    <span>Reportes</span>
                  </Link>
                  {rol === 'AUDITOR' && (
                    <Link
                      href="/auditoria"
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive('/auditoria') ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-slate-900 text-slate-300 hover:text-white'
                      }`}
                    >
                      <History className="w-4 h-4" />
                      <span>Bitácora de Auditoría</span>
                    </Link>
                  )}
                </nav>
              </div>
            )}

            {/* 7. Configuración del Negocio (Admin) */}
            {rol === 'ADMIN' && (
              <div>
                <div className="px-3 py-1 mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  7. Configuración del Negocio
                </div>
                <nav className="space-y-1">
                  <Link
                    href="/personalizacion"
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive('/personalizacion') ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-slate-900 text-slate-300 hover:text-white'
                    }`}
                  >
                    <Sliders className="w-4 h-4" />
                    <span>Personalizar</span>
                  </Link>
                  <Link
                    href="/usuarios"
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive('/usuarios') ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-slate-900 text-slate-300 hover:text-white'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    <span>Gestión de Usuarios</span>
                  </Link>
                </nav>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pie del Sidebar: Indicador de Seguridad y Rol */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/80">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Lock className="w-3.5 h-3.5 text-slate-500" />
          <span>Acceso: {rol}</span>
        </div>
        {rol === 'AUDITOR' && (
          <p className="text-xs text-amber-400 mt-1 font-medium flex items-center gap-1">
            <Eye className="w-3 h-3" /> Modo Auditoría (Solo Lectura)
          </p>
        )}
        {rol === 'ALMACENISTA' && (
          <p className="text-xs text-blue-400 mt-1">
            Operaciones físicas de almacén
          </p>
        )}
      </div>
    </aside>
  );
}
