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
  PackageCheck,
  TrendingUp,
  DollarSign,
  Filter,
  X
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
  const [activeTab, setActiveTab] = useState<'TODAS' | 'PENDIENTES' | 'PARCIALES' | 'SURTIDAS'>('TODAS');

  useEffect(() => {
    if (user?.tenantId || user?.rol === 'SUPERADMIN') {
      loadData();
    }
  }, [user]);

  // Accesibilidad: Cerrar modales con tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showModal) setShowModal(false);
        if (showRecibirModal) setShowRecibirModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showModal, showRecibirModal]);

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

  const handlePrintOrdenCompra = (oc: any) => {
    if (user?.rol === 'ALMACENISTA') return;
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;

    const tenant = user?.tenant;
    const primaryColor = tenant?.colorPrimario || '#1e40af';
    const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[char]!);
    const safeColor = /^#[0-9a-f]{6}$/i.test(primaryColor) ? primaryColor : '#1e40af';

    const itemsHtml = oc.items?.map((it: any, idx: number) => `
      <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
        <td style="padding: 10px 12px; font-family: ui-monospace, monospace; font-size: 12px; font-weight: 600; color: #0f172a; border-bottom: 1px solid #e2e8f0;">
          ${escapeHtml(it.producto?.sku || 'N/A')}
        </td>
        <td style="padding: 10px 12px; font-size: 12px; color: #0f172a; border-bottom: 1px solid #e2e8f0;">
          <div style="font-weight: 600;">${escapeHtml(it.producto?.nombre || 'Artículo de Suministro')}</div>
          <div style="font-size: 12px; color: #64748b; margin-top: 2px;">Unidad: ${escapeHtml(it.producto?.unidadMedida || 'Sin especificar')}</div>
        </td>
        <td style="padding: 10px 12px; text-align: center; font-family: ui-monospace, monospace; font-size: 12px; font-weight: 600; color: #0f172a; border-bottom: 1px solid #e2e8f0;">
          ${escapeHtml(it.cantidadSolicitada)}
        </td>
        <td style="padding: 10px 12px; text-align: center; font-family: ui-monospace, monospace; font-size: 12px; color: #64748b; border-bottom: 1px solid #e2e8f0;">
          ${escapeHtml(it.cantidadRecibida || 0)}
        </td>
        <td style="padding: 10px 12px; text-align: right; font-family: ui-monospace, monospace; font-size: 12px; color: #0f172a; border-bottom: 1px solid #e2e8f0;">
          $${Number(it.costoUnitario).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
        </td>
        <td style="padding: 10px 12px; text-align: right; font-family: ui-monospace, monospace; font-size: 12px; font-weight: 700; color: #0f172a; border-bottom: 1px solid #e2e8f0;">
          $${Number(it.subtotal).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
        </td>
      </tr>
    `).join('') || '';

    const content = `
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <title>Orden de Compra - ${escapeHtml(oc.folio)}</title>
          <style>
            @page { size: letter; margin: 12mm 15mm; }
            * { box-sizing: border-box; }
            body {
              font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              color: #0f172a;
              margin: 0;
              padding: 24px;
              background: #ffffff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            table { width: 100%; border-collapse: collapse; }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="no-print" style="margin-bottom: 20px; display: flex; justify-content: flex-end; gap: 10px;">
              <button onclick="window.print()" style="background: ${safeColor}; color: white; border: none; padding: 8px 18px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px;">
              🖨️ Imprimir Orden de Compra
            </button>
          </div>

          <div style="height: 4px; background: ${safeColor}; width: 100%; margin-bottom: 20px; border-radius: 8px;"></div>

          <!-- Cabecera de Empresa y Folio -->
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px;">
            <div style="display: flex; gap: 16px; align-items: center; max-width: 60%;">
              ${tenant?.logoUrl ? `
                <div style="width: 80px; height: 80px; border-radius: 8px; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center; padding: 4px; background: #ffffff;">
                  <img src="${escapeHtml(tenant.logoUrl)}" alt="Logo" style="max-width: 100%; max-height: 100%; object-fit: contain;" />
                </div>
              ` : `
                <div style="width: 56px; height: 56px; border-radius: 8px; background: ${safeColor}; color: white; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 900;">
                  ${escapeHtml(tenant?.nombreComercial ? tenant.nombreComercial.charAt(0) : 'C')}
                </div>
              `}
              <div>
                <h1 style="margin: 0; font-size: 18px; font-weight: 800; color: #0f172a; letter-spacing: -0.02em;">
                  ${escapeHtml(tenant?.razonSocial || tenant?.nombreComercial || 'CONTROL ERP')}
                </h1>
                <p style="margin: 3px 0 0 0; font-size: 12px; font-weight: 700; color: #0f172a; font-family: ui-monospace, monospace;">
                  RFC: ${escapeHtml(tenant?.identificacionFiscal || 'Sin registrar')} • Régimen: ${escapeHtml(tenant?.regimenFiscal || 'Sin registrar')}
                </p>
                <p style="margin: 2px 0 0 0; font-size: 12px; color: #64748b;">
                  Lugar de Operación: C.P. ${escapeHtml(tenant?.codigoPostal || 'Sin registrar')} • Abastecimiento
                </p>
                ${tenant?.textoEncabezadoDoc ? `<p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b; font-style: italic;">"${escapeHtml(tenant.textoEncabezadoDoc)}"</p>` : ''}
              </div>
            </div>

            <div style="border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px 18px; background: #f8fafc; min-width: 220px; text-align: right;">
                <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: ${safeColor};">
                ORDEN DE COMPRA
              </div>
              <div style="font-family: ui-monospace, monospace; font-size: 18px; font-weight: 900; color: #0f172a; margin: 4px 0;">
                ${escapeHtml(oc.folio)}
              </div>
              <div style="font-size: 12px; color: #64748b;">
                Fecha Emisión: <strong>${new Date(oc.fecha).toLocaleDateString('es-MX')}</strong>
              </div>
              <div style="margin-top: 5px;">
                <span style="background: #eff6ff; color: #1d4ed8; font-size: 12px; font-weight: 700; padding: 2px 8px; border-radius: 12px; border: 1px solid #e2e8f0;">
                  ESTADO: ${escapeHtml(oc.estado)}
                </span>
              </div>
            </div>
          </div>

          <!-- Proveedor y Almacén de Recepción -->
          <div style="display: grid; grid-template-columns: 3fr 2fr; gap: 16px; margin-bottom: 20px;">
            <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; background: #ffffff;">
              <div style="font-size: 12px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">
                PROVEEDOR ADJUDICADO
              </div>
              <div style="font-size: 14px; font-weight: 800; color: #0f172a;">
                  ${escapeHtml(oc.proveedor?.razonSocial || 'Proveedor Registrado')}
              </div>
              <div style="font-size: 12px; font-family: ui-monospace, monospace; color: #0f172a; margin-top: 2px;">
                <strong>RFC:</strong> ${escapeHtml(oc.proveedor?.rfc || 'Sin registrar')}
              </div>
              <div style="font-size: 12px; color: #64748b; margin-top: 2px;">
                <strong>Teléfono:</strong> ${escapeHtml(oc.proveedor?.telefono || 'N/A')} • <strong>Email:</strong> ${escapeHtml(oc.proveedor?.email || 'N/A')}
              </div>
            </div>

            <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; background: #ffffff;">
              <div style="font-size: 12px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">
                PUNTO DE ENTREGA & ALMACÉN
              </div>
              <div style="font-size: 14px; font-weight: 700; color: #0f172a;">
                ${escapeHtml(oc.almacenDestino?.nombre || 'Sin asignar')}
              </div>
              <div style="font-size: 12px; color: #0f172a; margin-top: 2px;">
                <strong>Ubicación:</strong> ${escapeHtml(oc.almacenDestino?.ubicacion || 'Sin registrar')}
              </div>
              <div style="font-size: 12px; color: #0f172a; margin-top: 2px;">
                <strong>Fecha Esperada:</strong> ${oc.fechaEsperada ? new Date(oc.fechaEsperada).toLocaleDateString('es-MX') : 'Sin fecha'}
              </div>
            </div>
          </div>

          <!-- Tabla de Partidas Requeridas -->
          <table style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin-bottom: 20px;">
            <thead>
              <tr style="background: #0f172a; color: #ffffff;">
                <th style="padding: 10px 12px; text-align: left; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; width: 14%;">SKU</th>
                <th style="padding: 10px 12px; text-align: left; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Descripción</th>
                <th style="padding: 10px 12px; text-align: center; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; width: 12%;">Solicitada</th>
                <th style="padding: 10px 12px; text-align: center; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; width: 12%;">Recibida</th>
                <th style="padding: 10px 12px; text-align: right; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; width: 15%;">Costo Unit.</th>
                <th style="padding: 10px 12px; text-align: right; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; width: 17%;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <!-- Totales y Resumen Financiero -->
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; margin-bottom: 24px;">
            <div style="flex: 1; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; background: #f8fafc;">
              <div style="font-size: 12px; font-weight: 800; color: #64748b; text-transform: uppercase;">
                Importe Total
              </div>
              <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-top: 4px;">
                ${Number(oc.total).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}
              </div>
              ${oc.observaciones ? `
                <div style="margin-top: 10px; padding-top: 8px; border-top: 1px dashed #cbd5e1; font-size: 12px; color: #0f172a;">
                  <strong>Notas / Instrucciones de Entrega:</strong> ${escapeHtml(oc.observaciones)}
                </div>
              ` : ''}
            </div>

            <div style="width: 280px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background: #ffffff;">
              <table style="width: 100%;">
                <tr>
                  <td style="padding: 8px 14px; font-size: 12px; color: #0f172a; border-bottom: 1px solid #f1f5f9;">Subtotal:</td>
                  <td style="padding: 8px 14px; text-align: right; font-family: ui-monospace, monospace; font-size: 12px; font-weight: 600; color: #0f172a; border-bottom: 1px solid #f1f5f9;">
                    $${Number(oc.subtotal).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 14px; font-size: 12px; color: #0f172a; border-bottom: 1px solid #f1f5f9;">IVA Trasladado (16%):</td>
                  <td style="padding: 8px 14px; text-align: right; font-family: ui-monospace, monospace; font-size: 12px; font-weight: 600; color: #0f172a; border-bottom: 1px solid #f1f5f9;">
                    $${Number(oc.iva).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
                <tr style="background: #f8fafc;">
                  <td style="padding: 10px 14px; font-size: 14px; font-weight: 800; color: #0f172a;">TOTAL COMPRA:</td>
                  <td style="padding: 10px 14px; text-align: right; font-family: ui-monospace, monospace; font-size: 14px; font-weight: 900; color: ${safeColor};">
                    $${Number(oc.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
                  </td>
                </tr>
              </table>
            </div>
          </div>

          <!-- Pie de Página y Auditoría -->
          <div style="border-top: 1px solid #e2e8f0; padding-top: 12px; display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #64748b;">
            <div>
              Orden emitida por <strong>ControlERP</strong> • Folio: <span style="font-family: ui-monospace, monospace;">${escapeHtml(oc.folio)}</span>
            </div>
            <div>
              Cadena de Suministro & 3-Way Matching • Documento de Control Operativo
            </div>
          </div>

          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
  };

  // Métricas y KPIs de compras
  const kpiPendientes = ordenes.filter(o => o.estado === 'AUTORIZADA');
  const kpiParciales = ordenes.filter(o => o.estado === 'RECIBIDA_PARCIAL');
  const kpiSurtidas = ordenes.filter(o => o.estado === 'RECIBIDA_TOTAL');
  const isAlmacenista = user?.rol === 'ALMACENISTA';
  const totalMontoPendiente = kpiPendientes.reduce((acc, o) => acc + Number(o.total || 0), 0);
  const totalMontoCompras = ordenes.reduce((acc, o) => acc + Number(o.total || 0), 0);

  const filteredOrdenes = ordenes.filter((o) => {
    // Filtro por pestaña de estado
    if (activeTab === 'PENDIENTES' && o.estado !== 'AUTORIZADA') return false;
    if (activeTab === 'PARCIALES' && o.estado !== 'RECIBIDA_PARCIAL') return false;
    if (activeTab === 'SURTIDAS' && o.estado !== 'RECIBIDA_TOTAL') return false;

    // Filtro por texto
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
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Surtida Completa
          </span>
        );
      case 'RECIBIDA_PARCIAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600" /> Entrega Parcial
          </span>
        );
      case 'AUTORIZADA':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <PackageCheck className="w-3.5 h-3.5 text-blue-600" /> Autorizada (Por Recibir)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            {estado}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-3">
              <Truck className="w-7 h-7 text-blue-600" />
              Órdenes de Compra & Cadena de Suministro
            </h1>
            <span className="bg-blue-50 text-blue-700 text-xs px-2.5 py-0.5 rounded-full font-bold border border-blue-200">
              3-Way Matching
            </span>
          </div>
          <p className="text-slate-500 text-sm mt-1">
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
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-all hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Orden de Compra</span>
          </button>
        )}
      </div>

      {/* ALERTAS */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-3 text-sm">
          <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-3 text-sm">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* TARJETAS KPI (THE FINTECH LEDGER) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm shadow-slate-200/50 hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Por Recibir</span>
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <PackageCheck className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 font-mono">{kpiPendientes.length}</span>
            <span className="text-xs text-slate-500">órdenes autorizadas</span>
          </div>
          {!isAlmacenista && <div className="mt-2 text-xs text-blue-700 font-mono font-semibold">
            ${totalMontoPendiente.toLocaleString('es-MX', { minimumFractionDigits: 2 })} en tránsito
          </div>}
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm shadow-slate-200/50 hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Entregas Parciales</span>
            <span className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 font-mono">{kpiParciales.length}</span>
            <span className="text-xs text-slate-500">con saldo pendiente</span>
          </div>
          <div className="mt-2 text-xs text-amber-700 font-medium">
            Requieren seguimiento de remisión
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm shadow-slate-200/50 hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Compras Registradas</span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 font-mono">{ordenes.length}</span>
            <span className="text-xs text-slate-500">({kpiSurtidas.length} surtidas 100%)</span>
          </div>
          {!isAlmacenista && <div className="mt-2 text-xs text-emerald-700 font-mono font-semibold">
            ${totalMontoCompras.toLocaleString('es-MX', { minimumFractionDigits: 2 })} total histórico
          </div>}
        </div>
      </div>

      {/* PESTAÑAS DE ESTADO Y BUSCADOR */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('TODAS')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
              activeTab === 'TODAS'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            Todas ({ordenes.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('PENDIENTES')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
              activeTab === 'PENDIENTES'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            Por Recibir ({kpiPendientes.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('PARCIALES')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-amber-500/50 ${
              activeTab === 'PARCIALES'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            Parciales ({kpiParciales.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('SURTIDAS')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
              activeTab === 'SURTIDAS'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            Surtidas ({kpiSurtidas.length})
          </button>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por folio, proveedor o almacén..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white font-mono transition-colors"
          />
        </div>
      </div>

      {/* TABLA PRINCIPAL DE ORDENES */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-800">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Folio Orden</th>
                <th className="py-3.5 px-4">Fecha Emisión</th>
                <th className="py-3.5 px-4">Proveedor</th>
                <th className="py-3.5 px-4">Almacén Destino</th>
                <th className="py-3.5 px-4">Estado</th>
                {!isAlmacenista && <th className="py-3.5 px-4 text-right">Monto Total</th>}
                <th className="py-3.5 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={isAlmacenista ? 6 : 7} className="py-8 text-center text-slate-400">
                    Cargando órdenes de compra...
                  </td>
                </tr>
              ) : filteredOrdenes.length === 0 ? (
                <tr>
                  <td colSpan={isAlmacenista ? 6 : 7} className="py-10 text-center text-slate-400">
                    No se encontraron órdenes de compra registradas.
                  </td>
                </tr>
              ) : (
                filteredOrdenes.map((oc) => (
                  <tr key={oc.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-700">
                      {oc.folio}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 text-xs">
                      {new Date(oc.fecha).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-900">
                      {oc.proveedor?.razonSocial}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {oc.almacenDestino?.nombre}
                    </td>
                    <td className="py-3.5 px-4">
                      {getStatusBadge(oc.estado)}
                    </td>
                    {!isAlmacenista && <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                      ${Number(oc.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center justify-center gap-2">
                        {!isAlmacenista && <button
                          onClick={() => handlePrintOrdenCompra(oc)}
                          title="Imprimir Orden de Compra"
                          aria-label={`Imprimir Orden de Compra ${oc.folio}`}
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        >
                          <Printer className="w-4 h-4" />
                        </button>}

                        {oc.estado !== 'RECIBIDA_TOTAL' && user?.rol !== 'AUDITOR' && (
                          <button
                            onClick={() => handleOpenRecibir(oc)}
                            aria-label={`Recibir partidas 3-Way Matching para ${oc.folio}`}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold transition-all border border-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 shadow-sm"
                          >
                            <Truck className="w-3.5 h-3.5 text-emerald-600" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">
                    Nueva Orden de Compra (OC)
                  </h2>
                  <p className="text-xs text-slate-400">
                    Autorización previa de abastecimiento a proveedores con costeo unitario garantizado.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                aria-label="Cerrar modal de nueva orden"
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveOC} className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Proveedor *
                  </label>
                  <select
                    value={proveedorId}
                    onChange={(e) => setProveedorId(e.target.value)}
                    required
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  >
                    {proveedores.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.razonSocial} ({p.rfc})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Almacén de Entrega *
                  </label>
                  <select
                    value={almacenDestinoId}
                    onChange={(e) => setAlmacenDestinoId(e.target.value)}
                    required
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  >
                    {almacenes.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Fecha Prometida de Entrega
                  </label>
                  <input
                    type="date"
                    value={fechaEsperada}
                    onChange={(e) => setFechaEsperada(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Selector de Partidas */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-blue-600" />
                  Agregar Partidas a la Orden
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="md:col-span-6">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Producto</label>
                    <select
                      value={selectedProdId}
                      onChange={(e) => handleProductSelectChange(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm text-slate-900 focus:outline-none focus:border-blue-500"
                    >
                      {productos.map((prod) => (
                        <option key={prod.id} value={prod.id}>
                          {prod.sku} — {prod.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Cantidad</label>
                    <input
                      type="number"
                      min="1"
                      value={addQty}
                      onChange={(e) => setAddQty(Number(e.target.value))}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm text-slate-900 text-right font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Costo Unitario ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={addCost}
                      onChange={(e) => setAddCost(Number(e.target.value))}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm text-slate-900 text-right font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <button
                      type="button"
                      onClick={handleAddToCart}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-1.5 rounded-lg text-sm flex items-center justify-center gap-1 transition-colors shadow-sm"
                    >
                      <Plus className="w-4 h-4" /> Agregar
                    </button>
                  </div>
                </div>
              </div>

              {/* Partidas en el Carrito */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-3">SKU</th>
                      <th className="p-3">Producto</th>
                      <th className="p-3 text-right">Cantidad</th>
                      <th className="p-3 text-right">Costo Unitario</th>
                      <th className="p-3 text-right">Subtotal</th>
                      <th className="p-3 text-center">Quitar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cart.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-4 text-center text-slate-400">
                          No has agregado partidas a esta orden de compra.
                        </td>
                      </tr>
                    ) : (
                      cart.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/70">
                          <td className="p-3 font-mono font-semibold text-slate-900">{item.sku}</td>
                          <td className="p-3 font-medium text-slate-900">{item.nombre}</td>
                          <td className="p-3 text-right font-mono font-bold text-slate-900">{item.cantidad} {item.unidadMedida}</td>
                          <td className="p-3 text-right font-mono">${item.costoUnitario.toFixed(2)}</td>
                          <td className="p-3 text-right font-mono font-bold text-slate-900">
                            ${item.subtotal.toFixed(2)}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveFromCart(idx)}
                              className="text-rose-500 hover:text-rose-700 p-1 rounded hover:bg-rose-50 transition-colors"
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
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Instrucciones / Observaciones
                  </label>
                  <textarea
                    rows={2}
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder="Instrucciones especiales de entrega, condiciones comerciales, etc."
                    className="w-full bg-white border border-slate-300 rounded-xl p-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="w-full md:w-1/3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-2">
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>Partidas:</span>
                    <span className="font-mono font-semibold text-slate-900">{cart.length}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-slate-900 border-t border-slate-200 pt-2">
                    <span>Total Estimado:</span>
                    <span className="font-mono text-blue-700">
                      ${totalCart.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || cart.length === 0}
                  className="px-5 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm disabled:opacity-50 transition-all"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
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
                aria-label="Cerrar modal de recepción 3-Way"
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitRecibir} className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Folio Factura / Remisión del Proveedor
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. FAC-99482 o REM-1049"
                    value={folioFacturaProveedor}
                    onChange={(e) => setFolioFacturaProveedor(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                  <span className="text-xs text-slate-500 mt-1 block">
                    Se vinculará directamente a la Cuenta por Pagar (CxP).
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Términos de Pago *
                  </label>
                  <select
                    value={tipoPago}
                    onChange={(e) => setTipoPago(e.target.value as any)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="CREDITO">Crédito (Afecta CxP y Días de Gracia)</option>
                    <option value="CONTADO">Contado / Liquidado Inmediato</option>
                  </select>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-3">SKU & Producto</th>
                      <th className="p-3 text-center">Pedidas</th>
                      <th className="p-3 text-center">Recibidas Previas</th>
                      <th className="p-3 text-center">Pendientes</th>
                      <th className="p-3 text-center text-emerald-700">Recibiendo Ahora *</th>
                      <th className="p-3">No. Lote (Opcional)</th>
                      <th className="p-3">Caducidad</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {itemsRecibir.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70">
                        <td className="p-3">
                          <span className="font-mono font-bold text-slate-900 block">{item.sku}</span>
                          <span className="text-slate-500 text-xs">{item.nombre}</span>
                        </td>
                        <td className="p-3 text-center font-mono font-semibold text-slate-800">{item.cantidadSolicitada}</td>
                        <td className="p-3 text-center font-mono text-slate-500">{item.cantidadRecibidaPrevia}</td>
                        <td className="p-3 text-center font-mono font-bold text-amber-700">{item.cantidadPendiente}</td>
                        <td className="p-3 text-center">
                          <input
                            type="number"
                            min="0"
                            max={item.cantidadPendiente}
                            value={item.cantidadARecibir}
                            onChange={(e) => handleUpdateItemRecibir(idx, 'cantidadARecibir', Number(e.target.value))}
                            className="w-24 bg-white border border-emerald-500 rounded-lg px-2 py-1 text-sm text-center font-mono font-bold text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 shadow-sm"
                          />
                        </td>
                        <td className="p-3">
                          <input
                            type="text"
                            placeholder="Ej. LOT-2026-X"
                            value={item.numeroLote}
                            onChange={(e) => handleUpdateItemRecibir(idx, 'numeroLote', e.target.value)}
                            className="w-32 bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-500"
                          />
                        </td>
                        <td className="p-3">
                          <input
                            type="date"
                            value={item.fechaCaducidad}
                            onChange={(e) => handleUpdateItemRecibir(idx, 'fechaCaducidad', e.target.value)}
                            className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-900 focus:outline-none focus:border-slate-500"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowRecibirModal(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm disabled:opacity-50 transition-all flex items-center gap-2"
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
      {showPrintModal && printOC && !isAlmacenista && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-900 text-white">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Documento de Orden de Abastecimiento
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" /> Imprimir
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="text-slate-300 hover:text-white px-2 py-1 text-sm rounded hover:bg-slate-800"
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
