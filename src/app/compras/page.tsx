'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { 
  Truck, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  Building2, 
  Receipt,
  Eye,
  Boxes
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

export default function ComprasPage() {
  const { user } = useAuth();
  const [compras, setCompras] = useState<any[]>([]);
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [almacenes, setAlmacenes] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Formulario de Nueva Compra
  const [showModal, setShowModal] = useState(false);
  const [proveedorId, setProveedorId] = useState('');
  const [almacenId, setAlmacenId] = useState('');
  const [folioFacturaProv, setFolioFacturaProv] = useState('');
  const [tipoPago, setTipoPago] = useState<'CREDITO' | 'CONTADO'>('CREDITO');
  const [observaciones, setObservaciones] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);

  // Selector de artículo
  const [selectedProdId, setSelectedProdId] = useState('');
  const [addQty, setAddQty] = useState(5);
  const [addCost, setAddCost] = useState(0);

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (user?.tenantId) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [resCompras, resProveedores, resAlm, resProd] = await Promise.all([
        fetch(`/api/compras`),
        fetch(`/api/proveedores`),
        fetch(`/api/almacenes`),
        fetch(`/api/productos`),
      ]);

      if (resCompras.ok && resProveedores.ok && resAlm.ok && resProd.ok) {
        const cData = await resCompras.json();
        const pData = await resProveedores.json();
        const aData = await resAlm.json();
        const prData = await resProd.json();

        setCompras(cData);
        setProveedores(pData);
        setAlmacenes(aData);
        setProductos(prData);

        if (pData.length > 0 && !proveedorId) setProveedorId(pData[0].id);
        if (aData.length > 0 && !almacenId) setAlmacenId(aData[0].id);
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
    setErrorMsg('');
    const prod = productos.find((p) => p.id === selectedProdId);
    if (!prod) return;

    if (addQty <= 0) {
      setErrorMsg('La cantidad debe ser mayor a cero.');
      return;
    }

    const existingIndex = cart.findIndex((it) => it.productoId === selectedProdId);
    if (existingIndex >= 0) {
      const updatedCart = [...cart];
      const newQty = updatedCart[existingIndex].cantidad + addQty;
      updatedCart[existingIndex].cantidad = newQty;
      updatedCart[existingIndex].costoUnitario = addCost;
      updatedCart[existingIndex].subtotal = newQty * addCost;
      setCart(updatedCart);
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

    setAddQty(1);
  };

  const handleRemoveFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const subtotalCart = cart.reduce((acc, it) => acc + it.subtotal, 0);
  const ivaCart = Math.round(subtotalCart * 0.16 * 100) / 100;
  const totalCart = subtotalCart + ivaCart;

  const handleCreateCompra = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      setErrorMsg('Debe agregar al menos un artículo a la compra.');
      return;
    }

    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/compras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proveedorId,
          almacenId,
          folioFacturaProv,
          tipoPago,
          observaciones,
          items: cart.map((it) => ({
            productoId: it.productoId,
            cantidad: it.cantidad,
            costoUnitario: it.costoUnitario,
          })),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(`¡Recepción ${data.folio} registrada con éxito! El inventario fue incrementado.`);
        setCart([]);
        setFolioFacturaProv('');
        setObservaciones('');
        setTimeout(() => {
          setShowModal(false);
          setSuccessMsg('');
          loadData();
        }, 1200);
      } else {
        setErrorMsg(data.error || 'Error al registrar compra.');
      }
    } catch (err) {
      setErrorMsg('Error de conexión con el servidor.');
    } finally {
      setSaving(false);
    }
  };

  const isReadOnly = user?.rol === 'AUDITOR';
  const isAlmacenista = user?.rol === 'ALMACENISTA';

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Truck className="w-6 h-6 text-blue-600" />
            Recepción de Compras & Proveedores
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Ingreso físico de mercancía al almacén con recálculo de costo promedio y afectación de cuentas por pagar (CxP).
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
            <Plus className="w-4 h-4" /> Registrar Compra
          </button>
        )}
      </div>

      {isReadOnly && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 font-medium">
          <Eye className="w-4 h-4 text-amber-600" />
          Modo Auditoría: Consulta de recepciones de mercancía en modo solo lectura.
        </div>
      )}

      {/* Historial de Compras */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-sm">Historial Reciente de Entradas por Compra</h3>
          <span className="text-xs text-slate-500 font-medium">{compras.length} órdenes recibidas</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400">Cargando compras...</div>
        ) : compras.length === 0 ? (
          <div className="p-8 text-center text-slate-400">No hay compras registradas en este periodo.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 uppercase text-xs font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Folio Compra</th>
                  <th className="py-3 px-4">Factura Proveedor</th>
                  <th className="py-3 px-4">Proveedor</th>
                  <th className="py-3 px-4">Almacén Destino</th>
                  <th className="py-3 px-4 text-center">Tipo Pago</th>
                  <th className="py-3 px-4 text-right">Subtotal</th>
                  <th className="py-3 px-4 text-right">Total</th>
                  <th className="py-3 px-4">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {compras.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-blue-700">
                      {c.folio}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-600">
                      {c.folioFacturaProv || '-'}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-900">{c.proveedor?.razonSocial}</p>
                      <p className="text-xs text-slate-400 font-mono">{c.proveedor?.codigo}</p>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600">
                      {c.almacen?.nombre}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {c.tipoPago === 'CREDITO' ? (
                        <span className="bg-purple-100 text-purple-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                          CRÉDITO (CxP)
                        </span>
                      ) : (
                        <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                          CONTADO
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right text-xs text-slate-700 font-medium">
                      ${c.subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      ${c.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500">
                      {new Date(c.fecha).toLocaleDateString('es-MX')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Nueva Compra */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-600" /> Registro de Recepción de Mercancía
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCompra} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Proveedor *</label>
                  <select
                    value={proveedorId}
                    onChange={(e) => setProveedorId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                    required
                  >
                    {proveedores.map((p) => (
                      <option key={p.id} value={p.id}>{p.razonSocial}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Almacén Receptor *</label>
                  <select
                    value={almacenId}
                    onChange={(e) => setAlmacenId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                    required
                  >
                    {almacenes.map((a) => (
                      <option key={a.id} value={a.id}>{a.nombre}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Término de Pago *</label>
                  <select
                    value={tipoPago}
                    onChange={(e) => setTipoPago(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white font-semibold"
                  >
                    <option value="CREDITO">Crédito (Afecta CxP)</option>
                    <option value="CONTADO">Contado</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Folio de Factura del Proveedor (Opcional)</label>
                <input
                  type="text"
                  value={folioFacturaProv}
                  onChange={(e) => setFolioFacturaProv(e.target.value)}
                  placeholder="Ej. FAC-10948"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                />
              </div>

              {/* Agregar Artículos */}
              <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl space-y-2">
                <p className="text-xs font-bold text-slate-800">Agregar Artículos a la Entrada</p>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <div className="sm:col-span-2">
                    <select
                      value={selectedProdId}
                      onChange={(e) => handleProductSelectChange(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                    >
                      {productos.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.sku} - {p.nombre} (Costo actual: ${p.costoPromedio})
                        </option>
                      ))}
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
                      placeholder="Costo Compra"
                      value={addCost}
                      onChange={(e) => setAddCost(Number(e.target.value))}
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
                      <th className="py-2 px-3 text-right">Costo Unitario</th>
                      <th className="py-2 px-3 text-right">Subtotal</th>
                      <th className="py-2 px-3 text-center">Quitar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cart.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-slate-400">
                          No hay artículos en la lista de recepción.
                        </td>
                      </tr>
                    ) : (
                      cart.map((it, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2 px-3">
                            <p className="font-semibold text-slate-900">{it.nombre}</p>
                            <p className="text-xs font-mono text-slate-400">{it.sku}</p>
                          </td>
                          <td className="py-2 px-3 text-center font-bold">{it.cantidad} {it.unidadMedida}</td>
                          <td className="py-2 px-3 text-right">${it.costoUnitario.toFixed(2)}</td>
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
                  {saving ? 'Registrando compra...' : 'Confirmar Recepción & Aumentar Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
