/**
 * Catálogos oficiales del SAT para CFDI 4.0 (México)
 */

export interface CatalogOption {
  codigo: string;
  descripcion: string;
  aplicaFisica?: boolean;
  aplicaMoral?: boolean;
}

export const REGIMENES_FISCALES_SAT: CatalogOption[] = [
  { codigo: '601', descripcion: 'General de Ley Personas Morales', aplicaMoral: true, aplicaFisica: false },
  { codigo: '603', descripcion: 'Personas Morales con Fines no Lucrativos', aplicaMoral: true, aplicaFisica: false },
  { codigo: '605', descripcion: 'Sueldos y Salarios e Ingresos Asimilados a Salarios', aplicaMoral: false, aplicaFisica: true },
  { codigo: '606', descripcion: 'Arrendamiento', aplicaMoral: false, aplicaFisica: true },
  { codigo: '612', descripcion: 'Personas Físicas con Actividades Empresariales y Profesionales', aplicaMoral: false, aplicaFisica: true },
  { codigo: '621', descripcion: 'Incorporación Fiscal (RIF)', aplicaMoral: false, aplicaFisica: true },
  { codigo: '625', descripcion: 'Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas', aplicaMoral: false, aplicaFisica: true },
  { codigo: '626', descripcion: 'Régimen Simplificado de Confianza (RESICO)', aplicaMoral: true, aplicaFisica: true },
];

export const USOS_CFDI_SAT: CatalogOption[] = [
  { codigo: 'G01', descripcion: 'Adquisición de mercancías' },
  { codigo: 'G02', descripcion: 'Devoluciones, descuentos o bonificaciones' },
  { codigo: 'G03', descripcion: 'Gastos en general' },
  { codigo: 'I01', descripcion: 'Construcciones' },
  { codigo: 'I02', descripcion: 'Mobiliario y equipo de oficina por inversiones' },
  { codigo: 'I04', descripcion: 'Equipo de cómputo y accesorios' },
  { codigo: 'CP01', descripcion: 'Pagos (Complemento para recepción de pagos)' },
  { codigo: 'S01', descripcion: 'Sin efectos fiscales' },
];

export const FORMAS_PAGO_SAT: CatalogOption[] = [
  { codigo: '01', descripcion: 'Efectivo' },
  { codigo: '02', descripcion: 'Cheque nominativo' },
  { codigo: '03', descripcion: 'Transferencia electrónica de fondos (SPEI)' },
  { codigo: '04', descripcion: 'Tarjeta de crédito' },
  { codigo: '28', descripcion: 'Tarjeta de débito' },
  { codigo: '99', descripcion: 'Por definir (Exclusivo para ventas en PPD)' },
];

export const METODOS_PAGO_SAT: CatalogOption[] = [
  { codigo: 'PUE', descripcion: 'Pago en una sola exhibición (Contado)' },
  { codigo: 'PPD', descripcion: 'Pago en parcialidades o diferido (Crédito)' },
];

export const CLAVES_UNIDAD_SAT: CatalogOption[] = [
  { codigo: 'H87', descripcion: 'Pieza (PZA)' },
  { codigo: 'KGM', descripcion: 'Kilogramo (KG)' },
  { codigo: 'LTR', descripcion: 'Litro (LTS)' },
  { codigo: 'MTR', descripcion: 'Metro (MTS)' },
  { codigo: 'XBX', descripcion: 'Caja (CAJA)' },
  { codigo: 'E48', descripcion: 'Unidad de servicio' },
];

export const CLAVES_PROD_SERV_SAT_FRECUENTES: CatalogOption[] = [
  { codigo: '01010101', descripcion: 'No existe en el catálogo' },
  { codigo: '27111701', descripcion: 'Herramientas manuales' },
  { codigo: '27112700', descripcion: 'Herramientas eléctricas y mecánicas' },
  { codigo: '46181500', descripcion: 'Equipo y ropa de protección de seguridad' },
  { codigo: '40151500', descripcion: 'Bombas y compresores' },
  { codigo: '84111506', descripcion: 'Servicios de facturación y cobranza' },
  { codigo: '81112000', descripcion: 'Servicios de datos informáticos' },
];
