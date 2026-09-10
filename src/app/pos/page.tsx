'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { 
  Zap, 
  Search, 
  Barcode, 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  CreditCard, 
  Banknote, 
  Printer, 
  CheckCircle2, 
  AlertTriangle, 
  Lock, 
  Unlock, 
  Receipt, 
  ArrowRight,
  RotateCcw,
  Sparkles,
  Building2
} from 'lucide-react';

interface CartPosItem {
  productoId: string;
  sku: string;
  codigoBarras?: string;
  nombre: string;
  unidadMedida: string;
  precioUnitario: number;
  cantidad: number;
  subtotal: number;
  stockDisponible: number;
}

export default function PosPage() {
  const { user } = useAuth();
  const [productos, setProductos] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [almacenes, setAlmacenes] = useState<any[]>([]);
  const [almacenId, setAlmacenId] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [loading, setLoading] = useState(true);

  // Turno de Caja
  const [turnoActivo, setTurnoActivo] = useState<any>(null);
  const [showAperturaModal, setShowAperturaModal] = useState(false);
  const [showCierreModal, setShowCierreModal] = useState(false);
  const [montoApertura, setMontoApertura] = useState(500);
  const [montoCierreEfectivo, setMontoCierreEfectivo] = useState(0);
  const [notasApertura, setNotasApertura] = useState('');
  const [notasCierre, setNotasCierre] = useState('');

  // Carrito de mostrador
  const [cart, setCart] = useState<CartPosItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [tipoPago, setTipoPago] = useState<'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA'>('EFECTIVO');
  const [pagoCon, setPagoCon] = useState<number>(0);
  const [processingSale, setProcessingSale] = useState(false);
  const [lastSale, setLastSale] = useState<any>(null);
  const [posError, setPosError] = useState('');

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user?.tenantId) {
      loadInitialData();
    }
  }, [user]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [resProd, resCli, resAlm] = await Promise.all([
        fetch('/api/productos'),
        fetch('/api/clientes'),
        fetch('/api/almacenes'),
      ]);

      if (resProd.ok && resCli.ok && resAlm.ok) {
        const prodData = await resProd.json();
        const cliData = await resCli.json();
        const almData = await resAlm.json();

        setProductos(prodData);
        setClientes(cliData);
        setAlmacenes(almData);

        const defaultAlm = almData.find((a: any) => a.esPrincipal) || almData[0];
        if (defaultAlm) {
          setAlmacenId(defaultAlm.id);
          checkTurnoCaja(defaultAlm.id);
        }

        const publicoGeneral = cliData.find((c: any) => c.rfc === 'XAXX010101000' || c.razonSocial.toLowerCase().includes('público')) || cliData[0];
        if (publicoGeneral) {
          setClienteId(publicoGeneral.id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const checkTurnoCaja = async (targetAlmacenId: string) => {
    try {
      const res = await fetch(`/api/pos/turno?almacenId=${targetAlmacenId}`);
      if (res.ok) {
        const data = await res.json();
        setTurnoActivo(data.turnoActivo || null);
        if (!data.turnoActivo) {
          setShowAperturaModal(true);
        }
      }
    } catch (e) {
      console.error('Error al consultar caja:', e);
    }
  };

  const handleAbrirCaja = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/pos/turno', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion: 'ABRIR',
          almacenId,
          montoApertura,
          notasApertura,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setTurnoActivo(data.turno);
        setShowAperturaModal(false);
      } else {
        alert(data.error || 'Error al abrir caja');
      }
    } catch (err) {
      alert('Error de conexión');
    }
  };

  const handleCerrarCaja = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!turnoActivo) return;

    try {
      const res = await fetch('/api/pos/turno', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion: 'CERRAR',
          turnoId: turnoActivo.id,
          montoCierre: montoCierreEfectivo,
          notasCierre,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(`¡Corte Z Realizado con Éxito!\n\nFondo Apertura: $${data.resumen.fondoApertura.toFixed(2)}\nVentas Efectivo: $${data.resumen.ventasEfectivo.toFixed(2)}\nEfectivo Esperado: $${data.resumen.efectivoEsperado.toFixed(2)}\nEfectivo Entregado: $${data.resumen.efectivoEntregado.toFixed(2)}\nDiferencia: $${data.resumen.diferencia.toFixed(2)} MXN`);
        setTurnoActivo(null);
        setShowCierreModal(false);
      } else {
        alert(data.error || 'Error al cerrar caja');
      }
    } catch (err) {
      alert('Error de conexión');
    }
  };

  // Agregar al carrito por clic o por escaneo de código de barras
  const handleAddProduct = (prod: any) => {
    setPosError('');
    const ex = prod.existencias?.find((e: any) => e.almacenId === almacenId);
    const stock = ex ? ex.cantidad : 0;

    const existingIndex = cart.findIndex((i) => i.productoId === prod.id);
    const cantActual = existingIndex >= 0 ? cart[existingIndex].cantidad : 0;

    if (cantActual + 1 > stock) {
      setPosError(`Stock insuficiente de "${prod.nombre}". Solo hay ${stock} en este almacén.`);
      return;
    }

    if (existingIndex >= 0) {
      const updated = [...cart];
      updated[existingIndex].cantidad += 1;
      updated[existingIndex].subtotal = updated[existingIndex].cantidad * updated[existingIndex].precioUnitario;
      setCart(updated);
    } else {
      setCart([
        ...cart,
        {
          productoId: prod.id,
          sku: prod.sku,
          codigoBarras: prod.codigoBarras,
          nombre: prod.nombre,
          unidadMedida: prod.unidadMedida,
          precioUnitario: prod.precioVenta,
          cantidad: 1,
          subtotal: prod.precioVenta,
          stockDisponible: stock,
        },
      ]);
    }
  };

  const handleUpdateQty = (index: number, delta: number) => {
    const updated = [...cart];
    const item = updated[index];
    const newQty = item.cantidad + delta;

    if (newQty <= 0) {
      setCart(cart.filter((_, i) => i !== index));
      return;
    }

    if (newQty > item.stockDisponible) {
      setPosError(`Solo hay ${item.stockDisponible} ${item.unidadMedida} disponibles.`);
      return;
    }

    item.cantidad = newQty;
    item.subtotal = newQty * item.precioUnitario;
    setCart(updated);
  };

  // Buscar por escáner de código de barras o SKU al presionar Enter
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const query = searchQuery.trim().toLowerCase();
    const found = productos.find(
      (p) =>
        (p.codigoBarras && p.codigoBarras.toLowerCase() === query) ||
        p.sku.toLowerCase() === query ||
        p.nombre.toLowerCase().includes(query)
    );

    if (found) {
      handleAddProduct(found);
      setSearchQuery('');
    } else {
      setPosError(`No se encontró ningún artículo para "${searchQuery}"`);
    }
  };

  const subtotal = cart.reduce((acc, i) => acc + i.subtotal, 0);
  const impuestos = Math.round(subtotal * 0.16 * 100) / 100;
  const total = subtotal + impuestos;
  const cambio = Math.max(0, pagoCon - total);

  // Cobrar e imprimir ticket
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (!turnoActivo) {
      alert('Debe abrir turno de caja antes de cobrar.');
      setShowAperturaModal(true);
      return;
    }

    if (tipoPago === 'EFECTIVO' && pagoCon < total) {
      setPosError(`El importe pagado ($${pagoCon.toFixed(2)}) es menor al total de la compra ($${total.toFixed(2)})`);
      return;
    }

    setProcessingSale(true);
    setPosError('');

    try {
      const res = await fetch('/api/ventas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteId,
          almacenId,
          tipoPago: 'CONTADO',
          observaciones: `Venta POS Mostrador. Pago: ${tipoPago}. Recibido: $${pagoCon || total}`,
          items: cart.map((i) => ({
            productoId: i.productoId,
            cantidad: i.cantidad,
            precioUnitario: i.precioUnitario,
          })),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        // Actualizar turno de caja en memoria
        setTurnoActivo((prev: any) => ({
          ...prev,
          totalEfectivo: prev.totalEfectivo + (tipoPago === 'EFECTIVO' ? total : 0),
          totalTarjeta: prev.totalTarjeta + (tipoPago === 'TARJETA' ? total : 0),
          totalVentas: prev.totalVentas + total,
        }));

        const saleRecord = {
          folio: data.folio,
          fecha: new Date(),
          items: [...cart],
          subtotal,
          impuestos,
          total,
          pagoCon: pagoCon || total,
          cambio,
          tipoPago,
          cajero: user?.nombre,
          almacen: almacenes.find((a) => a.id === almacenId)?.nombre,
          cliente: clientes.find((c) => c.id === clienteId)?.razonSocial,
        };

        setLastSale(saleRecord);
        setCart([]);
        setPagoCon(0);
        handlePrintTicket(saleRecord);
        loadInitialData();
      } else {
        setPosError(data.error || 'Error al procesar cobro en mostrador');
      }
    } catch (err) {
      setPosError('Error de comunicación con el servidor');
    } finally {
      setProcessingSale(false);
    }
  };

  const handlePrintTicket = (sale: any) => {
    const printWindow = window.open('', '_blank', 'width=350,height=600');
    if (!printWindow) return;

    const itemsRows = sale.items.map((i: any) => `
      <tr>
        <td style="padding: 2px 0;">${i.cantidad}x ${i.nombre.slice(0, 18)}</td>
        <td style="text-align: right; font-family: monospace;">$${i.subtotal.toFixed(2)}</td>
      </tr>
    `).join('');

    const ticketContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Ticket ${sale.folio}</title>
          <style>
            @page { size: 58mm auto; margin: 0; }
            body { font-family: monospace; font-size: 11px; margin: 6px; color: #000; }
            .center { text-align: center; }
            .right { text-align: right; }
            .line { border-bottom: 1px dashed #000; margin: 6px 0; }
            table { width: 100%; font-size: 11px; }
          </style>
        </head>
        <body>
          <div class="center">
            <h3 style="margin: 0;">${user?.tenant?.nombreComercial || 'ControlERP'}</h3>
            <p style="margin: 2px 0; font-size: 9px;">RFC: ${user?.tenant?.identificacionFiscal || 'XAXX010101000'}</p>
            <p style="margin: 0; font-size: 9px;">${sale.almacen || 'Mostrador Central'}</p>
          </div>
          <div class="line"></div>
          <p style="margin: 2px 0;">Folio: <strong>${sale.folio}</strong></p>
          <p style="margin: 2px 0;">Fecha: ${new Date(sale.fecha).toLocaleString('es-MX')}</p>
          <p style="margin: 2px 0;">Cajero: ${sale.cajero}</p>
          <p style="margin: 2px 0;">Cliente: ${sale.cliente || 'Público General'}</p>
          <div class="line"></div>
          <table>
            ${itemsRows}
          </table>
          <div class="line"></div>
          <table>
            <tr><td>Subtotal:</td><td class="right">$${sale.subtotal.toFixed(2)}</td></tr>
            <tr><td>IVA (16%):</td><td class="right">$${sale.impuestos.toFixed(2)}</td></tr>
            <tr style="font-weight: bold; font-size: 13px;"><td>TOTAL:</td><td class="right">$${sale.total.toFixed(2)}</td></tr>
            <tr><td>Pago (${sale.tipoPago}):</td><td class="right">$${sale.pagoCon.toFixed(2)}</td></tr>
            <tr><td>Cambio:</td><td class="right">$${sale.cambio.toFixed(2)}</td></tr>
          </table>
          <div class="line"></div>
          <div class="center" style="font-size: 10px; margin-top: 8px;">
            ¡Gracias por su compra!<br/>
            Comprobante de mostrador
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(ticketContent);
    printWindow.document.close();
  };

  const filteredProducts = productos.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.nombre.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      (p.codigoBarras && p.codigoBarras.includes(q))
    );
  });

  return (
    <div className="space-y-4">
      {/* Barra de Estado POS & Control de Caja */}
      <div className="bg-slate-900 text-white px-5 py-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold flex items-center gap-2">
              Punto de Venta Mostrador (POS)
              {turnoActivo ? (
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Unlock className="w-3 h-3" /> Caja Abierta (Turno Activo)
                </span>
              ) : (
                <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Caja Cerrada
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-400">
              Venta rápida al paso con soporte de lector de código de barras y ticket térmico
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          {/* Selector de Almacén de Mostrador */}
          <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
            <Building2 className="w-3.5 h-3.5 text-blue-400" />
            <select
              value={almacenId}
              onChange={(e) => {
                setAlmacenId(e.target.value);
                checkTurnoCaja(e.target.value);
                setCart([]);
              }}
              className="bg-transparent text-white font-semibold outline-none"
            >
              {almacenes.map((a) => (
                <option key={a.id} value={a.id} className="bg-slate-900 text-white">
                  {a.nombre}
                </option>
              ))}
            </select>
          </div>

          {turnoActivo ? (
            <button
              onClick={() => {
                setMontoCierreEfectivo(turnoActivo.montoApertura + turnoActivo.totalEfectivo);
                setShowCierreModal(true);
              }}
              className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Lock className="w-3.5 h-3.5" /> Corte Z / Cerrar Caja
            </button>
          ) : (
            <button
              onClick={() => setShowAperturaModal(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Unlock className="w-3.5 h-3.5" /> Abrir Caja de Turno
            </button>
          )}
        </div>
      </div>

      {posError && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center justify-between gap-2 font-medium animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{posError}</span>
          </div>
          <button onClick={() => setPosError('')} className="font-bold text-rose-500 hover:text-rose-800">✕</button>
        </div>
      )}

      {/* Grid Principal POS: Catálogo Izquierda vs Caja Derecha */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Lado Izquierdo: Catálogo y Búsqueda por Escáner (7 Columnas) */}
        <div className="lg:col-span-7 space-y-3">
          
          {/* Barra de Búsqueda y Escáner */}
          <form onSubmit={handleBarcodeSubmit} className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              ref={barcodeInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Escanear código de barras o teclear SKU / Nombre y presionar Enter..."
              className="w-full bg-white border border-slate-200 pl-10 pr-24 py-2.5 rounded-2xl text-xs font-semibold text-slate-800 placeholder-slate-400 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <button
              type="submit"
              className="absolute right-2 top-1.5 px-3 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold flex items-center gap-1"
            >
              <Barcode className="w-3.5 h-3.5" /> Escanear
            </button>
          </form>

          {/* Grid de Productos con Existencias en Vivo */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm h-[580px] overflow-y-auto">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {filteredProducts.map((p) => {
                const ex = p.existencias?.find((e: any) => e.almacenId === almacenId);
                const stock = ex ? ex.cantidad : 0;
                const sinStock = stock <= 0;

                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={sinStock}
                    onClick={() => handleAddProduct(p)}
                    className={`p-3 rounded-xl text-left border transition-all flex flex-col justify-between ${
                      sinStock
                        ? 'bg-slate-50 border-slate-200 opacity-50 cursor-not-allowed'
                        : 'bg-white hover:border-blue-400 hover:shadow-md border-slate-200/80 active:scale-95'
                    }`}
                  >
                    <div>
                      <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                        {p.sku}
                      </span>
                      <p className="text-xs font-bold text-slate-800 line-clamp-2 mt-1.5 leading-snug">
                        {p.nombre}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="font-mono text-sm font-bold text-slate-900">
                        ${p.precioVenta.toFixed(2)}
                      </span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        stock <= 5 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {stock} {p.unidadMedida}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Lado Derecho: Carrito de Caja, Cobro y Ticket (5 Columnas) */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 shadow-md p-4 flex flex-col justify-between h-[640px]">
          
          <div>
            {/* Cabecera del Carrito & Cliente */}
            <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-sm">Mostrador / Carrito</h3>
              </div>
              <div className="w-48">
                <select
                  value={clienteId}
                  onChange={(e) => setClienteId(e.target.value)}
                  className="w-full text-[11px] font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-1 outline-none"
                >
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.razonSocial}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Lista de Artículos en Carrito */}
            <div className="h-[240px] overflow-y-auto divide-y divide-slate-100 py-1">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                  <Barcode className="w-8 h-8 text-slate-300 mb-1" />
                  Escanea artículos o haz clic en el catálogo para agregarlos.
                </div>
              ) : (
                cart.map((item, idx) => (
                  <div key={idx} className="py-2 flex items-center justify-between text-xs">
                    <div className="truncate pr-2">
                      <p className="font-bold text-slate-800 truncate">{item.nombre}</p>
                      <p className="text-[11px] text-slate-400 font-mono font-bold">${item.precioUnitario.toFixed(2)} c/u</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center bg-slate-100 rounded-lg border border-slate-200">
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(idx, -1)}
                          className="px-2 py-0.5 text-slate-600 hover:text-black font-bold"
                        >
                          -
                        </button>
                        <span className="px-2 font-bold font-mono text-slate-800">{item.cantidad}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(idx, 1)}
                          className="px-2 py-0.5 text-slate-600 hover:text-black font-bold"
                        >
                          +
                        </button>
                      </div>

                      <span className="font-mono font-bold text-slate-900 w-16 text-right">
                        ${item.subtotal.toFixed(2)}
                      </span>

                      <button
                        type="button"
                        onClick={() => setCart(cart.filter((_, i) => i !== idx))}
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Zona de Totales y Cobro */}
          <div className="pt-3 border-t border-slate-100 space-y-3">
            <div className="bg-slate-50 p-3 rounded-2xl space-y-1 text-xs">
              <div className="flex justify-between text-slate-500 font-medium">
                <span>Subtotal:</span>
                <span className="font-mono font-bold text-slate-700">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-500 font-medium">
                <span>IVA (16%):</span>
                <span className="font-mono font-bold text-slate-700">${impuestos.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-900 text-base font-bold pt-1 border-t border-slate-200">
                <span>Total a Pagar:</span>
                <span className="font-mono text-blue-600">${total.toFixed(2)} MXN</span>
              </div>
            </div>

            {/* Selector de Método de Pago */}
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setTipoPago('EFECTIVO')}
                className={`py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1 ${
                  tipoPago === 'EFECTIVO' ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-white text-slate-600 border-slate-200'
                }`}
              >
                <Banknote className="w-3.5 h-3.5" /> Efectivo
              </button>
              <button
                type="button"
                onClick={() => {
                  setTipoPago('TARJETA');
                  setPagoCon(total);
                }}
                className={`py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1 ${
                  tipoPago === 'TARJETA' ? 'bg-purple-600 text-white border-purple-600 shadow-sm' : 'bg-white text-slate-600 border-slate-200'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" /> Tarjeta
              </button>
              <button
                type="button"
                onClick={() => {
                  setTipoPago('TRANSFERENCIA');
                  setPagoCon(total);
                }}
                className={`py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1 ${
                  tipoPago === 'TRANSFERENCIA' ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-slate-600 border-slate-200'
                }`}
              >
                <Zap className="w-3.5 h-3.5" /> Transfer
              </button>
            </div>

            {/* Cálculo de Cambio en Efectivo */}
            {tipoPago === 'EFECTIVO' && (
              <div className="flex items-center gap-2 text-xs">
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Recibido ($)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={pagoCon || ''}
                    onChange={(e) => setPagoCon(Number(e.target.value))}
                    placeholder="Monto entregado"
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl font-mono font-bold text-slate-900 outline-none"
                  />
                </div>
                <div className="flex-1 text-right">
                  <span className="block text-[10px] font-bold text-slate-500 mb-0.5">Cambio a Entregar:</span>
                  <span className={`font-mono text-base font-bold ${cambio > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                    ${cambio.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {/* Botón de Cobro Rápido */}
            <button
              type="button"
              disabled={processingSale || cart.length === 0}
              onClick={handleCheckout}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl shadow-lg shadow-emerald-600/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2 text-sm"
            >
              {processingSale ? (
                'Procesando despacho...'
              ) : (
                <>
                  <Printer className="w-4 h-4" /> Cobrar & Imprimir Ticket (${total.toFixed(2)})
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* MODAL APERTURA DE CAJA */}
      {showAperturaModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Unlock className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm">Apertura de Turno de Caja (POS)</h3>
              </div>
              <button onClick={() => setShowAperturaModal(false)} className="text-slate-400 hover:text-white text-xs font-bold">✕</button>
            </div>

            <form onSubmit={handleAbrirCaja} className="p-6 space-y-4 text-xs">
              <p className="text-slate-500">
                Inicia un nuevo turno de caja registradora en el almacén <strong>{almacenes.find(a => a.id === almacenId)?.nombre}</strong>.
              </p>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Fondo Inicial de Caja en Efectivo ($) *</label>
                <input
                  type="number"
                  min="0"
                  step="10"
                  required
                  value={montoApertura}
                  onChange={(e) => setMontoApertura(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-base font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notas de Turno (Opcional)</label>
                <textarea
                  value={notasApertura}
                  onChange={(e) => setNotasApertura(e.target.value)}
                  placeholder="Ej. Fondo para cambio billetes chicos"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none"
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAperturaModal(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-md"
                >
                  Confirmar Apertura
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CORTE Z / CIERRE DE CAJA */}
      {showCierreModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-rose-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Lock className="w-5 h-5 text-white" />
                <h3 className="font-bold text-sm">Corte Z / Arqueo Diario de Caja</h3>
              </div>
              <button onClick={() => setShowCierreModal(false)} className="text-white text-xs font-bold">✕</button>
            </div>

            <form onSubmit={handleCerrarCaja} className="p-6 space-y-4 text-xs">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <p className="text-slate-500">Cajero: <strong className="text-slate-900">{turnoActivo?.usuarioNombre}</strong></p>
                <p className="text-slate-500">Fondo Inicial: <strong className="font-mono">${turnoActivo?.montoApertura.toFixed(2)}</strong></p>
                <p className="text-slate-500">Ventas en Efectivo: <strong className="font-mono text-emerald-600">+${turnoActivo?.totalEfectivo.toFixed(2)}</strong></p>
                <p className="text-slate-500">Total Esperado en Caja: <strong className="font-mono text-slate-900 font-bold">${((turnoActivo?.montoApertura || 0) + (turnoActivo?.totalEfectivo || 0)).toFixed(2)} MXN</strong></p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Efectivo Físico Contado en Caja ($) *</label>
                <input
                  type="number"
                  step="0.5"
                  required
                  value={montoCierreEfectivo}
                  onChange={(e) => setMontoCierreEfectivo(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-base font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Observaciones de Arqueo</label>
                <textarea
                  value={notasCierre}
                  onChange={(e) => setNotasCierre(e.target.value)}
                  placeholder="Ej. Caja cuadrada sin faltantes"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none"
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCierreModal(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow-md"
                >
                  Cerrar Caja & Generar Corte Z
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
