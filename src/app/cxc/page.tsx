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
  FileDown,
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
  const [timbrarRep, setTimbrarRep] = useState(true);
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
          timbrarRep,
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
    .filter((c) => (c.estado === 'VENCIDA' || new Date(c.fechaVencimiento) < new Date()) && c.saldoPendiente > 0)
    .reduce((acc, c) => acc + (c.saldoPendiente || 0), 0);

  const totalPorVencer = cxcList
    .filter((c) => {
      if (c.saldoPendiente <= 0) return false;
      const vto = new Date(c.fechaVencimiento);
      const diffDias = Math.ceil((vto.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      return diffDias >= 0 && diffDias <= 5;
    })
    .reduce((acc, c) => acc + (c.saldoPendiente || 0), 0);

  const filteredDocs = cxcList.filter((c) => {
    const matchSearch =
      c.folio.toLowerCase().includes(search.toLowerCase()) ||
      c.cliente.razonSocial.toLowerCase().includes(search.toLowerCase());

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

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-28 bg-slate-200 rounded-2xl"></div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="h-24 bg-slate-200 rounded-2xl"></div>
          <div className="h-24 bg-slate-200 rounded-2xl"></div>
          <div className="h-24 bg-slate-200 rounded-2xl"></div>
          <div className="h-24 bg-slate-200 rounded-2xl"></div>
        </div>
        <div className="h-96 bg-slate-200 rounded-2xl"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Soberano Ejecutivo */}
      <div className="bg-slate-900 border border-slate-800 text-white p-6 rounded-2xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-blue-400" /> Cartera y Crédito
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-2 flex items-center gap-2">
            Cuentas por Cobrar & Cobranza
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Control de facturas a crédito, conciliación de pagos y restauración de saldo disponible.
          </p>
        </div>
      </div>

      {isReadOnly && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs px-4 py-3 rounded-2xl flex items-center gap-2.5 font-medium">
          <Eye className="w-4 h-4 text-amber-700 shrink-0" />
          <span><strong>Modo Auditoría:</strong> Consulta de cartera y saldos en modo solo lectura.</span>
        </div>
      )}

      {/* Tarjetas de Resumen de Cartera (Card Float Principle) */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-md shadow-slate-900/5 hover:shadow-xl hover:-translate-y-0.5 transition-all">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Cartera Pendiente Total</span>
          <p className="text-2xl font-bold font-mono text-slate-900 mt-2">
            ${totalPorCobrar.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-slate-400 mt-1">Suma de saldos pendientes</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-rose-200 bg-rose-50/20 shadow-md shadow-slate-900/5 hover:shadow-xl hover:-translate-y-0.5 transition-all">
          <span className="text-xs font-semibold uppercase tracking-wider text-rose-700 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> Saldo Vencido (Mora)
          </span>
          <p className="text-2xl font-bold font-mono text-rose-600 mt-2">
            ${totalVencido.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-rose-600 font-medium mt-1">Requiere cobro urgente</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-md shadow-slate-900/5 hover:shadow-xl hover:-translate-y-0.5 transition-all">
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-700 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> Por Vencer (&le; 5 días)
          </span>
          <p className="text-2xl font-bold font-mono text-amber-700 mt-2">
            ${totalPorVencer.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-amber-700 font-medium mt-1">Gestión preventiva de cobro</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-md shadow-slate-900/5 hover:shadow-xl hover:-translate-y-0.5 transition-all">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Documentos Emitidos</span>
          <p className="text-2xl font-bold font-mono text-slate-900 mt-2">{cxcList.length} <span className="text-sm font-sans font-normal text-slate-500">facturas</span></p>
          <p className="text-xs text-slate-400 mt-1">Con crédito activo</p>
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
                    : 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {tab.label}
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
              <thead className="bg-slate-50 text-slate-600 uppercase text-xs font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Folio Factura</th>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">Fecha Emisión</th>
                  <th className="py-3 px-4">Vencimiento</th>
                  <th className="py-3 px-4 text-right">Total Factura</th>
                  <th className="py-3 px-4 text-right">Saldo Pendiente</th>
                  <th className="py-3 px-4 text-center">Estado de Cartera</th>
                  <th className="py-3 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDocs.map((doc) => {
                  const isVencida = new Date(doc.fechaVencimiento) < new Date() && doc.saldoPendiente > 0;
                  const vto = new Date(doc.fechaVencimiento);
                  const diffDias = Math.ceil((vto.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                  const isPorVencer = doc.saldoPendiente > 0 && diffDias >= 0 && diffDias <= 5;

                  return (
                    <tr key={doc.id} className={`transition-colors ${
                      isVencida ? 'bg-rose-50/40 hover:bg-rose-50/70' : isPorVencer ? 'bg-amber-50/30 hover:bg-amber-50/60' : 'hover:bg-slate-50/70'
                    }`}>
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
                        <div className="flex flex-col">
                          <span className={isVencida ? 'text-rose-600 font-bold' : isPorVencer ? 'text-amber-700 font-bold' : 'text-slate-600 font-medium'}>
                            {new Date(doc.fechaVencimiento).toLocaleDateString('es-MX')}
                          </span>
                          {doc.saldoPendiente > 0 && (
                            <span className="text-xs font-medium text-slate-400">
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
                          <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-0.5 rounded-full">
                            LIQUIDADA
                          </span>
                        ) : isVencida ? (
                          <span className="bg-rose-100 text-rose-800 text-xs font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                            <AlertTriangle className="w-2.5 h-2.5" /> VENCIDA
                          </span>
                        ) : isPorVencer ? (
                          <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" /> POR VENCER
                          </span>
                        ) : (
                          <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-0.5 rounded-full">
                            VIGENTE
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {doc.pagos && doc.pagos.length > 0 && (
                            <a
                              href={`/api/cxc/${doc.id}/rep/pdf`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors inline-flex items-center gap-1 text-xs font-semibold"
                              title="Descargar Recibo Electrónico de Pago (REP 2.0 SAT) en PDF"
                            >
                              <FileDown className="w-3.5 h-3.5" /> REP PDF
                            </a>
                          )}

                          {!isReadOnly && doc.saldoPendiente > 0 && (
                            <button
                              onClick={() => {
                                setSelectedDoc(doc);
                                setMontoAbono(doc.saldoPendiente);
                                setReferencia('');
                                setAbonoMsg('');
                              }}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-2.5 py-1 rounded-lg shadow-sm transition-colors"
                            >
                              Abonar
                            </button>
                          )}

                          {doc.saldoPendiente === 0 && (!doc.pagos || doc.pagos.length === 0) && (
                            <span className="text-xs text-slate-400 font-semibold">Liquidada</span>
                          )}
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

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5">
              <p className="text-slate-500">Cliente: <strong className="text-slate-900">{selectedDoc.cliente.razonSocial}</strong></p>
              <p className="text-slate-500">Saldo Pendiente de Factura: <strong className="text-slate-900">${selectedDoc.saldoPendiente.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong></p>
              {selectedDoc.pagos && selectedDoc.pagos.length > 0 && (
                <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-slate-500">Abonos previos: <strong>{selectedDoc.pagos.length}</strong></span>
                  <a
                    href={`/api/cxc/${selectedDoc.id}/rep/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-700 hover:text-purple-800 hover:underline font-semibold flex items-center gap-1"
                  >
                    <FileDown className="w-3 h-3" /> Ver Último REP PDF
                  </a>
                </div>
              )}
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

              {/* Opción Timbrado Fiscal REP 2.0 */}
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={timbrarRep}
                    onChange={(e) => setTimbrarRep(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-purple-900 block">Timbrar Complemento de Pago (REP 2.0)</span>
                    <span className="text-xs text-purple-700 block">Emite recibo fiscal electrónico ante el SAT con desglose de saldo anterior e insoluto.</span>
                  </div>
                </label>
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
                  {processingAbono ? 'Aplicando y Timbrando...' : 'Aplicar Abono'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
