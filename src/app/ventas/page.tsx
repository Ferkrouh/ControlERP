'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { 
  ShoppingCart, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  Building2, 
  Users, 
  CreditCard, 
  DollarSign, 
  Receipt,
  Eye,
  FileCheck,
  FileText
} from 'lucide-react';

interface CartItem {
  productoId: string;
  sku: string;
  nombre: string;
  unidadMedida: string;
  stockDisponible: number;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export default function VentasPage() {
  const { user } = useAuth();
  const [ventas, setVentas] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [almacenes, setAlmacenes] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Formulario de Nueva Venta
  const [showModal, setShowModal] = useState(false);
  const [clienteId, setClienteId] = useState('');
  const [almacenId, setAlmacenId] = useState('');
  const [tipoPago, setTipoPago] = useState<'CONTADO' | 'CREDITO'>('CONTADO');
  const [observaciones, setObservaciones] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Selector de artículo para agregar al carrito
  const [selectedProdId, setSelectedProdId] = useState('');
  const [addQty, setAddQty] = useState(1);
  const [addPrice, setAddPrice] = useState(0);

  const [saving, setSaving] = useState(false);
  const [timbrandoId, setTimbrandoId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleTimbrarVenta = async (ventaId: string, folio: string) => {
    try {
      setTimbrandoId(ventaId);
      setErrorMsg('');
      const res = await fetch(`/api/ventas/${ventaId}/timbrar`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        alert(`¡Comprobante CFDI 4.0 timbrado exitosamente!\nFolio: ${folio}\nUUID SAT: ${data.uuid}`);
        await loadData();
      } else {
        alert(`Error al timbrar: ${data.error}`);
      }
    } catch (err) {
      alert('Error de comunicación con el servicio de timbrado.');
    } finally {
      setTimbrandoId(null);
    }
  };

  useEffect(() => {
    if (user?.tenantId) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [resVentas, resClientes, resAlm, resProd] = await Promise.all([
        fetch(`/api/ventas`),
        fetch(`/api/clientes`),
        fetch(`/api/almacenes`),
        fetch(`/api/productos`),
      ]);

      if (resVentas.ok && resClientes.ok && resAlm.ok && resProd.ok) {
        const vData = await resVentas.json();
        const cData = await resClientes.json();
        const aData = await resAlm.json();
        const pData = await resProd.json();

        setVentas(vData);
        setClientes(cData);
        setAlmacenes(aData);
        setProductos(pData);

        if (cData.length > 0 && !clienteId) setClienteId(cData[0].id);
        if (aData.length > 0 && !almacenId) setAlmacenId(aData[0].id);
        if (pData.length > 0 && !selectedProdId) {
          setSelectedProdId(pData[0].id);
          setAddPrice(pData[0].precioVenta || 0);
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
      setAddPrice(prod.precioVenta || 0);
    }
  };

  const handleAddToCart = () => {
    setErrorMsg('');
    const prod = productos.find((p) => p.id === selectedProdId);
    if (!prod) return;

    const existenciaAlm = prod.existencias?.find((e: any) => e.almacenId === almacenId);
    const stockDisponible = existenciaAlm ? existenciaAlm.cantidad : 0;

    if (addQty <= 0) {
      setErrorMsg('La cantidad debe ser mayor a cero.');
      return;
    }

    // Verificar si ya está en el carrito
    const existingIndex = cart.findIndex((it) => it.productoId === selectedProdId);
    const cantidadTotal = existingIndex >= 0 ? cart[existingIndex].cantidad + addQty : addQty;

    if (cantidadTotal > stockDisponible) {
      setErrorMsg(`Stock insuficiente en este almacén. Solo hay ${stockDisponible} ${prod.unidadMedida} disponibles.`);
      return;
    }

    if (existingIndex >= 0) {
      const updatedCart = [...cart];
      updatedCart[existingIndex].cantidad = cantidadTotal;
      updatedCart[existingIndex].precioUnitario = addPrice;
      updatedCart[existingIndex].subtotal = cantidadTotal * addPrice;
      setCart(updatedCart);
    } else {
      setCart([
        ...cart,
        {
          productoId: prod.id,
          sku: prod.sku,
          nombre: prod.nombre,
          unidadMedida: prod.unidadMedida,
          stockDisponible,
          cantidad: addQty,
          precioUnitario: addPrice,
          subtotal: addQty * addPrice,
        },
      ]);
    }

    setAddQty(1);
  };

  const handleRemoveFromCart = (index: number) => {
    const updated = cart.filter((_, i) => i !== index);
    setCart(updated);
  };

  const subtotalCart = cart.reduce((acc, it) => acc + it.subtotal, 0);
  const ivaCart = Math.round(subtotalCart * 0.16 * 100) / 100;
  const totalCart = subtotalCart + ivaCart;

  const handleCreateVenta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      setErrorMsg('Debe agregar al menos un artículo a la venta.');
      return;
    }

    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/ventas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteId,
          almacenId,
          tipoPago,
          observaciones,
          items: cart.map((it) => ({
            productoId: it.productoId,
            cantidad: it.cantidad,
            precioUnitario: it.precioUnitario,
          })),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(`¡Venta ${data.folio} procesada con éxito!`);
        setCart([]);
        setObservaciones('');
        setTimeout(() => {
          setShowModal(false);
          setSuccessMsg('');
          loadData();
        }, 1200);
      } else {
        setErrorMsg(data.error || 'Error al emitir venta.');
      }
    } catch (err) {
      setErrorMsg('Error de conexión.');
    } finally {
      setSaving(false);
    }
  };

  const isReadOnly = user?.rol === 'AUDITOR';
  const isAlmacenista = user?.rol === 'ALMACENISTA';

  const selectedClienteObj = clientes.find((c) => c.id === clienteId);

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-blue-600" />
            Ventas & Facturación Comercial
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Emisión de ventas de mostrador y pedidos a crédito con afectación automática de inventario y CxC.
          </p>
        </div>

        {!isReadOnly && !isAlmacenista && (
          <button
            onClick={() => {
              setCart([]);
              setErrorMsg('');
              setSuccessMsg('');
              setShowModal(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-4 py-2.5 rounded-xl shadow-sm transition-all flex items-center gap-2 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" /> Nueva Venta
          </button>
        )}
      </div>

      {isReadOnly && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 font-medium">
          <Eye className="w-4 h-4 text-amber-600" />
          Modo Auditoría: Consulta histórica de folios comerciales en modo solo lectura.
        </div>
      )}

      {/* Historial de Ventas */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-sm">Historial Reciente de Operaciones Comerciales</h3>
          <span className="text-xs text-slate-500 font-medium">{ventas.length} ventas registradas</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400">Cargando ventas...</div>
        ) : ventas.length === 0 ? (
          <div className="p-8 text-center text-slate-400">No hay ventas registradas en este periodo.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[11px] font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Folio Venta</th>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">Almacén Despacho</th>
                  <th className="py-3 px-4 text-center">Tipo Pago</th>
                  <th className="py-3 px-4 text-right">Subtotal</th>
                  <th className="py-3 px-4 text-right">IVA (16%)</th>
                  <th className="py-3 px-4 text-right">Total</th>
                  <th className="py-3 px-4">Fecha</th>
                  <th className="py-3 px-4 text-center">CFDI 4.0</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ventas.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-blue-700">
                      {v.folio}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-900">{v.cliente?.razonSocial}</p>
                      <p className="text-xs text-slate-400 font-mono">{v.cliente?.codigo} • RFC: {v.cliente?.rfc || 'XAXX010101000'}</p>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600">
                      {v.almacen?.nombre}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {v.tipoPago === 'CREDITO' ? (
                        <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                          CRÉDITO (CxC)
                        </span>
                      ) : (
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                          CONTADO
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right text-xs text-slate-700 font-medium">
                      ${v.subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right text-xs text-slate-500">
                      ${v.impuestos.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      ${v.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500">
                      {new Date(v.fecha).toLocaleDateString('es-MX')}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {v.estadoFiscal === 'TIMBRADA' ? (
                        <div className="flex flex-col items-center">
                          <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                            <FileCheck className="w-3 h-3" /> TIMBRADA
                          </span>
                          <span className="text-[9px] font-mono text-slate-400 mt-0.5" title={v.uuidFiscal}>
                            {v.uuidFiscal ? `${v.uuidFiscal.substring(0, 8)}...` : ''}
                          </span>
                        </div>
                      ) : !isReadOnly && !isAlmacenista ? (
                        <button
                          onClick={() => handleTimbrarVenta(v.id, v.folio)}
                          disabled={timbrandoId === v.id}
                          className="inline-flex items-center gap-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50"
                          title="Generar y timbrar comprobante fiscal digital CFDI 4.0"
                        >
                          <FileText className="w-3 h-3 text-amber-600" />
                          {timbrandoId === v.id ? 'Timbrando...' : 'Timbrar CFDI'}
                        </button>
                      ) : (
                        <span className="text-slate-400 text-xs italic">Sin timbrar</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Nueva Venta */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-blue-600" /> Emisión de Nueva Venta
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateVenta} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Cliente *</label>
                  <select
                    value={clienteId}
                    onChange={(e) => setClienteId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                    required
                  >
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.razonSocial}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Almacén de Salida *</label>
                  <select
                    value={almacenId}
                    onChange={(e) => {
                      setAlmacenId(e.target.value);
                      setCart([]); // Limpiar carrito al cambiar de almacén para recalcular existencias
                    }}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                    required
                  >
                    {almacenes.map((a) => (
                      <option key={a.id} value={a.id}>{a.nombre}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Condición de Pago *</label>
                  <select
                    value={tipoPago}
                    onChange={(e) => setTipoPago(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white font-semibold"
                  >
                    <option value="CONTADO">Contado (Liquidado)</option>
                    <option value="CREDITO">Crédito (Afecta CxC)</option>
                  </select>
                </div>
              </div>

              {/* Información de Crédito del Cliente Seleccionado */}
              {tipoPago === 'CREDITO' && selectedClienteObj && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex flex-col sm:flex-row justify-between gap-2">
                  <div>
                    <span className="text-slate-500">Límite de Crédito: </span>
                    <strong className="text-slate-900">${selectedClienteObj.limiteCredito.toLocaleString('es-MX')}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Saldo Ocupado: </span>
                    <strong className="text-slate-900">${selectedClienteObj.saldoActual.toLocaleString('es-MX')}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Disponible: </span>
                    <strong className={selectedClienteObj.limiteCredito - selectedClienteObj.saldoActual > 0 ? 'text-emerald-600' : 'text-rose-600'}>
                      ${Math.max(0, selectedClienteObj.limiteCredito - selectedClienteObj.saldoActual).toLocaleString('es-MX')}
                    </strong>
                  </div>
                </div>
              )}

              {/* Agregar Artículos */}
              <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl space-y-2">
                <p className="text-xs font-bold text-slate-800">Agregar Artículos al Carrito</p>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <div className="sm:col-span-2">
                    <select
                      value={selectedProdId}
                      onChange={(e) => handleProductSelectChange(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                    >
                      {productos.map((p) => {
                        const ex = p.existencias?.find((e: any) => e.almacenId === almacenId);
                        const stock = ex ? ex.cantidad : 0;
                        return (
                          <option key={p.id} value={p.id}>
                            {p.sku} - {p.nombre} (Stock: {stock})
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div>
                    <input
                      type="number"
                      min="1"
                      placeholder="Cantidad"
                      value={addQty}
                      onChange={(e) => setAddQty(Number(e.target.value))}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-bold"
                    />
                  </div>
                  <div className="flex gap-1">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Precio"
                      value={addPrice}
                      onChange={(e) => setAddPrice(Number(e.target.value))}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-bold"
                    />
                    <button
                      type="button"
                      onClick={handleAddToCart}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg shrink-0"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Tabla del Carrito */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-semibold border-b">
                    <tr>
                      <th className="py-2 px-3">Artículo</th>
                      <th className="py-2 px-3 text-center">Cant.</th>
                      <th className="py-2 px-3 text-right">P. Unitario</th>
                      <th className="py-2 px-3 text-right">Subtotal</th>
                      <th className="py-2 px-3 text-center">Quitar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cart.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-slate-400">
                          El carrito de venta está vacío.
                        </td>
                      </tr>
                    ) : (
                      cart.map((it, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2 px-3">
                            <p className="font-semibold text-slate-900">{it.nombre}</p>
                            <p className="text-[10px] font-mono text-slate-400">{it.sku}</p>
                          </td>
                          <td className="py-2 px-3 text-center font-bold">{it.cantidad} {it.unidadMedida}</td>
                          <td className="py-2 px-3 text-right">${it.precioUnitario.toFixed(2)}</td>
                          <td className="py-2 px-3 text-right font-bold text-slate-900">${it.subtotal.toFixed(2)}</td>
                          <td className="py-2 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveFromCart(idx)}
                              className="text-rose-500 hover:text-rose-700 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Totales */}
              <div className="flex justify-end">
                <div className="w-64 space-y-1 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-semibold">${subtotalCart.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>IVA (16%):</span>
                    <span className="font-semibold">${ivaCart.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-slate-900 pt-1 border-t border-slate-200">
                    <span>Total a Liquidar:</span>
                    <span className="text-blue-600">${totalCart.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
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
                  disabled={saving || cart.length === 0}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2 rounded-lg shadow-sm disabled:opacity-50"
                >
                  {saving ? 'Emitiendo venta...' : 'Confirmar Venta & Afectar Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
