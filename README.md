# Beholder · Grafo del encargo SITIA (Doppelgänger C)

**Sitio:** https://fjreboll.github.io/doppelganger-encargo/ · **Par:** [Santiago Gemelo Digital (A)](https://fjreboll.github.io/doppelganger-doble/)

Red de nodos de la prueba de concepto C del programa *Doppelganger*: la ontología de fusión de datos aplicada hacia arriba, sobre el Estado y sus proveedores. Organismos, unidades, empresas, instrumentos, normas, territorios y personas en su rol público del Sistema Integrado de Teleprotección con Inteligencia Artificial (SITIA), con fuente y evidencia en cada vínculo. Las ausencias —lo que el encargo no documenta— son objetos de primera clase.

## Criterios

- Solo actores institucionales y personas en su **rol público**, con fuente pública enlazada.
- Planos de evidencia: `documentado`, `reconstruccion`, `hipotesis`.
- Cada cita es un **fragmento literal** leído en la página de origen y verificado el 2026-09-19; el grafo guarda estado y fecha de verificación por vínculo y por fuente.
- La adhesión de las 12 municipalidades y de los dos centros comerciales no está escrita en la portada: consta en sus **logotipos**, cuya imagen queda enlazada en cada vínculo.
- Revisión 2026-09-19: la página de gobernanza (antes 403) publica los 20 integrantes del Comité de Ética, así que la ausencia «nómina del Comité» se retiró del grafo; la ficha del Repositorio de Algoritmos Públicos responde 404 y se retiró de las fuentes.
- Ninguna empresa se fusiona con registros externos sin RUT (ver sección *Resolución de entidades*).

## Estructura

| Ruta | Contenido |
|---|---|
| `index.html`, `app.js` | Interfaz (Material Design 3; grafo de fuerzas D3 con tooltips, filtros, búsqueda, panel de detalle y vista tabular) |
| `banner.js`, `assets/banner_grid_sitia.json` | Banner pixel art: Santiago urbano rasterizado (300×237 escritorio, 140×111 móvil) con las 12 comunas que SITIA nombra como colaboradoras, autos que circulan por la red vial de OpenStreetMap y cámaras (ubicación ilustrativa) junto a avenidas que envían lecturas a un centro, cifras declaradas y las ausencias del grafo |
| `nav.js` | Navegación compartida con el sitio A: índice de secciones con seguimiento de lectura, barra de progreso, aparición progresiva, enlaces profundos y atajos (`/` buscar, `[` `]` secciones, `t` arriba). El banner enlaza con el grafo: el centro y las cámaras seleccionan SITIA, las comunas la Región Metropolitana y cada ausencia su nodo |
| `data.json` | Objetos, vínculos, fuentes y autorregistro exportados desde la base común |
| `assets/` | Hoja de estilo M3, D3 v7 y tipografías auto-alojadas (incl. Pixelify Sans y VT323, SIL OFL) |

El código que genera `data.json` vive en [`doppelganger-doble/pipeline`](https://github.com/fjreboll/doppelganger-doble/tree/main/pipeline) (`04_grafo_encargo.py`, semilla `data/seeds/encargo_sitia.json`, adaptadores para Mercado Público e InfoLobby aún no ejecutados).

## Fuentes

Vías del banner: OpenStreetMap (© colaboradores de OpenStreetMap, licencia ODbL), consulta Overpass del 2026-09-16, rasterizada con `pipeline/src/11_calles_osm.js` y `12_integrar_calles.py` del repositorio DOBLE.

sitia.gob.cl (portada, preguntas frecuentes, nota Maule 2025-11-07) · nota corporativa SONDA (2024-12-13) · Registro de Empresas y Sociedades. Página de gobernanza SITIA (403) y ficha del Repositorio de Algoritmos Públicos GobLab UAI (no legible) registradas como reconstrucción.
