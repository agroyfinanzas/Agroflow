/**
 * ════════════════════════════════════════════════════════════════════════════
 * CÓDIGO DE INTEGRACIÓN — AgroFlow: Lotes ↔ Planificador de Siembra
 * 
 * Instrucciones: Incluir este archivo ANTES del código existente de Lotes
 * en index.html:
 * 
 * <script src="codigo-integracion-agroflow.js"></script>
 * <script>
 *   // ... código existente de lotes ...
 * </script>
 * ════════════════════════════════════════════════════════════════════════════
 */

// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║ 1. CAPA DE ALMACENAMIENTO CENTRALIZADO                                   ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

const AgroFlowStorage = {
  /**
   * Guarda datos en localStorage con validación
   */
  guardar: (clave, datos) => {
    try {
      const json = JSON.stringify(datos);
      // Validar tamaño (localStorage límite ~5MB)
      if (json.length > 5 * 1024 * 1024) {
        console.warn(`⚠️ Datos de ${clave} cercanos al límite de almacenamiento`);
      }
      localStorage.setItem(`agro_${clave}`, json);
      return true;
    } catch (e) {
      console.error(`❌ Error guardando ${clave}:`, e.message);
      return false;
    }
  },

  /**
   * Carga datos de localStorage con fallback
   */
  cargar: (clave, defecto = null) => {
    try {
      const datos = localStorage.getItem(`agro_${clave}`);
      return datos ? JSON.parse(datos) : defecto;
    } catch (e) {
      console.error(`❌ Error cargando ${clave}:`, e.message);
      return defecto;
    }
  },

  /**
   * Borra datos de localStorage
   */
  borrar: (clave) => {
    try {
      localStorage.removeItem(`agro_${clave}`);
      return true;
    } catch (e) {
      console.error(`❌ Error borrando ${clave}:`, e.message);
      return false;
    }
  },

  /**
   * Obtiene tamaño aproximado en KB
   */
  obtenerTamano: () => {
    let totalKB = 0;
    for (let key in localStorage) {
      if (key.startsWith('agro_')) {
        totalKB += localStorage[key].length / 1024;
      }
    }
    return totalKB.toFixed(2);
  }
};

// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║ 2. SISTEMA REACTIVO (OBSERVER PATTERN)                                   ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

/**
 * Clase base para eventos reactivos
 * Implementa patrón Observer para sincronización entre módulos
 */
class EventoReactivo {
  constructor(nombre) {
    this.nombre = nombre;
    this.suscriptores = [];
    this.ultimoDato = null;
  }

  /**
   * Suscribirse a cambios
   * @param {Function} callback - Función llamada cuando cambian los datos
   * @returns {Function} - Función para desuscribirse
   */
  suscribir(callback) {
    if (typeof callback !== 'function') {
      console.warn(`⚠️ Suscriptor no es función para ${this.nombre}`);
      return;
    }
    this.suscriptores.push(callback);
    
    // Retornar función de desuscripción
    return () => {
      this.suscriptores = this.suscriptores.filter(c => c !== callback);
    };
  }

  /**
   * Notificar a todos los suscriptores
   * @param {*} datos - Datos a notificar
   */
  notificar(datos) {
    this.ultimoDato = datos;
    this.suscriptores.forEach(callback => {
      try {
        callback(datos);
      } catch (e) {
        console.error(`❌ Error en suscriptor de ${this.nombre}:`, e);
      }
    });
  }

  /**
   * Obtener últimos datos notificados
   */
  obtenerUltimo() {
    return this.ultimoDato;
  }
}

// Instancias globales de eventos
const AgroFlowEventos = {
  lotesActualizados: new EventoReactivo('lotesActualizados'),
  tratamientosActualizados: new EventoReactivo('tratamientosActualizados'),
  insumosActualizados: new EventoReactivo('insumosActualizados'),
  preciosActualizados: new EventoReactivo('preciosActualizados'),
  consolidacionActualizada: new EventoReactivo('consolidacionActualizada')
};

// Escuchar cambios de storage desde otras pestañas
window.addEventListener('storage', (e) => {
  if (e.key?.startsWith('agro_')) {
    const clave = e.key.replace('agro_', '');
    const datos = e.newValue ? JSON.parse(e.newValue) : null;
    
    // Mapear cambios a eventos
    switch (clave) {
      case 'lotesData':
        AgroFlowEventos.lotesActualizados.notificar(datos);
        break;
      case 'planificadorSiembraData':
        if (datos?.tratamientos) {
          AgroFlowEventos.tratamientosActualizados.notificar(datos.tratamientos);
        }
        break;
      case 'insumosStock':
        AgroFlowEventos.insumosActualizados.notificar(datos);
        break;
    }
  }
});

// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║ 3. API GLOBAL PARA INTEROPERABILIDAD                                     ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

const AgroFlowAPI = {
  /**
   * ════════════════════════════════════════════════════════════════════════
   * MÓDULO: LOTES & ROTACIONES
   * ════════════════════════════════════════════════════════════════════════
   */

  /**
   * Obtener todos los lotes
   */
  lotes: {
    obtenerTodos: () => {
      return AgroFlowStorage.cargar('lotesData', []);
    },

    obtenerPorId: (id) => {
      const lotes = AgroFlowAPI.lotes.obtenerTodos();
      return lotes.find(l => l.id === id);
    },

    /**
     * Actualizar un lote específico
     * @param {number} id - ID del lote
     * @param {Object} cambios - Cambios a aplicar { ha, nombre, rotacion, etc }
     */
    actualizar: (id, cambios) => {
      let lotes = AgroFlowAPI.lotes.obtenerTodos();
      const lote = lotes.find(l => l.id === id);
      
      if (!lote) {
        console.error(`❌ Lote ${id} no encontrado`);
        return false;
      }

      const lotesAnterior = JSON.stringify(lote);
      Object.assign(lote, cambios);
      
      AgroFlowStorage.guardar('lotesData', lotes);
      AgroFlowEventos.lotesActualizados.notificar({
        accion: 'actualizar',
        loteId: id,
        cambios: cambios,
        lote: lote,
        timestamp: Date.now()
      });
      
      return true;
    },

    /**
     * Obtener superficie total de lotes seleccionados
     * @param {Array<number>} loteIds - IDs de lotes a sumar (opcional)
     */
    obtenerSuperficieTotal: (loteIds = null) => {
      const lotes = AgroFlowAPI.lotes.obtenerTodos();
      if (!loteIds || loteIds.length === 0) {
        return lotes.reduce((sum, l) => sum + (l.ha || 0), 0);
      }
      return lotes
        .filter(l => loteIds.includes(l.id))
        .reduce((sum, l) => sum + (l.ha || 0), 0);
    },

    /**
     * Obtener cultivo actual de un lote
     */
    obtenerCultivoActual: (loteId) => {
      const lote = AgroFlowAPI.lotes.obtenerPorId(loteId);
      return lote?.rotacion?.[0] || null;
    },

    /**
     * Cambiar cultivo de un lote (año 0 del plan de rotación)
     */
    cambiarCultivo: (loteId, nuevoCultivo) => {
      const lote = AgroFlowAPI.lotes.obtenerPorId(loteId);
      if (!lote || !lote.rotacion) {
        console.error(`❌ No se puede cambiar cultivo del lote ${loteId}`);
        return false;
      }

      return AgroFlowAPI.lotes.actualizar(loteId, {
        rotacion: [nuevoCultivo, ...lote.rotacion.slice(1)]
      });
    }
  },

  /**
   * ════════════════════════════════════════════════════════════════════════
   * MÓDULO: PLANIFICADOR DE SIEMBRA
   * ════════════════════════════════════════════════════════════════════════
   */

  planificador: {
    /**
     * Obtener todos los tratamientos
     */
    obtenerTratamientos: () => {
      const data = AgroFlowStorage.cargar('planificadorSiembraData', {
        lotesSeleccionados: [],
        tratamientos: []
      });
      return data.tratamientos || [];
    },

    /**
     * Obtener lotes seleccionados
     */
    obtenerLotesSeleccionados: () => {
      const data = AgroFlowStorage.cargar('planificadorSiembraData', {
        lotesSeleccionados: []
      });
      return data.lotesSeleccionados || [];
    },

    /**
     * Actualizar lotes seleccionados
     */
    actualizarLotesSeleccionados: (loteIds) => {
      const data = AgroFlowStorage.cargar('planificadorSiembraData', {
        lotesSeleccionados: [],
        tratamientos: []
      });
      data.lotesSeleccionados = loteIds;
      AgroFlowStorage.guardar('planificadorSiembraData', data);
      
      AgroFlowEventos.tratamientosActualizados.notificar({
        accion: 'lotesSeleccionadosChange',
        lotesIds: loteIds,
        timestamp: Date.now()
      });
      
      return true;
    },

    /**
     * Agregar tratamiento
     */
    agregarTratamiento: (insumoId, dosisHa, fase = 'posemergencia') => {
      const data = AgroFlowStorage.cargar('planificadorSiembraData', {
        lotesSeleccionados: [],
        tratamientos: []
      });

      // Verificar que no exista
      if (data.tratamientos.find(t => t.id === insumoId)) {
        console.warn(`⚠️ Insumo ${insumoId} ya existe en el plan`);
        return false;
      }

      data.tratamientos.push({
        id: insumoId,
        dosisHa: parseFloat(dosisHa),
        fase: fase,
        fechaAnadido: Date.now()
      });

      AgroFlowStorage.guardar('planificadorSiembraData', data);
      AgroFlowEventos.tratamientosActualizados.notificar(data.tratamientos);
      
      return true;
    },

    /**
     * Eliminar tratamiento
     */
    eliminarTratamiento: (insumoId) => {
      const data = AgroFlowStorage.cargar('planificadorSiembraData', {
        tratamientos: []
      });

      const indexAnterior = data.tratamientos.length;
      data.tratamientos = data.tratamientos.filter(t => t.id !== insumoId);
      
      if (data.tratamientos.length === indexAnterior) {
        console.warn(`⚠️ Insumo ${insumoId} no encontrado en el plan`);
        return false;
      }

      AgroFlowStorage.guardar('planificadorSiembraData', data);
      AgroFlowEventos.tratamientosActualizados.notificar(data.tratamientos);
      
      return true;
    },

    /**
     * Actualizar dosis de un insumo
     */
    actualizarDosis: (insumoId, nuevaDosis) => {
      const data = AgroFlowStorage.cargar('planificadorSiembraData', {
        tratamientos: []
      });

      const tratamiento = data.tratamientos.find(t => t.id === insumoId);
      if (!tratamiento) {
        console.error(`❌ Insumo ${insumoId} no encontrado`);
        return false;
      }

      tratamiento.dosisHa = parseFloat(nuevaDosis);
      AgroFlowStorage.guardar('planificadorSiembraData', data);
      AgroFlowEventos.tratamientosActualizados.notificar(data.tratamientos);
      
      return true;
    }
  },

  /**
   * ════════════════════════════════════════════════════════════════════════
   * MÓDULO: CONSOLIDADOR DE INSUMOS
   * ════════════════════════════════════════════════════════════════════════
   */

  consolidacion: {
    /**
     * Calcular consolidación de insumos por rubro
     * @param {Array<number>} loteIds - IDs de lotes a consolidar
     * @returns {Object} - Insumos agrupados por rubro
     */
    calcularPorRubro: (loteIds = null) => {
      const lotesSeleccionados = loteIds || AgroFlowAPI.planificador.obtenerLotesSeleccionados();
      const totalHa = AgroFlowAPI.lotes.obtenerSuperficieTotal(lotesSeleccionados);

      if (totalHa === 0) return {};

      const tratamientos = AgroFlowAPI.planificador.obtenerTratamientos();
      const consolidado = {};

      // Nota: VADEMECUM debe estar disponible globalmente
      if (typeof VADEMECUM === 'undefined') {
        console.error('❌ VADEMECUM no está disponible');
        return {};
      }

      tratamientos.forEach(trat => {
        const insumo = VADEMECUM.find(i => i.id === trat.id);
        if (!insumo) return;

        if (!consolidado[insumo.rubro]) {
          consolidado[insumo.rubro] = [];
        }

        const cantidadTotal = trat.dosisHa * totalHa;
        
        // Buscar si ya existe en este rubro
        let item = consolidado[insumo.rubro].find(i => i.id === insumo.id);
        if (item) {
          item.cantidad += cantidadTotal;
        } else {
          consolidado[insumo.rubro].push({
            id: insumo.id,
            nombre: insumo.nombre,
            unidad: insumo.unidad,
            cantidad: cantidadTotal,
            stock: AgroFlowAPI.insumos.obtenerStock(insumo.id),
            faltante: 0 // Se calcula abajo
          });
        }
      });

      // Calcular faltantes
      Object.values(consolidado).forEach(insumos => {
        insumos.forEach(ins => {
          ins.faltante = Math.max(0, ins.cantidad - ins.stock);
        });
      });

      return consolidado;
    },

    /**
     * Obtener cantidad total necesaria de un insumo específico
     */
    obtenerCantidadNecesaria: (insumoId) => {
      const consolidado = AgroFlowAPI.consolidacion.calcularPorRubro();
      
      for (const insumos of Object.values(consolidado)) {
        const item = insumos.find(i => i.id === insumoId);
        if (item) return item.cantidad;
      }
      return 0;
    }
  },

  /**
   * ════════════════════════════════════════════════════════════════════════
   * MÓDULO: INVENTARIO & STOCK
   * ════════════════════════════════════════════════════════════════════════
   */

  insumos: {
    /**
     * Obtener stock de un insumo
     */
    obtenerStock: (insumoId) => {
      const data = AgroFlowStorage.cargar('insumosStock', {});
      return data[insumoId] || 0;
    },

    /**
     * Actualizar stock
     */
    actualizarStock: (insumoId, cantidad) => {
      const data = AgroFlowStorage.cargar('insumosStock', {});
      data[insumoId] = Math.max(0, parseFloat(cantidad) || 0);
      
      AgroFlowStorage.guardar('insumosStock', data);
      AgroFlowEventos.insumosActualizados.notificar(data);
      
      return true;
    },

    /**
     * Obtener faltante de un insumo
     */
    obtenerFaltante: (insumoId) => {
      const necesario = AgroFlowAPI.consolidacion.obtenerCantidadNecesaria(insumoId);
      const stock = AgroFlowAPI.insumos.obtenerStock(insumoId);
      return Math.max(0, necesario - stock);
    }
  }
};

// Exponer globalmente
window.AgroFlowAPI = AgroFlowAPI;
window.AgroFlowEventos = AgroFlowEventos;
window.AgroFlowStorage = AgroFlowStorage;

// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║ 4. FUNCIONES HELPER PARA INTEGRACIÓN                                     ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

/**
 * Helper: Exportar datos de lotes para sincronización
 * Llamar cada vez que cambien los lotes en el módulo existente
 */
function exportarLotesParaSincronizacion() {
  if (typeof lotes === 'undefined') {
    console.error('❌ Variable "lotes" no disponible. Asegúrate de llamar después de cargar Lotes');
    return false;
  }

  const datosExportacion = lotes.map(l => ({
    id: l.id,
    nombre: l.nombre,
    ha: l.ha,
    tipo: l.tipo || 'agricola',
    rotacion: Array.isArray(l.rotacion) ? l.rotacion : [],
    rinde: l.rinde || {},
    hacienda: l.hacienda || {}
  }));

  AgroFlowStorage.guardar('lotesData', datosExportacion);
  AgroFlowEventos.lotesActualizados.notificar({
    accion: 'exportar',
    lotes: datosExportacion,
    timestamp: Date.now()
  });

  return true;
}

/**
 * Helper: Generar mensaje de WhatsApp con consolidación
 */
function generarMensajeWhatsApp() {
  const lotesSeleccionados = AgroFlowAPI.planificador.obtenerLotesSeleccionados();
  const totalHa = AgroFlowAPI.lotes.obtenerSuperficieTotal(lotesSeleccionados);
  const consolidado = AgroFlowAPI.consolidacion.calcularPorRubro(lotesSeleccionados);

  if (totalHa === 0 || Object.keys(consolidado).length === 0) {
    console.warn('⚠️ No hay datos para generar mensaje');
    return '';
  }

  let mensaje = `🌱 *Cotización de Insumos — AgroFlow*\n\n`;
  
  mensaje += `📍 *Campos:*\n`;
  lotesSeleccionados.forEach(loteId => {
    const lote = AgroFlowAPI.lotes.obtenerPorId(loteId);
    if (lote) {
      mensaje += `  • ${lote.nombre} (${lote.ha} ha)\n`;
    }
  });

  mensaje += `\n*Total: ${totalHa} ha*\n\n`;
  mensaje += `📋 *Insumos Necesarios:*\n\n`;

  Object.entries(consolidado).forEach(([rubro, insumos]) => {
    mensaje += `*${rubro}:*\n`;
    insumos.forEach(ins => {
      mensaje += `  • ${ins.nombre}: ${ins.cantidad.toFixed(1)} ${ins.unidad}\n`;
      if (ins.faltante > 0) {
        mensaje += `    ⚠️ Faltante: ${ins.faltante.toFixed(1)} ${ins.unidad}\n`;
      }
    });
    mensaje += `\n`;
  });

  mensaje += `📞 Por favor cotizá estos insumos.\nGenerado con AgroFlow.`;

  return mensaje;
}

/**
 * Helper: Debug - Ver estado actual de almacenamiento
 */
function debugAgroFlow() {
  console.group('🔍 AgroFlow Debug Info');
  
  console.log('📦 Tamaño almacenamiento:', AgroFlowStorage.obtenerTamano(), 'KB');
  
  console.log('🌾 Lotes:', AgroFlowAPI.lotes.obtenerTodos());
  console.log('📋 Tratamientos:', AgroFlowAPI.planificador.obtenerTratamientos());
  console.log('📊 Consolidación:', AgroFlowAPI.consolidacion.calcularPorRubro());
  
  console.log('📡 Suscriptores activos:');
  Object.entries(AgroFlowEventos).forEach(([nombre, evento]) => {
    console.log(`  ${nombre}: ${evento.suscriptores.length} suscriptor(es)`);
  });
  
  console.groupEnd();
}

// Hacer debug disponible globalmente
window.debugAgroFlow = debugAgroFlow;

console.log('✅ Sistema de integración AgroFlow cargado correctamente');
