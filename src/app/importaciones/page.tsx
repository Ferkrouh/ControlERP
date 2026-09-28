'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';

type Tipo = 'PRODUCTOS' | 'PROVEEDORES' | 'CLIENTES';
type Modo = 'CREAR' | 'ACTUALIZAR';
type Previo = { loteId: string; hashArchivo: string; tipo: Tipo; modo: Modo; total: number;
  confirmable: boolean; errores: { fila: number; error: string }[]; muestra: { fila: number; clave: string; datos: Record<string, unknown> }[] };
type Resultado = { loteId: string; procesados: number; tipo: Tipo; modo: Modo };
const pendienteKey = 'controlerp:importacion-pendiente';
const stockKey = 'controlerp:stock-inicial-pendiente';
type StockPrevio = { token: string; vence: string; almacen: { codigo: string; nombre: string }; total: number;
  muestra: { fila: number; sku: string; cantidad: number }[] };

export default function ImportacionesPage() {
  const { user } = useAuth();
  const [tipo, setTipo] = useState<Tipo>('PRODUCTOS');
  const [modo, setModo] = useState<Modo>('CREAR');
  const [tenantId, setTenantId] = useState('');
  const [tenants, setTenants] = useState<{ id: string; nombreComercial: string }[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [previo, setPrevio] = useState<Previo | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [pendiente, setPendiente] = useState<{ loteId: string; hashArchivo: string } | null>(null);
  const [stockFile, setStockFile] = useState<File | null>(null);
  const [stockPrevio, setStockPrevio] = useState<StockPrevio | null>(null);
  const [stockPendiente, setStockPendiente] = useState<{ token: string; clave: string } | null>(null);
  const [stockResultado, setStockResultado] = useState('');

  useEffect(() => {
    try { const raw = sessionStorage.getItem(pendienteKey); if (raw) setPendiente(JSON.parse(raw)); } catch { /* sesión corrupta */ }
    try { const raw = sessionStorage.getItem(stockKey); if (raw) setStockPendiente(JSON.parse(raw)); } catch { /* sesión corrupta */ }
  }, []);
  useEffect(() => {
    if (user?.rol !== 'SUPERADMIN') return;
    fetch('/api/tenants').then(r => r.ok ? r.json() : []).then(setTenants).catch(() => setTenants([]));
  }, [user?.rol]);
  const cambiar = () => { setPrevio(null); setResultado(null); setError(''); };
  async function previsualizar(e: React.FormEvent) {
    e.preventDefault(); if (!file || pendiente) return;
    setBusy(true); setError(''); setPrevio(null); setResultado(null);
    try {
      const data = new FormData(); data.set('archivo', file); data.set('tipo', tipo); data.set('modo', modo);
      if (user?.rol === 'SUPERADMIN') data.set('tenantId', tenantId);
      const res = await fetch('/api/importaciones/previsualizar', { method: 'POST', body: data });
      const body = await res.json(); if (!res.ok) throw new Error(body.error || 'No se pudo analizar el archivo');
      setPrevio(body);
    } catch (e) { setError(e instanceof Error ? e.message : 'Error de lectura'); }
    finally { setBusy(false); }
  }
  async function confirmar(ids = previo) {
    if (!ids || !ids.confirmable) return;
    const solicitud = { loteId: ids.loteId, hashArchivo: ids.hashArchivo };
    sessionStorage.setItem(pendienteKey, JSON.stringify(solicitud)); setPendiente(solicitud);
    await enviar(solicitud);
  }
  async function enviar(solicitud: { loteId: string; hashArchivo: string }) {
    setBusy(true); setError('');
    try {
      const res = await fetch('/api/importaciones/confirmar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(solicitud) });
      const body = await res.json();
      if (!res.ok) {
        if (res.status < 500) { sessionStorage.removeItem(pendienteKey); setPendiente(null); }
        throw new Error(body.error || 'No se pudo confirmar');
      }
      setResultado(body); setPrevio(null); sessionStorage.removeItem(pendienteKey); setPendiente(null);
    } catch (e) { setError(e instanceof Error ? e.message : 'Resultado desconocido; reintente el mismo lote'); }
    finally { setBusy(false); }
  }
  async function previewStock(e: React.FormEvent) {
    e.preventDefault(); if (!stockFile || stockPendiente) return;
    setBusy(true); setError(''); setStockPrevio(null); setStockResultado('');
    try {
      const data=new FormData();data.set('archivo',stockFile);if(user?.rol==='SUPERADMIN')data.set('tenantId',tenantId);
      const res=await fetch('/api/importaciones/stock-inicial',{method:'POST',body:data});const body=await res.json();
      if(!res.ok)throw new Error(body.error||'No se pudo previsualizar el corte');setStockPrevio(body);
    }catch(e){setError(e instanceof Error?e.message:'Error de lectura');}finally{setBusy(false);}
  }
  async function enviarStock(solicitud:{token:string;clave:string}) {
    setBusy(true);setError('');
    try{
      const res=await fetch('/api/inventarios/ajustes',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':solicitud.clave},body:JSON.stringify({accion:'CONFIRMAR',token:solicitud.token})});
      const body=await res.json();if(!res.ok){if(res.status<500){sessionStorage.removeItem(stockKey);setStockPendiente(null);}throw new Error(body.error||'No se pudo confirmar el corte');}
      setStockResultado(body.folio);setStockPrevio(null);sessionStorage.removeItem(stockKey);setStockPendiente(null);
    }catch(e){setError(e instanceof Error?e.message:'Resultado desconocido; reintente la misma solicitud');}finally{setBusy(false);}
  }
  function confirmarStock(){if(!stockPrevio)return;const solicitud={token:stockPrevio.token,clave:crypto.randomUUID()};sessionStorage.setItem(stockKey,JSON.stringify(solicitud));setStockPendiente(solicitud);void enviarStock(solicitud);}
  if (user && !['ADMIN','SUPERADMIN'].includes(user.rol)) return <main className="p-8 text-slate-700">Acceso restringido a administración.</main>;
  return <main className="mx-auto max-w-6xl space-y-7 p-6 text-slate-900 lg:p-10">
    <header className="border-b border-slate-200 pb-5">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Administración · Datos maestros</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Importación de catálogos</h1>
      <p className="mt-2 max-w-3xl text-sm text-slate-600">Revise los registros antes de aplicarlos. El stock inicial se confirma por separado desde Inventarios, con corte y Kárdex.</p>
    </header>
    {pendiente && <section className="rounded-xl border border-amber-300 bg-amber-50 p-4" role="alert">
      <p className="font-semibold">Hay una confirmación cuyo resultado debe recuperarse</p>
      <p className="mt-1 text-sm">Reintente el mismo lote para conocer el resultado antes de cargar otro archivo.</p>
      <button disabled={busy} onClick={() => enviar(pendiente)} className="mt-3 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Consultar resultado</button>
    </section>}
    <form onSubmit={previsualizar} className="grid gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-md shadow-slate-900/5 md:grid-cols-2">
      {user?.rol === 'SUPERADMIN' && <label className="block text-sm font-medium">Empresa
        <select required value={tenantId} onChange={e => { setTenantId(e.target.value); cambiar(); }} className="mt-2 w-full rounded-lg border border-slate-300 p-3">
          <option value="">Seleccione empresa</option>{tenants.map(t => <option key={t.id} value={t.id}>{t.nombreComercial}</option>)}
        </select></label>}
      <label className="block text-sm font-medium">Catálogo
        <select value={tipo} onChange={e => { setTipo(e.target.value as Tipo); cambiar(); }} disabled={!!pendiente} className="mt-2 w-full rounded-lg border border-slate-300 p-3">
          <option value="PRODUCTOS">Productos y materiales</option><option value="PROVEEDORES">Proveedores</option><option value="CLIENTES">Clientes</option>
        </select></label>
      <label className="block text-sm font-medium">Operación
        <select value={modo} onChange={e => { setModo(e.target.value as Modo); cambiar(); }} disabled={!!pendiente} className="mt-2 w-full rounded-lg border border-slate-300 p-3">
          <option value="CREAR">Crear nuevos</option><option value="ACTUALIZAR">Actualizar existentes</option>
        </select></label>
      <label className="block text-sm font-medium">Archivo CSV UTF-8 o XLSX · máximo 2 MB y 1000 filas
        <input required type="file" accept=".csv,.xlsx" disabled={!!pendiente} onChange={e => { setFile(e.target.files?.[0] || null); cambiar(); }} className="mt-2 block w-full rounded-lg border border-slate-300 p-3 text-sm" />
      </label>
      <div className="flex items-end gap-3">
        <a className="rounded-lg border border-slate-300 px-4 py-3 text-sm font-semibold hover:bg-slate-50" href={`/api/importaciones/plantilla?tipo=${tipo}`}>Descargar plantilla CSV</a>
        <button disabled={!file || busy || !!pendiente || user?.rol === 'SUPERADMIN' && !tenantId} className="rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Procesando…' : 'Previsualizar'}</button>
      </div>
    </form>
    {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">{error}</p>}
    {previo && <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md shadow-slate-900/5">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-xl font-semibold">Vista previa · {previo.total} registros válidos</h2><p className="mt-1 text-sm text-slate-600">{previo.errores.length} errores. Se muestran las primeras 20 filas. El lote se aplica completo o se revierte completo. La vista previa vence en 24 horas.</p></div>
        <button disabled={!previo.confirmable || busy || !!pendiente} onClick={() => confirmar()} className="rounded-lg bg-blue-800 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">Confirmar {previo.modo.toLowerCase()}</button></div>
      {previo.errores.length > 0 && <ul className="mt-5 max-h-52 overflow-auto rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">{previo.errores.map((e,i) => <li key={i}>Fila {e.fila}: {e.error}</li>)}</ul>}
      <div className="mt-5 overflow-x-auto"><table className="w-full border-collapse text-left text-sm"><thead><tr className="border-b border-slate-200 text-slate-500"><th className="p-2">Fila</th><th className="p-2">Clave</th><th className="p-2">Datos propuestos</th></tr></thead><tbody>{previo.muestra.map(f => <tr key={f.fila} className="border-b border-slate-100"><td className="p-2 font-mono">{f.fila}</td><td className="p-2 font-mono">{f.clave}</td><td className="p-2">{Object.entries(f.datos).map(([k,v]) => `${k}: ${v ?? '—'}`).join(' · ')}</td></tr>)}</tbody></table></div>
    </section>}
    {resultado && <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-5" role="status"><h2 className="font-semibold">Lote confirmado</h2><p className="mt-1 text-sm">{resultado.procesados} registros {resultado.modo === 'CREAR' ? 'creados' : 'actualizados'}. Referencia: <span className="font-mono">{resultado.loteId}</span></p></section>}
    <section className="space-y-5 border-t border-slate-200 pt-8">
      <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Corte físico</p><h2 className="mt-2 text-2xl font-semibold">Stock inicial por almacén</h2>
        <p className="mt-2 text-sm text-slate-600">Use un archivo por almacén. Los productos deben existir en el catálogo y el almacén debe estar sin movimientos ni stock. La confirmación crea acta, Kárdex y auditoría.</p></div>
      {stockPendiente && <div className="rounded-xl border border-amber-300 bg-amber-50 p-4"><p className="font-semibold">Resultado de corte pendiente</p><button disabled={busy} onClick={()=>enviarStock(stockPendiente)} className="mt-3 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Consultar resultado</button></div>}
      <form onSubmit={previewStock} className="flex flex-wrap items-end gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-md shadow-slate-900/5">
        <label className="min-w-72 flex-1 text-sm font-medium">Archivo CSV UTF-8 o XLSX
          <input required type="file" accept=".csv,.xlsx" disabled={!!stockPendiente} onChange={e=>{setStockFile(e.target.files?.[0]||null);setStockPrevio(null);}} className="mt-2 block w-full rounded-lg border border-slate-300 p-3 text-sm" /></label>
        <a href="/api/importaciones/plantilla?tipo=STOCK_INICIAL" className="rounded-lg border border-slate-300 px-4 py-3 text-sm font-semibold hover:bg-slate-50">Plantilla stock</a>
        <button disabled={!stockFile||busy||!!stockPendiente||user?.rol==='SUPERADMIN'&&!tenantId} className="rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">Previsualizar corte</button>
      </form>
      {stockPrevio && <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md shadow-slate-900/5">
        <div className="flex flex-wrap items-start justify-between gap-4"><div><h3 className="text-xl font-semibold">{stockPrevio.almacen.nombre} · {stockPrevio.total} partidas</h3><p className="mt-1 text-sm text-slate-600">Válido hasta {new Date(stockPrevio.vence).toLocaleString('es-MX')}. Revise las cantidades antes de confirmar.</p></div>
          <button disabled={busy||!!stockPendiente} onClick={confirmarStock} className="rounded-lg bg-blue-800 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">Confirmar corte inicial</button></div>
        <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-slate-200 text-slate-500"><th className="p-2">Fila</th><th className="p-2">SKU</th><th className="p-2">Cantidad</th></tr></thead><tbody>{stockPrevio.muestra.map(f=><tr key={f.fila} className="border-b border-slate-100"><td className="p-2 font-mono">{f.fila}</td><td className="p-2 font-mono">{f.sku}</td><td className="p-2 font-mono">{f.cantidad}</td></tr>)}</tbody></table></div>
      </div>}
      {stockResultado && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm">Corte inicial confirmado. Folio: <span className="font-mono">{stockResultado}</span></p>}
    </section>
  </main>;
}
