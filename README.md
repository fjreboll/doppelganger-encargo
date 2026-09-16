# Grafo del encargo · SITIA (Doppelganger C)

**Sitio:** https://fjreboll.github.io/doppelganger-encargo/ · **Par:** [DOBLE (A)](https://fjreboll.github.io/doppelganger-doble/)

Red de nodos de la prueba de concepto C del programa *Doppelganger*: la ontología de fusión de datos aplicada hacia arriba, sobre el Estado y sus proveedores. Organismos, unidades, empresas, instrumentos, normas, territorios y personas en su rol público del Sistema Integrado de Teleprotección con Inteligencia Artificial (SITIA), con fuente y evidencia en cada vínculo. Las ausencias —lo que el encargo no documenta— son objetos de primera clase.

## Criterios

- Solo actores institucionales y personas en su **rol público**, con fuente pública enlazada.
- Planos de evidencia: `documentado`, `reconstruccion`, `hipotesis`.
- La evidencia de cada vínculo se obtuvo por **extracción asistida** y es paráfrasis, no cita literal: verificar contra la fuente antes de citar.
- Ninguna empresa se fusiona con registros externos sin RUT (ver sección *Resolución de entidades*).

## Estructura

| Ruta | Contenido |
|---|---|
| `index.html`, `app.js` | Interfaz (Material Design 3; grafo de fuerzas D3 con tooltips, filtros, búsqueda, panel de detalle y vista tabular) |
| `data.json` | Objetos, vínculos, fuentes y autorregistro exportados desde la base común |
| `assets/` | Hoja de estilo M3, D3 v7 y tipografías auto-alojadas |

El código que genera `data.json` vive en [`doppelganger-doble/pipeline`](https://github.com/fjreboll/doppelganger-doble/tree/main/pipeline) (`04_grafo_encargo.py`, semilla `data/seeds/encargo_sitia.json`, adaptadores para Mercado Público e InfoLobby aún no ejecutados).

## Fuentes

sitia.gob.cl (portada, preguntas frecuentes, nota Maule 2025-11-07) · nota corporativa SONDA (2024-12-13) · Registro de Empresas y Sociedades. Página de gobernanza SITIA (403) y ficha del Repositorio de Algoritmos Públicos GobLab UAI (no legible) registradas como reconstrucción.
