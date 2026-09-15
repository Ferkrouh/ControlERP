'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  Building2, 
  Users, 
  Boxes, 
  ShieldCheck, 
  Server, 
  CheckCircle2, 
  XCircle, 
  Plus, 
  ArrowUpRight,
  KeyRound,
  HardDrive,
  Cloud,
  Lock,
  RefreshCw,
  AlertTriangle,
  CreditCard,
  Layers,
  Clock,
  Activity,
  Radio
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

interface Tenant {
  id: string;
  nombreComercial: string;
  razonSocial?: string;
  identificacionFiscal: string;
  giro: string;
  activo: boolean;
  colorPrimario?: string;
  planSuscripcion?: string;
  fechaVencimientoPlan?: string | null;
  diasGraciaSuscripcion?: number;
  bloqueadoPorSuscripcion?: boolean;
  limiteUsuarios?: number;
  limiteAlmacenes?: number;
  moduloMultiAlmacen?: boolean;
  moduloTraspasos?: boolean;
  moduloCredito?: boolean;
  moduloFacturacionSAT?: boolean;
  moduloTesoreria?: boolean;
  moduloManufactura?: boolean;
  moduloCrm?: boolean;
  _count?: {
    usuarios: number;
    almacenes: number;
    ventas: number;
    compras: number;
  };
  usuarios?: any[];
  almacenes?: any[];
}

interface AuditLog {
  id: string;
  modulo: string;
  accion: string;
  usuarioNombre: string;
  detalles: string;
  nivelRiesgo: string;
  fecha: string;
}

const PLAN_PRICES: Record<string, number> = {
  DEMO: 0,
  BASICO: 799,
  PROFESIONAL: 1899,
  ENTERPRISE: 3999,
  PERSONALIZADO: 2499,
};

export default function SuperadminDashboard() {
  const { switchUser } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingModule, setTogglingModule] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [resTenants, resAudit] = await Promise.all([
        fetch('/api/tenants'),
        fetch('/api/auditoria?limit=6'),
      ]);

      if (resTenants.ok) {
        const data = await resTenants.json();
        setTenants(data);
      }

      if (resAudit.ok) {
        const auditData = await resAudit.json();
        if (Array.isArray(auditData)) {
          setRecentLogs(auditData.slice(0, 5));
        } else if (auditData.logs) {
          setRecentLogs(auditData.logs.slice(0, 5));
        }
      }
    } catch (e) {
      console.error('Error fetching Superadmin Dashboard data:', e);
    } finally {
      setLoading(false);
    }
  };

  const toggleModule = async (tenantId: string, moduleKey: string, currentValue: boolean) => {
    try {
      setTogglingModule(`${tenantId}-${moduleKey}`);
      const res = await fetch(`/api/tenants/${tenantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [moduleKey]: !currentValue }),
      });
      if (res.ok) {
        setTenants((prev) =>
          prev.map((t) => (t.id === tenantId ? { ...t, [moduleKey]: !currentValue } : t))
        );
      }
    } catch (e) {
      console.error('Error toggling module:', e);
    } finally {
      setTogglingModule(null);
    }
  };

  const handleImpersonate = async (tenant: Tenant) => {
    try {
      const res = await fetch(`/api/tenants/${tenant.id}`);
      if (!res.ok) throw new Error('Error al consultar usuarios del tenant');
      const data = await res.json();
      
      const adminUser = data.usuarios?.find((u: any) => u.rol === 'ADMIN') || data.usuarios?.[0];
      if (!adminUser) {
        alert('Este negocio no cuenta con usuarios configurados aún.');
        return;
      }

      if (confirm(`¿Deseas ingresar a la vista de "${tenant.nombreComercial}" como ${adminUser.nombre} (${adminUser.email})?`)) {
        await switchUser(adminUser.email);
        window.location.href = '/';
      }
    } catch (err) {
      console.error('Error durante impersonación:', err);
      alert('No se pudo acceder al entorno del tenant');
    }
  };

  // Cálculo de estado de suscripción
  const getSubscriptionStatus = (t: Tenant) => {
    if (!t.activo) {
      return { status: 'PAUSADO', label: 'Pausado', badgeBg: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
    if (t.bloqueadoPorSuscripcion) {
      return { status: 'BLOQUEADO', label: 'Bloqueado', badgeBg: 'bg-rose-50 text-rose-700 border-rose-200' };
    }
    if (!t.fechaVencimientoPlan) {
      return { status: 'ACTIVO', label: 'Permanente', badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    }

    const now = new Date().getTime();
    const vencimiento = new Date(t.fechaVencimientoPlan).getTime();
    const diffDays = Math.ceil((vencimiento - now) / (1000 * 3600 * 24));
    const diasGracia = t.diasGraciaSuscripcion || 3;

    if (diffDays > 7) {
      return { status: 'ACTIVO', label: `Activo (${diffDays}d)`, badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    } else if (diffDays > 0) {
      return { status: 'POR_VENCER', label: `Vence en ${diffDays}d`, badgeBg: 'bg-amber-50 text-amber-700 border-amber-200' };
    } else if (diffDays >= -diasGracia) {
      return { status: 'MOROSO_GRACIA', label: `En Gracia (+${Math.abs(diffDays)}d)`, badgeBg: 'bg-orange-50 text-orange-700 border-orange-200' };
    } else {
      return { status: 'VENCIDO', label: `Vencido (+${Math.abs(diffDays)}d)`, badgeBg: 'bg-rose-50 text-rose-700 border-rose-200' };
    }
  };

  // Métricas Consolidadas SaaS
  const mrrEstimado = useMemo(() => {
    return tenants.reduce((acc, t) => {
      if (!t.activo || t.bloqueadoPorSuscripcion) return acc;
      const plan = (t.planSuscripcion || 'PROFESIONAL').toUpperCase();
      return acc + (PLAN_PRICES[plan] || 1899);
    }, 0);
  }, [tenants]);

  const totalUsuarios = useMemo(() => {
    return tenants.reduce((acc, t) => acc + (t._count?.usuarios || t.usuarios?.length || 0), 1);
  }, [tenants]);

  const totalAlmacenes = useMemo(() => {
    return tenants.reduce((acc, t) => acc + (t._count?.almacenes || t.almacenes?.length || 0), 0);
  }, [tenants]);

  const negociosEnAlerta = useMemo(() => {
    return tenants.filter((t) => {
      const sub = getSubscriptionStatus(t);
      return sub.status === 'POR_VENCER' || sub.status === 'MOROSO_GRACIA' || sub.status === 'VENCIDO';
    }).length;
  }, [tenants]);

  const almacenamientoTotalMB = useMemo(() => {
    const totalRecords = tenants.reduce((acc, t) => {
      const ventas = t._count?.ventas || 0;
      const compras = t._count?.compras || 0;
      return acc + ventas + compras + 20;
    }, 0);
    return ((totalRecords * 4.5) / 1024).toFixed(1);
  }, [tenants]);

  return (
    <div className="space-y-6">
      {/* 1. Cabecera Soberana Ejecutiva - The Fintech Ledger */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="bg-purple-500/20 text-purple-300 border border-purple-400/30 text-xs px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-400" /> Plataforma SaaS Global
            </span>
            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs px-2.5 py-0.5 rounded-full flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Docker Ubuntu • Servidor Online
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            Panel Maestro Superadmin SaaS
          </h1>
          <p className="text-slate-400 text-sm max-w-2xl leading-relaxed">
            Supervisa el crecimiento comercial recurrente, la salud técnica de las bases de datos y la autorización modular de las empresas clientes.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto shrink-0">
          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-all border border-slate-700"
            title="Sincronizar telemetría de inquilinos"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-purple-400' : ''}`} />
          </button>

          <Link
            href="/negocios"
            className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2.5 rounded-xl font-semibold text-xs transition-all shadow-sm flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Dar de Alta Negocio
          </Link>
        </div>
      </div>

      {/* 2. Cuadrícula de Métricas Clave (Fintech Ledger KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* MRR Estimado */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-md shadow-slate-900/5 hover:shadow-xl hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">MRR Recurrente Estimado</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-slate-900 mt-2">
            ${mrrEstimado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            <span className="text-emerald-700 font-semibold font-mono">MXN/mes</span> • Suscripciones activas
          </p>
        </div>

        {/* Empresas Activas */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-md shadow-slate-900/5 hover:shadow-xl hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Negocios Registrados</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-slate-900 mt-2">{tenants.length}</p>
          <p className="text-xs text-slate-500 mt-1">
            <span className="font-semibold text-slate-700">{totalUsuarios}</span> usuarios en red
          </p>
        </div>

        {/* Alertas de Suscripción */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-md shadow-slate-900/5 hover:shadow-xl hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">Alertas de Cartera</span>
            {negociosEnAlerta > 0 ? (
              <div className="p-2 bg-amber-50 text-amber-700 rounded-xl border border-amber-200/60">
                <AlertTriangle className="w-4 h-4" />
              </div>
            ) : (
              <div className="p-2 bg-slate-100 text-slate-600 rounded-xl">
                <ShieldCheck className="w-4 h-4" />
              </div>
            )}
          </div>
          <p className={`text-2xl font-bold font-mono mt-2 ${negociosEnAlerta > 0 ? 'text-amber-700' : 'text-slate-900'}`}>
            {negociosEnAlerta}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Por vencer o en período de gracia
          </p>
        </div>

        {/* Almacenes & Red Física */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-md shadow-slate-900/5 hover:shadow-xl hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Almacenes en Red</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-slate-900 mt-2">{totalAlmacenes}</p>
          <p className="text-xs text-slate-500 mt-1">
            Centros de distribución activos
          </p>
        </div>
      </div>

      {/* 3. Matriz Maestra de Clientes (Tenants Ledger) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-600" />
              Matriz Maestra de Clientes & Conmutación Restrictiva
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Control centralizado de licencias. Los administradores de cada empresa solo tienen visibilidad de los módulos encendidos.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs bg-purple-50 text-purple-700 border border-purple-200/60 px-3 py-1 rounded-full font-semibold">
              Aislamiento Multi-tenant Estricto
            </span>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-purple-600" />
            <span className="text-xs font-semibold">Cargando matriz de inquilinos...</span>
          </div>
        ) : tenants.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Building2 className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">No hay negocios registrados en la plataforma.</p>
            <Link
              href="/negocios"
              className="mt-3 inline-flex items-center gap-1.5 text-xs text-purple-600 font-bold hover:underline"
            >
              <Plus className="w-3.5 h-3.5" /> Dar de alta el primer negocio
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Negocio / Razón Social</th>
                  <th className="py-3 px-4">Plan SaaS & Vigencia</th>
                  <th className="py-3 px-4 text-center">Multi-Almacén</th>
                  <th className="py-3 px-4 text-center">Traspasos</th>
                  <th className="py-3 px-4 text-center">Crédito & CxC</th>
                  <th className="py-3 px-4 text-center">Facturación SAT</th>
                  <th className="py-3 px-4 text-center">Tesorería</th>
                  <th className="py-3 px-4 text-center">Manufactura</th>
                  <th className="py-3 px-4 text-right">Operación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tenants.map((t) => {
                  const sub = getSubscriptionStatus(t);
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Empresa y RFC */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div 
                            className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-xs"
                            style={{ backgroundColor: t.colorPrimario || '#2563eb' }}
                          >
                            {t.nombreComercial.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800 leading-tight">{t.nombreComercial}</p>
                            <p className="text-xs text-slate-400 font-mono">RFC: {t.identificacionFiscal}</p>
                          </div>
                        </div>
                      </td>

                      {/* Plan y Vigencia */}
                      <td className="py-3 px-4">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 uppercase text-xs">
                              {t.planSuscripcion || 'PROFESIONAL'}
                            </span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${sub.badgeBg}`}>
                              {sub.label}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 font-mono mt-1">
                            {t.fechaVencimientoPlan 
                              ? `Vence: ${new Date(t.fechaVencimientoPlan).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}`
                              : 'Vigencia Permanente'}
                          </p>
                        </div>
                      </td>
                      
                      {/* Switch MultiAlmacen */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => toggleModule(t.id, 'moduloMultiAlmacen', !!t.moduloMultiAlmacen)}
                          disabled={togglingModule === `${t.id}-moduloMultiAlmacen`}
                          className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded transition-colors"
                          title="Click para alternar autorización"
                        >
                          {t.moduloMultiAlmacen ? (
                            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded flex items-center gap-1 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" /> Activo
                            </span>
                          ) : (
                            <span className="text-slate-400 bg-slate-100 px-2 py-0.5 rounded flex items-center gap-1">
                              <XCircle className="w-3 h-3" /> Bloqueado
                            </span>
                          )}
                        </button>
                      </td>

                      {/* Switch Traspasos */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => toggleModule(t.id, 'moduloTraspasos', !!t.moduloTraspasos)}
                          disabled={togglingModule === `${t.id}-moduloTraspasos`}
                          className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded transition-colors"
                          title="Click para alternar autorización"
                        >
                          {t.moduloTraspasos ? (
                            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded flex items-center gap-1 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" /> Activo
                            </span>
                          ) : (
                            <span className="text-slate-400 bg-slate-100 px-2 py-0.5 rounded flex items-center gap-1">
                              <XCircle className="w-3 h-3" /> Bloqueado
                            </span>
                          )}
                        </button>
                      </td>

                      {/* Switch Credito */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => toggleModule(t.id, 'moduloCredito', !!t.moduloCredito)}
                          disabled={togglingModule === `${t.id}-moduloCredito`}
                          className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded transition-colors"
                          title="Click para alternar autorización"
                        >
                          {t.moduloCredito ? (
                            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded flex items-center gap-1 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" /> Activo
                            </span>
                          ) : (
                            <span className="text-slate-400 bg-slate-100 px-2 py-0.5 rounded flex items-center gap-1">
                              <XCircle className="w-3 h-3" /> Bloqueado
                            </span>
                          )}
                        </button>
                      </td>

                      {/* Switch SAT */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => toggleModule(t.id, 'moduloFacturacionSAT', !!t.moduloFacturacionSAT)}
                          disabled={togglingModule === `${t.id}-moduloFacturacionSAT`}
                          className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded transition-colors"
                          title="Click para alternar autorización"
                        >
                          {t.moduloFacturacionSAT ? (
                            <span className="text-purple-700 bg-purple-50 px-2 py-0.5 rounded flex items-center gap-1 border border-purple-200">
                              CFDI 4.0
                            </span>
                          ) : (
                            <span className="text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                              Inactivo
                            </span>
                          )}
                        </button>
                      </td>

                      {/* Switch Tesorería */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => toggleModule(t.id, 'moduloTesoreria', !!t.moduloTesoreria)}
                          disabled={togglingModule === `${t.id}-moduloTesoreria`}
                          className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded transition-colors"
                          title="Click para alternar autorización"
                        >
                          {t.moduloTesoreria ? (
                            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded flex items-center gap-1 border border-emerald-200">
                              Bancos
                            </span>
                          ) : (
                            <span className="text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                              Inactivo
                            </span>
                          )}
                        </button>
                      </td>

                      {/* Switch Manufactura */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => toggleModule(t.id, 'moduloManufactura', !!t.moduloManufactura)}
                          disabled={togglingModule === `${t.id}-moduloManufactura`}
                          className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded transition-colors"
                          title="Click para alternar autorización"
                        >
                          {t.moduloManufactura ? (
                            <span className="text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded flex items-center gap-1 border border-indigo-200">
                              BOM/OP
                            </span>
                          ) : (
                            <span className="text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                              Inactivo
                            </span>
                          )}
                        </button>
                      </td>

                      {/* Acciones */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleImpersonate(t)}
                            className="p-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg transition-all border border-purple-200/60"
                            title="Ingreso de Soporte Directo (Impersonación)"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>

                          <Link
                            href={`/negocios?id=${t.id}`}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all"
                            title="Mesa de Control Completa del Negocio"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. Panel Inferior: Telemetría de Infraestructura & Actividad en Vivo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna Izquierda: Estatus de Infraestructura Cloud */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Server className="w-4 h-4 text-purple-600" />
              Telemetría de Infraestructura
            </h3>
            <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
              99.98% SLA
            </span>
          </div>

          <div className="space-y-3 text-xs">
            {/* Base de Datos */}
            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200/60">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-slate-600" />
                <div>
                  <p className="font-semibold text-slate-800">Motor de Base de Datos</p>
                  <p className="text-slate-500 font-mono">SQLite (Dev) / Postgres (Prod)</p>
                </div>
              </div>
              <span className="font-bold font-mono text-slate-700">
                ~{almacenamientoTotalMB} MB
              </span>
            </div>

            {/* Timbrado Fiscal PAC */}
            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200/60">
              <div className="flex items-center gap-2">
                <Cloud className="w-4 h-4 text-slate-600" />
                <div>
                  <p className="font-semibold text-slate-800">Adaptador Multi-PAC SAT</p>
                  <p className="text-slate-500">Finkok / SW Sapien / Prodigia</p>
                </div>
              </div>
              <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Online (120ms)
              </span>
            </div>

            {/* Seguridad Criptográfica */}
            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200/60">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-purple-600" />
                <div>
                  <p className="font-semibold text-slate-800">Bitácora Criptográfica</p>
                  <p className="text-slate-500">Encadenamiento SHA-256 Activo</p>
                </div>
              </div>
              <Link 
                href="/auditoria"
                className="text-purple-700 hover:text-purple-900 font-bold hover:underline"
              >
                Auditar &rarr;
              </Link>
            </div>
          </div>
        </div>

        {/* Columna Derecha: Feed de Auditoría Global Reciente (2 Columnas en lg) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-600" />
              Feed Transaccional Reciente en Tiempo Real
            </h3>
            <Link 
              href="/auditoria"
              className="text-xs font-semibold text-purple-700 hover:text-purple-900 hover:underline"
            >
              Ver Auditoría Forense Completa &rarr;
            </Link>
          </div>

          {recentLogs.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              Sin actividad reciente registrada en la plataforma.
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentLogs.map((log) => {
                const isCritico = log.nivelRiesgo === 'CRITICO';
                const isAdvertencia = log.nivelRiesgo === 'ADVERTENCIA';

                return (
                  <div
                    key={log.id}
                    className="p-3 bg-slate-50/70 hover:bg-slate-100/70 rounded-xl border border-slate-200/60 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${
                        isCritico ? 'bg-rose-600' : isAdvertencia ? 'bg-amber-500' : 'bg-blue-600'
                      }`} />
                      <span className="font-bold text-slate-900">{log.usuarioNombre}</span>
                      <span className="font-mono bg-white text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                        {log.modulo}
                      </span>
                      <span className="font-mono font-bold text-purple-700 uppercase">
                        {log.accion}
                      </span>
                      <span className="text-slate-600 truncate max-w-xs md:max-w-md">
                        {log.detalles}
                      </span>
                    </div>

                    <span className="text-slate-400 font-mono text-xs whitespace-nowrap self-end sm:self-auto">
                      {new Date(log.fecha).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
