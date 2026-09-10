'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { 
  Sliders, 
  Palette, 
  Building, 
  ShieldCheck, 
  FileText, 
  Save, 
  Check, 
  AlertCircle 
} from 'lucide-react';

export default function PersonalizacionPage() {
  const { user, updateTenantConfig } = useAuth();
  const tenant = user?.tenant;

  const [nombreComercial, setNombreComercial] = useState(tenant?.nombreComercial || '');
  const [razonSocial, setRazonSocial] = useState(tenant?.razonSocial || '');
  const [identificacionFiscal, setIdentificacionFiscal] = useState(tenant?.identificacionFiscal || '');
  const [regimenFiscal, setRegimenFiscal] = useState(tenant?.regimenFiscal || '601');
  const [codigoPostal, setCodigoPostal] = useState(tenant?.codigoPostal || '64000');
  const [colorPrimario, setColorPrimario] = useState(tenant?.colorPrimario || '#1e40af');
  const [textoEncabezadoDoc, setTextoEncabezadoDoc] = useState(tenant?.textoEncabezadoDoc || '');
  const [diasGraciaCredito, setDiasGraciaCredito] = useState(tenant?.diasGraciaCredito ?? 0);
  const [alertaVencimientoDias, setAlertaVencimientoDias] = useState(tenant?.alertaVencimientoDias ?? 5);
  const [politicaBloqueoCredito, setPoliticaBloqueoCredito] = useState(tenant?.politicaBloqueoCredito || 'ESTRICTO');

  // Configuración PAC / SAT CFDI 4.0
  const [pacProveedor, setPacProveedor] = useState((tenant as any)?.pacProveedor || 'FINKOK');
  const [pacUsuario, setPacUsuario] = useState((tenant as any)?.pacUsuario || '');
  const [pacPassword, setPacPassword] = useState((tenant as any)?.pacPassword || '');
  const [pacModoProduccion, setPacModoProduccion] = useState((tenant as any)?.pacModoProduccion || false);
  const [serieFactura, setSerieFactura] = useState((tenant as any)?.serieFactura || 'A');
  const [seriePagoRep, setSeriePagoRep] = useState((tenant as any)?.seriePagoRep || 'P');
  const [serieCartaPorte, setSerieCartaPorte] = useState((tenant as any)?.serieCartaPorte || 'CP');

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!user || (user.rol !== 'ADMIN' && user.rol !== 'SUPERADMIN')) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200 shadow-sm max-w-lg mx-auto mt-10">
        <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
        <h3 className="font-bold text-slate-800 text-lg">Acceso Restringido</h3>
        <p className="text-sm text-slate-500 mt-1">
          La personalización del negocio está reservada para usuarios con rol de <strong>ADMIN</strong> del negocio o <strong>SUPERADMIN</strong>.
        </p>
      </div>
    );
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;

    setSaving(true);
    setErrorMsg('');
    setSavedSuccess(false);

    try {
      const updates = {
        nombreComercial,
        razonSocial,
        identificacionFiscal,
        regimenFiscal,
        codigoPostal,
        colorPrimario,
        textoEncabezadoDoc,
        diasGraciaCredito: Number(diasGraciaCredito),
        alertaVencimientoDias: Number(alertaVencimientoDias),
        politicaBloqueoCredito,
        pacProveedor,
        pacUsuario,
        pacPassword,
        pacModoProduccion,
        serieFactura,
        seriePagoRep,
        serieCartaPorte,
      };

      const res = await fetch(`/api/tenants/${tenant.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (res.ok) {
        updateTenantConfig(updates);
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 4000);
      } else {
        setErrorMsg('No se pudieron guardar los cambios.');
      }
    } catch (err) {
      setErrorMsg('Error de red al guardar.');
    } finally {
      setSaving(false);
    }
  };

  const presetColors = [
    { name: 'Azul Corporativo', hex: '#1e40af' },
    { name: 'Índigo Real', hex: '#4338ca' },
    { name: 'Verde Esmeralda', hex: '#0f766e' },
    { name: 'Rojo Carmesí', hex: '#b91c1c' },
    { name: 'Púrpura Profundo', hex: '#6b21a8' },
    { name: 'Gris Carbón', hex: '#1e293b' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Sliders className="w-6 h-6 text-blue-600" />
            Personalización del Negocio
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Adapta la identidad de marca, datos fiscales para facturación SAT y políticas de control crediticio.
          </p>
        </div>

        {savedSuccess && (
          <span className="bg-emerald-100 text-emerald-800 text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1.5 animate-in fade-in">
            <Check className="w-4 h-4" /> Cambios Guardados
          </span>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Sección 1: Identidad & Branding */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Palette className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-900 text-base">Identidad de Marca & Tema Visual</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nombre Comercial del Negocio
              </label>
              <input
                type="text"
                value={nombreComercial}
                onChange={(e) => setNombreComercial(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Texto / Lema en Encabezado de Reportes y Documentos
              </label>
              <input
                type="text"
                value={textoEncabezadoDoc}
                onChange={(e) => setTextoEncabezadoDoc(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej. Especialistas en distribución y mayoreo industrial"
              />
            </div>
          </div>

          {/* Color Primario */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Color Primario del Sistema (Acento de Interfaz)
            </label>
            <div className="flex flex-wrap items-center gap-3">
              {presetColors.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setColorPrimario(c.hex)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                    colorPrimario === c.hex
                      ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span
                    className="w-4 h-4 rounded-full border border-black/10 shrink-0"
                    style={{ backgroundColor: c.hex }}
                  ></span>
                  {c.name}
                </button>
              ))}

              <div className="flex items-center gap-2 border border-slate-200 px-2 py-1 rounded-lg">
                <span className="text-xs text-slate-500">Personalizado:</span>
                <input
                  type="color"
                  value={colorPrimario}
                  onChange={(e) => setColorPrimario(e.target.value)}
                  className="w-7 h-7 rounded border-0 cursor-pointer p-0 bg-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sección 2: Políticas de Límite de Crédito */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-slate-900 text-base">Políticas de Control Crediticio a Clientes</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Días de Gracia de Tolerancia
              </label>
              <input
                type="number"
                min="0"
                max="30"
                value={diasGraciaCredito}
                onChange={(e) => setDiasGraciaCredito(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">Días tras vencimiento antes de bloquear</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Alerta Temprana de Vencimiento
              </label>
              <input
                type="number"
                min="1"
                max="15"
                value={alertaVencimientoDias}
                onChange={(e) => setAlertaVencimientoDias(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">Días de anticipación para avisar al vendedor</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Comportamiento al Exceder Límite
              </label>
              <select
                value={politicaBloqueoCredito}
                onChange={(e) => setPoliticaBloqueoCredito(e.target.value as 'ESTRICTO' | 'ADVERTENCIA')}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="ESTRICTO">Bloqueo Estricto (Prohibir Venta)</option>
                <option value="ADVERTENCIA">Modo Advertencia (Permite con Alerta)</option>
              </select>
              <p className="text-[11px] text-slate-400 mt-1">Regla aplicada al facturar</p>
            </div>
          </div>
        </div>

        {/* Sección 3: Datos Fiscales (Preparación CFDI 4.0 SAT) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <FileText className="w-5 h-5 text-purple-600" />
            <div>
              <h3 className="font-bold text-slate-900 text-base">Datos Fiscales para México (SAT CFDI 4.0)</h3>
              <p className="text-xs text-slate-500">Información legal requerida para emisión de comprobantes fiscales</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Razón Social Fiscal (Idéntica a CSF SAT)
              </label>
              <input
                type="text"
                value={razonSocial}
                onChange={(e) => setRazonSocial(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                RFC (Registro Federal de Contribuyentes)
              </label>
              <input
                type="text"
                value={identificacionFiscal}
                onChange={(e) => setIdentificacionFiscal(e.target.value.toUpperCase())}
                maxLength={13}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Régimen Fiscal (Catálogo SAT)
              </label>
              <select
                value={regimenFiscal || '601'}
                onChange={(e) => setRegimenFiscal(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="601">601 - General de Ley Personas Morales</option>
                <option value="612">612 - Personas Físicas con Actividades Empresariales</option>
                <option value="626">626 - Régimen Simplificado de Confianza (RESICO)</option>
                <option value="603">603 - Personas Morales con Fines no Lucrativos</option>
                <option value="605">605 - Sueldos y Salarios e Ingresos Asimilados</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Código Postal Fiscal del Emisor
              </label>
              <input
                type="text"
                value={codigoPostal || ''}
                onChange={(e) => setCodigoPostal(e.target.value)}
                maxLength={5}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Sección 4: Proveedor Autorizado de Certificación (PAC) & Certificados CSD */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
              <div>
                <h3 className="font-bold text-slate-900 text-base">Conexión con PAC & Certificados SAT (CSD)</h3>
                <p className="text-xs text-slate-500">Configuración del motor de timbrado en tiempo real para CFDI 4.0, REP 2.0 y Carta Porte 3.1</p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
              {pacModoProduccion ? '🔴 MODO PRODUCCIÓN' : '🟢 MODO SANDBOX (PRUEBAS)'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Proveedor PAC</label>
              <select
                value={pacProveedor}
                onChange={(e) => setPacProveedor(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="FINKOK">Finkok (Recomendado)</option>
                <option value="SW_SAPIEN">SW SmarterWeb / Sapien</option>
                <option value="PRODIGIA">Prodigia PAC</option>
                <option value="SIMULADOR">Simulador Local (Desarrollo sin costo)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Usuario / Contrato PAC</label>
              <input
                type="text"
                value={pacUsuario}
                onChange={(e) => setPacUsuario(e.target.value)}
                placeholder="ej. usuario@empresa.com"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Contraseña / Token API PAC</label>
              <input
                type="password"
                value={pacPassword}
                onChange={(e) => setPacPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Serie Facturas (Ingreso)</label>
              <input
                type="text"
                value={serieFactura}
                onChange={(e) => setSerieFactura(e.target.value.toUpperCase())}
                maxLength={4}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Serie Complemento Pago (REP)</label>
              <input
                type="text"
                value={seriePagoRep}
                onChange={(e) => setSeriePagoRep(e.target.value.toUpperCase())}
                maxLength={4}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Serie Carta Porte (Traslado)</label>
              <input
                type="text"
                value={serieCartaPorte}
                onChange={(e) => setSerieCartaPorte(e.target.value.toUpperCase())}
                maxLength={4}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 font-mono"
              />
            </div>
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={pacModoProduccion}
                onChange={(e) => setPacModoProduccion(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <span className="text-xs font-bold text-slate-800">
                Habilitar Timbrado Fiscal Oficial ante el SAT (Requiere timbres contratados con el PAC)
              </span>
            </label>
          </div>
        </div>

        {errorMsg && (
          <p className="text-xs font-semibold text-rose-600 bg-rose-50 p-3 rounded-lg border border-rose-200">
            {errorMsg}
          </p>
        )}

        {/* Botón Guardar */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-6 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Guardando configuración...' : 'Guardar Personalización'}
          </button>
        </div>
      </form>
    </div>
  );
}
