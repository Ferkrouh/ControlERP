import { createHash } from 'crypto';
import { Prisma } from '@prisma/client';
import ExcelJS from 'exceljs-hardened';
import { prisma } from './prisma';
import type { UserSession } from './types';
import { VentaError } from './ventas';
import { previsualizarAjuste } from './ajustes-inventario';

export type TipoImportacion = 'PRODUCTOS' | 'PROVEEDORES' | 'CLIENTES';
export type ModoImportacion = 'CREAR' | 'ACTUALIZAR';
type Fila = { numero: number; clave: string; datos: Record<string, string | number | null>; original?: string; anterior?: Record<string, unknown> };
const columnas: Record<TipoImportacion, string[]> = {
  PRODUCTOS: ['sku', 'nombre', 'unidadMedida', 'precioVenta', 'costoPromedio', 'categoria', 'codigoBarras'],
  PROVEEDORES: ['codigo', 'razonSocial', 'rfc', 'contacto', 'telefono', 'email', 'diasCredito'],
  CLIENTES: ['codigo', 'razonSocial', 'rfc', 'telefono', 'email', 'direccion', 'diasCredito'],
};
const obligatorias: Record<TipoImportacion, string[]> = {
  PRODUCTOS: ['sku', 'nombre', 'unidadMedida', 'precioVenta'],
  PROVEEDORES: ['codigo', 'razonSocial'],
  CLIENTES: ['codigo', 'razonSocial'],
};
const claveCampo = (tipo: TipoImportacion) => tipo === 'PRODUCTOS' ? 'sku' : 'codigo';
const normalizar = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\s_-]+/g, '').toLowerCase();
const texto = (v: unknown) => String(v ?? '').trim();
const huella = (v: unknown) => createHash('sha256').update(JSON.stringify(v)).digest('hex');
function validarActor(user: UserSession, tenantId: string) {
  if (!['ADMIN','SUPERADMIN'].includes(user.rol)) throw new VentaError('Solo administración puede importar catálogos', 403);
  if (user.rol !== 'SUPERADMIN' && user.tenantId !== tenantId) throw new VentaError('Empresa no autorizada', 403);
}
function csv(cadena: string): string[][] {
  const salida: string[][] = []; let fila: string[] = []; let celda = ''; let comillas = false;
  for (let i = 0; i < cadena.length; i++) {
    const c = cadena[i];
    if (c === '"' && comillas && cadena[i+1] === '"') { celda += '"'; i++; }
    else if (c === '"' && !celda) comillas = !comillas;
    else if (c === '"' && comillas) comillas = false;
    else if (c === '"') throw new VentaError('CSV con comillas inválidas');
    else if (c === ',' && !comillas) { fila.push(celda); celda = ''; }
    else if ((c === '\n' || c === '\r') && !comillas) {
      if (c === '\r' && cadena[i+1] === '\n') i++;
      fila.push(celda); salida.push(fila); fila = []; celda = '';
      if (salida.length > 1002) throw new VentaError('Máximo 1000 filas por archivo');
    } else celda += c;
  }
  if (comillas) throw new VentaError('CSV con comillas sin cerrar');
  if (celda || fila.length) { fila.push(celda); salida.push(fila); }
  return salida;
}
export async function leerArchivoImportacion(file: File): Promise<string[][]> {
  if (file.size < 1 || file.size > 2_000_000) throw new VentaError('Archivo vacío o mayor a 2 MB');
  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.name.toLowerCase().split('.').pop();
  if (ext === 'csv') {
    const raw = new TextDecoder('utf-8', { fatal: true }).decode(buffer).replace(/^\uFEFF/, '');
    return csv(raw);
  }
  if (ext !== 'xlsx') throw new VentaError('Use archivo CSV UTF-8 o XLSX');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as never, { maxEntryUncompressedSize: 4_000_000, maxTotalUncompressedSize: 8_000_000 } as never);
  const hoja = workbook.worksheets[0];
  if (!hoja || hoja.rowCount > 1001) throw new VentaError('El XLSX debe tener una hoja y máximo 1000 filas');
  const salida: string[][] = [];
  hoja.eachRow({ includeEmpty: true }, row => {
    if (row.number > 1001) throw new VentaError('Máximo 1000 filas');
    const celdas: string[] = [];
    for (let c = 1; c <= Math.min(row.cellCount, 30); c++) {
      const valor = row.getCell(c).value;
      if (valor && typeof valor === 'object' && ('formula' in valor || 'sharedFormula' in valor || 'hyperlink' in valor))
        throw new VentaError(`Fila ${row.number}: fórmulas y enlaces no admitidos`);
      celdas.push(row.getCell(c).text.trim());
    }
    salida.push(celdas);
  });
  return salida;
}
function convertir(tipo: TipoImportacion, valores: Record<string, string>, presentes: Set<string>): Record<string, string | number | null> {
  const datos: Record<string, string | number | null> = {};
  for (const campo of columnas[tipo]) {
    if (!presentes.has(campo)) continue;
    const valor = texto(valores[campo]);
    if (['precioVenta','costoPromedio','diasCredito'].includes(campo)) {
      const numero = valor === '' ? 0 : Number(valor);
      if (!Number.isFinite(numero) || numero < 0 || (campo === 'diasCredito' && (!Number.isInteger(numero) || numero > 3650))
        || (campo !== 'diasCredito' && (numero > 1e9 || !/^\d+(?:\.\d{1,2})?$/.test(valor || '0'))))
        throw new VentaError(`${campo}: número inválido`);
      datos[campo] = numero;
    } else {
      if (valor.length > (campo === 'razonSocial' || campo === 'nombre' ? 200 : 120)) throw new VentaError(`${campo}: texto demasiado largo`);
      if (/^[=+\-@\t\r]/.test(valor)) throw new VentaError(`${campo}: contenido inseguro`);
      datos[campo] = (campo === 'rfc' ? valor.toUpperCase() : valor) || (['categoria','unidadMedida'].includes(campo) ? campo === 'categoria' ? 'General' : 'PZA' : null);
    }
  }
  const campo = claveCampo(tipo);
  datos[campo] = texto(datos[campo]).toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9._/-]{0,63}$/.test(texto(datos[campo]))) throw new VentaError(`${campo}: código inválido`);
  if (!texto(datos[tipo === 'PRODUCTOS' ? 'nombre' : 'razonSocial'])) throw new VentaError('Nombre o razón social obligatorio');
  if (datos.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(texto(datos.email))) throw new VentaError('Correo inválido');
  if (datos.rfc && !/^[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}$/.test(texto(datos.rfc).toUpperCase())) throw new VentaError('RFC inválido');
  return datos;
}
async function existentes(tipo: TipoImportacion, tenantId: string, claves: string[], tx: Prisma.TransactionClient | typeof prisma = prisma) {
  if (tipo === 'PRODUCTOS') return tx.producto.findMany({ where: { tenantId, sku: { in: claves } }, select: { sku: true, nombre: true, unidadMedida: true, precioVenta: true, costoPromedio: true, categoria: true, codigoBarras: true } });
  if (tipo === 'PROVEEDORES') return tx.proveedor.findMany({ where: { tenantId, codigo: { in: claves } }, select: { codigo: true, razonSocial: true, rfc: true, contacto: true, telefono: true, email: true, diasCredito: true } });
  return tx.cliente.findMany({ where: { tenantId, codigo: { in: claves } }, select: { codigo: true, razonSocial: true, rfc: true, telefono: true, email: true, direccion: true, diasCredito: true } });
}
export function plantilla(tipo: TipoImportacion) {
  return '\uFEFF' + columnas[tipo].join(',') + '\r\n';
}
export async function previsualizarImportacion(file: File, tipo: TipoImportacion, modo: ModoImportacion, tenantId: string, user: UserSession) {
  validarActor(user, tenantId);
  if (!['PRODUCTOS','PROVEEDORES','CLIENTES'].includes(tipo) || !['CREAR','ACTUALIZAR'].includes(modo)) throw new VentaError('Tipo o modo inválido');
  const tenant = await prisma.tenant.findFirst({ where: { id: tenantId, activo: true, bloqueadoPorSuscripcion: false } });
  if (!tenant) throw new VentaError('Empresa no disponible', 403);
  const matriz = await leerArchivoImportacion(file);
  if (matriz.length < 2 || matriz.length > 1001) throw new VentaError('Archivo sin datos o con más de 1000 filas');
  const encabezados = matriz[0].map(normalizar);
  const indices = Object.fromEntries(columnas[tipo].map(c => [c, encabezados.indexOf(normalizar(c))]));
  const faltantes = obligatorias[tipo].filter(c => indices[c] < 0);
  if (faltantes.length) throw new VentaError(`Faltan columnas: ${faltantes.join(', ')}`);
  const filas: Fila[] = []; const errores: { fila: number; error: string }[] = []; const vistas = new Set<string>();
  for (let n = 1; n < matriz.length; n++) {
    if (matriz[n].every(c => !texto(c))) continue;
    try {
      const valores = Object.fromEntries(columnas[tipo].map(c => [c, indices[c] >= 0 ? matriz[n][indices[c]] ?? '' : '']));
      const datos = convertir(tipo, valores, new Set(columnas[tipo].filter(c => indices[c] >= 0))); const clave = texto(datos[claveCampo(tipo)]);
      if (vistas.has(clave)) throw new VentaError('Código repetido en el archivo');
      vistas.add(clave); filas.push({ numero: n+1, clave, datos });
    } catch (e) { errores.push({ fila: n+1, error: e instanceof Error ? e.message : 'Fila inválida' }); }
  }
  if (!filas.length && !errores.length) throw new VentaError('Archivo sin registros');
  const actual = await existentes(tipo, tenantId, filas.map(f => f.clave));
  const mapa = new Map(actual.map(r => [texto(r[claveCampo(tipo) as keyof typeof r]), r]));
  for (const fila of filas) {
    const anterior = mapa.get(fila.clave);
    if (modo === 'CREAR' && anterior) errores.push({ fila: fila.numero, error: 'Código ya existe en la empresa' });
    if (modo === 'ACTUALIZAR' && !anterior) errores.push({ fila: fila.numero, error: 'Código no existe en la empresa' });
    if (anterior) { fila.original = huella(anterior); fila.anterior = anterior; }
  }
  const hashArchivo = createHash('sha256').update(Buffer.from(await file.arrayBuffer())).digest('hex');
  const importado = await prisma.loteImportacion.findFirst({ where: { tenantId, tipo, modo, archivoHash: hashArchivo, estado: 'CONFIRMADO' } });
  if (importado) throw new VentaError(`Este archivo ya se confirmó como lote ${importado.id}`, 409);
  const lote = await prisma.loteImportacion.create({ data: { tenantId, usuarioId: user.id, tipo, modo, archivoHash: hashArchivo, filasJson: JSON.stringify(filas), erroresJson: JSON.stringify(errores) } });
  return { loteId: lote.id, hashArchivo, tipo, modo, total: filas.length, errores, confirmable: errores.length === 0 && filas.length > 0,
    muestra: filas.slice(0, 20).map(f => ({ fila: f.numero, clave: f.clave, datos: f.datos })) };
}
export async function confirmarImportacion(loteId: string, hashArchivo: string, user: UserSession) {
  const lote = await prisma.loteImportacion.findUnique({ where: { id: loteId } });
  if (!lote) throw new VentaError('Lote no encontrado', 404);
  validarActor(user, lote.tenantId);
  if (lote.usuarioId !== user.id || lote.archivoHash !== hashArchivo) throw new VentaError('Lote no autorizado', 403);
  if (lote.estado === 'CONFIRMADO' && lote.resultadoJson) return { resultado: JSON.parse(lote.resultadoJson), repetida: true };
  if (Date.now() - lote.fecha.getTime() > 24*60*60_000) throw new VentaError('La vista previa venció; vuelva a cargar el archivo', 409);
  if (JSON.parse(lote.erroresJson).length) throw new VentaError('El lote contiene errores; corrija el archivo y previsualice de nuevo', 409);
  const tipo = lote.tipo as TipoImportacion; const modo = lote.modo as ModoImportacion;
  const filas = JSON.parse(lote.filasJson) as Fila[];
  try {
    return await prisma.$transaction(async tx => {
      const reclamo = await tx.loteImportacion.updateMany({ where: { id: lote.id, estado: 'PREVISUALIZADO' }, data: { estado: 'PROCESANDO' } });
      if (!reclamo.count) throw new VentaError('Lote en proceso o ya confirmado', 409);
      const previo = await existentes(tipo, lote.tenantId, filas.map(f => f.clave), tx);
      const mapa = new Map(previo.map(r => [texto(r[claveCampo(tipo) as keyof typeof r]), r]));
      for (const f of filas) {
        const anterior = mapa.get(f.clave);
        if (modo === 'CREAR' && anterior || modo === 'ACTUALIZAR' && (!anterior || huella(anterior) !== f.original))
          throw new VentaError(`Fila ${f.numero}: catálogo cambió desde la vista previa`, 409);
      }
      for (const f of filas) {
        if (tipo === 'PRODUCTOS') {
          const data = f.datos as unknown as { sku: string; nombre: string; unidadMedida: string; precioVenta: number; costoPromedio: number; categoria: string; codigoBarras: string | null };
          if (modo === 'CREAR') await tx.producto.create({ data: { ...data, tenantId: lote.tenantId } });
          else await tx.producto.update({ where: { tenantId_sku: { tenantId: lote.tenantId, sku: f.clave } }, data });
        } else if (tipo === 'PROVEEDORES') {
          const data = f.datos as unknown as { codigo: string; razonSocial: string; rfc: string | null; contacto: string | null; telefono: string | null; email: string | null; diasCredito: number };
          if (modo === 'CREAR') await tx.proveedor.create({ data: { ...data, tenantId: lote.tenantId, saldoPendiente: 0 } });
          else await tx.proveedor.update({ where: { tenantId_codigo: { tenantId: lote.tenantId, codigo: f.clave } }, data });
        } else {
          const data = f.datos as unknown as { codigo: string; razonSocial: string; rfc: string | null; telefono: string | null; email: string | null; direccion: string | null; diasCredito: number };
          if (modo === 'CREAR') await tx.cliente.create({ data: { ...data, tenantId: lote.tenantId, saldoActual: 0, limiteCredito: 0,
            estadoCredito: 'ACTIVO', regimenFiscal: null, usoCfdi: null, codigoPostal: null } });
          else await tx.cliente.update({ where: { tenantId_codigo: { tenantId: lote.tenantId, codigo: f.clave } }, data });
        }
        await tx.registroAuditoria.create({ data: { tenantId: lote.tenantId, usuarioId: user.id, usuarioNombre: user.nombre,
          modulo: 'IMPORTACIONES', accion: modo, detalles: `${tipo} ${f.clave}; lote ${lote.id}; fila ${f.numero}`,
          metadataJson: JSON.stringify({ loteId: lote.id, tipo, codigo: f.clave, anterior: f.anterior ?? null, nuevo: f.datos }) } });
      }
      const resultado = { loteId: lote.id, tipo, modo, procesados: filas.length, fecha: new Date().toISOString() };
      await tx.loteImportacion.update({ where: { id: lote.id }, data: { estado: 'CONFIRMADO', resultadoJson: JSON.stringify(resultado), confirmadoAt: new Date() } });
      return { resultado, repetida: false };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 60_000, maxWait: 10_000 });
  } catch (e) {
    if (['P2002','P2034','P2028'].includes((e as { code?: string }).code ?? '')) {
      const actual = await prisma.loteImportacion.findUnique({ where: { id: lote.id } });
      if (actual?.estado === 'CONFIRMADO' && actual.resultadoJson) return { resultado: JSON.parse(actual.resultadoJson), repetida: true };
      throw new VentaError('Conflicto concurrente; vuelva a previsualizar el archivo', 409);
    }
    throw e;
  }
}

export async function previsualizarStockInicial(file: File, tenantId: string, user: UserSession) {
  validarActor(user, tenantId);
  const matriz = await leerArchivoImportacion(file);
  if (matriz.length < 2 || matriz.length > 1001) throw new VentaError('Archivo sin datos o con más de 1000 filas');
  const columnas = matriz[0].map(normalizar);
  const ai = columnas.indexOf('almacencodigo'), si = columnas.indexOf('sku'), ci = columnas.indexOf('cantidad');
  if ([ai,si,ci].some(i => i < 0)) throw new VentaError('Se requieren almacenCodigo,sku,cantidad');
  const registros: { fila: number; sku: string; cantidad: number }[] = [];
  let codigoAlmacen = '';
  const vistos = new Set<string>();
  for (let i=1;i<matriz.length;i++) {
    if (matriz[i].every(c => !texto(c))) continue;
    const codigo = texto(matriz[i][ai]).toUpperCase(); const sku = texto(matriz[i][si]).toUpperCase();
    const raw = texto(matriz[i][ci]); const cantidad = Number(raw);
    if (!codigo || !sku || !raw || !/^\d+(?:\.\d{1,6})?$/.test(raw) || !Number.isFinite(cantidad) || cantidad > 1e9)
      throw new VentaError(`Fila ${i+1}: almacén, SKU o cantidad inválidos`);
    if (codigoAlmacen && codigo !== codigoAlmacen) throw new VentaError('Use un archivo por almacén para el corte inicial');
    if (vistos.has(sku)) throw new VentaError(`Fila ${i+1}: SKU repetido`);
    codigoAlmacen = codigo; vistos.add(sku); registros.push({ fila:i+1,sku,cantidad });
  }
  if (!registros.length) throw new VentaError('Archivo sin partidas');
  const almacen = await prisma.almacen.findUnique({ where: { tenantId_codigo: { tenantId, codigo: codigoAlmacen } } });
  if (!almacen) throw new VentaError('Almacén no encontrado en la empresa', 404);
  const productos = await prisma.producto.findMany({ where: { tenantId, sku: { in: registros.map(r=>r.sku) } }, select: { id:true, sku:true, nombre:true } });
  if (productos.length !== registros.length) {
    const faltan = registros.filter(r => !productos.some(p => p.sku === r.sku)).map(r => `${r.sku} (fila ${r.fila})`);
    throw new VentaError(`SKU no encontrado: ${faltan.slice(0,10).join(', ')}`, 404);
  }
  const corte = await previsualizarAjuste({ accion:'PREVISUALIZAR', tenantId, almacenId:almacen.id,
    tipo:'INVENTARIO_INICIAL', motivo:'INVENTARIO_INICIAL', observaciones:`Corte inicial desde archivo ${file.name.slice(0,100)}`,
    items:registros.map(r=>({productoId:productos.find(p=>p.sku===r.sku)!.id,cantidadNueva:r.cantidad})) },user);
  return { ...corte, almacen:{id:almacen.id,codigo:almacen.codigo,nombre:almacen.nombre},
    total:registros.length, muestra:registros.slice(0,20).map(r=>({fila:r.fila,sku:r.sku,cantidad:r.cantidad})) };
}
