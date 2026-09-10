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
  FileText,
  Printer,
  Edit,
  X,
  Clock
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

  // Estados para Visualizar Venta
  const [selectedVentaView, setSelectedVentaView] = useState<any>(null);

  // Estados para Modificar Venta
  const [editingVenta, setEditingVenta] = useState<any>(null);
  const [editObservaciones, setEditObservaciones] = useState('');
  const [editTipoPago, setEditTipoPago] = useState<'CONTADO' | 'CREDITO'>('CONTADO');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');

  // Handler para imprimir factura / comprobante comercial
  const handlePrintFactura = (venta: any) => {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      alert('Por favor habilite los pop-ups en su navegador para imprimir comprobantes.');
      return;
    }

    const itemsHtml = venta.detalles?.map((d: any) => `
      <tr>
        <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-family: monospace;">${d.producto?.sku || 'N/A'}</td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0;">${d.producto?.nombre || 'Artículo'}</td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; text-align: center;">${d.cantidad}</td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">$${d.precioUnitario.toFixed(2)}</td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold;">$${d.subtotal.toFixed(2)}</td>
      </tr>
    `).join('') || '';

    const content = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Comprobante de Venta - ${venta.folio}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0f172a; margin: 40px; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 24px; }
            .badge { display: inline-block; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: bold; background: #e2e8f0; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }
            th { background: #f8fafc; text-align: left; padding: 8px; border-bottom: 2px solid #cbd5e1; font-size: 11px; text-transform: uppercase; }
            .totals { margin-top: 24px; display: flex; justify-content: flex-end; }
            .totals table { width: 280px; }
            .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px dashed #cbd5e1; padding-top: 16px; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h2 style="margin: 0 0 4px 0;">ControlERP</h2>
              <p style="margin: 0; font-size: 12px; color: #64748b;">Comprobante de Operación Comercial</p>
              <p style="margin: 4px 0 0 0; font-size: 12px; font-weight: 600;">Despacho: ${venta.almacen?.nombre || 'Almacén Central'}</p>
            </div>
            <div style="text-align: right;">
              <h3 style="margin: 0; font-family: monospace; color: #2563eb;">${venta.folio}</h3>
              <p style="margin: 4px 0 0 0; font-size: 12px;">Fecha: ${new Date(venta.fecha).toLocaleDateString('es-MX')}</p>
              <span class="badge" style="margin-top: 6px;">PAGO: ${venta.tipoPago}</span>
            </div>
          </div>

          <div style="margin-bottom: 20px; font-size: 13px; background: #f8fafc; padding: 12px 16px; border-radius: 8px;">
            <p style="margin: 0 0 4px 0;"><strong>Cliente:</strong> ${venta.cliente?.razonSocial || 'Público General'}</p>
            <p style="margin: 0; font-size: 12px; color: #64748b;"><strong>RFC:</strong> ${venta.cliente?.rfc || 'XAXX010101000'} | <strong>Código:</strong> ${venta.cliente?.codigo || 'CLI-01'}</p>
            ${venta.observaciones ? `<p style="margin: 6px 0 0 0; font-size: 12px;"><strong>Notas:</strong> ${venta.observaciones}</p>` : ''}
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 15%;">SKU</th>
                <th>Descripción del Artículo</th>
                <th style="text-align: center; width: 12%;">Cant.</th>
                <th style="text-align: right; width: 18%;">P. Unitario</th>
                <th style="text-align: right; width: 18%;">Importe</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="totals">
            <table>
              <tr>
                <td style="padding: 4px 0;">Subtotal:</td>
                <td style="text-align: right; font-family: monospace; font-weight: bold;">$${venta.subtotal.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0;">IVA (16%):</td>
                <td style="text-align: right; font-family: monospace; font-weight: bold;">$${venta.impuestos.toFixed(2)}</td>
              </tr>
              <tr style="border-top: 1px solid #0f172a; font-size: 15px;">
                <td style="padding: 8px 0; font-weight: bold;">Total Neto:</td>
                <td style="text-align: right; font-family: monospace; font-weight: bold; color: #2563eb;">$${venta.total.toFixed(2)}</td>
              </tr>
            </table>
          </div>

          <div class="footer">
            <p style="margin: 0;">Gracias por su preferencia • Documento de control interno y despacho físico</p>
          </div>

          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(content);
    printWindow.document.close();
  };

  // Handler para eliminar venta con reversión de inventario
  const handleDeleteVenta = async (venta: any) => {
    const confirmDelete = confirm(
      `¿Estás seguro de eliminar y cancelar la venta "${venta.folio}"?\n\nAl eliminarla, las cantidades despachadas se reintegrarán automáticamente al almacén "${venta.almacen?.nombre}" y se ajustará el saldo del cliente.`
    );
    if (!confirmDelete) return;

    try {
      const res = await fetch(`/api/ventas/${venta.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Venta eliminada y existencias reintegradas con éxito.');
        loadData();
      } else {
        alert(data.error || 'No se pudo eliminar la venta.');
      }
    } catch (err) {
      alert('Error de conexión al intentar eliminar la venta.');
    }
  };

  // Handler para guardar modificación de venta
  const handleSaveEditVenta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVenta) return;

    setSavingEdit(true);
    setEditError('');

    try {
      const res = await fetch(`/api/ventas/${editingVenta.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          observaciones: editObservaciones,
          tipoPago: editTipoPago,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setEditingVenta(null);
        loadData();
      } else {
        setEditError(data.error || 'Error al actualizar la venta.');
      }
    } catch (err) {
      setEditError('Error de conexión al modificar venta.');
    } finally {
      setSavingEdit(false);
    }
  };

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
  const facturasVencidasCliente = selectedClienteObj?.cxc?.filter(
    (x: any) => (x.estado === 'VENCIDA' || new Date(x.fechaVencimiento) < new Date()) && x.saldoPendiente > 0
  ) || [];
  const tieneMoraCliente = facturasVencidasCliente.length > 0;
  const creditoExcedido = selectedClienteObj && tipoPago === 'CREDITO' && (selectedClienteObj.saldoActual + totalCart > selectedClienteObj.limiteCredito);
  const estaBloqueado = selectedClienteObj?.estadoCredito === 'BLOQUEADO';

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-blue-600" />
            Área Comercial
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Gestión comercial de ventas de mostrador y crédito con control de almacenes y cuentas corrientes.
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
          <h3 className="font-bold text-slate-800 text-sm">Historial de Operaciones Comerciales</h3>
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
                  <th className="py-3 px-4 text-center">Estado Fiscal SAT</th>
                  <th className="py-3 px-4 text-right">Subtotal</th>
                  <th className="py-3 px-4 text-right">IVA (16%)</th>
                  <th className="py-3 px-4 text-right">Total</th>
                  <th className="py-3 px-4">Fecha</th>
                  <th className="py-3 px-4 text-center">Acciones</th>
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
                    <td className="py-3 px-4 text-center">
                      {v.estadoFiscal === 'TIMBRADA' ? (
                        <div className="flex flex-col items-center">
                          <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> CFDI 4.0
                          </span>
                          <span className="text-[9px] font-mono text-slate-500 mt-0.5 truncate max-w-[120px]" title={v.uuidFiscal}>
                            {v.uuidFiscal?.slice(0, 13)}...
                          </span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 text-[10px] font-medium px-2 py-0.5 rounded-full">
                          <Clock className="w-3 h-3 text-slate-400" /> Sin Timbrar
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right text-xs text-slate-700 font-medium font-mono">
                      ${v.subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right text-xs text-slate-500 font-mono">
                      ${v.impuestos.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900 font-mono">
                      ${v.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500">
                      {new Date(v.fecha).toLocaleDateString('es-MX')}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {/* Timbrar CFDI 4.0 ante el SAT */}
                        {v.estadoFiscal !== 'TIMBRADA' && !isReadOnly && !isAlmacenista && (
                          <button
                            onClick={() => handleTimbrarVenta(v.id, v.folio)}
                            disabled={timbrandoId === v.id}
                            className="p-1.5 rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs"
                            title="Timbrar CFDI 4.0 oficial"
                          >
                            <FileCheck className={`w-4 h-4 ${timbrandoId === v.id ? 'animate-spin' : ''}`} />
                          </button>
                        )}

                        {/* Descargar XML sellado */}
                        {v.estadoFiscal === 'TIMBRADA' && v.xmlSat && (
                          <button
                            onClick={() => {
                              const blob = new Blob([v.xmlSat], { type: 'application/xml' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `${v.folio}_CFDI40.xml`;
                              a.click();
                              URL.revokeObjectURL(url);
                            }}
                            className="p-1.5 rounded-lg text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors"
                            title="Descargar XML CFDI 4.0 sellado"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                        )}

                        {/* 1. Visualizar Venta */}
                        <button
                          onClick={() => setSelectedVentaView(v)}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Visualizar detalles de la venta"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* 2. Imprimir Factura / Comprobante */}
                        <button
                          onClick={() => handlePrintFactura(v)}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                          title="Imprimir factura / comprobante"
                        >
                          <Printer className="w-4 h-4 text-emerald-600" />
                        </button>

                        {/* 3. Modificar Venta */}
                        {!isReadOnly && !isAlmacenista && v.estadoFiscal !== 'TIMBRADA' && (
                          <button
                            onClick={() => {
                              setEditingVenta(v);
                              setEditObservaciones(v.observaciones || '');
                              setEditTipoPago(v.tipoPago);
                              setEditError('');
                            }}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                            title="Modificar venta"
                          >
                            <Edit className="w-4 h-4 text-amber-600" />
                          </button>
                        )}

                        {/* 4. Eliminar Venta */}
                        {!isReadOnly && !isAlmacenista && (user?.rol === 'ADMIN' || user?.rol === 'SUPERADMIN') && v.estadoFiscal !== 'TIMBRADA' && (
                          <button
                            onClick={() => handleDeleteVenta(v)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Eliminar venta y reintegrar stock"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      {/* Modal de Nueva Venta Rediseñado - Terminal Fintech POS */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center z-50 p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-5xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden">
            
            {/* Header Modal */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <ShoppingCart className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                    Terminal de Emisión de Venta & CFDI
                  </h3>
                  <p className="text-xs text-slate-400">
                    Despacho de almacén con afectación en vivo de existencias y cuenta corriente
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Cuerpo del Modal */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
              
              {/* Paso 1: Configuración de Cliente, Almacén y Forma de Pago */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-600 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" /> 1. Datos de Operación & Despacho
                  </span>
                  {selectedClienteObj && (
                    <span className="text-[11px] font-mono text-slate-500">
                      RFC: <strong className="text-slate-800">{selectedClienteObj.rfc || 'XAXX010101000'}</strong>
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Selector Cliente */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Cliente Receptor *</label>
                    <select
                      value={clienteId}
                      onChange={(e) => setClienteId(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium text-slate-800 transition-all outline-none"
                      required
                    >
                      {clientes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.razonSocial} ({c.codigo})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Selector Almacén */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Almacén de Salida *</label>
                    <select
                      value={almacenId}
                      onChange={(e) => {
                        setAlmacenId(e.target.value);
                        setCart([]); // Limpiar carrito para garantizar stock exacto del nuevo almacén
                      }}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium text-slate-800 transition-all outline-none"
                      required
                    >
                      {almacenes.map((a) => (
                        <option key={a.id} value={a.id}>
                          🏬 {a.nombre} {a.esPrincipal ? '★ (Principal)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Selector Condición de Pago */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Condición Comercial *</label>
                    <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setTipoPago('CONTADO')}
                        className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                          tipoPago === 'CONTADO' 
                            ? 'bg-white text-emerald-700 shadow-sm' 
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        💵 Contado
                      </button>
                      <button
                        type="button"
                        onClick={() => setTipoPago('CREDITO')}
                        className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                          tipoPago === 'CREDITO' 
                            ? 'bg-purple-600 text-white shadow-sm' 
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        💳 Crédito CxC
                      </button>
                    </div>
                  </div>
                </div>

                {/* Banner de Crédito en Tiempo Real y Control de Cartera Vencida */}
                {tipoPago === 'CREDITO' && selectedClienteObj && (
                  <div className="space-y-2">
                    <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-xl text-xs flex flex-wrap items-center justify-between gap-3 animate-in fade-in">
                      <div className="flex items-center gap-2 text-purple-900 font-semibold">
                        <CreditCard className="w-4 h-4 text-purple-600" />
                        <span>Línea de Crédito Otorgada:</span>
                        <span className="font-mono text-slate-900 font-bold">${selectedClienteObj.limiteCredito.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs font-mono">
                        <div>
                          <span className="text-slate-500">Saldo Ocupado: </span>
                          <strong className="text-slate-800">${selectedClienteObj.saldoActual.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>
                        </div>
                        <div className="border-l border-purple-200 pl-4">
                          <span className="text-slate-500">Disponible: </span>
                          <strong className={selectedClienteObj.limiteCredito - selectedClienteObj.saldoActual >= totalCart ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                            ${Math.max(0, selectedClienteObj.limiteCredito - selectedClienteObj.saldoActual).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </strong>
                        </div>
                      </div>
                    </div>

                    {/* Alerta si el cliente tiene facturas vencidas */}
                    {tieneMoraCliente && (
                      <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-start gap-2 animate-in fade-in">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold">⚠️ Atención: Este cliente tiene {facturasVencidasCliente.length} factura(s) con vencimiento cumplido en Cartera.</p>
                          <p className="text-[11px] text-rose-700 mt-0.5">
                            Total en mora: <strong className="font-mono">${facturasVencidasCliente.reduce((acc: number, f: any) => acc + f.saldoPendiente, 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>. Se recomienda solicitar cobro antes de otorgar más crédito.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Alerta si el crédito está bloqueado o excede el límite */}
                    {estaBloqueado && (
                      <div className="p-3 bg-red-100 border border-red-300 text-red-900 text-xs rounded-xl flex items-center gap-2 font-bold animate-pulse">
                        <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                        <span>⛔ CRÉDITO BLOQUEADO: El cliente tiene su línea restringida por políticas de mora o riesgo crediticio.</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Paso 2: Selección y Agregado de Artículos */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-600 flex items-center gap-1.5">
                    <ShoppingCart className="w-3.5 h-3.5" /> 2. Selección de Artículos & Existencias
                  </span>
                  <span className="text-xs text-slate-400">
                    Almacén activo: <strong className="text-slate-700">{almacenes.find(a => a.id === almacenId)?.nombre}</strong>
                  </span>
                </div>

                {/* Formulario Rápido de Agregar */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                  <div className="sm:col-span-6">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Buscar / Elegir Artículo</label>
                    <select
                      value={selectedProdId}
                      onChange={(e) => handleProductSelectChange(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white font-medium text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {productos.map((p) => {
                        const ex = p.existencias?.find((e: any) => e.almacenId === almacenId);
                        const stock = ex ? ex.cantidad : 0;
                        return (
                          <option key={p.id} value={p.id}>
                            [{p.sku}] {p.nombre} — Stock: {stock} {p.unidadMedida} — ${p.precioVenta.toFixed(2)}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Cantidad</label>
                    <input
                      type="number"
                      min="1"
                      value={addQty}
                      onChange={(e) => setAddQty(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white font-bold text-center text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Precio Unit. ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={addPrice}
                      onChange={(e) => setAddPrice(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white font-bold text-right text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      onClick={handleAddToCart}
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-2 rounded-lg shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" /> Agregar
                    </button>
                  </div>
                </div>

                {/* Tabla de Artículos en Carrito */}
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/80 text-slate-700 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-4">Clave / Producto</th>
                        <th className="py-2.5 px-3 text-center">Unidad</th>
                        <th className="py-2.5 px-3 text-center">Cant.</th>
                        <th className="py-2.5 px-3 text-right">Precio Unit.</th>
                        <th className="py-2.5 px-4 text-right">Subtotal</th>
                        <th className="py-2.5 px-3 text-center">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {cart.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400">
                            <ShoppingCart className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                            No has agregado ningún artículo al pedido todavía.
                          </td>
                        </tr>
                      ) : (
                        cart.map((it, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-2.5 px-4">
                              <p className="font-bold text-slate-900">{it.nombre}</p>
                              <span className="font-mono text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                {it.sku}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center text-slate-500 font-medium">{it.unidadMedida}</td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg">
                                {it.cantidad}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-700">
                              ${it.precioUnitario.toFixed(2)}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                              ${it.subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveFromCart(idx)}
                                className="w-7 h-7 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors inline-flex items-center justify-center"
                                title="Eliminar artículo"
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

                {/* Observaciones y Resumen de Totales */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Notas u Observaciones del Pedido</label>
                    <textarea
                      rows={2}
                      value={observaciones}
                      onChange={(e) => setObservaciones(e.target.value)}
                      placeholder="Ej. Entregar en rampa 2, atención con el Ing. Pérez..."
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                    />
                  </div>

                  <div className="bg-slate-900 text-white p-4 rounded-2xl space-y-2 shadow-inner">
                    <div className="flex justify-between text-xs text-slate-300">
                      <span>Subtotal de Venta:</span>
                      <span className="font-mono font-bold">${subtotalCart.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-300">
                      <span>IVA Trasladado (16%):</span>
                      <span className="font-mono font-bold">${ivaCart.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-base font-bold text-white pt-2 border-t border-slate-800">
                      <span>Total Neto a Cobrar:</span>
                      <span className="font-mono text-blue-400 text-lg">${totalCart.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Mensajes de Notificación */}
              {errorMsg && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2 animate-in fade-in">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span className="font-medium">{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span className="font-bold">{successMsg}</span>
                </div>
              )}
            </div>

            {/* Footer de Acciones del Modal */}
            <div className="px-6 py-4 bg-white border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancelar Operación
              </button>

              <button
                type="button"
                onClick={handleCreateVenta}
                disabled={saving || cart.length === 0}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm px-6 py-2.5 rounded-xl shadow-lg shadow-blue-600/30 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? (
                  <>Procesando y afectando almacén...</>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Emitir Venta (${totalCart.toLocaleString('es-MX', { minimumFractionDigits: 2 })})
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Modal Visualizar Detalle de Venta */}
      {selectedVentaView && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    Comprobante de Venta: <span className="font-mono text-blue-600">{selectedVentaView.folio}</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Fecha: {new Date(selectedVentaView.fecha).toLocaleString('es-MX')} • Despachado por: {selectedVentaView.usuarioNombre}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedVentaView(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-xs"
              >
                ✕
              </button>
            </div>

            {/* Datos del Cliente y Almacén */}
            <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-2xl text-xs border border-slate-200/80">
              <div>
                <p className="text-slate-500 font-medium">Cliente Receptor:</p>
                <p className="font-bold text-slate-900 text-sm">{selectedVentaView.cliente?.razonSocial}</p>
                <p className="text-[11px] font-mono text-slate-400">RFC: {selectedVentaView.cliente?.rfc || 'XAXX010101000'}</p>
              </div>
              <div className="text-right">
                <p className="text-slate-500 font-medium">Almacén de Salida:</p>
                <p className="font-bold text-slate-800">{selectedVentaView.almacen?.nombre}</p>
                <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  selectedVentaView.tipoPago === 'CREDITO' ? 'bg-purple-100 text-purple-800' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  PAGO: {selectedVentaView.tipoPago}
                </span>
              </div>
            </div>

            {selectedVentaView.observaciones && (
              <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl text-xs text-amber-900">
                <strong>Notas:</strong> {selectedVentaView.observaciones}
              </div>
            )}

            {/* Partidas Despachadas */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b">
                  <tr>
                    <th className="py-2.5 px-3">SKU</th>
                    <th className="py-2.5 px-3">Descripción</th>
                    <th className="py-2.5 px-3 text-center">Cant.</th>
                    <th className="py-2.5 px-3 text-right">P. Unitario</th>
                    <th className="py-2.5 px-3 text-right">Importe</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {selectedVentaView.detalles?.map((det: any) => (
                    <tr key={det.id} className="hover:bg-slate-50/70">
                      <td className="py-2 px-3 font-mono text-[11px] text-blue-600">{det.producto?.sku}</td>
                      <td className="py-2 px-3 font-medium text-slate-800">{det.producto?.nombre}</td>
                      <td className="py-2 px-3 text-center font-bold text-slate-900">{det.cantidad} {det.producto?.unidadMedida}</td>
                      <td className="py-2 px-3 text-right font-mono">${det.precioUnitario.toFixed(2)}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">${det.subtotal.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totales */}
            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => handlePrintFactura(selectedVentaView)}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-colors"
              >
                <Printer className="w-4 h-4 text-emerald-400" /> Imprimir Comprobante
              </button>

              <div className="w-56 space-y-1 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-mono font-semibold">${selectedVentaView.subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>IVA (16%):</span>
                  <span className="font-mono font-semibold">${selectedVentaView.impuestos.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-slate-900 pt-1 border-t border-slate-200">
                  <span>Total Neto:</span>
                  <span className="font-mono text-blue-600">${selectedVentaView.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Modificar Venta */}
      {editingVenta && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <Edit className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Modificar Venta</h3>
                  <p className="text-xs font-mono text-blue-600 font-semibold">{editingVenta.folio}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingVenta(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditVenta} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Cliente Receptor</label>
                <input
                  type="text"
                  disabled
                  value={editingVenta.cliente?.razonSocial || ''}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-100 text-slate-600 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Condición de Pago</label>
                <select
                  value={editTipoPago}
                  onChange={(e) => setEditTipoPago(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium"
                >
                  <option value="CONTADO">Contado</option>
                  <option value="CREDITO">Crédito</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notas u Observaciones</label>
                <textarea
                  rows={3}
                  value={editObservaciones}
                  onChange={(e) => setEditObservaciones(e.target.value)}
                  placeholder="Actualizar notas del pedido o despacho..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
              </div>

              {editError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingVenta(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-5 py-2 rounded-xl shadow-md shadow-blue-500/20 disabled:opacity-50 transition-all flex items-center gap-1.5"
                >
                  {savingEdit ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
