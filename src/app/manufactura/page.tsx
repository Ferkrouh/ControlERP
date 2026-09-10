'use client';

import React, { useEffect, useState } from 'react';
import {
  Factory,
  Layers,
  Plus,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Boxes,
  Hammer,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';

export default function ManufacturaPage() {
  const [boms, setBoms] = useState<any[]>([]);
  const [ordenes, setOrdenes] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [almacenes, setAlmacenes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ORDENES' | 'BOM'>('ORDENES');

  // Modales
  const [showBomModal, setShowBomModal] = useState(false);
  const [showOrdenModal, setShowOrdenModal] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Formulario BOM
  const [bomCodigo, setBomCodigo] = useState('');
  const [bomNombre, setBomNombre] = useState('');
  const [bomProductoId, setBomProductoId] = useState('');
  const [bomCantidadBase, setBomCantidadBase] = useState('1');
  const [bomInsumos, setBomInsumos] = useState<{ productoId: string; cantidadRequerida: string; mermaEsperadaPct: string }[]>([
    { productoId: '', cantidadRequerida: '1', mermaEsperadaPct: '0' },
  ]);

  // Formulario Orden
  const [ordenBomId, setOrdenBomId] = useState('');
  const [ordenAlmacenOrigen, setOrdenAlmacenOrigen] = useState('');
  const [ordenAlmacenDestino, setOrdenAlmacenDestino] = useState('');
  const [ordenCantidadPlan, setOrdenCantidadPlan] = useState('10');
  const [ordenCostoManoObra, setOrdenCostoManoObra] = useState('0');
  const [ordenObservaciones, setOrdenObservaciones] = useState('');

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [resBoms, resOrdenes, resProd, resAlm] = await Promise.all([
        fetch('/api/mrp/bom').then((r) => r.json()),
        fetch('/api/mrp/ordenes').then((r) => r.json()),
        fetch('/api/productos').then((r) => r.json()),
        fetch('/api/almacenes').then((r) => r.json()),
      ]);

      setBoms(Array.isArray(resBoms) ? resBoms : []);
      setOrdenes(Array.isArray(resOrdenes) ? resOrdenes : []);
      setProductos(Array.isArray(resProd) ? resProd : []);
      setAlmacenes(Array.isArray(resAlm) ? resAlm : []);

      if (Array.isArray(resAlm) && resAlm.length > 0) {
        setOrdenAlmacenOrigen(resAlm[0].id);
        setOrdenAlmacenDestino(resAlm[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const handleCrearBom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bomCodigo || !bomNombre || !bomProductoId) {
      alert('Por favor complete todos los campos obligatorios del ensamble.');
      return;
    }

    const insumosFiltrados = bomInsumos.filter((i) => i.productoId && Number(i.cantidadRequerida) > 0);
    if (insumosFiltrados.length === 0) {
      alert('Debe agregar al menos una materia prima o insumo.');
      return;
    }

    try {
      const res = await fetch('/api/mrp/bom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo: bomCodigo,
          nombre: bomNombre,
          productoId: bomProductoId,
          cantidadBase: Number(bomCantidadBase),
          insumos: insumosFiltrados,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Error al guardar lista de materiales');
        return;
      }

      setShowBomModal(false);
      setBomCodigo('');
      setBomNombre('');
      setBomProductoId('');
      setBomInsumos([{ productoId: '', cantidadRequerida: '1', mermaEsperadaPct: '0' }]);
      cargarDatos();
    } catch (err) {
      alert('Error de conexión');
    }
  };

  const handleCrearOrden = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ordenBomId || !ordenAlmacenOrigen || !ordenAlmacenDestino) {
      alert('Seleccione receta BOM y almacenes');
      return;
    }

    try {
      const res = await fetch('/api/mrp/ordenes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listaMaterialesId: ordenBomId,
          almacenOrigenId: ordenAlmacenOrigen,
          almacenDestinoId: ordenAlmacenDestino,
          cantidadPlan: Number(ordenCantidadPlan),
          costoManoObra: Number(ordenCostoManoObra),
          observaciones: ordenObservaciones,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Error al crear orden');
        return;
      }

      setShowOrdenModal(false);
      setOrdenObservaciones('');
      cargarDatos();
    } catch (err) {
      alert('Error de conexión');
    }
  };

  const handleProcesarOrden = async (id: string, accion: 'INICIAR' | 'FINALIZAR' | 'CANCELAR') => {
    let cantidadReal = undefined;
    if (accion === 'FINALIZAR') {
      const orden = ordenes.find((o) => o.id === id);
      const input = prompt('Ingrese la cantidad final de producto terminado producida y aprobada:', String(orden?.cantidadPlan || '1'));
      if (input === null) return;
      cantidadReal = Number(input);
      if (isNaN(cantidadReal) || cantidadReal <= 0) {
        alert('Cantidad inválida');
        return;
      }
    }

    if (accion === 'CANCELAR') {
      if (!confirm('¿Seguro que deseas cancelar esta orden de producción?')) return;
    }

    try {
      setProcessingId(id);
      const res = await fetch(`/api/mrp/ordenes/${id}/procesar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion, cantidadReal }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'No se pudo procesar la orden');
        return;
      }

      cargarDatos();
    } catch (err) {
      alert('Error al comunicar con el servidor');
    } finally {
      setProcessingId(null);
    }
  };

  const totalPlanificadas = ordenes.filter((o) => o.estado === 'PLANIFICADA').length;
  const totalEnProceso = ordenes.filter((o) => o.estado === 'EN_PROCESO').length;
  const totalFinalizadas = ordenes.filter((o) => o.estado === 'FINALIZADA').length;

  return (
    <div className="space-y-6">
      {/* Header Fintech Ledger */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Factory className="w-7 h-7 text-indigo-600" />
            Manufactura y MRP (Producción)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Listas de Materiales (BOM), transformación de materias primas y costeo en tiempo real.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowBomModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all shadow-sm"
          >
            <Layers className="w-4 h-4 text-slate-500" />
            Nueva Receta (BOM)
          </button>
          <button
            onClick={() => setShowOrdenModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-md shadow-indigo-600/20"
          >
            <Plus className="w-4 h-4" />
            Nueva Orden de Producción
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Recetas Registradas</span>
            <Layers className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-mono font-bold text-slate-900 mt-2">{boms.length}</p>
          <span className="text-[11px] text-slate-400">Listas de Materiales (BOM)</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-amber-200/60 bg-amber-50/20 shadow-sm">
          <div className="flex items-center justify-between text-amber-700 text-xs font-semibold uppercase tracking-wider">
            <span>En Proceso de Línea</span>
            <Hammer className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-mono font-bold text-amber-900 mt-2">{totalEnProceso}</p>
          <span className="text-[11px] text-amber-600">Órdenes activas en planta</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-blue-200/60 bg-blue-50/20 shadow-sm">
          <div className="flex items-center justify-between text-blue-700 text-xs font-semibold uppercase tracking-wider">
            <span>Planificadas</span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-mono font-bold text-blue-900 mt-2">{totalPlanificadas}</p>
          <span className="text-[11px] text-blue-600">Pendientes de inicio</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-emerald-200/60 bg-emerald-50/20 shadow-sm">
          <div className="flex items-center justify-between text-emerald-700 text-xs font-semibold uppercase tracking-wider">
            <span>Finalizadas</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-mono font-bold text-emerald-900 mt-2">{totalFinalizadas}</p>
          <span className="text-[11px] text-emerald-600">Stock PT ingresado al Kárdex</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('ORDENES')}
          className={`px-5 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'ORDENES'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Factory className="w-4 h-4" />
          Órdenes de Producción ({ordenes.length})
        </button>
        <button
          onClick={() => setActiveTab('BOM')}
          className={`px-5 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'BOM'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Layers className="w-4 h-4" />
          Estructuras de Producto / BOM ({boms.length})
        </button>
      </div>

      {/* Content: Ordenes de Producción */}
      {activeTab === 'ORDENES' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Folio OP</th>
                  <th className="py-3 px-4">Producto a Fabricar</th>
                  <th className="py-3 px-4">Almacenes (Origen / Destino)</th>
                  <th className="py-3 px-4 text-right">Cant. Plan</th>
                  <th className="py-3 px-4 text-right">Cant. Real</th>
                  <th className="py-3 px-4 text-right">Costo Total</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ordenes.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      No hay órdenes de producción registradas. Comienza creando una nueva orden.
                    </td>
                  </tr>
                ) : (
                  ordenes.map((op) => (
                    <tr key={op.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{op.folio}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{op.producto.nombre}</div>
                        <div className="font-mono text-[10px] text-slate-400">SKU: {op.producto.sku}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <span className="text-slate-500">{op.almacenOrigen?.nombre}</span>
                          <ArrowRight className="w-3 h-3 text-slate-400" />
                          <span className="font-medium text-slate-800">{op.almacenDestino?.nombre}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                        {op.cantidadPlan} {op.producto.unidadMedida}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-600">
                        {op.cantidadReal !== null ? `${op.cantidadReal} ${op.producto.unidadMedida}` : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                        ${op.costoTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            op.estado === 'FINALIZADA'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : op.estado === 'EN_PROCESO'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : op.estado === 'CANCELADA'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                        >
                          {op.estado}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1">
                        {op.estado === 'PLANIFICADA' && (
                          <button
                            disabled={processingId === op.id}
                            onClick={() => handleProcesarOrden(op.id, 'INICIAR')}
                            className="px-2.5 py-1 text-[11px] font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all inline-flex items-center gap-1"
                          >
                            <Play className="w-3 h-3" />
                            Iniciar
                          </button>
                        )}

                        {op.estado === 'EN_PROCESO' && (
                          <button
                            disabled={processingId === op.id}
                            onClick={() => handleProcesarOrden(op.id, 'FINALIZAR')}
                            className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all inline-flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            Finalizar y Entregar PT
                          </button>
                        )}

                        {op.estado !== 'FINALIZADA' && op.estado !== 'CANCELADA' && (
                          <button
                            disabled={processingId === op.id}
                            onClick={() => handleProcesarOrden(op.id, 'CANCELAR')}
                            className="px-2 py-1 text-[11px] font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                          >
                            Cancelar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Content: Listas de Materiales (BOM) */}
      {activeTab === 'BOM' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {boms.length === 0 ? (
            <div className="col-span-2 bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400">
              No se han creado listas de materiales aún. Haz clic en 'Nueva Receta (BOM)' para registrar tu primera fórmula de ensamble.
            </div>
          ) : (
            boms.map((bom) => (
              <div key={bom.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                  <div>
                    <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                      {bom.codigo}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-1">{bom.nombre}</h3>
                    <p className="text-xs text-slate-500">
                      Produce: <strong className="text-slate-800">{bom.producto?.nombre}</strong> ({bom.cantidadBase} {bom.producto?.unidadMedida})
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block uppercase">Costo Insumos Estimado</span>
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      ${bom.costoEstimado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div>
                  <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Insumos Requeridos ({bom.insumos?.length || 0})
                  </h4>
                  <div className="space-y-1.5">
                    {bom.insumos?.map((insumo: any) => (
                      <div key={insumo.id} className="flex items-center justify-between text-xs py-1 px-2.5 rounded-lg bg-slate-50 border border-slate-100">
                        <div className="flex items-center gap-2">
                          <Boxes className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-medium text-slate-700">{insumo.producto?.nombre}</span>
                        </div>
                        <div className="font-mono text-slate-600">
                          {insumo.cantidadRequerida} {insumo.producto?.unidadMedida}
                          {insumo.mermaEsperadaPct > 0 && (
                            <span className="text-amber-600 text-[10px] ml-1">
                              (+{insumo.mermaEsperadaPct}% merma)
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal: Crear BOM */}
      {showBomModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-600" />
                Nueva Lista de Materiales (BOM)
              </h3>
              <button onClick={() => setShowBomModal(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCrearBom} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Código Receta *</label>
                  <input
                    type="text"
                    required
                    placeholder="BOM-MUEBLE-01"
                    value={bomCodigo}
                    onChange={(e) => setBomCodigo(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-mono uppercase focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nombre Descriptivo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ensamble Estándar Mesa Roble"
                    value={bomNombre}
                    onChange={(e) => setBomNombre(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Producto Terminado a Producir *</label>
                  <select
                    required
                    value={bomProductoId}
                    onChange={(e) => setBomProductoId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="">Seleccione Producto Terminado...</option>
                    {productos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.sku} — {p.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Cantidad Base *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={bomCantidadBase}
                    onChange={(e) => setBomCantidadBase(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              {/* Insumos dinámicos */}
              <div className="border-t border-slate-200 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    Insumos y Materias Primas Requeridas
                  </label>
                  <button
                    type="button"
                    onClick={() => setBomInsumos([...bomInsumos, { productoId: '', cantidadRequerida: '1', mermaEsperadaPct: '0' }])}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Agregar Insumo
                  </button>
                </div>

                <div className="space-y-2">
                  {bomInsumos.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                      <div className="flex-1">
                        <select
                          required
                          value={item.productoId}
                          onChange={(e) => {
                            const copy = [...bomInsumos];
                            copy[idx].productoId = e.target.value;
                            setBomInsumos(copy);
                          }}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white outline-none"
                        >
                          <option value="">Seleccione Materia Prima...</option>
                          {productos.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.sku} — {p.nombre} (Costo: ${p.costoPromedio})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="w-24">
                        <input
                          type="number"
                          step="any"
                          min="0.0001"
                          required
                          placeholder="Cant."
                          value={item.cantidadRequerida}
                          onChange={(e) => {
                            const copy = [...bomInsumos];
                            copy[idx].cantidadRequerida = e.target.value;
                            setBomInsumos(copy);
                          }}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg font-mono text-right bg-white outline-none"
                        />
                      </div>
                      <div className="w-24">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          placeholder="% Merma"
                          value={item.mermaEsperadaPct}
                          onChange={(e) => {
                            const copy = [...bomInsumos];
                            copy[idx].mermaEsperadaPct = e.target.value;
                            setBomInsumos(copy);
                          }}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg font-mono text-right bg-white outline-none"
                        />
                      </div>
                      {bomInsumos.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setBomInsumos(bomInsumos.filter((_, i) => i !== idx))}
                          className="p-1 text-rose-500 hover:bg-rose-100 rounded-md"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowBomModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20"
                >
                  Guardar Lista de Materiales
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Crear Orden de Producción */}
      {showOrdenModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <Factory className="w-5 h-5 text-indigo-600" />
                Nueva Orden de Producción
              </h3>
              <button onClick={() => setShowOrdenModal(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCrearOrden} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Receta (BOM) a Ejecutar *</label>
                <select
                  required
                  value={ordenBomId}
                  onChange={(e) => setOrdenBomId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="">Seleccione Lista de Materiales...</option>
                  {boms.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.codigo} — {b.nombre} (Para: {b.producto?.nombre})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Almacén Consumo (Insumos) *</label>
                  <select
                    required
                    value={ordenAlmacenOrigen}
                    onChange={(e) => setOrdenAlmacenOrigen(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    {almacenes.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Almacén Entrada (Producto Terminado) *</label>
                  <select
                    required
                    value={ordenAlmacenDestino}
                    onChange={(e) => setOrdenAlmacenDestino(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    {almacenes.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Cantidad a Fabricar *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={ordenCantidadPlan}
                    onChange={(e) => setOrdenCantidadPlan(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Costo Mano de Obra Estimado ($)</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={ordenCostoManoObra}
                    onChange={(e) => setOrdenCostoManoObra(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Observaciones / Instrucciones de Ensamble</label>
                <textarea
                  rows={2}
                  placeholder="ej. Asegurar secado de pintura antes del empaque..."
                  value={ordenObservaciones}
                  onChange={(e) => setOrdenObservaciones(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowOrdenModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20"
                >
                  Crear Orden Planificada
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
