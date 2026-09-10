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
  const [filtroEstado, setFiltroEstado] = useState('TODOS');

  // Cálculos de Resumen
  const totalPorPagar = cxpList.reduce((acc, c) => acc + (c.saldoPendiente || 0), 0);
  const totalVencido = cxpList
    .filter((c) => (c.estado === 'VENCIDA' || new Date(c.fechaVencimiento) < new Date()) && c.saldoPendiente > 0)
    .reduce((acc, c) => acc + (c.saldoPendiente || 0), 0);

  const totalPorVencer = cxpList
    .filter((c) => {
      if (c.saldoPendiente <= 0) return false;
      const vto = new Date(c.fechaVencimiento);
      const diffDias = Math.ceil((vto.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      return diffDias >= 0 && diffDias <= 5;
    })
    .reduce((acc, c) => acc + (c.saldoPendiente || 0), 0);

  const filtered = cxpList.filter((c) => {
    const matchSearch =
      c.folioFactura.toLowerCase().includes(search.toLowerCase()) ||
      c.proveedor.razonSocial.toLowerCase().includes(search.toLowerCase());

    const isVencida = (c.estado === 'VENCIDA' || new Date(c.fechaVencimiento) < new Date()) && c.saldoPendiente > 0;
    const vto = new Date(c.fechaVencimiento);
    const diffDias = Math.ceil((vto.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    const isPorVencer = c.saldoPendiente > 0 && diffDias >= 0 && diffDias <= 5;

    if (filtroEstado === 'TODOS') return matchSearch;
    if (filtroEstado === 'PENDIENTES') return matchSearch && c.saldoPendiente > 0;
    if (filtroEstado === 'POR_VENCER') return matchSearch && isPorVencer;
    if (filtroEstado === 'VENCIDAS') return matchSearch && isVencida;
    if (filtroEstado === 'PAGADAS') return matchSearch && c.saldoPendiente === 0;
    return matchSearch;
  });

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

      {/* Tarjetas de Resumen de Cartera CxP */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold uppercase text-slate-500">Pasivo Total Pendiente</span>
          <p className="text-xl font-bold font-mono text-slate-900 mt-1">
            ${totalPorPagar.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">Suma de facturas por pagar</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-rose-200 bg-rose-50/20 shadow-sm">
          <span className="text-xs font-semibold uppercase text-rose-600 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> Pagos Vencidos (En Mora)
          </span>
          <p className="text-xl font-bold font-mono text-rose-600 mt-1">
            ${totalVencido.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-rose-500 font-semibold mt-0.5">Requiere liquidación inmediata</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/20 shadow-sm">
          <span className="text-xs font-semibold uppercase text-amber-600 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> Por Vencer (&le; 5 días)
          </span>
          <p className="text-xl font-bold font-mono text-amber-600 mt-1">
            ${totalPorVencer.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-amber-600 font-medium mt-0.5">Programar flujo de tesorería</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold uppercase text-slate-500">Facturas Registradas</span>
          <p className="text-xl font-bold text-slate-900 mt-1">{cxpList.length} documentos</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Pasivo corriente</p>
        </div>
      </div>

      {/* Buscador y Filtros */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-2 w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por factura de proveedor o razón social..."
            className="w-full text-sm outline-none bg-transparent"
          />
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto text-xs overflow-x-auto">
          <span className="text-slate-500 font-medium shrink-0">Filtrar:</span>
          {[
            { id: 'TODOS', label: 'Todos' },
            { id: 'PENDIENTES', label: 'Pendientes' },
            { id: 'POR_VENCER', label: 'Por Vencer (5d)' },
            { id: 'VENCIDAS', label: 'Vencidas' },
            { id: 'PAGADAS', label: 'Pagadas' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFiltroEstado(tab.id)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 ${
                filtroEstado === tab.id
                  ? tab.id === 'VENCIDAS'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : tab.id === 'POR_VENCER'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'bg-purple-600 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400">Cargando cuentas por pagar...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-400">No hay facturas registradas en este criterio.</div>
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
                  <th className="py-3 px-4 text-center">Estado de Pago</th>
                  {!isReadOnly && <th className="py-3 px-4 text-center">Acción</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((doc) => {
                  const isVencida = (doc.estado === 'VENCIDA' || new Date(doc.fechaVencimiento) < new Date()) && doc.saldoPendiente > 0;
                  const vto = new Date(doc.fechaVencimiento);
                  const diffDias = Math.ceil((vto.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                  const isPorVencer = doc.saldoPendiente > 0 && diffDias >= 0 && diffDias <= 5;

                  return (
                    <tr key={doc.id} className={`transition-colors ${
                      isVencida ? 'bg-rose-50/40 hover:bg-rose-50/70' : isPorVencer ? 'bg-amber-50/30 hover:bg-amber-50/60' : 'hover:bg-slate-50/70'
                    }`}>
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
                      <td className="py-3 px-4 text-xs">
                        <div className="flex flex-col">
                          <span className={isVencida ? 'text-rose-600 font-bold' : isPorVencer ? 'text-amber-700 font-bold' : 'text-slate-600 font-medium'}>
                            {new Date(doc.fechaVencimiento).toLocaleDateString('es-MX')}
                          </span>
                          {doc.saldoPendiente > 0 && (
                            <span className="text-[10px] font-medium text-slate-400">
                              {diffDias < 0 ? `Vencido hace ${Math.abs(diffDias)} días` : diffDias === 0 ? 'Vence hoy' : `Vence en ${diffDias} días`}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold font-mono text-slate-800">
                        ${doc.montoTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-bold font-mono text-slate-900">
                        ${doc.saldoPendiente.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {doc.saldoPendiente === 0 ? (
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            LIQUIDADA
                          </span>
                        ) : isVencida ? (
                          <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            VENCIDA
                          </span>
                        ) : isPorVencer ? (
                          <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            POR VENCER
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
                  );
                })}
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
