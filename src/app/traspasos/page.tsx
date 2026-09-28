'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { 
  ArrowLeftRight, 
  Plus, 
  Clock, 
  CheckCircle2, 
  Truck, 
  Boxes, 
  ArrowRight,
  ClipboardCheck,
  FileDown,
  AlertCircle
} from 'lucide-react';

export default function TraspasosPage() {
  const { user } = useAuth();
  const puedeSolicitar = ['SUPERADMIN', 'ADMIN', 'ENCARGADO'].includes(user?.rol || '');
  const puedeOperar = (almacenId: string) => ['SUPERADMIN', 'ADMIN'].includes(user?.rol || '')
    || (user?.rol === 'ALMACENISTA' && user.almacenAsignadoId === almacenId);
  const [traspasos, setTraspasos] = useState<any[]>([]);
  const [almacenes, setAlmacenes] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal Solicitud
  const [showModal, setShowModal] = useState(false);
  const [almacenOrigenId, setAlmacenOrigenId] = useState('');
  const [almacenDestinoId, setAlmacenDestinoId] = useState('');
  const [productoId, setProductoId] = useState('');
  const [cantidad, setCantidad] = useState(5);
  const [observaciones, setObservaciones] = useState('');
  const [requiereCartaPorte, setRequiereCartaPorte] = useState(false);
  const [distanciaKm, setDistanciaKm] = useState(25);
  const [vehiculoPlacas, setVehiculoPlacas] = useState('');
  const [operadorNombre, setOperadorNombre] = useState('');
  const [operadorRfc, setOperadorRfc] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Modal Recepción
  const [selectedRecepcion, setSelectedRecepcion] = useState<any>(null);
  const [cantidadesRecibidas, setCantidadesRecibidas] = useState<Record<string, number>>({});
  const [processingAction, setProcessingAction] = useState(false);

  useEffect(() => {
    if (user?.tenantId) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [resTrasp, resAlm, resProd] = await Promise.all([
        fetch(`/api/traspasos?tenantId=${user?.tenantId}`),
        fetch(`/api/almacenes?tenantId=${user?.tenantId}`),
        fetch(`/api/productos?tenantId=${user?.tenantId}`),
      ]);

      if (resTrasp.ok && resAlm.ok && resProd.ok) {
        const traspData = await resTrasp.json();
        const almData = await resAlm.json();
        const prodData = await resProd.json();
        setTraspasos(traspData);
        setAlmacenes(almData);
        setProductos(prodData);

        if (almData.length >= 2) {
          setAlmacenOrigenId(almData[0].id);
          setAlmacenDestinoId(almData[1].id);
        }
        if (prodData.length > 0) {
          setProductoId(prodData[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTraspaso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.tenantId) return;
    setErrorMsg('');

    if (almacenOrigenId === almacenDestinoId) {
      setErrorMsg('El almacén de origen y destino deben ser diferentes.');
      return;
    }

    setSubmitting(true);
    try {
      const prodSelected = productos.find((p) => p.id === productoId);
      const res = await fetch('/api/traspasos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: user.tenantId,
          almacenOrigenId,
          almacenDestinoId,
          observaciones,
          requiereCartaPorte,
          distanciaKm,
          vehiculoPlacas,
          operadorNombre,
          operadorRfc,
          items: [{ 
            productoId, 
            cantidadEnviada: Number(cantidad),
            nombre: prodSelected?.nombre || 'Artículo',
          }],
        }),
      });

      if (res.ok) {
        setShowModal(false);
        setObservaciones('');
        loadData();
      } else {
        const data = await res.json();
        setErrorMsg(data.error || 'Error al solicitar traspaso.');
      }
    } catch (err) {
      setErrorMsg('Error de conexión.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDespachar = async (traspasoId: string) => {
    setProcessingAction(true);
    try {
      const res = await fetch(`/api/traspasos/${traspasoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'despachar' }),
      });

      if (res.ok) {
        loadData();
      } else {
        const data = await res.json();
        alert(data.error || 'Error al despachar envío.');
        if (res.status === 409) await loadData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingAction(false);
    }
  };

  const handleConfirmarRecepcion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecepcion) return;

    setProcessingAction(true);
    try {
      const res = await fetch(`/api/traspasos/${selectedRecepcion.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion: 'recibir',
          recepciones: cantidadesRecibidas,
        }),
      });

      if (res.ok) {
        setSelectedRecepcion(null);
        loadData();
      } else {
        const data = await res.json();
        alert(data.error || 'Error al confirmar recepción.');
        if (res.status === 409) { setSelectedRecepcion(null); await loadData(); }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingAction(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ArrowLeftRight className="w-6 h-6 text-blue-600" />
            Traspasos entre Almacenes
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Flujo de control en 3 fases: Solicitud ➡️ Despacho (Salida de stock) ➡️ Recepción física y cotejo.
          </p>
        </div>

        {puedeSolicitar && (
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-4 py-2.5 rounded-xl shadow-sm transition-all flex items-center gap-2 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" /> Solicitar Traspaso
          </button>
        )}
      </div>

      {/* Flujo Visual */}
      <div className="bg-slate-900 text-white p-4 rounded-xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-semibold">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center font-bold">1</span>
          <span>Solicitud (Encargado)</span>
        </div>
        <ArrowRight className="hidden md:block w-4 h-4 text-slate-500" />
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center font-bold">2</span>
          <span>Despacho y Salida (Almacén Origen)</span>
        </div>
        <ArrowRight className="hidden md:block w-4 h-4 text-slate-500" />
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center font-bold">3</span>
          <span>Recepción Física y Kárdex (Almacén Destino)</span>
        </div>
      </div>

      {/* Tabla de Traspasos */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400">Cargando órdenes de traspaso...</div>
        ) : traspasos.length === 0 ? (
          <div className="p-8 text-center text-slate-400">No hay traspasos registrados.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 uppercase text-xs font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Folio</th>
                  <th className="py-3 px-4">Ruta (Origen ➡️ Destino)</th>
                  <th className="py-3 px-4">Artículos Transferidos</th>
                  <th className="py-3 px-4">Fecha Solicitud</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-center">Acción Operativa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {traspasos.map((trasp) => (
                  <tr key={trasp.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-blue-700">
                      {trasp.folio}
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 text-xs font-semibold">
                        <span className="text-slate-800">{trasp.almacenOrigenNombre}</span>
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                        <span className="text-blue-700">{trasp.almacenDestinoNombre}</span>
                      </div>
                      {trasp.observaciones && (
                        <p className="text-xs text-slate-400 mt-0.5">{trasp.observaciones}</p>
                      )}
                      {trasp.requiereCartaPorte && (
                        <div className="mt-1 flex items-center gap-1.5">
                          {trasp.estadoCartaPorte === 'TIMBRADA' ? (
                            <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-800 text-xs font-mono font-bold px-2 py-0.5 rounded-full" title={trasp.uuidCartaPorte}>
                              <CheckCircle2 className="w-3 h-3 text-purple-600" /> Carta Porte 3.1 SAT
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 text-xs font-mono px-2 py-0.5 rounded-full">
                              Carta Porte: {trasp.estadoCartaPorte}
                            </span>
                          )}
                          {trasp.vehiculoPlacas && (
                            <span className="text-xs font-mono text-slate-500">Placas: {trasp.vehiculoPlacas}</span>
                          )}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 text-xs">
                      {trasp.items?.map((it: any) => (
                        <div key={it.id} className="font-medium text-slate-800">
                          {it.producto.nombre} - <span className="font-bold">{it.cantidadEnviada} {it.producto.unidadMedida}</span>
                          {it.cantidadRecibida !== null && (
                            <span className="text-emerald-600 font-bold ml-1">(Recibidas: {it.cantidadRecibida})</span>
                          )}
                        </div>
                      ))}
                    </td>

                    <td className="py-3 px-4 text-xs text-slate-500">
                      {new Date(trasp.fechaSolicitud).toLocaleDateString('es-MX')}
                    </td>

                    <td className="py-3 px-4 text-center">
                      {trasp.estado === 'SOLICITADO' && puedeOperar(trasp.almacenOrigenId) && (
                        <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Solicitado
                        </span>
                      )}
                      {trasp.estado === 'DESPACHADO' && puedeOperar(trasp.almacenDestinoId) && (
                        <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                          <Truck className="w-3 h-3" /> En Tránsito
                        </span>
                      )}
                      {trasp.estado === 'RECIBIDO' && (
                        <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Recibido
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <a
                          href={`/api/traspasos/${trasp.id}/pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors inline-flex items-center gap-1 text-xs font-semibold"
                          title="Guía interna de traspaso PDF"
                        >
                          <FileDown className="w-3.5 h-3.5" /> PDF
                        </a>

                        {trasp.estado === 'SOLICITADO' && puedeOperar(trasp.almacenOrigenId) && (
                          <button
                            onClick={() => handleDespachar(trasp.id)}
                            disabled={processingAction}
                            className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-3 py-1 rounded-lg shadow-sm"
                          >
                            Despachar Envío
                          </button>
                        )}

                        {trasp.estado === 'DESPACHADO' && puedeOperar(trasp.almacenDestinoId) && (
                          <button
                            onClick={() => {
                              setSelectedRecepcion(trasp);
                              const mapInit: Record<string, number> = {};
                              trasp.items.forEach((it: any) => {
                                mapInit[it.id] = it.cantidadEnviada;
                              });
                              setCantidadesRecibidas(mapInit);
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1 rounded-lg shadow-sm"
                          >
                            Confirmar Recepción
                          </button>
                        )}

                        {trasp.estado === 'RECIBIDO' && (
                          <span className="text-xs text-slate-400 font-medium">Finalizado</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Nueva Solicitud de Traspaso */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5 text-blue-600" />
              Solicitud de Traspaso entre Almacenes
            </h3>

            <form onSubmit={handleCreateTraspaso} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Almacén Origen</label>
                  <select
                    value={almacenOrigenId}
                    onChange={(e) => setAlmacenOrigenId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                  >
                    {almacenes.map((a) => (
                      <option key={a.id} value={a.id}>{a.nombre}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Almacén Destino</label>
                  <select
                    value={almacenDestinoId}
                    onChange={(e) => setAlmacenDestinoId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                  >
                    {almacenes.map((a) => (
                      <option key={a.id} value={a.id}>{a.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Producto a Transferir</label>
                  <select
                    value={productoId}
                    onChange={(e) => setProductoId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                  >
                    {productos.map((p) => (
                      <option key={p.id} value={p.id}>{p.sku} - {p.nombre}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Cantidad</label>
                  <input
                    type="number"
                    min="1"
                    value={cantidad}
                    onChange={(e) => setCantidad(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Motivo / Observaciones</label>
                <input
                  type="text"
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Ej. Reabastecimiento urgente de stock para entrega"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                />
              </div>

              {/* Complemento Carta Porte 3.1 SAT */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled
                    checked={requiereCartaPorte}
                    onChange={(e) => setRequiereCartaPorte(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Carta Porte: no disponible en el piloto</span>
                    <span className="text-xs text-slate-500 block">La guía interna de traspaso no sustituye un documento fiscal de transporte.</span>
                  </div>
                </label>

                {requiereCartaPorte && (
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 text-xs">
                    <div>
                      <label className="block text-xs text-slate-600 mb-0.5">Distancia Recorrida (Km)</label>
                      <input
                        type="number"
                        min="1"
                        value={distanciaKm}
                        onChange={(e) => setDistanciaKm(Number(e.target.value))}
                        className="w-full px-2 py-1 border rounded bg-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 mb-0.5">Placas Vehículo</label>
                      <input
                        type="text"
                        placeholder="ej. P-991-NL"
                        value={vehiculoPlacas}
                        onChange={(e) => setVehiculoPlacas(e.target.value.toUpperCase())}
                        className="w-full px-2 py-1 border rounded bg-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 mb-0.5">Nombre del Chofer / Operador</label>
                      <input
                        type="text"
                        placeholder="Nombre completo"
                        value={operadorNombre}
                        onChange={(e) => setOperadorNombre(e.target.value)}
                        className="w-full px-2 py-1 border rounded bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 mb-0.5">RFC Chofer</label>
                      <input
                        type="text"
                        placeholder="RFC a 13 posiciones"
                        value={operadorRfc}
                        onChange={(e) => setOperadorRfc(e.target.value.toUpperCase())}
                        className="w-full px-2 py-1 border rounded bg-white font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              {errorMsg && (
                <p className="text-xs font-semibold text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                  {errorMsg}
                </p>
              )}

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
                  disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2 rounded-lg shadow-sm"
                >
                  {submitting ? 'Creando orden...' : 'Generar Traspaso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmación de Recepción Física con Cotejo */}
      {selectedRecepcion && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-emerald-600" />
              Cotejo y Recepción Física en Almacén
            </h3>
            <p className="text-xs text-slate-500">
              Folio: <strong>{selectedRecepcion.folio}</strong> hacia <strong>{selectedRecepcion.almacenDestinoNombre}</strong>
            </p>

            <p className="text-xs text-slate-600">Capture el total acumulado recibido. El faltante permanecerá pendiente; el traspaso se cerrará al recibir todas las partidas.</p>
            <form onSubmit={handleConfirmarRecepcion} className="space-y-3">
              <div className="space-y-2">
                {selectedRecepcion.items.map((it: any) => (
                  <div key={it.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <p className="text-xs font-bold text-slate-900">{it.producto.nombre}</p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Enviadas: <strong>{it.cantidadEnviada}</strong> · Ya recibidas: <strong>{it.cantidadRecibida ?? 0}</strong> · Pendientes: <strong>{it.cantidadEnviada - (it.cantidadRecibida ?? 0)} {it.producto.unidadMedida}</strong></span>
                      <div className="flex items-center gap-1.5">
                        <label htmlFor={`recepcion-${it.id}`} className="font-semibold text-slate-700">Total recibido:</label>
                        <input
                          id={`recepcion-${it.id}`}
                          type="number"
                          min={it.cantidadRecibida ?? 0}
                          max={it.cantidadEnviada}
                          step="any"
                          required
                          value={cantidadesRecibidas[it.id] ?? it.cantidadEnviada}
                          onChange={(e) =>
                            setCantidadesRecibidas({
                              ...cantidadesRecibidas,
                              [it.id]: Number(e.target.value),
                            })
                          }
                          className="w-16 px-2 py-1 text-xs border border-slate-300 rounded font-bold text-center"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedRecepcion(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={processingAction}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2 rounded-lg shadow-sm"
                >
                  {processingAction ? 'Acreditando...' : 'Confirmar y Sumar a Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
