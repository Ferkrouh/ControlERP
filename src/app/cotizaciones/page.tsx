'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { calcularMontosVenta } from '@/lib/montos-venta';
import { 
  FileText, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  Users, 
  CreditCard, 
  Eye, 
  Printer, 
  ArrowRight, 
  RotateCcw, 
  Clock, 
  Calendar,
  Building2,
  Send,
  Sparkles,
  Mail,
  Edit
} from 'lucide-react';

interface CartCotItem {
  productoId: string;
  sku: string;
  nombre: string;
  unidadMedida: string;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
  subtotal: number;
}

function vistaImportes(items: CartCotItem[]) {
  try {
    return { ...calcularMontosVenta(items), error: '' };
  } catch (error) {
    return { subtotal: 0, impuestos: 0, total: 0, partidas: [], error: error instanceof Error ? error.message : 'Revise los importes de las partidas' };
  }
}

export default function CotizacionesPage() {
  const { user } = useAuth();
  const [cotizaciones, setCotizaciones] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [almacenes, setAlmacenes] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal Nueva Cotización
  const [showModal, setShowModal] = useState(false);
  const [clienteId, setClienteId] = useState('');
  const [vigenciaDias, setVigenciaDias] = useState(15);
  const [observaciones, setObservaciones] = useState('');
  const [condicionesPago, setCondicionesPago] = useState('Contado comercial / Sujeto a existencias');
  const [cart, setCart] = useState<CartCotItem[]>([]);

  // Selector de Producto
  const [selectedProdId, setSelectedProdId] = useState('');
  const [addQty, setAddQty] = useState(1);
  const [addPrice, setAddPrice] = useState(0);

  // Estados de Operación
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modal Conversión a Venta
  const [convertingCot, setConvertingCot] = useState<any>(null);
  const [convertAlmacenId, setConvertAlmacenId] = useState('');
  const [convertTipoPago, setConvertTipoPago] = useState<'CONTADO' | 'CREDITO'>('CONTADO');
  const [processingConvert, setProcessingConvert] = useState(false);
  const [convertError, setConvertError] = useState('');

  // Vista Detalle
  const [viewCot, setViewCot] = useState<any>(null);

  // Modal Enviar Cotización por Correo
  const [emailModalCot, setEmailModalCot] = useState<any>(null);
  const [emailDestinatarios, setEmailDestinatarios] = useState('');
  const [emailAsunto, setEmailAsunto] = useState('');
  const [emailMensaje, setEmailMensaje] = useState('');
  const [emailAdjuntarPdf, setEmailAdjuntarPdf] = useState(true);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailFeedback, setEmailFeedback] = useState<{ success?: string; error?: string } | null>(null);

  // Modal Modificar Cotización
  const [editingCot, setEditingCot] = useState<any>(null);
  const [editClienteId, setEditClienteId] = useState('');
  const [editVigenciaDias, setEditVigenciaDias] = useState(15);
  const [editObservaciones, setEditObservaciones] = useState('');
  const [editCondicionesPago, setEditCondicionesPago] = useState('Contado comercial / Sujeto a existencias');
  const [editCart, setEditCart] = useState<CartCotItem[]>([]);
  const [editSelectedProdId, setEditSelectedProdId] = useState('');
  const [editAddQty, setEditAddQty] = useState(1);
  const [editAddPrice, setEditAddPrice] = useState(0);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.tenantId) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [resCot, resCli, resAlm, resProd] = await Promise.all([
        fetch('/api/cotizaciones'),
        fetch('/api/clientes'),
        fetch('/api/almacenes'),
        fetch('/api/productos'),
      ]);

      if (resCot.ok && resCli.ok && resAlm.ok && resProd.ok) {
        const cotData = await resCot.json();
        const cliData = await resCli.json();
        const almData = await resAlm.json();
        const prodData = await resProd.json();

        setCotizaciones(cotData);
        setClientes(cliData);
        setAlmacenes(almData);
        setProductos(prodData);

        if (cliData.length > 0 && !clienteId) setClienteId(cliData[0].id);
        if (almData.length > 0 && !convertAlmacenId) setConvertAlmacenId(almData[0].id);
        if (prodData.length > 0 && !selectedProdId) {
          setSelectedProdId(prodData[0].id);
          setAddPrice(prodData[0].precioVenta || 0);
        }
      }
    } catch (e) {
      console.error('Error cargando cotizaciones:', e);
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

    if (!Number.isFinite(addQty) || addQty <= 0 || !Number.isFinite(addPrice) || addPrice < 0) {
      setErrorMsg('Ingrese una cantidad positiva y un precio válido');
      return;
    }

    const existingIndex = cart.findIndex((i) => i.productoId === selectedProdId);
    if (existingIndex >= 0) {
      const updated = [...cart];
      updated[existingIndex].cantidad += addQty;
      updated[existingIndex].precioUnitario = addPrice;
      updated[existingIndex].subtotal = updated[existingIndex].cantidad * addPrice;
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
          precioUnitario: addPrice,
          descuento: 0,
          subtotal: addQty * addPrice,
        },
      ]);
    }
    setAddQty(1);
  };

  const handleRemoveFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const { subtotal: subtotalCart, impuestos: ivaCart, total: totalCart, error: importeError } = vistaImportes(cart);

  const handleCreateCotizacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      setErrorMsg('Debe agregar al menos un producto a la cotización');
      return;
    }

    if (importeError) { setErrorMsg(importeError); return; }
    setSaving(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/cotizaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteId,
          vigenciaDias,
          observaciones,
          condicionesPago,
          items: cart.map((i) => ({
            productoId: i.productoId,
            cantidad: i.cantidad,
            precioUnitario: i.precioUnitario,
            descuento: i.descuento,
          })),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(`¡Cotización ${data.folio} generada exitosamente!`);
        setCart([]);
        setObservaciones('');
        setTimeout(() => {
          setShowModal(false);
          setSuccessMsg('');
          loadData();
        }, 1200);
      } else {
        setErrorMsg(data.error || 'Error al emitir cotización');
      }
    } catch (err) {
      setErrorMsg('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  const handleExecuteConversion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!convertingCot || !convertAlmacenId) return;

    setProcessingConvert(true);
    setConvertError('');

    try {
      const res = await fetch(`/api/cotizaciones/${convertingCot.id}/convertir`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: convertingCot.version,
          almacenId: convertAlmacenId,
          tipoPago: convertTipoPago,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.message || '¡Venta procesada con éxito!');
        setConvertingCot(null);
        loadData();
      } else {
        setConvertError(data.error || 'No se pudo convertir a venta');
      }
    } catch (err) {
      setConvertError('Error de comunicación con el servidor');
    } finally {
      setProcessingConvert(false);
    }
  };

  const handlePrintCotizacion = (cot: any) => {
    window.open(`/api/cotizaciones/${cot.id}/pdf`, '_blank');
  };

  const handleOpenEmailModal = (cot: any) => {
    setEmailModalCot(cot);
    setEmailDestinatarios(cot.cliente?.email || '');
    setEmailAsunto(`Propuesta Comercial y Cotización ${cot.folio} - ControlERP`);
    setEmailMensaje(`Estimado(a) ${cot.cliente?.razonSocial || 'Cliente'},\n\nAdjuntamos la cotización comercial formal para su amable revisión y autorización.\n\nQuedamos a sus órdenes para cualquier duda o ajuste.`);
    setEmailAdjuntarPdf(true);
    setEmailFeedback(null);
  };

  const handleSendEmailCot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailModalCot) return;

    setSendingEmail(true);
    setEmailFeedback(null);

    try {
      const dests = emailDestinatarios
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      if (dests.length === 0) {
        setEmailFeedback({ error: 'Debe ingresar al menos una dirección de correo válida.' });
        setSendingEmail(false);
        return;
      }

      const res = await fetch(`/api/cotizaciones/${emailModalCot.id}/enviar-correo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destinatarios: dests,
          asunto: emailAsunto,
          mensajePersonalizado: emailMensaje,
          adjuntarPdf: emailAdjuntarPdf,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setEmailFeedback({ success: data.message || '¡Cotización enviada exitosamente por correo!' });
        setTimeout(() => {
          setEmailModalCot(null);
          setEmailFeedback(null);
        }, 1500);
      } else {
        setEmailFeedback({ error: data.error || 'Error al enviar cotización.' });
      }
    } catch (err) {
      setEmailFeedback({ error: 'Error de comunicación al enviar correo.' });
    } finally {
      setSendingEmail(false);
    }
  };

  const handleOpenEditCot = (cot: any) => {
    setEditingCot(cot);
    setEditClienteId(cot.clienteId || (clientes[0]?.id || ''));
    setEditVigenciaDias(cot.vigenciaDias || 15);
    setEditObservaciones(cot.observaciones || '');
    setEditCondicionesPago(cot.condicionesPago || 'Contado comercial / Sujeto a existencias');
    const items: CartCotItem[] = (cot.detalles || []).map((d: any) => ({
      productoId: d.productoId || d.producto?.id,
      sku: d.producto?.sku || 'SKU-00',
      nombre: d.producto?.nombre || 'Artículo',
      unidadMedida: d.producto?.unidadMedida || 'PZA',
      cantidad: Number(d.cantidad || 1),
      precioUnitario: Number(d.precioUnitario || 0),
      descuento: Number(d.descuento || 0),
      subtotal: Number(d.subtotal ?? d.cantidad * d.precioUnitario),
    }));
    setEditCart(items);
    if (productos.length > 0) {
      setEditSelectedProdId(productos[0].id);
      setEditAddPrice(productos[0].precioVenta || 0);
    }
    setEditAddQty(1);
    setEditError('');
  };

  const handleEditAddToCart = () => {
    const prod = productos.find((p) => p.id === editSelectedProdId);
    if (!prod) return;
    if (!Number.isFinite(editAddQty) || editAddQty <= 0 || !Number.isFinite(editAddPrice) || editAddPrice < 0) { setEditError('Ingrese una cantidad positiva y un precio válido'); return; }

    const existingIndex = editCart.findIndex((i) => i.productoId === editSelectedProdId);
    if (existingIndex >= 0) {
      const updated = [...editCart];
      updated[existingIndex].cantidad += editAddQty;
      updated[existingIndex].precioUnitario = editAddPrice;
      updated[existingIndex].subtotal = updated[existingIndex].cantidad * editAddPrice;
      setEditCart(updated);
    } else {
      setEditCart([
        ...editCart,
        {
          productoId: prod.id,
          sku: prod.sku,
          nombre: prod.nombre,
          unidadMedida: prod.unidadMedida,
          cantidad: editAddQty,
          precioUnitario: editAddPrice,
          descuento: 0,
          subtotal: editAddQty * editAddPrice,
        },
      ]);
    }
    setEditAddQty(1);
  };

  const handleEditRemoveFromCart = (index: number) => {
    setEditCart(editCart.filter((_, i) => i !== index));
  };

  const { subtotal: editSubtotalCart, impuestos: editIvaCart, total: editTotalCart, error: editImporteError } = vistaImportes(editCart);

  const handleSaveEditCot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCot) return;
    if (editCart.length === 0) {
      setEditError('La cotización debe contener al menos un artículo.');
      return;
    }

    if (editImporteError) { setEditError(editImporteError); return; }
    setSavingEdit(true);
    setEditError('');

    try {
      const res = await fetch(`/api/cotizaciones/${editingCot.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: editingCot.version,
          clienteId: editClienteId,
          vigenciaDias: editVigenciaDias,
          observaciones: editObservaciones,
          condicionesPago: editCondicionesPago,
          items: editCart.map((i) => ({
            productoId: i.productoId,
            cantidad: i.cantidad,
            precioUnitario: i.precioUnitario,
            descuento: i.descuento,
          })),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setEditingCot(null);
        loadData();
      } else {
        setEditError(data.error || 'Error al actualizar cotización.');
      }
    } catch (err) {
      setEditError('Error de comunicación con el servidor.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteCot = async (cot: any) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar la cotización ${cot.folio} para "${cot.cliente?.razonSocial || 'Cliente'}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    setDeletingId(cot.id);
    try {
      const res = await fetch(`/api/cotizaciones/${cot.id}`, {
        method: 'DELETE',
        headers: { 'If-Match': cot.version },
      });

      const data = await res.json();
      if (res.ok) {
        if (viewCot?.id === cot.id) setViewCot(null);
        loadData();
      } else {
        alert(data.error || 'No se pudo eliminar la cotización.');
      }
    } catch (err) {
      alert('Error de conexión al eliminar.');
    } finally {
      setDeletingId(null);
    }
  };

  const isReadOnly = user?.rol === 'AUDITOR' || user?.rol === 'ALMACENISTA';

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            Cotizaciones & Presupuestos
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Gestión de propuestas comerciales con vigencia y conversión a pedido/venta en un clic estilo Odoo.
          </p>
        </div>

        {!isReadOnly && (
          <button
            onClick={() => {
              setCart([]);
              setErrorMsg('');
              setSuccessMsg('');
              setShowModal(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-4 py-2.5 rounded-xl shadow-sm transition-all flex items-center gap-2 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" /> Nueva Cotización
          </button>
        )}
      </div>

      {/* Tabla de Cotizaciones */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-sm">Registro de Presupuestos Comerciales</h3>
          <span className="text-xs text-slate-500 font-medium">{cotizaciones.length} cotizaciones</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400">Cargando cotizaciones...</div>
        ) : cotizaciones.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            No hay cotizaciones registradas. Crea una para enviar propuestas a clientes.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 uppercase text-xs font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Folio</th>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4 text-center">Vigencia</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-right">Subtotal</th>
                  <th className="py-3 px-4 text-right">Total</th>
                  <th className="py-3 px-4">Emisión</th>
                  <th className="py-3 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cotizaciones.map((c) => {
                  const isExpired = new Date(c.fechaVencimiento) < new Date();
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-blue-700">
                        {c.folio}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-900">{c.cliente?.razonSocial}</p>
                        <p className="text-xs text-slate-400 font-mono">{c.cliente?.codigo || 'Sin código'} • RFC: {c.cliente?.rfc || 'Sin registrar'}</p>
                      </td>
                      <td className="py-3 px-4 text-center text-xs">
                        <span className={`inline-flex items-center gap-1 font-semibold ${isExpired ? 'text-rose-600' : 'text-slate-600'}`}>
                          <Clock className="w-3 h-3" />
                          {c.vigenciaDias} días ({new Date(c.fechaVencimiento).toLocaleDateString('es-MX')})
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {c.estado === 'CONVERTIDA' ? (
                          <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                            CONVERTIDA A VENTA
                          </span>
                        ) : isExpired ? (
                          <span className="bg-rose-100 text-rose-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                            EXPIRADA
                          </span>
                        ) : (
                          <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                            VIGENTE
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs text-slate-700">
                        ${c.subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        ${c.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500">
                        {new Date(c.fecha).toLocaleDateString('es-MX')}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Ver Detalle */}
                          <button
                            onClick={() => setViewCot(c)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-slate-100 transition-colors"
                            title="Ver detalles"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Imprimir Presupuesto */}
                          <button
                            onClick={() => handlePrintCotizacion(c)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-600 hover:bg-slate-100 transition-colors"
                            title="Imprimir presupuesto comercial"
                          >
                            <Printer className="w-4 h-4 text-emerald-600" />
                          </button>

                          {/* Enviar por Correo */}
                          <button
                            onClick={() => handleOpenEmailModal(c)}
                            className="p-1.5 rounded-lg text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors shadow-xs"
                            title="Enviar cotización por correo electrónico"
                          >
                            <Mail className="w-4 h-4" />
                          </button>

                          {/* Modificar Cotización */}
                          {!isReadOnly && c.estado !== 'CONVERTIDA' && (
                            <button
                              onClick={() => handleOpenEditCot(c)}
                              className="p-1.5 rounded-lg text-slate-600 hover:text-amber-600 hover:bg-slate-100 transition-colors"
                              title="Modificar cotización"
                            >
                              <Edit className="w-4 h-4 text-amber-600" />
                            </button>
                          )}

                          {/* Eliminar Cotización */}
                          {!isReadOnly && c.estado !== 'CONVERTIDA' && (
                            <button
                              onClick={() => handleDeleteCot(c)}
                              disabled={deletingId === c.id}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-colors"
                              title="Eliminar cotización"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}

                          {/* Convertir a Venta */}
                          {!isReadOnly && ['BORRADOR', 'ENVIADA', 'APROBADA'].includes(c.estado) && new Date(c.fechaVencimiento).getTime() > Date.now() && (
                            <button
                              onClick={() => {
                                setConvertingCot(c);
                                setConvertError('');
                              }}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                              title="Convertir a venta y despachar almacén"
                            >
                              <ArrowRight className="w-3.5 h-3.5" /> Convertir
                            </button>
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

      {/* MODAL NUEVA COTIZACIÓN */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center z-50 p-3 sm:p-6 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Generar Cotización / Presupuesto</h3>
                  <p className="text-xs text-slate-400">Oferta formal con vigencia y reserva comercial de precios</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCotizacion} className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
              {(errorMsg || importeError) && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2 font-medium">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMsg || importeError}</span>
                </div>
              )}
              {successMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Paso 1: Cliente y Vigencia */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Cliente Receptor *</label>
                    <select
                      value={clienteId}
                      onChange={(e) => setClienteId(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 font-medium"
                      required
                    >
                      {clientes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.razonSocial} ({c.codigo})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Vigencia del Presupuesto *</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[7, 15, 30].map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setVigenciaDias(d)}
                          className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                            vigenciaDias === d 
                              ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {d} Días
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Paso 2: Selección de Artículos */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                  Partidas del Presupuesto
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="sm:col-span-6">
                    <label className="block text-xs font-bold text-slate-600 mb-1">Artículo</label>
                    <select
                      value={selectedProdId}
                      onChange={(e) => handleProductSelectChange(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-medium"
                    >
                      {productos.map((p) => (
                        <option key={p.id} value={p.id}>
                          [{p.sku}] {p.nombre} — ${p.precioVenta.toFixed(2)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-600 mb-1">Cantidad</label>
                    <input
                      type="number"
                      min="1"
                      value={addQty}
                      onChange={(e) => setAddQty(Number(e.target.value))}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white text-center font-bold"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-600 mb-1">Precio Unit.</label>
                    <input
                      type="number"
                      step="0.01"
                      value={addPrice}
                      onChange={(e) => setAddPrice(Number(e.target.value))}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white text-right font-bold"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      onClick={handleAddToCart}
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-1.5 rounded-lg shadow-sm flex items-center justify-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Añadir
                    </button>
                  </div>
                </div>

                {/* Tabla Carrito */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">SKU</th>
                        <th className="py-2 px-3">Producto</th>
                        <th className="py-2 px-3 text-center">Cant.</th>
                        <th className="py-2 px-3 text-right">Precio</th>
                        <th className="py-2 px-3 text-right">Subtotal</th>
                        <th className="py-2 px-3 text-center">Quitar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {cart.map((it, idx) => (
                        <tr key={idx}>
                          <td className="py-2 px-3 font-mono font-bold text-blue-700">{it.sku}</td>
                          <td className="py-2 px-3">{it.nombre}</td>
                          <td className="py-2 px-3 text-center font-bold">{it.cantidad}</td>
                          <td className="py-2 px-3 text-right font-mono">${it.precioUnitario.toFixed(2)}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">${it.subtotal.toFixed(2)}</td>
                          <td className="py-2 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveFromCart(idx)}
                              className="text-slate-400 hover:text-rose-600 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totales */}
                <div className="flex justify-end pt-2">
                  <div className="w-64 space-y-1 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal:</span>
                      <span className="font-mono font-bold">${subtotalCart.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>IVA (16%):</span>
                      <span className="font-mono font-bold">${ivaCart.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-900 font-bold text-sm pt-1 border-t border-slate-200">
                      <span>Total:</span>
                      <span className="font-mono text-blue-600">${totalCart.toFixed(2)} MXN</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || cart.length === 0}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? 'Guardando...' : <><Send className="w-4 h-4" /> Emitir Cotización</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CONVERTIR A VENTA */}
      {convertingCot && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-emerald-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-white" />
                <h3 className="font-bold text-base">Convertir Cotización a Pedido de Venta</h3>
              </div>
              <button
                onClick={() => setConvertingCot(null)}
                className="w-7 h-7 rounded-full bg-emerald-700 text-white flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExecuteConversion} className="p-6 space-y-4 text-xs">
              {convertError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-2 font-medium">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{convertError}</span>
                </div>
              )}

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <p className="text-slate-500">Folio Cotización: <strong className="text-slate-900 font-mono">{convertingCot.folio}</strong></p>
                <p className="text-slate-500">Cliente: <strong className="text-slate-900">{convertingCot.cliente?.razonSocial}</strong></p>
                <p className="text-slate-500">Total a Facturar: <strong className="text-emerald-700 font-mono font-bold">${convertingCot.total.toFixed(2)} MXN</strong></p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Almacén de Salida / Despacho *</label>
                <select
                  value={convertAlmacenId}
                  onChange={(e) => setConvertAlmacenId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-medium"
                  required
                >
                  {almacenes.map((a) => (
                    <option key={a.id} value={a.id}>
                      🏬 {a.nombre}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-400 mt-1">El stock se descontará de este almacén y se registrará en el Kárdex en tiempo real.</p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Condición de Pago *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setConvertTipoPago('CONTADO')}
                    className={`py-2 font-bold rounded-xl border transition-all ${
                      convertTipoPago === 'CONTADO' 
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' 
                        : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    💵 Contado
                  </button>
                  <button
                    type="button"
                    onClick={() => setConvertTipoPago('CREDITO')}
                    className={`py-2 font-bold rounded-xl border transition-all ${
                      convertTipoPago === 'CREDITO' 
                        ? 'bg-purple-600 text-white border-purple-600 shadow-sm' 
                        : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    💳 Crédito (CxC)
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setConvertingCot(null)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={processingConvert}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-md disabled:opacity-50 flex items-center gap-1.5"
                >
                  {processingConvert ? 'Procesando despacho...' : 'Confirmar Venta & Despachar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL VER DETALLE */}
      {viewCot && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-base">Detalle de Cotización: {viewCot.folio}</h3>
              <button
                onClick={() => setViewCot(null)}
                className="w-7 h-7 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <p><strong>Cliente:</strong> {viewCot.cliente?.razonSocial}</p>
                <p><strong>Vigencia:</strong> {viewCot.vigenciaDias} días (Vence el {new Date(viewCot.fechaVencimiento).toLocaleDateString('es-MX')})</p>
                <p><strong>Estado:</strong> <span className="font-bold text-blue-600">{viewCot.estado}</span></p>
                {viewCot.observaciones && <p><strong>Notas:</strong> {viewCot.observaciones}</p>}
              </div>

              <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                <thead className="bg-slate-100 text-slate-700 font-semibold">
                  <tr>
                    <th className="p-2.5">SKU</th>
                    <th className="p-2.5">Producto</th>
                    <th className="p-2.5 text-center">Cant.</th>
                    <th className="p-2.5 text-right">Precio</th>
                    <th className="p-2.5 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {viewCot.detalles?.map((d: any) => (
                    <tr key={d.id}>
                      <td className="p-2.5 font-mono font-bold text-blue-700">{d.producto?.sku}</td>
                      <td className="p-2.5">{d.producto?.nombre}</td>
                      <td className="p-2.5 text-center font-bold">{d.cantidad}</td>
                      <td className="p-2.5 text-right font-mono">${d.precioUnitario.toFixed(2)}</td>
                      <td className="p-2.5 text-right font-mono font-bold">${d.subtotal.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-between items-center pt-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handlePrintCotizacion(viewCot)}
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold flex items-center gap-1.5"
                  >
                    <Printer className="w-4 h-4 text-emerald-600" /> Imprimir Propuesta
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const c = viewCot;
                      setViewCot(null);
                      handleOpenEmailModal(c);
                    }}
                    className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl font-bold flex items-center gap-1.5"
                  >
                    <Mail className="w-4 h-4 text-blue-600" /> Enviar por Correo
                  </button>
                  {!isReadOnly && viewCot.estado !== 'CONVERTIDA' && (
                    <button
                      type="button"
                      onClick={() => {
                        const c = viewCot;
                        setViewCot(null);
                        handleOpenEditCot(c);
                      }}
                      className="px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl font-bold flex items-center gap-1.5"
                    >
                      <Edit className="w-4 h-4 text-amber-600" /> Modificar
                    </button>
                  )}
                  {!isReadOnly && viewCot.estado !== 'CONVERTIDA' && (
                    <button
                      type="button"
                      onClick={() => handleDeleteCot(viewCot)}
                      className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-bold flex items-center gap-1.5"
                    >
                      <Trash2 className="w-4 h-4 text-rose-600" /> Eliminar
                    </button>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-slate-500">Total Presupuesto:</p>
                  <p className="font-mono text-lg font-bold text-blue-600">${viewCot.total.toFixed(2)} MXN</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ENVIAR COTIZACIÓN POR CORREO */}
      {emailModalCot && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600/30 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Enviar Cotización por Correo</h3>
                  <p className="text-xs text-slate-400">Folio: <span className="font-mono text-blue-300 font-bold">{emailModalCot.folio}</span></p>
                </div>
              </div>
              <button
                onClick={() => setEmailModalCot(null)}
                className="w-7 h-7 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendEmailCot} className="p-6 space-y-4 text-xs">
              {emailFeedback?.error && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-2 font-medium">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{emailFeedback.error}</span>
                </div>
              )}

              {emailFeedback?.success && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{emailFeedback.success}</span>
                </div>
              )}

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <p className="text-slate-500">Cliente: <strong className="text-slate-900">{emailModalCot.cliente?.razonSocial}</strong></p>
                <p className="text-slate-500">Total Cotizado: <strong className="text-blue-600 font-mono font-bold">${Number(emailModalCot.total).toFixed(2)} MXN</strong></p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Destinatarios (separar con comas para múltiples correos) *
                </label>
                <input
                  type="text"
                  value={emailDestinatarios}
                  onChange={(e) => setEmailDestinatarios(e.target.value)}
                  placeholder="ejemplo@cliente.com, compras@cliente.com"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Asunto del Correo *
                </label>
                <input
                  type="text"
                  value={emailAsunto}
                  onChange={(e) => setEmailAsunto(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Mensaje / Observaciones para el Cliente
                </label>
                <textarea
                  value={emailMensaje}
                  onChange={(e) => setEmailMensaje(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-blue-500"
                  placeholder="Escribe un mensaje de cortesía..."
                />
              </div>

              {/* Opciones de Archivos Adjuntos */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <span className="font-bold text-slate-700 block">Archivos Adjuntos:</span>
                <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emailAdjuntarPdf}
                    onChange={(e) => setEmailAdjuntarPdf(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                  />
                  <span>📎 Cotizacion_{emailModalCot.folio}.pdf (Propuesta Comercial Oficial)</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEmailModalCot(null)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={sendingEmail}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-md disabled:opacity-50 flex items-center gap-2"
                >
                  {sendingEmail ? (
                    'Enviando...'
                  ) : (
                    <>
                      <Send className="w-4 h-4" /> Enviar Cotización
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL MODIFICAR COTIZACIÓN (The Sovereign Lift) */}
      {editingCot && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Edit className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Modificar Cotización: {editingCot.folio}</h3>
                  <p className="text-xs text-slate-400">Ajusta cliente, vigencia, condiciones o partidas presupuestadas</p>
                </div>
              </div>
              <button
                onClick={() => setEditingCot(null)}
                className="w-7 h-7 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditCot} className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
              {(editError || editImporteError) && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-2 font-medium">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{editError || editImporteError}</span>
                </div>
              )}

              {/* Paso 1: Cliente y Vigencia */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Cliente Receptor *</label>
                  <select
                    value={editClienteId}
                    onChange={(e) => setEditClienteId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        [{c.codigo}] {c.razonSocial}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Vigencia de la Oferta *</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[7, 15, 30].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setEditVigenciaDias(d)}
                        className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                          editVigenciaDias === d
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {d} Días
                      </button>
                    ))}
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Condiciones Comerciales / Forma de Pago</label>
                  <input
                    type="text"
                    value={editCondicionesPago}
                    onChange={(e) => setEditCondicionesPago(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium"
                    placeholder="Ej. Contado comercial, 30 días crédito, etc."
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Notas u Observaciones</label>
                  <textarea
                    rows={2}
                    value={editObservaciones}
                    onChange={(e) => setEditObservaciones(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium"
                    placeholder="Notas adicionales..."
                  />
                </div>
              </div>

              {/* Paso 2: Partidas de la Cotización */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                  Partidas del Presupuesto
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="sm:col-span-6">
                    <label className="block text-xs font-bold text-slate-600 mb-1">Artículo</label>
                    <select
                      value={editSelectedProdId}
                      onChange={(e) => {
                        const pId = e.target.value;
                        setEditSelectedProdId(pId);
                        const prod = productos.find((p) => p.id === pId);
                        if (prod) setEditAddPrice(prod.precioVenta || 0);
                      }}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-medium"
                    >
                      {productos.map((p) => (
                        <option key={p.id} value={p.id}>
                          [{p.sku}] {p.nombre} — ${p.precioVenta.toFixed(2)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-600 mb-1">Cantidad</label>
                    <input
                      type="number"
                      min="1"
                      value={editAddQty}
                      onChange={(e) => setEditAddQty(Number(e.target.value))}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white text-center font-bold"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-600 mb-1">Precio Unit.</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editAddPrice}
                      onChange={(e) => setEditAddPrice(Number(e.target.value))}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white text-right font-bold"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      onClick={handleEditAddToCart}
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-1.5 rounded-lg shadow-sm flex items-center justify-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Añadir
                    </button>
                  </div>
                </div>

                {/* Tabla Carrito en Edición */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">SKU</th>
                        <th className="py-2 px-3">Producto</th>
                        <th className="py-2 px-3 text-center">Cant.</th>
                        <th className="py-2 px-3 text-right">Precio</th>
                        <th className="py-2 px-3 text-right">Subtotal</th>
                        <th className="py-2 px-3 text-center">Quitar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {editCart.map((it, idx) => (
                        <tr key={idx}>
                          <td className="py-2 px-3 font-mono font-bold text-blue-700">{it.sku}</td>
                          <td className="py-2 px-3">{it.nombre}</td>
                          <td className="py-2 px-3 text-center font-bold">{it.cantidad}</td>
                          <td className="py-2 px-3 text-right font-mono">${it.precioUnitario.toFixed(2)}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">${it.subtotal.toFixed(2)}</td>
                          <td className="py-2 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleEditRemoveFromCart(idx)}
                              className="text-slate-400 hover:text-rose-600 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totales Recalculados */}
                <div className="flex justify-end pt-2">
                  <div className="w-64 space-y-1 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal:</span>
                      <span className="font-mono font-bold">${editSubtotalCart.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>IVA (16%):</span>
                      <span className="font-mono font-bold">${editIvaCart.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-900 font-bold text-sm pt-1 border-t border-slate-200">
                      <span>Total:</span>
                      <span className="font-mono text-blue-600">${editTotalCart.toFixed(2)} MXN</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingCot(null)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEdit || editCart.length === 0}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md disabled:opacity-50 flex items-center gap-2"
                >
                  {savingEdit ? 'Guardando cambios...' : <><Edit className="w-4 h-4" /> Guardar Cambios</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
