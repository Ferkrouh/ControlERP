'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Building2, Plus, CheckCircle2, XCircle, ShieldAlert } from 'lucide-react';

export default function NegociosPage() {
  const { user } = useAuth();
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [nombreComercial, setNombreComercial] = useState('');
  const [identificacionFiscal, setIdentificacionFiscal] = useState('');
  const [giro, setGiro] = useState('DISTRIBUCION_MAYOREO');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminNombre, setAdminNombre] = useState('');
  const [moduloMultiAlmacen, setModuloMultiAlmacen] = useState(true);
  const [moduloTraspasos, setModuloTraspasos] = useState(true);
  const [moduloCredito, setModuloCredito] = useState(true);
  const [moduloFacturacionSAT, setModuloFacturacionSAT] = useState(true);
  const [saving, setSaving] = useState(false);

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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch('/api/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombreComercial,
          identificacionFiscal,
          giro,
          adminEmail,
          adminNombre,
          moduloMultiAlmacen,
          moduloTraspasos,
          moduloCredito,
          moduloFacturacionSAT,
        }),
      });

      if (res.ok) {
        setShowModal(false);
        setNombreComercial('');
        setIdentificacionFiscal('');
        setAdminEmail('');
        setAdminNombre('');
        fetchTenants();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (user?.rol !== 'SUPERADMIN') {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200 shadow-sm max-w-lg mx-auto mt-10">
        <ShieldAlert className="w-10 h-10 text-purple-600 mx-auto mb-3" />
        <h3 className="font-bold text-slate-800 text-lg">Acceso Restringido al Superadmin</h3>
        <p className="text-sm text-slate-500 mt-1">
          La gestión de negocios y asignación de licencias de plataforma está reservada exclusivamente para el Superadmin.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-purple-600" />
            Gestión de Negocios (Inquilinos SaaS)
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Alta de empresas, configuración del giro de negocio y habilitación restrictiva de módulos.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm px-4 py-2.5 rounded-xl shadow-sm transition-all flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Registrar Nuevo Negocio
        </button>
      </div>

      {/* Grid de Negocios */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {tenants.map((t) => (
          <div key={t.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-sm"
                  style={{ backgroundColor: t.colorPrimario || '#1e40af' }}
                >
                  {t.nombreComercial.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{t.nombreComercial}</h3>
                  <p className="text-xs text-slate-400 font-mono">RFC: {t.identificacionFiscal}</p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                {t.giro.replace('_', ' ')}
              </span>
            </div>

            <div className="text-xs space-y-2 pt-2 border-t border-slate-100">
              <div className="flex justify-between text-slate-600">
                <span>Almacenes Autorizados:</span>
                <strong>{t.almacenes?.length || 0}</strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Usuarios con Acceso:</span>
                <strong>{t.usuarios?.length || 0}</strong>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <p className="text-[11px] uppercase font-bold text-slate-400 mb-2">Módulos Activos:</p>
              <div className="flex flex-wrap gap-1.5">
                {t.moduloCredito && <span className="text-[10px] bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded">Límite Crédito</span>}
                {t.moduloCxC && <span className="text-[10px] bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded">CxC</span>}
                {t.moduloCxP && <span className="text-[10px] bg-purple-50 text-purple-700 font-semibold px-2 py-0.5 rounded">CxP</span>}
                {t.moduloMultiAlmacen && <span className="text-[10px] bg-amber-50 text-amber-700 font-semibold px-2 py-0.5 rounded">Multi-Almacén</span>}
                {t.moduloTraspasos && <span className="text-[10px] bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded">Traspasos</span>}
                {t.moduloFacturacionSAT && <span className="text-[10px] bg-rose-50 text-rose-700 font-semibold px-2 py-0.5 rounded">CFDI 4.0 SAT</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Nuevo Negocio */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-purple-600" />
              Alta de Nuevo Negocio / Empresa SaaS
            </h3>

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre Comercial *</label>
                <input
                  type="text"
                  value={nombreComercial}
                  onChange={(e) => setNombreComercial(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">RFC Fiscal *</label>
                  <input
                    type="text"
                    value={identificacionFiscal}
                    onChange={(e) => setIdentificacionFiscal(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Giro Comercial</label>
                  <select
                    value={giro}
                    onChange={(e) => setGiro(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="DISTRIBUCION_MAYOREO">Distribución y Mayoreo</option>
                    <option value="COMERCIAL_RETAIL">Comercio Minorista / Retail</option>
                    <option value="SERVICIOS">Empresa de Servicios</option>
                    <option value="MANUFACTURA">Manufactura / Ensamble</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-purple-50/50 border border-purple-100 rounded-xl">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Admin Nombre</label>
                  <input
                    type="text"
                    value={adminNombre}
                    onChange={(e) => setAdminNombre(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                    placeholder="Ej. Roberto Martínez"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Admin Email *</label>
                  <input
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                    placeholder="admin@empresa.com"
                    required
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <p className="text-xs font-bold text-slate-800">Módulos a Habilitar para el Negocio:</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={moduloMultiAlmacen} onChange={(e) => setModuloMultiAlmacen(e.target.checked)} />
                    Multi-Almacén
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={moduloTraspasos} onChange={(e) => setModuloTraspasos(e.target.checked)} />
                    Traspasos de Stock
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={moduloCredito} onChange={(e) => setModuloCredito(e.target.checked)} />
                    Control de Crédito
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={moduloFacturacionSAT} onChange={(e) => setModuloFacturacionSAT(e.target.checked)} />
                    Facturación SAT 4.0
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-5 py-2 rounded-lg shadow-sm"
                >
                  {saving ? 'Registrando...' : 'Crear Negocio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
