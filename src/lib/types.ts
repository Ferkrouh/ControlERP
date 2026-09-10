export type RolUsuario = 'SUPERADMIN' | 'ADMIN' | 'ENCARGADO' | 'ALMACENISTA' | 'AUDITOR';

export interface TenantInfo {
  id: string;
  nombreComercial: string;
  razonSocial: string;
  identificacionFiscal: string;
  regimenFiscal?: string | null;
  codigoPostal?: string | null;
  giro: string;
  moneda: string;
  activo: boolean;
  logoUrl?: string | null;
  colorPrimario: string;
  textoEncabezadoDoc?: string | null;
  diasGraciaCredito: number;
  alertaVencimientoDias: number;
  politicaBloqueoCredito: 'ESTRICTO' | 'ADVERTENCIA';
  moduloCredito: boolean;
  moduloCxC: boolean;
  moduloProveedores: boolean;
  moduloCxP: boolean;
  moduloMultiAlmacen: boolean;
  moduloTraspasos: boolean;
  moduloReportes: boolean;
  moduloFacturacionSAT: boolean;
}

export interface UserSession {
  id: string;
  nombre: string;
  email: string;
  rol: RolUsuario;
  tenantId: string | null;
  tenant?: TenantInfo | null;
  almacenAsignadoId?: string | null;
}
