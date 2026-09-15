'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { 
  FileText, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  Building2, 
  Truck,
  Boxes,
  Calendar,
  Layers,
  ArrowRight,
  Clock,
  Printer,
  Search,
  PackageCheck
} from 'lucide-react';

interface CartItem {
  productoId: string;
  sku: string;
  nombre: string;
  unidadMedida: string;
  cantidad: number;
  costoUnitario: number;
  subtotal: number;
}

interface ItemRecibir {
  productoId: string;
  nombre: string;
  sku: string;
  cantidadSolicitada: number;
  cantidadRecibidaPrevia: number;
  cantidadPendiente: number;
  cantidadARecibir: number;
  numeroLote: string;
  fechaCaducidad: string;
}

export default function OrdenesCompraPage() {
  const { user } = useAuth();
  const [ordenes, setOrdenes] = useState<any[]>([]);
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [almacenes, setAlmacenes] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal Nueva OC
  const [showModal, setShowModal] = useState(false);
  const [proveedorId, setProveedorId] = useState('');
  const [almacenDestinoId, setAlmacenDestinoId] = useState('');
  const [fechaEsperada, setFechaEsperada] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);

  // Selector de articulo para OC
  const [selectedProdId, setSelectedProdId] = useState('');
  const [addQty, setAddQty] = useState(10);
  const [addCost, setAddCost] = useState(0);

  // Modal 3-Way Matching Recepcion
  const [showRecibirModal, setShowRecibirModal] = useState(false);
  const [selectedOC, setSelectedOC] = useState<any | null>(null);
  const [folioFacturaProveedor, setFolioFacturaProveedor] = useState('');
  const [tipoPago, setTipoPago] = useState<'CREDITO' | 'CONTADO'>('CREDITO');
  const [itemsRecibir, setItemsRecibir] = useState<ItemRecibir[]>([]);

  // Modal Ver/Imprimir OC
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printOC, setPrintOC] = useState<any | null>(null);

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user?.tenantId || user?.rol === 'SUPERADMIN') {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [resOC, resProv, resAlm, resProd] = await Promise.all([
        fetch('/api/ordenes-compra'),
        fetch('/api/proveedores'),
        fetch('/api/almacenes'),
        fetch('/api/productos'),
      ]);

      if (resOC.ok) setOrdenes(await resOC.json());
      if (resProv.ok) {
        const pData = await resProv.json();
        setProveedores(pData);
        if (pData.length > 0 && !proveedorId) setProveedorId(pData[0].id);
      }
      if (resAlm.ok) {
        const aData = await resAlm.json();
        setAlmacenes(aData);
        if (aData.length > 0 && !almacenDestinoId) setAlmacenDestinoId(aData[0].id);
      }
      if (resProd.ok) {
        const prData = await resProd.json();
        setProductos(prData);
        if (prData.length > 0 && !selectedProdId) {
          setSelectedProdId(prData[0].id);
          setAddCost(prData[0].costoPromedio || 0);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleProductSelectChange = (prodId: string) => {
    setSelectedProdId(prodId);
    const prod = productos.find((p) => p.id === prodId);
    if (prod) {
      setAddCost(prod.costoPromedio || 0);
    }
  };

  const handleAddToCart = () => {
    if (!selectedProdId || addQty <= 0) return;
    const prod = productos.find((p) => p.id === selectedProdId);
    if (!prod) return;

    const existingIndex = cart.findIndex((i) => i.productoId === selectedProdId);
    if (existingIndex >= 0) {
      const updated = [...cart];
      updated[existingIndex].cantidad += addQty;
      updated[existingIndex].costoUnitario = addCost;
      updated[existingIndex].subtotal = updated[existingIndex].cantidad * addCost;
      setCart(updated);
    } else {
      setCart([
        ...cart,
        {
          productoId: prod.id,
          sku: prod.sku,
          nombre: prod.nombre,
          unidadMedida: prod.unidadMedida,
          cantidad: addQty,
          costoUnitario: addCost,
          subtotal: addQty * addCost,
        },
      ]);
    }
  };

  const handleRemoveFromCart = (index: number) => {
    const updated = [...cart];
    updated.splice(index, 1);
    setCart(updated);
  };

  const totalCart = cart.reduce((acc, item) => acc + item.subtotal, 0);

  const handleSaveOC = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!proveedorId || !almacenDestinoId || cart.length === 0) {
      setErrorMsg('Debe seleccionar proveedor, almacén de entrega y al menos un producto.');
      return;
    }

    try {
      setSaving(true);
      const res = await fetch('/api/ordenes-compra', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proveedorId,
          almacenDestinoId,
          fechaEsperada: fechaEsperada || null,
          observaciones,
          items: cart.map((i) => ({
            productoId: i.productoId,
            cantidad: i.cantidad,
            costoUnitario: i.costoUnitario,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al emitir orden de compra');
      }

      setSuccessMsg(`¡Orden de Compra ${data.folio} autorizada y registrada con éxito!`);
      setShowModal(false);
      setCart([]);
      setObservaciones('');
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenRecibir = (oc: any) => {
    setSelectedOC(oc);
    setFolioFacturaProveedor('');
    setTipoPago('CREDITO');
    setErrorMsg('');
    setSuccessMsg('');

    const itemsPrep: ItemRecibir[] = oc.items.map((it: any) => {
      const pendiente = Math.max(0, it.cantidadSolicitada - it.cantidadRecibida);
      return {
        productoId: it.productoId,
        nombre: it.producto.nombre,
        sku: it.producto.sku,
        cantidadSolicitada: it.cantidadSolicitada,
        cantidadRecibidaPrevia: it.cantidadRecibida,
        cantidadPendiente: pendiente,
        cantidadARecibir: pendiente,
        numeroLote: '',
        fechaCaducidad: '',
      };
    });

    setItemsRecibir(itemsPrep);
    setShowRecibirModal(true);
  };

  const handleUpdateItemRecibir = (index: number, field: keyof ItemRecibir, value: any) => {
    const updated = [...itemsRecibir];
    updated[index] = { ...updated[index], [field]: value };
    setItemsRecibir(updated);
  };

  const handleSubmitRecibir = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOC) return;
    setErrorMsg('');
    setSuccessMsg('');

    const validItems = itemsRecibir.filter((it) => Number(it.cantidadARecibir) > 0);
    if (validItems.length === 0) {
      setErrorMsg('Debe ingresar al menos una cantidad a recibir mayor a cero.');
      return;
    }

    try {
      setSaving(true);
      const res = await fetch(`/api/ordenes-compra/${selectedOC.id}/recibir`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folioFacturaProveedor,
          tipoPago,
          itemsRecibidos: validItems.map((it) => ({
            productoId: it.productoId,
            cantidad: Number(it.cantidadARecibir),
            numeroLote: it.numeroLote || undefined,
            fechaCaducidad: it.fechaCaducidad || undefined,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al procesar recepción de mercancía');
      }

      setSuccessMsg(`¡3-Way Matching Exitoso! Recepción procesada con folio ${data.folioCompra}. Inventario actualizado.`);
      setShowRecibirModal(false);
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  const filteredOrdenes = ordenes.filter((o) => {
    const term = searchTerm.toLowerCase();
    return (
      o.folio.toLowerCase().includes(term) ||
      o.proveedor?.razonSocial?.toLowerCase().includes(term) ||
      o.almacenDestino?.nombre?.toLowerCase().includes(term) ||
      o.estado.toLowerCase().includes(term)
    );
  });

  const getStatusBadge = (estado: string) => {
    switch (estado) {
      case 'RECIBIDA_TOTAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800/80">
            <CheckCircle2 className="w-3 h-3" /> Surtida Completa
          </span>
        );
      case 'RECIBIDA_PARCIAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-950/60 text-amber-400 border border-amber-800/80">
            <Clock className="w-3 h-3" /> Entrega Parcial
          </span>
        );
      case 'AUTORIZADA':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-950/60 text-blue-400 border border-blue-800/80">
            <PackageCheck className="w-3 h-3" /> Autorizada (Por Recibir)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300">
            {estado}
          </span>
        );
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800/80 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-3">
              <Truck className="w-7 h-7 text-blue-400" />
              Órdenes de Compra & Cadena de Suministro
            </h1>
            <span className="bg-blue-950 text-blue-400 text-xs px-2.5 py-0.5 rounded-full font-bold border border-blue-800">
              3-Way Matching
            </span>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            Gestión de abastecimiento, autorización de compras a proveedores, control de lotes y trazabilidad física vs contable.
          </p>
        </div>

        {user?.rol !== 'AUDITOR' && user?.rol !== 'ALMACENISTA' && (
          <button
            onClick={() => {
              setErrorMsg('');
              setSuccessMsg('');
              setShowModal(true);
            }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Orden de Compra</span>
          </button>
        )}
      </div>

      {/* ALERTAS */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 flex items-center gap-3 text-sm">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800 text-emerald-300 flex items-center gap-3 text-sm">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* FILTROS Y BUSQUEDA */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-900/40 p-4 rounded-xl border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Buscar por folio, proveedor o almacén..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
          />
        </div>
        <div className="text-xs text-slate-400 flex items-center gap-4">
          <span>Total órdenes: <strong className="text-white font-mono">{filteredOrdenes.length}</strong></span>
        </div>
      </div>

      {/* TABLA PRINCIPAL DE ORDENES */}
      <div className="bg-slate-900/60 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Folio OC</th>
                <th className="py-3.5 px-4">Fecha Emisión</th>
                <th className="py-3.5 px-4">Proveedor</th>
                <th className="py-3.5 px-4">Almacén Destino</th>
                <th className="py-3.5 px-4">Estado</th>
                <th className="py-3.5 px-4 text-right">Monto Total</th>
                <th className="py-3.5 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Cargando órdenes de compra...
                  </td>
                </tr>
              ) : filteredOrdenes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500">
                    No se encontraron órdenes de compra registradas.
                  </td>
                </tr>
              ) : (
                filteredOrdenes.map((oc) => (
                  <tr key={oc.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-white">
                      {oc.folio}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 text-xs">
                      {new Date(oc.fecha).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-200">
                      {oc.proveedor?.razonSocial}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {oc.almacenDestino?.nombre}
                    </td>
                    <td className="py-3.5 px-4">
                      {getStatusBadge(oc.estado)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400">
                      ${Number(oc.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            setPrintOC(oc);
                            setShowPrintModal(true);
                          }}
                          title="Imprimir Orden de Compra"
                          className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
                        >
                          <Printer className="w-4 h-4" />
                        </button>

                        {oc.estado !== 'RECIBIDA_TOTAL' && user?.rol !== 'AUDITOR' && (
                          <button
                            onClick={() => handleOpenRecibir(oc)}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white text-xs font-semibold transition-all border border-emerald-700/50"
                          >
                            <Truck className="w-3.5 h-3.5" />
                            <span>Recibir (3-Way)</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: NUEVA ORDEN DE COMPRA */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-400" />
                  Nueva Orden de Compra (OC)
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Autorización previa de abastecimiento a proveedores con costeo unitario garantizado.
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white text-xl font-bold p-1 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveOC} className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Proveedor *
                  </label>
                  <select
                    value={proveedorId}
                    onChange={(e) => setProveedorId(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    {proveedores.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.razonSocial} ({p.rfc})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Almacén de Entrega *
                  </label>
                  <select
                    value={almacenDestinoId}
                    onChange={(e) => setAlmacenDestinoId(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    {almacenes.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Fecha Prometida de Entrega
                  </label>
                  <input
                    type="date"
                    value={fechaEsperada}
                    onChange={(e) => setFechaEsperada(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Selector de Partidas */}
              <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800/80 space-y-3">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-blue-400" />
                  Agregar Partidas a la Orden
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <div className="md:col-span-6">
                    <label className="block text-xs text-slate-400 mb-1">Producto</label>
                    <select
                      value={selectedProdId}
                      onChange={(e) => handleProductSelectChange(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
                    >
                      {productos.map((prod) => (
                        <option key={prod.id} value={prod.id}>
                          {prod.sku} — {prod.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs text-slate-400 mb-1">Cantidad</label>
                    <input
                      type="number"
                      min="1"
                      value={addQty}
                      onChange={(e) => setAddQty(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white text-right font-mono"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs text-slate-400 mb-1">Costo Unitario ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={addCost}
                      onChange={(e) => setAddCost(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white text-right font-mono"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <button
                      type="button"
                      onClick={handleAddToCart}
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-1.5 rounded-lg text-sm flex items-center justify-center gap-1 transition-colors"
                    >
                      <Plus className="w-4 h-4" /> Agregar
                    </button>
                  </div>
                </div>
              </div>

              {/* Partidas en el Carrito */}
              <div className="border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-semibold">
                    <tr>
                      <th className="p-3">SKU</th>
                      <th className="p-3">Producto</th>
                      <th className="p-3 text-right">Cantidad</th>
                      <th className="p-3 text-right">Costo Unitario</th>
                      <th className="p-3 text-right">Subtotal</th>
                      <th className="p-3 text-center">Quitar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {cart.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-4 text-center text-slate-500">
                          No has agregado partidas a esta orden de compra.
                        </td>
                      </tr>
                    ) : (
                      cart.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/30">
                          <td className="p-3 font-mono font-semibold text-white">{item.sku}</td>
                          <td className="p-3">{item.nombre}</td>
                          <td className="p-3 text-right font-mono font-bold text-white">{item.cantidad} {item.unidadMedida}</td>
                          <td className="p-3 text-right font-mono">${item.costoUnitario.toFixed(2)}</td>
                          <td className="p-3 text-right font-mono font-bold text-emerald-400">
                            ${item.subtotal.toFixed(2)}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveFromCart(idx)}
                              className="text-rose-400 hover:text-rose-300 p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col md:flex-row gap-4 items-start justify-between">
                <div className="w-full md:w-1/2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Instrucciones / Observaciones
                  </label>
                  <textarea
                    rows={2}
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder="Instrucciones especiales de entrega, condiciones comerciales, etc."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="w-full md:w-1/3 bg-slate-950/80 p-4 rounded-xl border border-slate-800 flex flex-col gap-2">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Partidas:</span>
                    <span className="font-mono text-white">{cart.length}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-white border-t border-slate-800 pt-2">
                    <span>Total Estimado:</span>
                    <span className="font-mono text-emerald-400">
                      ${totalCart.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || cart.length === 0}
                  className="px-5 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 disabled:opacity-50 transition-all"
                >
                  {saving ? 'Autorizando OC...' : 'Autorizar y Generar OC'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RECEPCION 3-WAY MATCHING */}
      {showRecibirModal && selectedOC && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="bg-slate-900 border border-emerald-800/60 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/70">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <PackageCheck className="w-5 h-5 text-emerald-400" />
                    Recepción 3-Way Matching: {selectedOC.folio}
                  </h2>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                    Almacén: {selectedOC.almacenDestino?.nombre}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Valide las cantidades físicas recibidas, asigne número de lote y caducidad para Kárdex y genere la factura de proveedor en CxP.
                </p>
              </div>
              <button
                onClick={() => setShowRecibirModal(false)}
                className="text-slate-400 hover:text-white text-xl font-bold p-1 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitRecibir} className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Folio Factura / Remisión del Proveedor
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. FAC-99482 o REM-1049"
                    value={folioFacturaProveedor}
                    onChange={(e) => setFolioFacturaProveedor(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  <span className="text-xs text-slate-500 mt-1 block">
                    Se vinculará directamente a la Cuenta por Pagar (CxP).
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Términos de Pago *
                  </label>
                  <select
                    value={tipoPago}
                    onChange={(e) => setTipoPago(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="CREDITO">Crédito (Afecta CxP y Días de Gracia)</option>
                    <option value="CONTADO">Contado / Liquidado Inmediato</option>
                  </select>
                </div>
              </div>

              <div className="border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-semibold">
                    <tr>
                      <th className="p-3">SKU & Producto</th>
                      <th className="p-3 text-center">Pedidas</th>
                      <th className="p-3 text-center">Recibidas Previas</th>
                      <th className="p-3 text-center">Pendientes</th>
                      <th className="p-3 text-center text-emerald-400">Recibiendo Ahora *</th>
                      <th className="p-3">No. Lote (Opcional)</th>
                      <th className="p-3">Caducidad</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {itemsRecibir.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/30">
                        <td className="p-3">
                          <span className="font-mono font-bold text-white block">{item.sku}</span>
                          <span className="text-slate-400 text-xs">{item.nombre}</span>
                        </td>
                        <td className="p-3 text-center font-mono font-medium">{item.cantidadSolicitada}</td>
                        <td className="p-3 text-center font-mono text-slate-400">{item.cantidadRecibidaPrevia}</td>
                        <td className="p-3 text-center font-mono font-bold text-amber-400">{item.cantidadPendiente}</td>
                        <td className="p-3 text-center">
                          <input
                            type="number"
                            min="0"
                            max={item.cantidadPendiente}
                            value={item.cantidadARecibir}
                            onChange={(e) => handleUpdateItemRecibir(idx, 'cantidadARecibir', Number(e.target.value))}
                            className="w-24 bg-slate-950 border border-emerald-700/80 rounded-lg px-2 py-1 text-sm text-center font-mono font-bold text-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </td>
                        <td className="p-3">
                          <input
                            type="text"
                            placeholder="Ej. LOT-2026-X"
                            value={item.numeroLote}
                            onChange={(e) => handleUpdateItemRecibir(idx, 'numeroLote', e.target.value)}
                            className="w-32 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs font-mono text-white placeholder-slate-500"
                          />
                        </td>
                        <td className="p-3">
                          <input
                            type="date"
                            value={item.fechaCaducidad}
                            onChange={(e) => handleUpdateItemRecibir(idx, 'fechaCaducidad', e.target.value)}
                            className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowRecibirModal(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 disabled:opacity-50 transition-all flex items-center gap-2"
                >
                  <PackageCheck className="w-4 h-4" />
                  {saving ? 'Procesando 3-Way Matching...' : 'Confirmar Recepción y Afectar Kárdex'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL / VISTA DE IMPRESION */}
      {showPrintModal && printOC && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Documento de Orden de Abastecimiento
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" /> Imprimir
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="text-slate-400 hover:text-white px-2 py-1 text-sm rounded hover:bg-slate-800"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-8 bg-white text-slate-900 overflow-y-auto font-sans">
              <div className="flex justify-between items-start border-b border-slate-200 pb-6 mb-6">
                <div>
                  <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                    ORDEN DE COMPRA
                  </h1>
                  <p className="text-xs text-slate-500 font-mono mt-1">Folio Oficial: {printOC.folio}</p>
                  <p className="text-xs text-slate-500">Fecha de Emisión: {new Date(printOC.fecha).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-3 py-1 rounded bg-slate-100 text-slate-800 font-mono text-xs font-bold uppercase">
                    ESTADO: {printOC.estado}
                  </span>
                  {printOC.fechaEsperada && (
                    <p className="text-xs text-slate-600 mt-2 font-medium">
                      Entrega Solicitada: {new Date(printOC.fechaEsperada).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-6 text-xs">
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="font-bold text-slate-600 uppercase block mb-1">PROVEEDOR:</span>
                  <p className="font-bold text-slate-900 text-sm">{printOC.proveedor?.razonSocial}</p>
                  <p className="font-mono text-slate-600">RFC: {printOC.proveedor?.rfc}</p>
                  <p className="text-slate-600">Tel: {printOC.proveedor?.telefono || 'N/A'}</p>
                </div>

                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="font-bold text-slate-600 uppercase block mb-1">ENTREGAR EN ALMACÉN:</span>
                  <p className="font-bold text-slate-900 text-sm">{printOC.almacenDestino?.nombre}</p>
                  <p className="text-slate-600">Ubicación: {printOC.almacenDestino?.ubicacion || 'Principal'}</p>
                </div>
              </div>

              <table className="w-full text-left text-xs mb-6 border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-300 text-slate-600 uppercase font-bold">
                    <th className="py-2 px-1">SKU</th>
                    <th className="py-2 px-2">Descripción</th>
                    <th className="py-2 px-2 text-right">Cant. Solicitada</th>
                    <th className="py-2 px-2 text-right">Cant. Recibida</th>
                    <th className="py-2 px-2 text-right">Costo Unitario</th>
                    <th className="py-2 px-1 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {printOC.items?.map((it: any, i: number) => (
                    <tr key={i}>
                      <td className="py-2.5 px-1 font-mono font-bold text-slate-800">{it.producto?.sku}</td>
                      <td className="py-2.5 px-2 text-slate-700">{it.producto?.nombre}</td>
                      <td className="py-2.5 px-2 text-right font-mono font-bold">{it.cantidadSolicitada}</td>
                      <td className="py-2.5 px-2 text-right font-mono text-slate-500">{it.cantidadRecibida}</td>
                      <td className="py-2.5 px-2 text-right font-mono">${Number(it.costoUnitario).toFixed(2)}</td>
                      <td className="py-2.5 px-1 text-right font-mono font-bold text-slate-900">
                        ${Number(it.subtotal).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-end border-t border-slate-200 pt-4">
                <div className="text-right w-64 space-y-1 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-mono">${Number(printOC.subtotal).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>IVA (16%):</span>
                    <span className="font-mono">${Number(printOC.iva).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-slate-900 border-t border-slate-300 pt-1">
                    <span>Total de la Orden:</span>
                    <span className="font-mono text-base font-black text-blue-900">
                      ${Number(printOC.total).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {printOC.observaciones && (
                <div className="mt-6 p-3 bg-slate-50 rounded border border-slate-200 text-xs text-slate-600">
                  <strong className="block text-slate-800 mb-0.5">Notas y Condiciones:</strong>
                  {printOC.observaciones}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

