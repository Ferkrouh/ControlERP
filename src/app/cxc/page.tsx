'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { 
  CreditCard, 
  Search, 
  DollarSign, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Plus, 
  Calendar,
  Eye,
  Filter
} from 'lucide-react';

export default function CxCPage() {
  const { user } = useAuth();
  const [cxcList, setCxcList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('TODOS');

  // Modal de Abono
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [montoAbono, setMontoAbono] = useState<number>(0);
  const [metodoPago, setMetodoPago] = useState('TRANSFERENCIA');
  const [referencia, setReferencia] = useState('');
  const [processingAbono, setProcessingAbono] = useState(false);
  const [abonoMsg, setAbonoMsg] = useState('');

  useEffect(() => {
    if (user?.tenantId) {
      fetchCxC();
    }
  }, [user]);

  const fetchCxC = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/cxc?tenantId=${user?.tenantId}`);
      if (res.ok) {
        const data = await res.json();
        setCxcList(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleRegistrarAbono = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc) return;

    setProcessingAbono(true);
    setAbonoMsg('');

    try {
      const res = await fetch(`/api/cxc/${selectedDoc.id}/abono`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monto: Number(montoAbono),
          metodo: metodoPago,
          referencia,
          usuarioNombre: user?.nombre || 'Operador Cobranza',
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setAbonoMsg('Abono registrado con éxito. El crédito del cliente se actualizó.');
        setTimeout(() => {
          setSelectedDoc(null);
          setAbonoMsg('');
          fetchCxC();
        }, 1500);
      } else {
        setAbonoMsg(data.error || 'Error al procesar el abono.');
      }
    } catch (err) {
      setAbonoMsg('Error de conexión.');
    } finally {
      setProcessingAbono(false);
    }
  };

  const isReadOnly = user?.rol === 'AUDITOR';

  // Cálculos de Resumen
  const totalPorCobrar = cxcList.reduce((acc, c) => acc + (c.saldoPendiente || 0), 0);
  const totalVencido = cxcList
    .filter((c) => c.estado === 'VENCIDA' || new Date(c.fechaVencimiento) < new Date())
    .reduce((acc, c) => acc + (c.saldoPendiente || 0), 0);

  const filteredDocs = cxcList.filter((c) => {
    const matchSearch =
      c.folio.toLowerCase().includes(search.toLowerCase()) ||
      c.cliente.razonSocial.toLowerCase().includes(search.toLowerCase());

    if (filtroEstado === 'TODOS') return matchSearch;
    if (filtroEstado === 'PENDIENTES') return matchSearch && c.saldoPendiente > 0;
    if (filtroEstado === 'VENCIDAS') return matchSearch && (c.estado === 'VENCIDA' || new Date(c.fechaVencimiento) < new Date());
    if (filtroEstado === 'PAGADAS') return matchSearch && c.estado === 'PAGADA';
    return matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-blue-600" />
            Cuentas por Cobrar (CxC) & Cobranza
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Control de facturas a crédito, conciliación de pagos y restauración de saldo disponible.
          </p>
        </div>
      </div>

      {isReadOnly && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 font-medium">
          <Eye className="w-4 h-4 text-amber-600" />
          Modo Auditoría: Consulta de cartera y saldos en modo solo lectura.
        </div>
      )}

      {/* Tarjetas de Resumen de Cartera */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold uppercase text-slate-500">Cartera Pendiente Total</span>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            ${totalPorCobrar.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-slate-500 mt-1">Suma de saldos pendientes</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold uppercase text-slate-500">Saldo Vencido (En Mora)</span>
          <p className="text-2xl font-bold text-rose-600 mt-2">
            ${totalVencido.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-rose-500 font-semibold mt-1">Requiere gestión de cobranza inmediata</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold uppercase text-slate-500">Documentos Emitidos</span>
          <p className="text-2xl font-bold text-slate-900 mt-2">{cxcList.length} facturas</p>
          <p className="text-xs text-slate-500 mt-1">Con términos de crédito aplicados</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-2 w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por folio o cliente..."
            className="w-full text-sm outline-none bg-transparent"
          />
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto text-xs">
          <span className="text-slate-500 font-medium">Filtrar:</span>
          {['TODOS', 'PENDIENTES', 'VENCIDAS', 'PAGADAS'].map((st) => (
            <button
              key={st}
              onClick={() => setFiltroEstado(st)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                filtroEstado === st
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla de Cuentas por Cobrar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400">Cargando documentos CxC...</div>
        ) : filteredDocs.length === 0 ? (
          <div className="p-8 text-center text-slate-400">No hay cuentas por cobrar en este criterio.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[11px] font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Folio Factura</th>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">Fecha Emisión</th>
                  <th className="py-3 px-4">Vencimiento</th>
                  <th className="py-3 px-4 text-right">Total Factura</th>
                  <th className="py-3 px-4 text-right">Saldo Pendiente</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  {!isReadOnly && <th className="py-3 px-4 text-center">Acción</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDocs.map((doc) => {
                  const isVencida = new Date(doc.fechaVencimiento) < new Date() && doc.saldoPendiente > 0;

                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-blue-700">
                        {doc.folio}
                      </td>

                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-900">{doc.cliente.razonSocial}</p>
                        <p className="text-xs text-slate-400 font-mono">{doc.cliente.codigo}</p>
                      </td>

                      <td className="py-3 px-4 text-xs text-slate-600">
                        {new Date(doc.fechaEmision).toLocaleDateString('es-MX')}
                      </td>

                      <td className="py-3 px-4 text-xs">
                        <span className={isVencida ? 'text-rose-600 font-bold' : 'text-slate-600 font-medium'}>
                          {new Date(doc.fechaVencimiento).toLocaleDateString('es-MX')}
                        </span>
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
                        ) : isVencida ? (
                          <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            VENCIDA
                          </span>
                        ) : (
                          <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            VIGENTE
                          </span>
                        )}
                      </td>

                      {!isReadOnly && (
                        <td className="py-3 px-4 text-center">
                          {doc.saldoPendiente > 0 ? (
                            <button
                              onClick={() => {
                                setSelectedDoc(doc);
                                setMontoAbono(doc.saldoPendiente);
                                setReferencia('');
                                setAbonoMsg('');
                              }}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1 rounded-lg shadow-sm transition-colors"
                            >
                              Abonar
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400 font-semibold">Liquidada</span>
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

      {/* Modal Registrar Abono */}
      {selectedDoc && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Registrar Cobro / Abono</h3>
                <p className="text-xs font-mono text-blue-600 font-bold">{selectedDoc.folio}</p>
              </div>
              <button
                onClick={() => setSelectedDoc(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
              <p className="text-slate-500">Cliente: <strong className="text-slate-900">{selectedDoc.cliente.razonSocial}</strong></p>
              <p className="text-slate-500">Saldo Pendiente de Factura: <strong className="text-slate-900">${selectedDoc.saldoPendiente.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong></p>
            </div>

            <form onSubmit={handleRegistrarAbono} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Monto del Abono ($)
                </label>
                <input
                  type="number"
                  min="1"
                  max={selectedDoc.saldoPendiente}
                  step="0.01"
                  value={montoAbono}
                  onChange={(e) => setMontoAbono(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 font-bold text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Método de Pago
                </label>
                <select
                  value={metodoPago}
                  onChange={(e) => setMetodoPago(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white"
                >
                  <option value="TRANSFERENCIA">03 - Transferencia Electrónica (SPEI)</option>
                  <option value="EFECTIVO">01 - Efectivo</option>
                  <option value="CHEQUE">02 - Cheque Nominativo</option>
                  <option value="TARJETA">04 - Tarjeta de Crédito / Débito</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Referencia Bancaria / Comprobante
                </label>
                <input
                  type="text"
                  value={referencia}
                  onChange={(e) => setReferencia(e.target.value)}
                  placeholder="Ej. Clave de rastreo o autorización"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                />
              </div>

              {abonoMsg && (
                <p className="text-xs font-semibold text-emerald-700 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                  {abonoMsg}
                </p>
              )}

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
                  disabled={processingAbono}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2 rounded-lg shadow-sm disabled:opacity-50"
                >
                  {processingAbono ? 'Aplicando...' : 'Aplicar Abono'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
