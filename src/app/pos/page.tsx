'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
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
  Building2,
  X,
  ChevronUp,
  ChevronDown,
  Clock,
  User,
  Package,
  Layers,
  Check,
  History
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
  const [selectedCategory, setSelectedCategory] = useState<string>('TODOS');
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
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [posError, setPosError] = useState('');

  // Adaptabilidad táctil / Móvil / Drawer
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

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

  // Agregar al carrito
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

  // Búsqueda por escáner o SKU al presionar Enter
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

  // Categorías disponibles
  const categories = useMemo(() => {
    const cats = new Set<string>();
    productos.forEach(p => {
      if (p.categoria) cats.add(p.categoria);
    });
    return ['TODOS', ...Array.from(cats)];
  }, [productos]);

  // Filtrado de productos
  const filteredProducts = useMemo(() => {
    return productos.filter((p) => {
      const matchesCategory = selectedCategory === 'TODOS' || p.categoria === selectedCategory;
      if (!matchesCategory) return false;

      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        p.nombre.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.codigoBarras && p.codigoBarras.includes(q))
      );
    });
  }, [productos, selectedCategory, searchQuery]);

  const subtotal = cart.reduce((acc, i) => acc + i.subtotal, 0);
  const impuestos = Math.round(subtotal * 0.16 * 100) / 100;
  const total = subtotal + impuestos;
  const cambio = Math.max(0, pagoCon - total);
  const totalItemsCount = cart.reduce((acc, i) => acc + i.cantidad, 0);

  // Cobrar e imprimir ticket
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (!turnoActivo) {
      alert('Debe abrir turno de caja antes de cobrar.');
      setShowAperturaModal(true);
      return;
    }

    if (tipoPago === 'EFECTIVO' && pagoCon < total) {
      setPosError(`El importe recibido ($${pagoCon.toFixed(2)}) es menor al total ($${total.toFixed(2)})`);
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
        setShowTicketModal(true);
        setCart([]);
        setPagoCon(0);
        setIsMobileCartOpen(false);
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
    const printWindow = window.open('', '_blank', 'width=380,height=620');
    if (!printWindow) return;

    const itemsRows = sale.items.map((i: any) => `
      <tr>
        <td style="padding: 3px 0;">${i.cantidad}x ${i.nombre.slice(0, 20)}</td>
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
            body { font-family: monospace; font-size: 0.75rem; margin: 8px; color: black; }
            .center { text-align: center; }
            .right { text-align: right; }
            .line { border-bottom: 1px dashed black; margin: 6px 0; }
            table { width: 100%; font-size: 0.75rem; }
          </style>
        </head>
        <body>
          <div class="center">
            <h3 style="margin: 0; font-size: 0.875rem;">${user?.tenant?.nombreComercial || 'ControlERP'}</h3>
            <p style="margin: 2px 0;">RFC: ${user?.tenant?.identificacionFiscal || 'XAXX010101000'}</p>
            <p style="margin: 0;">${sale.almacen || 'Mostrador Central'}</p>
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
            <tr style="font-weight: bold; font-size: 0.875rem;"><td>TOTAL:</td><td class="right">$${sale.total.toFixed(2)}</td></tr>
            <tr><td>Pago (${sale.tipoPago}):</td><td class="right">$${sale.pagoCon.toFixed(2)}</td></tr>
            <tr><td>Cambio:</td><td class="right">$${sale.cambio.toFixed(2)}</td></tr>
          </table>
          <div class="line"></div>
          <div class="center" style="margin-top: 8px;">
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

  const handleQuickCash = (amount: number) => {
    setTipoPago('EFECTIVO');
    setPagoCon(amount);
  };

  return (
    <div className="space-y-4 pb-20 lg:pb-4">
      {/* Barra de Estado & Control de Caja (The Fintech Ledger) */}
      <div className="bg-slate-950 text-white p-5 rounded-3xl border border-slate-800/80 shadow-lg shadow-slate-950/20 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 shadow-inner">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  Punto de Venta Mostrador
                </h1>
                {turnoActivo ? (
                  <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-bold px-3 py-1 rounded-full inline-flex items-center gap-1.5 shadow-xs">
                    <Unlock className="w-3.5 h-3.5" /> Caja Abierta
                  </span>
                ) : (
                  <span className="bg-rose-500/15 text-rose-400 border border-rose-500/30 text-xs font-bold px-3 py-1 rounded-full inline-flex items-center gap-1.5 shadow-xs">
                    <Lock className="w-3.5 h-3.5" /> Caja Cerrada
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Despacho rápido con lector de código de barras, calculadora de cambio y ticket térmico.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Selector de Almacén */}
            <div className="flex items-center gap-2 bg-slate-900 px-3.5 py-2 rounded-xl border border-slate-800 text-xs text-slate-200 shadow-inner">
              <Building2 className="w-4 h-4 text-blue-400 shrink-0" />
              <select
                value={almacenId}
                onChange={(e) => {
                  setAlmacenId(e.target.value);
                  checkTurnoCaja(e.target.value);
                  setCart([]);
                }}
                className="bg-transparent text-white font-semibold outline-none cursor-pointer focus:ring-0"
              >
                {almacenes.map((a) => (
                  <option key={a.id} value={a.id} className="bg-slate-950 text-white">
                    {a.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Acciones de Caja */}
            <Link
              href="/reportes"
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all inline-flex items-center gap-1.5 border border-slate-700 active:scale-95 shadow-xs"
              title="Consultar concentrado de cortes y arqueos"
            >
              <History className="w-3.5 h-3.5 text-blue-400" /> Historial de Cortes
            </Link>

            {turnoActivo ? (
              <button
                onClick={() => {
                  setMontoCierreEfectivo(turnoActivo.montoApertura + turnoActivo.totalEfectivo);
                  setShowCierreModal(true);
                }}
                className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all inline-flex items-center gap-1.5 shadow-md shadow-rose-950/40 active:scale-95"
              >
                <Lock className="w-3.5 h-3.5" /> Corte Z / Cerrar Caja
              </button>
            ) : (
              <button
                onClick={() => setShowAperturaModal(true)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all inline-flex items-center gap-1.5 shadow-md shadow-emerald-950/40 active:scale-95"
              >
                <Unlock className="w-3.5 h-3.5" /> Abrir Caja
              </button>
            )}
          </div>
        </div>

        {/* Resumen del Turno Activo */}
        {turnoActivo && (
          <div className="mt-4 pt-4 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="bg-slate-900/50 p-2.5 rounded-xl border border-slate-800/50">
              <span className="text-slate-400 block font-medium text-[11px] uppercase tracking-wider">Cajero en Turno</span>
              <span className="font-bold text-white truncate block mt-0.5">{turnoActivo.usuarioNombre || user?.nombre}</span>
            </div>
            <div className="bg-slate-900/50 p-2.5 rounded-xl border border-slate-800/50">
              <span className="text-slate-400 block font-medium text-[11px] uppercase tracking-wider">Fondo de Apertura</span>
              <span className="font-bold font-mono text-slate-200 block mt-0.5">${turnoActivo.montoApertura?.toFixed(2)} MXN</span>
            </div>
            <div className="bg-slate-900/50 p-2.5 rounded-xl border border-slate-800/50">
              <span className="text-slate-400 block font-medium text-[11px] uppercase tracking-wider">Ventas en Efectivo</span>
              <span className="font-bold font-mono text-emerald-400 block mt-0.5">+${turnoActivo.totalEfectivo?.toFixed(2)} MXN</span>
            </div>
            <div className="bg-slate-900/50 p-2.5 rounded-xl border border-slate-800/50">
              <span className="text-slate-400 block font-medium text-[11px] uppercase tracking-wider">Total en Caja</span>
              <span className="font-bold font-mono text-blue-400 block mt-0.5">${((turnoActivo.montoApertura || 0) + (turnoActivo.totalEfectivo || 0)).toFixed(2)} MXN</span>
            </div>
          </div>
        )}
      </div>

      {/* Alerta de Error POS */}
      {posError && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-2xl flex items-center justify-between gap-3 font-medium animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{posError}</span>
          </div>
          <button onClick={() => setPosError('')} className="font-bold text-rose-600 hover:text-rose-900 p-1">✕</button>
        </div>
      )}

      {/* GRID PRINCIPAL ADAPTIVO (Split en Desktop / Flotante en Móvil) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* PANEL IZQUIERDO: CATÁLOGO, BUSCADOR Y CATEGORÍAS (7 cols en Desktop) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Barra de Búsqueda y Escáner */}
          <form onSubmit={handleBarcodeSubmit} className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={barcodeInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Escanear código de barras o buscar por SKU / Nombre..."
              className="w-full bg-white border border-slate-200 pl-10 pr-28 py-3 rounded-2xl text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400 shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
            >
              <Barcode className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Escanear</span>
            </button>
          </form>

          {/* Filtro por Categorías (Horizontal Scroll Táctil) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all select-none ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 hover:border-slate-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Grid de Artículos Táctil */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-md shadow-slate-900/5 min-h-[460px] max-h-[640px] overflow-y-auto">
            {loading ? (
              <div className="p-12 text-center text-slate-400">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mb-2"></div>
                <p className="text-xs font-medium">Cargando inventario de mostrador...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold">No se encontraron artículos con ese criterio.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
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
                      className={`p-3.5 rounded-2xl text-left border transition-all flex flex-col justify-between group select-none min-h-[135px] ${
                        sinStock
                          ? 'bg-slate-50 border-slate-200 opacity-40 cursor-not-allowed'
                          : 'bg-white hover:border-blue-400 hover:shadow-lg hover:shadow-blue-900/5 border-slate-200 active:scale-95'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[11px] font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                            {p.sku}
                          </span>
                          {stock <= 5 ? (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-mono">
                              {stock} {p.unidadMedida}
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                              {stock} {p.unidadMedida}
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-bold text-slate-900 line-clamp-2 mt-2 leading-snug group-hover:text-blue-600 transition-colors">
                          {p.nombre}
                        </p>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                        <div>
                          <span className="font-mono text-sm font-black text-slate-900">
                            ${p.precioVenta.toFixed(2)}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium ml-1">MXN</span>
                        </div>
                        <div className="w-7 h-7 rounded-xl bg-slate-100 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center transition-all shadow-xs">
                          <Plus className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* PANEL DERECHO: CARRITO, COBRO & TICKET (5 cols en Desktop / Drawer en Móvil) */}
        <div className={`
          fixed lg:static inset-x-0 bottom-0 z-40 lg:z-auto bg-white lg:rounded-3xl border-t lg:border border-slate-200 shadow-2xl lg:shadow-md p-4 sm:p-5 flex flex-col justify-between transition-transform duration-300
          lg:col-span-5 lg:min-h-[640px]
          ${isMobileCartOpen ? 'translate-y-0 max-h-[90vh] overflow-y-auto rounded-t-3xl' : 'translate-y-full lg:translate-y-0'}
        `}>
          <div>
            {/* Cabecera del Carrito & Cliente */}
            <div className="pb-3 border-b border-slate-100 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-50 text-blue-600 rounded-xl">
                  <ShoppingCart className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Mostrador / Carrito</h3>
                  <span className="text-xs text-slate-500 font-medium">{totalItemsCount} artículos</span>
                </div>
              </div>

              {/* Botón cerrar en vista móvil */}
              <button
                onClick={() => setIsMobileCartOpen(false)}
                className="lg:hidden p-1.5 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Selector de Cliente */}
            <div className="mt-3.5">
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Cliente de Mostrador</label>
              <select
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
                className="w-full text-xs font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
              >
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.razonSocial} {c.rfc ? `(${c.rfc})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Lista de Artículos en Carrito */}
            <div className="h-[210px] sm:h-[240px] overflow-y-auto divide-y divide-slate-100 py-1 mt-2.5">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs p-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-2 text-slate-400">
                    <Barcode className="w-6 h-6" />
                  </div>
                  <p className="font-bold text-slate-700">El carrito está vacío</p>
                  <p className="text-slate-400 mt-0.5 text-center">Escanea o haz clic en los artículos del catálogo para agregarlos.</p>
                </div>
              ) : (
                cart.map((item, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between text-xs gap-2 hover:bg-slate-50/50 px-1 rounded-lg transition-colors">
                    <div className="truncate pr-2 min-w-0">
                      <p className="font-bold text-slate-900 truncate">{item.nombre}</p>
                      <p className="text-[11px] text-slate-500 font-mono font-semibold">${item.precioUnitario.toFixed(2)} c/u</p>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <div className="flex items-center bg-slate-100 rounded-xl border border-slate-200 p-0.5">
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(idx, -1)}
                          className="w-7 h-7 flex items-center justify-center text-slate-700 hover:text-black font-bold rounded-lg hover:bg-white transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2.5 font-black font-mono text-slate-900">{item.cantidad}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(idx, 1)}
                          className="w-7 h-7 flex items-center justify-center text-slate-700 hover:text-black font-bold rounded-lg hover:bg-white transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <span className="font-mono font-black text-slate-900 w-20 text-right text-xs sm:text-sm">
                        ${item.subtotal.toFixed(2)}
                      </span>

                      <button
                        type="button"
                        onClick={() => setCart(cart.filter((_, i) => i !== idx))}
                        className="text-slate-400 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-100/70 transition-colors"
                        title="Quitar partida"
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
            <div className="bg-slate-900 text-white p-4 rounded-2xl space-y-2 text-xs shadow-inner">
              <div className="flex justify-between text-slate-400 font-medium">
                <span>Subtotal Neto:</span>
                <span className="font-mono font-bold text-slate-200">${subtotal.toFixed(2)} MXN</span>
              </div>
              <div className="flex justify-between text-slate-400 font-medium">
                <span>IVA Trasladado (16%):</span>
                <span className="font-mono font-bold text-slate-200">${impuestos.toFixed(2)} MXN</span>
              </div>
              <div className="flex justify-between text-white text-base font-black pt-2 border-t border-slate-800 items-baseline">
                <span>TOTAL A COBRAR:</span>
                <span className="font-mono text-xl sm:text-2xl font-black text-emerald-400">${total.toFixed(2)} <span className="text-xs font-normal text-slate-400">MXN</span></span>
              </div>
            </div>

            {/* Selector de Método de Pago */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTipoPago('EFECTIVO')}
                className={`py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  tipoPago === 'EFECTIVO'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Banknote className="w-4 h-4" /> Efectivo
              </button>

              <button
                type="button"
                onClick={() => {
                  setTipoPago('TARJETA');
                  setPagoCon(total);
                }}
                className={`py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  tipoPago === 'TARJETA'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <CreditCard className="w-4 h-4" /> Tarjeta
              </button>

              <button
                type="button"
                onClick={() => {
                  setTipoPago('TRANSFERENCIA');
                  setPagoCon(total);
                }}
                className={`py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  tipoPago === 'TRANSFERENCIA'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Zap className="w-4 h-4" /> Transfer
              </button>
            </div>

            {/* Calculadora de Denominaciones Rápidas para Efectivo */}
            {tipoPago === 'EFECTIVO' && (
              <div className="space-y-2.5 text-xs bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                  <button
                    type="button"
                    onClick={() => handleQuickCash(total)}
                    className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-800 font-mono font-bold text-xs shrink-0 shadow-xs active:scale-95"
                  >
                    Exacto
                  </button>
                  {[50, 100, 200, 500, 1000].map((den) => (
                    <button
                      key={den}
                      type="button"
                      onClick={() => handleQuickCash(den)}
                      className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-800 font-mono font-bold text-xs shrink-0 shadow-xs active:scale-95"
                    >
                      ${den.toLocaleString()}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <div className="flex-1">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">Recibido en Efectivo</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400 text-sm">$</span>
                      <input
                        type="number"
                        step="0.5"
                        value={pagoCon || ''}
                        onChange={(e) => setPagoCon(Number(e.target.value))}
                        placeholder="0.00"
                        className="w-full bg-white border border-slate-300 pl-7 pr-3 py-2 rounded-xl font-mono font-black text-slate-900 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
                      />
                    </div>
                  </div>
                  <div className="flex-1 text-right">
                    <span className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">Cambio a Entregar:</span>
                    <span className={`font-mono text-xl font-black block ${cambio > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                      ${cambio.toFixed(2)} <span className="text-xs font-normal">MXN</span>
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Botón de Cobro Rápido */}
            <button
              type="button"
              disabled={processingSale || cart.length === 0}
              onClick={handleCheckout}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl shadow-lg shadow-emerald-600/25 disabled:opacity-50 disabled:shadow-none transition-all active:scale-95 flex items-center justify-center gap-2 text-sm select-none"
            >
              {processingSale ? (
                'Procesando despacho en caja...'
              ) : (
                <>
                  <Printer className="w-4 h-4" /> Cobrar & Imprimir Ticket (${total.toFixed(2)} MXN)
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* BARRA FLOTANTE FIJA PARA DISPOSITIVOS TÁCTILES / MÓVILES (< 1024px) */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 bg-slate-900 text-white p-3.5 border-t border-slate-800 shadow-2xl z-30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-xl">
            <ShoppingCart className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block">{totalItemsCount} artículos</span>
            <span className="text-base font-bold font-mono text-white">${total.toFixed(2)} MXN</span>
          </div>
        </div>

        <button
          onClick={() => setIsMobileCartOpen(!isMobileCartOpen)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md active:scale-95"
        >
          {isMobileCartOpen ? 'Ver Catálogo' : 'Ver Carrito / Cobrar'}
          {isMobileCartOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>

      {/* MODAL PREVIEW DEL TICKET TÉRMICO (The Sovereign Lift) */}
      {showTicketModal && lastSale && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-xl">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Venta Despachada</h3>
              </div>
              <button
                onClick={() => setShowTicketModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Simulación del Ticket Térmico 58mm */}
            <div className="bg-slate-50 border border-dashed border-slate-300 p-4 rounded-2xl font-mono text-xs text-slate-800 space-y-2">
              <div className="text-center pb-2 border-b border-dashed border-slate-300">
                <p className="font-bold text-sm text-slate-900">{user?.tenant?.nombreComercial || 'ControlERP'}</p>
                <p className="text-xs text-slate-500">RFC: {user?.tenant?.identificacionFiscal || 'XAXX010101000'}</p>
                <p className="text-xs text-slate-500">{lastSale.almacen || 'Mostrador'}</p>
              </div>

              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Folio:</span>
                  <span className="font-bold">{lastSale.folio}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Fecha:</span>
                  <span>{new Date(lastSale.fecha).toLocaleTimeString('es-MX')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Cajero:</span>
                  <span>{lastSale.cajero}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Cliente:</span>
                  <span className="truncate max-w-[150px]">{lastSale.cliente}</span>
                </div>
              </div>

              <div className="border-t border-dashed border-slate-300 pt-2 space-y-1">
                {lastSale.items.map((it: any, i: number) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="truncate max-w-[140px]">{it.cantidad}x {it.nombre}</span>
                    <span className="font-bold">${it.subtotal.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-dashed border-slate-300 pt-2 space-y-1">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Subtotal:</span>
                  <span>${lastSale.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>IVA 16%:</span>
                  <span>${lastSale.impuestos.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-slate-900 pt-1 border-t border-slate-200">
                  <span>TOTAL:</span>
                  <span>${lastSale.total.toFixed(2)} MXN</span>
                </div>
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Pago ({lastSale.tipoPago}):</span>
                  <span>${lastSale.pagoCon.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-emerald-700 font-bold">
                  <span>Cambio:</span>
                  <span>${lastSale.cambio.toFixed(2)}</span>
                </div>
              </div>

              <div className="text-center pt-2 border-t border-dashed border-slate-300 text-xs text-slate-500">
                ¡Gracias por su compra!<br />
                Comprobante de Mostrador
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handlePrintTicket(lastSale)}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95"
              >
                <Printer className="w-4 h-4" /> Reimprimir Ticket
              </button>
              <button
                type="button"
                onClick={() => setShowTicketModal(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL APERTURA DE CAJA (The Sovereign Lift) */}
      {showAperturaModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-xl">
                  <Unlock className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm">Apertura de Turno de Caja</h3>
              </div>
              <button onClick={() => setShowAperturaModal(false)} className="text-slate-400 hover:text-white text-xs font-bold">✕</button>
            </div>

            <form onSubmit={handleAbrirCaja} className="p-6 space-y-4 text-xs">
              <p className="text-slate-600">
                Inicia un nuevo turno de caja registradora en el almacén <strong>{almacenes.find(a => a.id === almacenId)?.nombre}</strong>.
              </p>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Fondo Inicial de Caja en Efectivo ($ MXN) *</label>
                <input
                  type="number"
                  min="0"
                  step="10"
                  required
                  value={montoApertura}
                  onChange={(e) => setMontoApertura(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-base font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notas de Turno (Opcional)</label>
                <textarea
                  value={notasApertura}
                  onChange={(e) => setNotasApertura(e.target.value)}
                  placeholder="Ej. Fondo para cambio billetes chicos"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAperturaModal(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-md transition-all active:scale-95"
                >
                  Confirmar Apertura
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CORTE Z / CIERRE DE CAJA (The Sovereign Lift) */}
      {showCierreModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-rose-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-white/20 text-white rounded-xl">
                  <Lock className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm">Corte Z / Arqueo Diario de Caja</h3>
              </div>
              <button onClick={() => setShowCierreModal(false)} className="text-white text-xs font-bold">✕</button>
            </div>

            <form onSubmit={handleCerrarCaja} className="p-6 space-y-4 text-xs">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
                <p className="text-slate-600">Cajero: <strong className="text-slate-900">{turnoActivo?.usuarioNombre || user?.nombre}</strong></p>
                <p className="text-slate-600">Fondo Inicial: <strong className="font-mono text-slate-900">${turnoActivo?.montoApertura.toFixed(2)}</strong></p>
                <p className="text-slate-600">Ventas en Efectivo: <strong className="font-mono text-emerald-600 font-bold">+${turnoActivo?.totalEfectivo.toFixed(2)}</strong></p>
                <p className="text-slate-600 border-t border-slate-200 pt-1.5">
                  Total Esperado en Caja: <strong className="font-mono text-slate-900 font-bold">${((turnoActivo?.montoApertura || 0) + (turnoActivo?.totalEfectivo || 0)).toFixed(2)} MXN</strong>
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Efectivo Físico Contado en Caja ($ MXN) *</label>
                <input
                  type="number"
                  step="0.5"
                  required
                  value={montoCierreEfectivo}
                  onChange={(e) => setMontoCierreEfectivo(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-base font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Observaciones de Arqueo</label>
                <textarea
                  value={notasCierre}
                  onChange={(e) => setNotasCierre(e.target.value)}
                  placeholder="Ej. Caja cuadrada sin faltantes ni sobrantes"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:ring-2 focus:ring-rose-500"
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCierreModal(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow-md transition-all active:scale-95"
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
