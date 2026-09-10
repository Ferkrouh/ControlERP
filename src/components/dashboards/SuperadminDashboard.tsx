'use client';

import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Users, 
  Boxes, 
  ShieldCheck, 
  Server, 
  CheckCircle2, 
  XCircle, 
  ToggleLeft, 
  ToggleRight,
  Plus,
  ArrowUpRight
} from 'lucide-react';
import Link from 'next/link';

export default function SuperadminDashboard() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/tenants');
      if (res.ok) {
        const data = await res.json();
        setTenants(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const toggleModule = async (tenantId: string, moduleKey: string, currentValue: boolean) => {
    try {
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
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-purple-900 to-indigo-900 text-white p-6 rounded-2xl shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-purple-500/30 text-purple-200 border border-purple-400/40 text-xs px-2.5 py-0.5 rounded-full font-semibold">
              👑 Acceso Plataforma Global
            </span>
            <span className="bg-emerald-500/20 text-emerald-300 text-xs px-2.5 py-0.5 rounded-full flex items-center gap-1 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Servidor Ubuntu Online
            </span>
          </div>
          <h2 className="text-2xl font-bold mt-2">Panel Maestro Superadmin SaaS</h2>
          <p className="text-purple-200 text-sm mt-1">
            Control de inquilinos, licencias por negocio y módulos restrictivos para Administradores.
          </p>
        </div>
        <Link
          href="/negocios"
          className="bg-white text-purple-900 hover:bg-purple-50 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-sm flex items-center gap-2 shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Dar de Alta Negocio
        </Link>
      </div>

      {/* Global KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">Negocios Activos</span>
            <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{tenants.length}</p>
          <p className="text-xs text-slate-500 mt-1">Multi-inquilino aislado</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">Usuarios Totales</span>
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            {tenants.reduce((acc, t) => acc + (t.usuarios?.length || 0), 1)}
          </p>
          <p className="text-xs text-slate-500 mt-1">Distribuidos en 4 roles operativos</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">Almacenes en Red</span>
            <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
              <Boxes className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            {tenants.reduce((acc, t) => acc + (t.almacenes?.length || 0), 0)}
          </p>
          <p className="text-xs text-slate-500 mt-1">Con soporte de traspasos</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">Infraestructura</span>
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <Server className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">Docker + Cloudflare</p>
          <p className="text-xs text-emerald-600 mt-1 font-medium">HTTPS Cifrado de Extremo a Extremo</p>
        </div>
      </div>

      {/* Control de Negocios y Restricción de Módulos */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900 text-lg">Negocios Registrados y Modulación Restrictiva</h3>
            <p className="text-xs text-slate-500">
              Como Superadmin puedes encender o apagar módulos para cada negocio. El Admin de esa empresa solo podrá ver y operar lo que tú actives.
            </p>
          </div>
          <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-full font-medium self-start sm:self-auto">
            Aislamiento Tenant ID estricto
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400">Cargando inquilinos...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[11px] font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Negocio / Razón Social</th>
                  <th className="py-3 px-4">Giro Comercial</th>
                  <th className="py-3 px-4 text-center">Multi-Almacén</th>
                  <th className="py-3 px-4 text-center">Traspasos</th>
                  <th className="py-3 px-4 text-center">Control Crédito</th>
                  <th className="py-3 px-4 text-center">CxC / CxP</th>
                  <th className="py-3 px-4 text-center">Facturación SAT</th>
                  <th className="py-3 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tenants.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-xs shrink-0"
                          style={{ backgroundColor: t.colorPrimario || '#2563eb' }}
                        >
                          {t.nombreComercial.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{t.nombreComercial}</p>
                          <p className="text-xs text-slate-400 font-mono">{t.identificacionFiscal}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                        {t.giro.replace('_', ' ')}
                      </span>
                    </td>
                    
                    {/* Switch MultiAlmacen */}
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => toggleModule(t.id, 'moduloMultiAlmacen', t.moduloMultiAlmacen)}
                        className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded transition-colors"
                        title="Click para alternar"
                      >
                        {t.moduloMultiAlmacen ? (
                          <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Activo
                          </span>
                        ) : (
                          <span className="text-slate-400 bg-slate-100 px-2 py-0.5 rounded flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5" /> Bloqueado
                          </span>
                        )}
                      </button>
                    </td>

                    {/* Switch Traspasos */}
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => toggleModule(t.id, 'moduloTraspasos', t.moduloTraspasos)}
                        className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded transition-colors"
                        title="Click para alternar"
                      >
                        {t.moduloTraspasos ? (
                          <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Activo
                          </span>
                        ) : (
                          <span className="text-slate-400 bg-slate-100 px-2 py-0.5 rounded flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5" /> Bloqueado
                          </span>
                        )}
                      </button>
                    </td>

                    {/* Switch Credito */}
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => toggleModule(t.id, 'moduloCredito', t.moduloCredito)}
                        className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded transition-colors"
                        title="Click para alternar"
                      >
                        {t.moduloCredito ? (
                          <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Activo
                          </span>
                        ) : (
                          <span className="text-slate-400 bg-slate-100 px-2 py-0.5 rounded flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5" /> Bloqueado
                          </span>
                        )}
                      </button>
                    </td>

                    {/* Switch CxC/CxP */}
                    <td className="py-3 px-4 text-center">
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium">
                        Habilitado
                      </span>
                    </td>

                    {/* Facturación SAT */}
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => toggleModule(t.id, 'moduloFacturacionSAT', t.moduloFacturacionSAT)}
                        className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded transition-colors"
                        title="Click para alternar"
                      >
                        {t.moduloFacturacionSAT ? (
                          <span className="text-purple-700 bg-purple-50 px-2 py-0.5 rounded flex items-center gap-1">
                            CFDI 4.0
                          </span>
                        ) : (
                          <span className="text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                            Desactivado
                          </span>
                        )}
                      </button>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/negocios?id=${t.id}`}
                        className="text-xs font-semibold text-purple-700 hover:text-purple-900 inline-flex items-center gap-0.5"
                      >
                        Gestionar <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
