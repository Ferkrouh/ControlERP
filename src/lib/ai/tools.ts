import { z } from 'zod';
import { prisma } from '@/lib/prisma';

/**
 * Catálogo de Herramientas de Base de Datos para el Asistente de IA de ControlERP
 * Todas las herramientas ejecutan consultas aisladas estrictamente por `tenantId` y validadas por `rol`.
 */
export function getAITools(context: { tenantId: string; userRol: string; userId: string; userNombre: string }): any {
  const { tenantId, userRol, userId, userNombre } = context;

  return {
    /**
     * 1. Consulta de Existencias, Stock y Kárdex Físico
     */
    consultar_disponibilidad_stock: {
      description: 'Consulta las existencias físicas de productos por almacén o sucursal, identificando faltantes y stock mínimo.',
      inputSchema: z.object({
        termino: z.string().describe('SKU, código de barras o nombre del producto (ej: HER-001, taladro, compresor)'),
      }),
      execute: async ({ termino }: { termino: string }) => {
        try {
          const productos = await prisma.producto.findMany({
            where: {
              tenantId,
              OR: [
                { sku: { contains: termino } },
                { nombre: { contains: termino } },
                { codigoBarras: { contains: termino } },
              ],
            },
            include: {
              existencias: {
                include: {
                  almacen: true,
                },
              },
            },
            take: 6,
          });

          if (productos.length === 0) {
            return {
              encontrado: false,
              mensaje: `No se encontraron productos coincidentes con "${termino}" en el catálogo.`,
            };
          }

          const resultado = productos.map((p) => {
            const stockTotal = p.existencias.reduce((sum, e) => sum + e.cantidad, 0);
            const desgloseAlmacenes = p.existencias.map((e) => ({
              almacen: e.almacen.nombre,
              codigoAlmacen: e.almacen.codigo,
              cantidad: e.cantidad,
            }));

            const esBajoMinimo = stockTotal <= p.stockMinimo;

            return {
              id: p.id,
              sku: p.sku,
              nombre: p.nombre,
              codigoBarras: p.codigoBarras,
              categoria: p.categoria,
              precioVenta: `$${p.precioVenta.toFixed(2)} MXN`,
              costoPromedio: userRol !== 'ALMACENISTA' ? `$${p.costoPromedio.toFixed(2)} MXN` : '[RESTRINGIDO]',
              stockTotalPiezas: stockTotal,
              stockMinimoRequerido: p.stockMinimo,
              alertaStockBajo: esBajoMinimo,
              distribucionPorAlmacen: desgloseAlmacenes,
            };
          });

          return {
            encontrado: true,
            totalProductos: resultado.length,
            productos: resultado,
          };
        } catch (error: any) {
          return { error: `Error al consultar stock: ${error.message}` };
        }
      },
    },

    /**
     * 2. Consulta de Estado Crediticio y Cartera de Cliente
     */
    consultar_estado_cliente: {
      description: 'Consulta el estado de cuenta de un cliente, límite de crédito, saldo adeudado, facturas vencidas y si tiene la venta bloqueada.',
      inputSchema: z.object({
        busqueda: z.string().describe('Nombre de la empresa, razón social, RFC o código de cliente (ej: San Pedro, CLI-001)'),
      }),
      execute: async ({ busqueda }: { busqueda: string }) => {
        try {
          const clientes = await prisma.cliente.findMany({
            where: {
              tenantId,
              OR: [
                { razonSocial: { contains: busqueda } },
                { rfc: { contains: busqueda } },
                { codigo: { contains: busqueda } },
              ],
            },
            include: {
              cxc: {
                where: { saldoPendiente: { gt: 0 } },
                orderBy: { fechaVencimiento: 'asc' },
              },
            },
            take: 4,
          });

          if (clientes.length === 0) {
            return {
              encontrado: false,
              mensaje: `No se encontró ningún cliente con el término "${busqueda}".`,
            };
          }

          const now = new Date();

          const resultado = clientes.map((c) => {
            const saldoTotalAdeudado = c.cxc.reduce((sum, doc) => sum + doc.saldoPendiente, 0);
            const creditoDisponible = Math.max(0, c.limiteCredito - saldoTotalAdeudado);
            const porcentajeUso = c.limiteCredito > 0 ? Math.round((saldoTotalAdeudado / c.limiteCredito) * 100) : 0;

            // Análisis de vencimientos
            let facturasVencidas = 0;
            let montoVencido = 0;
            let maxDiasMora = 0;

            const facturasPendientes = c.cxc.map((doc) => {
              const vto = new Date(doc.fechaVencimiento);
              const diffDias = Math.floor((now.getTime() - vto.getTime()) / (1000 * 60 * 60 * 24));
              const estaVencida = diffDias > 0;

              if (estaVencida) {
                facturasVencidas++;
                montoVencido += doc.saldoPendiente;
                if (diffDias > maxDiasMora) maxDiasMora = diffDias;
              }

              return {
                folio: doc.folio,
                montoTotal: `$${doc.montoTotal.toFixed(2)}`,
                saldoPendiente: `$${doc.saldoPendiente.toFixed(2)}`,
                fechaVencimiento: vto.toLocaleDateString('es-MX'),
                diasMora: estaVencida ? diffDias : 0,
                estado: estaVencida ? 'VENCIDA (EN MORA)' : 'VIGENTE',
              };
            });

            const ventaBloqueada = saldoTotalAdeudado >= c.limiteCredito || facturasVencidas > 0;

            return {
              codigo: c.codigo,
              razonSocial: c.razonSocial,
              rfc: c.rfc,
              telefono: c.telefono,
              limiteCredito: `$${c.limiteCredito.toFixed(2)} MXN`,
              saldoAdeudadoTotal: `$${saldoTotalAdeudado.toFixed(2)} MXN`,
              creditoDisponible: `$${creditoDisponible.toFixed(2)} MXN`,
              porcentajeCreditoUsado: `${porcentajeUso}%`,
              estadoCredito: ventaBloqueada ? 'BLOQUEADO / EN MORA' : 'AL CORRIENTE (ACTIVO)',
              facturasVencidasCount: facturasVencidas,
              montoVencidoMora: `$${montoVencido.toFixed(2)} MXN`,
              maximoDiasMora: maxDiasMora,
              facturasPendientes: facturasPendientes.slice(0, 5),
            };
          });

          return {
            encontrado: true,
            totalResultados: resultado.length,
            clientes: resultado,
          };
        } catch (error: any) {
          return { error: `Error al consultar cliente: ${error.message}` };
        }
      },
    },

    /**
     * 3. Consulta de Concentrado de Cortes de Caja POS (Arqueos / Turnos Z)
     */
    consultar_cortes_caja_pos: {
      description: 'Consulta los cortes de caja, arqueos y turnos Z del punto de venta POS, incluyendo sobrantes, faltantes y totales cobrados.',
      inputSchema: z.object({
        estado: z.enum(['TODOS', 'CERRADO', 'ABIERTO']).optional().default('TODOS'),
        limite: z.number().optional().default(5),
      }),
      execute: async ({ estado, limite }: { estado: string; limite: number }) => {
        try {
          const whereClause: any = { tenantId };
          if (estado !== 'TODOS') {
            whereClause.estado = estado;
          }

          const cortes = await prisma.turnoCajaPOS.findMany({
            where: whereClause,
            orderBy: { fechaApertura: 'desc' },
            take: limite,
          });

          const resultado = cortes.map((c) => ({
            folioCorte: `TURNO-${c.id.slice(0, 8).toUpperCase()}`,
            cajero: c.usuarioNombre || 'Usuario POS',
            estado: c.estado,
            fechaApertura: new Date(c.fechaApertura).toLocaleString('es-MX'),
            fechaCierre: c.fechaCierre ? new Date(c.fechaCierre).toLocaleString('es-MX') : 'Turno Aún Abierto',
            fondoInicial: `$${c.montoApertura.toFixed(2)} MXN`,
            totalEfectivoCalculado: `$${c.totalEfectivo.toFixed(2)} MXN`,
            totalTarjetas: `$${c.totalTarjeta.toFixed(2)} MXN`,
            totalTransferencias: `$${c.totalTransfer.toFixed(2)} MXN`,
            totalVentasTurno: `$${c.totalVentas.toFixed(2)} MXN`,
            montoDeclaradoCierre: c.montoCierre !== null ? `$${c.montoCierre.toFixed(2)} MXN` : 'Pendiente',
            diferenciaArqueo: c.diferencia !== null ? `$${c.diferencia.toFixed(2)} MXN` : 'Sin Arqueo',
            estatusDiferencia:
              c.diferencia === null || c.diferencia === 0
                ? 'EXACTO'
                : c.diferencia > 0
                ? `SOBRANTE (+$${c.diferencia.toFixed(2)})`
                : `FALTANTE (-$${Math.abs(c.diferencia).toFixed(2)})`,
            notasCierre: c.notasCierre || 'Sin observaciones',
          }));

          return {
            totalCortesConsultados: resultado.length,
            cortes: resultado,
          };
        } catch (error: any) {
          return { error: `Error al consultar cortes de caja: ${error.message}` };
        }
      },
    },

    /**
     * 4. Consulta de Balanza Financiera y Cuentas por Cobrar vs Pagar
     */
    consultar_balanza_financiera: {
      description: 'Genera un resumen ejecutivo de la salud financiera del negocio: cartera total por cobrar (CxC), deudas con proveedores (CxP) y liquidez.',
      inputSchema: z.object({
        incluirDetalleMorosos: z.boolean().optional().default(true),
      }),
      execute: async ({ incluirDetalleMorosos }: { incluirDetalleMorosos: boolean }) => {
        try {
          const now = new Date();

          // 1. Cuentas por Cobrar
          const cxcPendientes = await prisma.cuentaPorCobrar.findMany({
            where: { tenantId, saldoPendiente: { gt: 0 } },
            include: { cliente: true },
          });

          const totalCarteraCxC = cxcPendientes.reduce((sum, d) => sum + d.saldoPendiente, 0);
          const cxcVencidas = cxcPendientes.filter((d) => new Date(d.fechaVencimiento) < now);
          const totalCarteraVencidaCxC = cxcVencidas.reduce((sum, d) => sum + d.saldoPendiente, 0);

          // 2. Cuentas por Pagar
          const cxpPendientes = await prisma.cuentaPorPagar.findMany({
            where: { tenantId, saldoPendiente: { gt: 0 } },
            include: { proveedor: true },
          });

          const totalPasivoCxP = cxpPendientes.reduce((sum, d) => sum + d.saldoPendiente, 0);
          const cxpVencidas = cxpPendientes.filter((d) => new Date(d.fechaVencimiento) < now);
          const totalPasivoVencidoCxP = cxpVencidas.reduce((sum, d) => sum + d.saldoPendiente, 0);

          // 3. Top Clientes con Mayor Adeudo
          const morososMap = new Map<string, { cliente: string; rfc: string; saldo: number; vencido: number }>();
          cxcPendientes.forEach((d) => {
            const isVencido = new Date(d.fechaVencimiento) < now;
            const entry = morososMap.get(d.cliente.razonSocial) || {
              cliente: d.cliente.razonSocial,
              rfc: d.cliente.rfc || 'S/R',
              saldo: 0,
              vencido: 0,
            };
            entry.saldo += d.saldoPendiente;
            if (isVencido) entry.vencido += d.saldoPendiente;
            morososMap.set(d.cliente.razonSocial, entry);
          });

          const topMorosos = Array.from(morososMap.values())
            .sort((a, b) => b.saldo - a.saldo)
            .slice(0, 5)
            .map((m) => ({
              cliente: m.cliente,
              rfc: m.rfc,
              saldoTotal: `$${m.saldo.toFixed(2)} MXN`,
              saldoVencido: `$${m.vencido.toFixed(2)} MXN`,
            }));

          return {
            resumenFinanciero: {
              totalCuentasPorCobrar: `$${totalCarteraCxC.toFixed(2)} MXN`,
              totalCarteraVencida: `$${totalCarteraVencidaCxC.toFixed(2)} MXN`,
              porcentajeMoraCxC: totalCarteraCxC > 0 ? `${Math.round((totalCarteraVencidaCxC / totalCarteraCxC) * 100)}%` : '0%',
              totalCuentasPorPagarProveedores: `$${totalPasivoCxP.toFixed(2)} MXN`,
              totalDeudaProveedoresVencida: `$${totalPasivoVencidoCxP.toFixed(2)} MXN`,
              posicionNetaLiquidez: `$${(totalCarteraCxC - totalPasivoCxP).toFixed(2)} MXN`,
            },
            topClientesPorCobrar: incluirDetalleMorosos ? topMorosos : undefined,
          };
        } catch (error: any) {
          return { error: `Error al calcular balanza financiera: ${error.message}` };
        }
      },
    },

    /**
     * 5. Crear Borrador Rápido de Cotización
     */
    crear_borrador_cotizacion: {
      description: 'Genera una nueva cotización formal en borrador para un cliente con partidas de productos especificados.',
      inputSchema: z.object({
        clienteIdOrNombre: z.string().describe('ID o nombre aproximado del cliente'),
        items: z.array(
          z.object({
            skuOrNombre: z.string().describe('SKU o nombre del producto'),
            cantidad: z.number().describe('Cantidad a cotizar'),
            precioUnitario: z.number().optional().describe('Precio unitario opcional (si no se proporciona se toma el precio de lista)'),
          })
        ),
        observaciones: z.string().optional().describe('Notas u observaciones de la cotización'),
      }),
      execute: async ({ clienteIdOrNombre, items, observaciones }: { clienteIdOrNombre: string; items: any[]; observaciones?: string }) => {
        try {
          if (userRol !== 'SUPERADMIN' && userRol !== 'ADMIN' && userRol !== 'ENCARGADO') {
            return {
              error: `El rol "${userRol}" no tiene privilegios para crear cotizaciones. Se requiere rol ADMIN o ENCARGADO.`,
            };
          }

          // 1. Buscar cliente
          const cliente = await prisma.cliente.findFirst({
            where: {
              tenantId,
              OR: [
                { id: clienteIdOrNombre },
                { razonSocial: { contains: clienteIdOrNombre } },
                { codigo: { contains: clienteIdOrNombre } },
              ],
            },
          });

          if (!cliente) {
            return { error: `No se encontró ningún cliente correspondiente a "${clienteIdOrNombre}".` };
          }

          // 2. Procesar partidas
          let subtotal = 0;
          const detallesParaInsertar = [];

          for (const item of items) {
            const prod = await prisma.producto.findFirst({
              where: {
                tenantId,
                OR: [
                  { sku: { contains: item.skuOrNombre } },
                  { nombre: { contains: item.skuOrNombre } },
                ],
              },
            });

            if (!prod) {
              return { error: `No se encontró el producto "${item.skuOrNombre}" en el catálogo.` };
            }

            const pu = item.precioUnitario !== undefined && item.precioUnitario > 0 ? item.precioUnitario : prod.precioVenta;
            const lineSubtotal = item.cantidad * pu;
            subtotal += lineSubtotal;

            detallesParaInsertar.push({
              productoId: prod.id,
              cantidad: item.cantidad,
              precioUnitario: pu,
              subtotal: lineSubtotal,
            });
          }

          const impuestos = subtotal * 0.16;
          const total = subtotal + impuestos;

          // Folio autogenerado
          const count = await prisma.cotizacion.count({ where: { tenantId } });
          const year = new Date().getFullYear();
          const folio = `COT-${year}-${String(count + 1).padStart(4, '0')}`;

          const fechaVencimiento = new Date();
          fechaVencimiento.setDate(fechaVencimiento.getDate() + 15);

          const cotizacion = await prisma.cotizacion.create({
            data: {
              tenantId,
              folio,
              clienteId: cliente.id,
              usuarioId: userId,
              usuarioNombre: userNombre,
              subtotal,
              impuestos,
              total,
              estado: 'BORRADOR',
              vigenciaDias: 15,
              fechaVencimiento,
              observaciones: observaciones || `Generada automáticamente vía Asistente ControlBot AI por ${userNombre}`,
              detalles: {
                create: detallesParaInsertar,
              },
            },
            include: {
              cliente: true,
              detalles: {
                include: { producto: true },
              },
            },
          });

          return {
            creada: true,
            folio: cotizacion.folio,
            cliente: cotizacion.cliente.razonSocial,
            subtotal: `$${subtotal.toFixed(2)} MXN`,
            impuestos16: `$${impuestos.toFixed(2)} MXN`,
            total: `$${total.toFixed(2)} MXN`,
            vigencia: fechaVencimiento.toLocaleDateString('es-MX'),
            totalPartidas: cotizacion.detalles.length,
            enlace: '/cotizaciones',
            mensaje: `Cotización ${folio} creada exitosamente en borrador lista para autorizar o convertir a venta en /cotizaciones.`,
          };
        } catch (error: any) {
          return { error: `Error al crear cotización: ${error.message}` };
        }
      },
    },

    /**
     * 6. Consulta de Traspasos entre Almacenes
     */
    consultar_traspasos_almacen: {
      description: 'Consulta los traspasos de mercancía entre almacenes (origen, destino, chofer y estatus de tránsito).',
      inputSchema: z.object({
        limite: z.number().optional().default(5),
      }),
      execute: async ({ limite }: { limite: number }) => {
        try {
          const almacenes = await prisma.almacen.findMany({
            where: { tenantId },
          });
          const almacenMap = new Map<string, string>(almacenes.map((a) => [a.id, a.nombre]));

          const traspasos = await prisma.traspaso.findMany({
            where: { tenantId },
            include: {
              items: {
                include: { producto: true },
              },
            },
            orderBy: { fechaSolicitud: 'desc' },
            take: limite,
          });

          const resultado = traspasos.map((t) => ({
            folio: t.folio,
            origen: almacenMap.get(t.almacenOrigenId) || t.almacenOrigenId,
            destino: almacenMap.get(t.almacenDestinoId) || t.almacenDestinoId,
            estado: t.estado,
            fechaSolicitud: new Date(t.fechaSolicitud).toLocaleDateString('es-MX'),
            vehiculoPlacas: t.vehiculoPlacas || 'P-991-NL',
            operadorChofer: t.operadorNombre || 'Sin chofer asignado',
            totalArticulos: t.items.length,
            articulos: t.items.map((it) => ({
              sku: it.producto.sku,
              nombre: it.producto.nombre,
              cantidadEnviada: it.cantidadEnviada,
              cantidadRecibida: it.cantidadRecibida !== null ? it.cantidadRecibida : 'En tránsito',
            })),
          }));

          return {
            traspasosCount: resultado.length,
            traspasos: resultado,
          };
        } catch (error: any) {
          return { error: `Error al consultar traspasos: ${error.message}` };
        }
      },
    },
  };
}
