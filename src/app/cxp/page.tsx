'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Receipt, Search, Plus, CheckCircle2, Clock, Eye } from 'lucide-react';

export default function CxPPage() {
  const { user } = useAuth();
  const [cxpList, setCxpList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal Pago
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [montoPago, setMontoPago] = useState(0);
  const [metodo, setMetodo] = useState('TRANSFERENCIA');
  const [referencia, setReferencia] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (user?.tenantId) {
      fetchCxP();
    }
  }, [user]);

  const fetchCxP = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/cxp?tenantId=${user?.tenantId}`);
      if (res.ok) {
        const data = await res.json();
        setCxpList(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handlePagar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc) return;

    setProcessing(true);
    try {
      const res = await fetch(`/api/cxp/${selectedDoc.id}/pago`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monto: Number(montoPago),
          metodo,
          referencia,
        }),
      });

      if (res.ok) {
        setSelectedDoc(null);
        fetchCxP();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  const isReadOnly = user?.rol === 'AUDITOR';

  const filtered = cxpList.filter((c) =>
    c.folioFactura.toLowerCase().includes(search.toLowerCase()) ||
    c.proveedor.razonSocial.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Receipt className="w-6 h-6 text-purple-600" />
            Cuentas por Pagar (CxP) a Proveedores
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Programación y comprobación de egresos, facturas recibidas y calendario de vencimientos.
          </p>
        </div>
      </div>

      {isReadOnly && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 font-medium">
          <Eye className="w-4 h-4 text-amber-600" />
          Modo Auditoría: Consulta de pasivos y pagos a proveedores en modo solo lectura.
        </div>
      )}

      {/* Buscador */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por factura de proveedor o razón social..."
          className="w-full text-sm outline-none bg-transparent"
        />
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400">Cargando cuentas por pagar...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-400">No hay facturas registradas en CxP.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[11px] font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Folio Factura</th>
                  <th className="py-3 px-4">Proveedor</th>
                  <th className="py-3 px-4">Emisión</th>
                  <th className="py-3 px-4">Vencimiento</th>
                  <th className="py-3 px-4 text-right">Total Factura</th>
                  <th className="py-3 px-4 text-right">Saldo Pendiente</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  {!isReadOnly && <th className="py-3 px-4 text-center">Acción</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-purple-700">
                      {doc.folioFactura}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-900">{doc.proveedor.razonSocial}</p>
                      <span className="text-xs text-slate-400 font-mono">{doc.proveedor.codigo}</span>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600">
                      {new Date(doc.fechaEmision).toLocaleDateString('es-MX')}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600">
                      {new Date(doc.fechaVencimiento).toLocaleDateString('es-MX')}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-800">
                      ${doc.montoTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      ${doc.saldoPendiente.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {doc.saldoPendiente === 0 ? (
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          PAGADA
                        </span>
                      ) : (
                        <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          PENDIENTE
                        </span>
                      )}
                    </td>
                    {!isReadOnly && (
                      <td className="py-3 px-4 text-center">
                        {doc.saldoPendiente > 0 && (
                          <button
                            onClick={() => {
                              setSelectedDoc(doc);
                              setMontoPago(doc.saldoPendiente);
                            }}
                            className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold px-3 py-1 rounded-lg shadow-sm"
                          >
                            Pagar
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Pago CxP */}
      {selectedDoc && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Registrar Pago a Proveedor</h3>
              <button onClick={() => setSelectedDoc(null)} className="text-slate-400 font-bold">✕</button>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
              <p className="text-slate-500">Proveedor: <strong className="text-slate-900">{selectedDoc.proveedor.razonSocial}</strong></p>
              <p className="text-slate-500">Factura: <strong className="text-slate-900">{selectedDoc.folioFactura}</strong></p>
              <p className="text-slate-500">Saldo Adeudado: <strong className="text-slate-900">${selectedDoc.saldoPendiente.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong></p>
            </div>

            <form onSubmit={handlePagar} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Monto a Liquidar ($)</label>
                <input
                  type="number"
                  min="1"
                  max={selectedDoc.saldoPendiente}
                  step="0.01"
                  value={montoPago}
                  onChange={(e) => setMontoPago(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Método de Dispersión</label>
                <select
                  value={metodo}
                  onChange={(e) => setMetodo(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white"
                >
                  <option value="TRANSFERENCIA">Transferencia SPEI</option>
                  <option value="CHEQUE">Cheque Nominativo</option>
                  <option value="EFECTIVO">Efectivo de Caja Chica</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Folio / Referencia de Pago</label>
                <input
                  type="text"
                  value={referencia}
                  onChange={(e) => setReferencia(e.target.value)}
                  placeholder="Ej. Transferencia Banorte #90214"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedDoc(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-5 py-2 rounded-lg shadow-sm"
                >
                  {processing ? 'Registrando...' : 'Confirmar Egreso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
