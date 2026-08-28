# 🚜 AgroFlow - Módulo de Cotización de Insumos

**Gestiona y compara cotizaciones de insumos agrícolas directamente en AgroFlow**

[![GitHub Stars](https://img.shields.io/github/stars/tu-usuario/agroflow-cotizacion?style=social)](https://github.com/tu-usuario/agroflow-cotizacion)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![HTML5](https://img.shields.io/badge/HTML5-E34C26?style=flat&logo=html5&logoColor=white)](https://html.spec.whatwg.org/)

---

## 🌟 Características

✅ **Sincronización Automática**  
Pre-llena automáticamente con datos del Plan de Siembra  

✅ **Dos Modalidades**  
Sincronizar con Plan o Carga Manual de insumos  

✅ **Matriz Comparativa**  
Compara ofertas de múltiples agronomías lado a lado  

✅ **Adjudicación Inteligente**  
Adjudica toda la cotización o parcialmente (ítem por ítem)  

✅ **Completamente Responsivo**  
Funciona perfectamente en desktop, tablet y móvil  

✅ **Sin Dependencias Externas**  
HTML/CSS/JavaScript puro, funciona offline  

✅ **Integración Nativa**  
Funciona dentro de AgroFlow sin modificaciones adicionales  

---

## 🚀 Inicio Rápido

### Opción 1: Usar directamente (Más rápido)
```bash
# 1. Descargar el archivo
wget https://raw.githubusercontent.com/tu-usuario/agroflow-cotizacion/main/src/index.html

# 2. Abrir en navegador
# Doble clic en index.html
# O arrastrar a navegador
```

### Opción 2: Clonar repositorio
```bash
git clone https://github.com/tu-usuario/agroflow-cotizacion.git
cd agroflow-cotizacion

# Abrir servidor local (opcional)
python -m http.server 8000
# Visita: http://localhost:8000/src/
```

### Opción 3: GitHub Pages (Live Demo)
```
https://tu-usuario.github.io/agroflow-cotizacion/src/
```

---

## 📖 Cómo Usar en 3 Pasos

### 1️⃣ **Ir a Plan de Siembra**
```
Haz clic en: 🌱 Plan de Siembra
Selecciona: Campaña (ej: Maíz 25/26)
Selecciona: Lote (ej: Lote La Trinchera)
```

### 2️⃣ **Abrir Cotización**
```
Haz clic en: 📋 Cotización Insumos
✨ Se pre-llena automáticamente ✨
Ver insumos cargados del plan
```

### 3️⃣ **Completar y Lanzar**
```
Completa: Condiciones comerciales
Haz clic: 🚀 Lanzar Cotización
Ver: Ofertas de agronomías
Adjudica: A la mejor opción
```

---

## 📚 Documentación

| Documento | Descripción |
|-----------|------------|
| 📖 [Guía Rápida](docs/GUIA_RAPIDA_INICIO.md) | Empieza en 5 minutos |
| 🔧 [Documentación Técnica](docs/INTEGRACION_TECNICA.md) | Detalles de código e integración |
| 👨‍🏫 [Tutorial Paso a Paso](docs/PASO_A_PASO.html) | Guía interactiva visual |
| 📋 [API Reference](docs/INTEGRACION_COTIZACION.md) | Referencia de funciones |

---

## 📸 Capturas de Pantalla

### Sincronización Automática con Plan
```
Plan de Siembra (Maíz 25/26 - La Trinchera)
            ↓
Usuario abre Cotización
            ↓
✨ Pre-llena automáticamente ✨
├─ Campaña
├─ Lote  
└─ Insumos
```

### Matriz Comparativa de Ofertas
```
┌─────────────────────────────────────────┐
│  Agronomía ABC      Agronomía XYZ       │
│  ─────────────      ──────────────      │
│  Glifosato: $4.50   Glifosato: $4.20   │
│  Atrazina: $85.00   Atrazina: $82.00   │
│  ...                ...                 │
│  Total: $333.885    Total: $322.640    │
│  ✓ Adjudicar        ✓ Adjudicar       │
└─────────────────────────────────────────┘
```

### Adjudicación Parcial
```
Elegir para cada insumo la mejor oferta:
Glifosato → Agronomía XYZ ($4.20)
Atrazina → Agronomía XYZ ($82.00)
Fertilizante → Agronomía ABC ($0.78)
            ↓
Costo Total Optimizado: $295.000
```

---

## 🎯 Casos de Uso

### Caso 1: Productor Planifica y Cotiza
```
1. Diseña Plan de Siembra (campañas, lotes, insumos)
2. Abre Cotización de Insumos
3. Pre-llenan automáticamente ✨
4. Completa condiciones
5. Compara 3 ofertas
6. Adjudica al mejor precio
7. ¡Ahorra dinero! 💰
```

### Caso 2: Agrónomo Cotiza Manual
```
1. Carga Manual de insumos
2. Especifica cantidades y unidades
3. Marca acepta genéricos
4. Completa condiciones
5. Lanza a la red
6. Recibe ofertas
7. Adjudica
```

### Caso 3: Comparar Opciones
```
1. Lanza cotización
2. Ve 3 ofertas simultáneamente
3. Compara:
   - Precio unitario
   - Marca
   - Flete
   - Condición de pago
   - Total consolidado
4. Elige la mejor opción (total o parcial)
```

---

## 🔄 Sistema de Sincronización

La aplicación sincroniza automáticamente con el Plan de Siembra:

```javascript
// Cuando el usuario abre Cotización:
CotizacionManager.sincronizarAutomatico()
  ├─ Detecta Plan seleccionado
  ├─ Extrae Campaña y Lote
  ├─ Carga insumos asociados
  └─ Pre-llena formulario
```

**Puntos de sincronización:**
1. Al abrir módulo de Cotización
2. Al cambiar campaña
3. Al cambiar lote
4. Manualmente (botón sync)

---

## ⚙️ Personalización

### Agregar nuevas campañas
Edita `src/index.html` y busca:
```javascript
const campaignData = {
  'mi-campana': {
    lotes: {
      'mi-lote': {
        nombre: 'Mi Lote Especial',
        hectareas: 150,
        insumos: [
          { 
            id: 1, 
            nombre: 'Glifosato 480 SL', 
            cantidad: 2250, 
            unidad: 'Litros', 
            marca: 'Monsanto' 
          }
        ]
      }
    }
  }
}
```

### Cambiar colores (Tema)
```css
:root {
  --accent-cotiz: #57c26a;      /* Verde principal */
  --emerald-cotiz: #10b981;     /* Verde secundario */
  --green-forest: #2d5016;      /* Verde oscuro */
}
```

### Agregar agronomías/ofertas
```javascript
const offersData = [
  {
    id: 1,
    agronomia: 'Tu Agronomía',
    contacto: 'Tu Contacto',
    ofertas: [
      { 
        insumoId: 1, 
        nombre: 'Glifosato 480 SL', 
        precioUnitario: 4.5, 
        marca: 'Monsanto', 
        cantidad: 2250 
      }
    ],
    flete: 1500,
    financiacion: 'Contado',
    totalConsolidado: 333885
  }
]
```

---

## 🛠️ Requisitos Técnicos

- ✅ Navegador moderno (Chrome, Firefox, Safari, Edge)
- ✅ JavaScript habilitado
- ✅ No requiere backend
- ✅ No requiere base de datos
- ✅ Funciona offline

**Tamaño:** ~100KB (HTML + CSS + JS)  
**Rendimiento:** Carga instantánea  
**Compatibilidad:** Mobile (iOS, Android) + Desktop

---

## 📊 Stack Técnico

| Tecnología | Uso | Versión |
|-----------|-----|---------|
| HTML5 | Estructura | 5 |
| CSS3 | Estilos | 3 |
| JavaScript | Lógica | ES6+ |
| Tailwind CSS | Framework CSS | CDN |
| Chart.js | Gráficos (opcional) | 4.4.0 |

**Sin dependencias NPM necesarias**

---

## 📈 Roadmap

### Versión 1.0 (Actual)
- ✅ Sincronización automática
- ✅ Dos modalidades (Plan/Manual)
- ✅ Matriz comparativa
- ✅ Adjudicación total y parcial
- ✅ Responsive design

### Versión 2.0 (Próxima)
- [ ] Integración con Firebase Firestore
- [ ] API de agronomías en tiempo real
- [ ] Exportar cotizaciones a PDF
- [ ] Email de confirmación
- [ ] Historial de cotizaciones

### Versión 3.0 (Futuro)
- [ ] Analytics y reportes
- [ ] Comparación de precios históricos
- [ ] Notificaciones push
- [ ] Aplicación móvil nativa
- [ ] Integración con bancos para financiación

---

## 🤝 Contribuir

¿Quieres mejorar el módulo? ¡Ayuda es bienvenida!

### Cómo contribuir:
1. **Fork** el proyecto
2. Crea una rama: `git checkout -b feature/tu-mejora`
3. Commit cambios: `git commit -m 'Agrega tu mejora'`
4. Push: `git push origin feature/tu-mejora`
5. Abre un **Pull Request**

Ver [CONTRIBUTING.md](CONTRIBUTING.md) para más detalles.

### Ideas para contribuir:
- [ ] Nuevas funcionalidades
- [ ] Corrección de bugs
- [ ] Mejoras de UI/UX
- [ ] Traducción a otros idiomas
- [ ] Documentación
- [ ] Tests automatizados

---

## 🐛 Reportar Bugs

Encontraste un bug? [Abre un issue aquí](https://github.com/tu-usuario/agroflow-cotizacion/issues)

**Por favor incluye:**
- Descripción clara del problema
- Pasos para reproducir
- Navegador y versión
- Screenshots (si aplica)

---

## ❓ FAQ

**¿Puedo usar sin AgroFlow?**  
Sí, funciona de forma independiente. Solo necesitas el HTML.

**¿Necesito base de datos?**  
No. Los datos se guardan en memoria. Agrega Firebase si quieres persistencia.

**¿Funciona offline?**  
Sí, completamente. Sin internet funciona igual.

**¿Puedo integrar mi propia API?**  
Sí, edita las funciones de `launchQuotation()` y `displayOffers()`

**¿Qué navegadores soporta?**  
Todos los modernos: Chrome, Firefox, Safari, Edge (últimas 2 versiones)

**¿Es gratis?**  
Sí, bajo licencia MIT.

---

## 📝 Licencia

Este proyecto está licenciado bajo la **Licencia MIT** - ver [LICENSE](LICENSE)

Resumen:
- ✅ Uso comercial
- ✅ Modificación
- ✅ Distribución
- ✅ Uso privado
- ⚠️ Incluye licencia y aviso de copyright

---

## 🙏 Agradecimientos

- Desarrollado para la comunidad agrícola
- Basado en **AgroFlow** - Plataforma de Gestión Agropecuaria
- Inspirado en mejores prácticas de UX/UI
- Con ❤️ para los productores agropecuarios

---

## 📧 Contacto

- **Email:** contacto@agroflow.com
- **GitHub Issues:** [Aquí](https://github.com/tu-usuario/agroflow-cotizacion/issues)
- **Discussiones:** [GitHub Discussions](https://github.com/tu-usuario/agroflow-cotizacion/discussions)

---

## 🌟 Apoya el Proyecto

Si te gustó este módulo:

⭐ **Dale una estrella** en GitHub  
🐛 **Reporta bugs** para mejorar  
💡 **Sugiere features** en Issues  
📢 **Comparte** con otros  
🤝 **Contribuye** código  

---

<div align="center">

### Desarrollado con 💚 para el agro

**¿Listo para cotizan insumos de forma inteligente?**

[⬇️ Descargar Ahora](https://github.com/tu-usuario/agroflow-cotizacion/releases) | [📖 Leer Docs](docs/) | [🐛 Reportar Bug](https://github.com/tu-usuario/agroflow-cotizacion/issues)

**[Volver a GitHub](https://github.com/tu-usuario/agroflow-cotizacion)**

</div>
