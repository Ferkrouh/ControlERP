'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Truck, Plus, Search, Eye, Phone, Mail, FileText } from 'lucide-react';
import Link from 'next/link';

export default function ProveedoresPage() {
  const { user } = useAuth();
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [razonSocial, setRazonSocial] = useState('');
  const [rfc, setRfc] = useState('');
  const [contacto, setContacto] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [diasCredito, setDiasCredito] = useState(30);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.tenantId) {
      fetchProveedores();
    }
  }, [user]);

  const fetchProveedores = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/proveedores?tenantId=${user?.tenantId}`);
      if (res.ok) {
        const data = await res.json();
        setProveedores(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.tenantId) return;

    setSaving(true);
    try {
      const res = await fetch('/api/proveedores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: user.tenantId,
          razonSocial,
          rfc,
          contacto,
          telefono,
          email,
          diasCredito: Number(diasCredito),
        }),
      });

      if (res.ok) {
        setShowModal(false);
        setRazonSocial('');
        setRfc('');
        setContacto('');
        setTelefono('');
        setEmail('');
        fetchProveedores();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const isReadOnly = user?.rol === 'AUDITOR';

  const filtered = proveedores.filter((p) =>
    p.razonSocial.toLowerCase().includes(search.toLowerCase()) ||
    (p.rfc && p.rfc.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Truck className="w-6 h-6 text-blue-600" />
            Directorio de Proveedores
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Catálogo de suplidores, plazos de compra acordados y saldo adeudado.
          </p>
        </div>

        {!isReadOnly && (
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-4 py-2.5 rounded-xl shadow-sm transition-all flex items-center gap-2 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" /> Nuevo Proveedor
          </button>
        )}
      </div>

      {/* Buscador */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar proveedor o RFC..."
          className="w-full text-sm outline-none bg-transparent"
        />
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400">Cargando proveedores...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-400">No hay proveedores registrados.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[11px] font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Código & Proveedor</th>
                  <th className="py-3 px-4">RFC</th>
                  <th className="py-3 px-4">Contacto</th>
                  <th className="py-3 px-4">Término</th>
                  <th className="py-3 px-4 text-right">Saldo Pendiente</th>
                  <th className="py-3 px-4 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((prv) => (
                  <tr key={prv.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-900">{prv.razonSocial}</p>
                      <span className="text-[11px] font-mono text-slate-400">{prv.codigo}</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-600">
                      {prv.rfc || 'Sin RFC'}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600">
                      <p>{prv.contacto || 'N/A'}</p>
                      <p className="text-slate-400">{prv.telefono}</p>
                    </td>
                    <td className="py-3 px-4 text-xs font-semibold text-slate-700">
                      {prv.diasCredito} días
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      ${(prv.saldoPendiente || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Link
                        href={`/cxp?proveedorId=${prv.id}`}
                        className="text-xs text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1"
                      >
                        <FileText className="w-3.5 h-3.5" /> Ver Facturas
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Nuevo Proveedor */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Truck className="w-5 h-5 text-blue-600" /> Nuevo Proveedor
            </h3>

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Razón Social *</label>
                <input
                  type="text"
                  value={razonSocial}
                  onChange={(e) => setRazonSocial(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">RFC</label>
                  <input
                    type="text"
                    value={rfc}
                    onChange={(e) => setRfc(e.target.value.toUpperCase())}
                    maxLength={13}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Días de Crédito</label>
                  <input
                    type="number"
                    value={diasCredito}
                    onChange={(e) => setDiasCredito(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Persona de Contacto</label>
                  <input
                    type="text"
                    value={contacto}
                    onChange={(e) => setContacto(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                />
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
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2 rounded-lg shadow-sm disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'Guardar Proveedor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
