/* DOBLE · prueba C · banner pixel art: autos que circulan, cámaras que leen patentes y un centro que no rinde cuentas */
(async function () {
  const root = document.getElementById('banner');
  if (!root) return;
  const [G, D] = await Promise.all([fetch('assets/banner_grid_sitia.json').then(r => r.json()), fetch('data.json').then(r => r.json())]);
  const $ = s => root.querySelector(s);
  const cv = $('canvas'), ctx = cv.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const C = { vacio: '#000000', trama: '#0d0e11', rm: '#0f1013', borde: '#26282e', nombrada: '#15305a', nombradaB: '#3987e5', red: '#1f3354',
    brillo: '#ffffff', pulso: '#aac7ff', lente: '#ff8a80', cuerpo: '#c4c6d0', poste: '#6b6e78', hub: '#3987e5', oscuro: '#000000',
    auto1: '#f2c14e', auto2: '#e2e2e9', auto3: '#e0703f', auto4: '#1faa78', faro: '#fff4c2', vidrio: '#7fb2ff', rueda: '#5d6068',
    v1: '#4a4e58', v2: '#363940', v3: '#25272d', vn1: '#4f73ab', vn2: '#34568c', vn3: '#223f6c' };
  const RGB = Object.fromEntries(Object.entries(C).map(([k, h]) => [k, [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16))]));
  // sprites sin fondo: '.' = transparente
  const CAM = ['BBBB.', 'BLBBB', 'BBBB.', '.p...'];  // cámara 5×4 (ícono original, sin fondo)
  const AUTO_H = ['.GGG.', 'CCCCF', '.o.o.'];        // auto 5×3 de perfil: vidrios, carrocería, faro, ruedas
  const AUTO_V = ['oFo', 'CGC', 'CCC', 'o.o'];        // auto 3×4 visto desde arriba
  const HUB = ['.HHHHH.', 'HhhhhhH', 'HHHHHHH', 'HhhhhhH', 'HHHHHHH', 'HhhhhhH', 'HHHHHHH', '.H...H.'];
  const COLORES = ['auto1', 'auto2', 'auto2', 'auto3', 'auto4'];
  const porIndice = Object.fromEntries(G.comunas.map(c => [c.i, c]));
  const aus = D.nodos.filter(n => n.familia === 'ausencia');
  let modo, grid, M, V, img, camaras = [], autos = [], pulsos = [], hub, t0 = performance.now(), tPrev = t0, jugando = !reduce;

  const DIRS = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
  let via_ = () => false, paso = 0;
  const hash = i => { let x = (i + 1) * 2654435761 >>> 0; x ^= x >>> 16; x = Math.imul(x, 2246822507) >>> 0; x ^= x >>> 13; return (x >>> 0) / 4294967296; };
  const linea = (x0, y0, x1, y1) => { const p = []; let dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1, dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1, e = dx + dy;
    for (;;) { p.push([x0, y0]); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } } return p; };

  function preparar() {
    const m = root.clientWidth < 640 ? 'movil' : 'escritorio';
    if (m === modo) return; modo = m; grid = G[m];
    const { cols, rows } = grid;
    M = new Uint8Array(cols * rows);
    for (let k = 0; k < M.length; k++) M[k] = G.alfabeto.indexOf(grid.celdas[k]);
    // calles OSM rasterizadas: 0 nada, 1 autopista, 2 primaria, 3 secundaria, 4 terciaria
    V = new Uint8Array(cols * rows);
    grid.calles.split('|').forEach((fila, y) => { let x = 0; for (const [, c, n] of fila.matchAll(/([A-E])([0-9a-z]*)/g)) { const k = 'ABCDE'.indexOf(c), len = n ? parseInt(n, 36) : 1; if (k) V.fill(k, y * cols + x, y * cols + x + len); x += len; } });
    cv.width = cols; cv.height = rows; img = ctx.createImageData(cols, rows);
    root.style.setProperty('--aspect', `${cols} / ${rows}`);
    hub = m === 'escritorio' ? { x: Math.round(cols * .9), y: Math.round(rows * .70) } : { x: Math.round(cols * .62), y: Math.round(rows * .78) };
    const libreDeHub = (x, y) => Math.abs(x - hub.x - 3) > 7 || Math.abs(y - hub.y - 3) > 7;
    const copyW = m === 'escritorio' ? cols * .36 : 0;               // sin sprites bajo el panel de texto

    /* cámaras: junto a avenidas de las comunas nombradas (el lector mira la vía), con distancia mínima */
    const via = (x, y) => x >= copyW && y >= 0 && x < cols && y < rows && V[y * cols + x] > 0 && V[y * cols + x] <= 3;
    const celdasPor = {};
    for (let y = 5; y < rows - 1; y++) for (let x = 2; x < cols - 4; x++) {
      const v = M[y * cols + x];
      if (v && porIndice[v].piloto && via(x, y) && !via(x, y - 1) && !via(x + 1, y - 2)) (celdasPor[v] ||= []).push([x, y]);
    }
    camaras = [];
    const dmin = m === 'escritorio' ? 10 : 8;
    Object.entries(celdasPor).forEach(([v, celdas]) => {
      const c = porIndice[v], n = Math.max(2, Math.min(m === 'escritorio' ? 6 : 3, Math.round(celdas.length / (m === 'escritorio' ? 25 : 18))));
      let puestas = 0;
      for (let k = 0; k < celdas.length * 3 && puestas < n; k++) {
        const [rx, ry] = celdas[Math.floor(hash(c.cod * 131 + k) * celdas.length)];
        const x = rx - 1, y = ry - 4;                                   // el poste queda justo sobre la vía
        if (x < copyW || !libreDeHub(x, y)) continue;
        if (camaras.some(q => Math.abs(q.x - x) < dmin && Math.abs(q.y - y) < dmin)) continue;
        camaras.push({ c, x, y, flash: -9 }); puestas++;
      }
    });

    /* autos: recorren la red vial OSM (autopistas, primarias y secundarias) celda a celda */
    autos = [];
    const nAutos = m === 'escritorio' ? 26 : 12;
    const inicios = [];
    for (let y = 1; y < rows - 1; y++) for (let x = Math.ceil(copyW); x < cols - 1; x++) if (via(x, y) && M[y * cols + x]) inicios.push([x, y]);
    for (let k = 0; autos.length < nAutos && k < nAutos * 20; k++) {
      const [x, y] = inicios[Math.floor(hash(k * 7 + 3) * inicios.length)];
      if (autos.some(a => Math.abs(a.x - x) < 6 && Math.abs(a.y - y) < 4)) continue;
      const vec = DIRS.filter(([dx, dy]) => via(x + dx, y + dy));
      if (!vec.length) continue;
      const [dx, dy] = vec[Math.floor(hash(k * 11) * vec.length)];
      autos.push({ x, y, dx, dy, acc: hash(k * 13), vel: 5 + hash(k * 23) * 5, color: COLORES[autos.length % COLORES.length], semilla: k });
    }
    via_ = via;
    pulsos = [];
    const hl = $('.px-hub'); hl.style.left = (hub.x + 3.5) / cols * 100 + '%'; hl.style.top = (hub.y + 8) / rows * 100 + '%';
  }

  function mover(a) {
    // sigue la vía: prefiere seguir derecho, luego giros suaves (45°), luego 90°; nunca retrocede salvo calle sin salida
    const i = DIRS.findIndex(([dx, dy]) => dx === a.dx && dy === a.dy);
    const opciones = [[0, 8], [1, 3], [-1, 3], [2, 1], [-2, 1]].map(([d, w]) => [DIRS[(i + d + 8) % 8], w]).filter(([[dx, dy]]) => via_(a.x + dx, a.y + dy));
    let elegido;
    if (!opciones.length) elegido = [-a.dx, -a.dy];
    else {
      const total = opciones.reduce((s, o) => s + o[1], 0); let r = hash(a.semilla * 977 + (paso++)) * total;
      elegido = opciones.find(o => (r -= o[1]) < 0)[0];
    }
    [a.dx, a.dy] = elegido;
    if (via_(a.x + a.dx, a.y + a.dy)) { a.x += a.dx; a.y += a.dy; }
    const clase = V[a.y * grid.cols + a.x];
    a.ritmo = clase === 1 ? 1.6 : clase === 2 ? 1.15 : 1;              // más rápido en autopista
  }

  function avanzar(dt, t) {
    autos.forEach(a => {
      a.acc += a.vel * (a.ritmo || 1) * dt;
      while (a.acc >= 1) { a.acc -= 1; mover(a); }
      camaras.forEach(q => {
        if (t - q.flash > 1.2 && Math.abs(q.x + 1 - a.x) <= 3 && Math.abs(q.y + 4 - a.y) <= 2) {
          q.flash = t;
          if (pulsos.length < 40) pulsos.push({ ruta: linea(q.x + 2, q.y + 1, hub.x + 3, hub.y + 3), t0: t });
        }
      });
    });
    pulsos = pulsos.filter(p => (t - p.t0) * 45 < p.ruta.length + 14);
  }

  function dibujar(t) {
    const { cols, rows } = grid, px = img.data;
    const set = (x, y, rgb) => { if (x < 0 || y < 0 || x >= cols || y >= rows) return; const o = (y * cols + x) * 4; px[o] = rgb[0]; px[o + 1] = rgb[1]; px[o + 2] = rgb[2]; px[o + 3] = 255; };
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const v = M[y * cols + x];
      if (!v) { set(x, y, V[y * cols + x] && V[y * cols + x] < 3 ? RGB.v3 : (x % 6 === 0 && y % 6 === 0) ? RGB.trama : RGB.vacio); continue; }
      const vec = (dx, dy) => { const xx = x + dx, yy = y + dy; return xx < 0 || yy < 0 || xx >= cols || yy >= rows ? v : M[yy * cols + xx]; };
      const borde = vec(1, 0) !== v || vec(-1, 0) !== v || vec(0, 1) !== v || vec(0, -1) !== v, nom = porIndice[v].piloto;
      const cv_ = V[y * cols + x];
      if (borde) set(x, y, nom ? RGB.nombradaB : RGB.borde);
      else if (cv_ && cv_ < 4) set(x, y, nom ? RGB['vn' + cv_] : RGB['v' + cv_]);
      else set(x, y, nom ? ((x + y) % 2 ? RGB.nombrada : RGB.red) : RGB.rm);
    }
    // lecturas viajando al centro
    pulsos.forEach(p => {
      const cabeza = Math.floor((t - p.t0) * 45);
      p.ruta.forEach(([x, y], j) => { if (j <= cabeza && j > cabeza - 14 && j % 2 === 0) set(x, y, RGB.red); });
      for (let q = 0; q < 2; q++) { const pt = p.ruta[cabeza - q]; if (pt) set(pt[0], pt[1], q ? RGB.nombradaB : RGB.pulso); }
    });
    // autos
    const pintar = (f, x0, y0, espejo, col) => f.forEach((fila, dy) => [...fila].forEach((ch, dx) => {
      if (ch === '.') return; const xx = espejo ? x0 + fila.length - 1 - dx : x0 + dx;
      set(xx, y0 + dy, ch === 'C' ? col : ch === 'G' ? RGB.vidrio : ch === 'F' ? RGB.faro : RGB.rueda);
    }));
    autos.forEach(a => {
      const col = RGB[a.color];
      if (Math.abs(a.dx) >= Math.abs(a.dy) && a.dx !== 0) pintar(AUTO_H, a.x - 2, a.y - 1, a.dx < 0, col);
      else pintar(a.dy > 0 ? [...AUTO_V].reverse() : AUTO_V, a.x - 1, a.y - 2, false, col);
    });
    // cámaras (sin fondo)
    camaras.forEach(q => {
      const lee = t - q.flash < .35;
      CAM.forEach((f, dy) => [...f].forEach((ch, dx) => { if (ch !== '.') set(q.x + dx, q.y + dy, ch === 'L' ? (lee ? RGB.brillo : RGB.lente) : ch === 'p' ? RGB.poste : RGB.cuerpo); }));
      if (lee) { set(q.x - 1, q.y, RGB.brillo); set(q.x - 1, q.y + 2, RGB.brillo); }
    });
    // centro
    for (let y = -1; y <= HUB.length; y++) for (let x = -1; x <= HUB[0].length; x++) set(hub.x + x, hub.y + y, RGB.oscuro);
    const parpadeo = Math.floor(t * 3) % 2;
    HUB.forEach((f, dy) => [...f].forEach((ch, dx) => { if (ch !== '.') set(hub.x + dx, hub.y + dy, ch === 'H' ? RGB.hub : ((dx + dy + parpadeo) % 2 ? RGB.pulso : RGB.oscuro)); }));
    ctx.putImageData(img, 0, 0);
  }

  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(root);
  function bucle(now) {
    if (jugando && visible) { const dt = Math.min(.1, (now - tPrev) / 1000); avanzar(dt, (now - t0) / 1000); dibujar((now - t0) / 1000); }
    tPrev = now; requestAnimationFrame(bucle);
  }

  /* íconos de la leyenda */
  root.querySelectorAll('.px-ico').forEach(c => {
    const g = c.getContext('2d'), put = (x, y, h) => { g.fillStyle = h; g.fillRect(x, y, 1, 1); };
    const f = c.dataset.ico === 'cam' ? CAM : AUTO_H;
    f.forEach((fila, y) => [...fila].forEach((ch, x) => { if (ch !== '.') put(x, y, ({ B: C.cuerpo, L: C.lente, p: C.poste, C: C.auto1, G: C.vidrio, F: C.faro, o: C.rueda })[ch]); }));
  });

  /* texto dinámico */
  const prog = D.nodos.find(n => n.id === 'PRG-SITIA').atributos;
  $('.px-camaras').textContent = prog.camaras; $('.px-lectores').textContent = prog.lectores_patentes; $('.px-comunas').textContent = prog.comunas_RM;
  const CORTO = { 'AUS-PROTOCOLO-ERROR': 'falsos positivos', 'AUS-PROVEEDOR-FAQ': 'proveedor', 'AUS-RETENCION': 'retención', 'AUS-CODIGO-LICIT': 'licitación', 'AUS-REGISTRO-DIV': 'registro de errores', 'AUS-NOMINA-ETICA': 'comité de ética' };
  const lista = $('.px-aus');
  aus.forEach(n => { const li = document.createElement('li'); const b = document.createElement('button'); b.type = 'button'; b.textContent = CORTO[n.id] || n.nombre.split(' (')[0]; b.title = n.nombre + ' · ver en el grafo'; b.onclick = () => window.panoptes?.ver(n.id); li.append(b); lista.append(li); });
  $('.px-aus-n').textContent = aus.length;

  const btn = $('.px-play');
  const syncBtn = () => { btn.querySelector('span').textContent = jugando ? 'pause' : 'play_arrow'; btn.setAttribute('aria-label', jugando ? 'Pausar animación' : 'Reproducir animación'); };
  btn.onclick = () => { jugando = !jugando; syncBtn(); };

  const tt = document.getElementById('tt');
  cv.addEventListener('pointermove', e => {
    const b = cv.getBoundingClientRect(), x = Math.floor((e.clientX - b.left) / b.width * grid.cols), y = Math.floor((e.clientY - b.top) / b.height * grid.rows);
    const cam = camaras.find(q => x >= q.x - 1 && x <= q.x + 5 && y >= q.y - 1 && y <= q.y + 4);
    if (Math.abs(x - hub.x - 3) <= 5 && Math.abs(y - hub.y - 3) <= 5) {
      tt.innerHTML = `<div class="tt-sub">Centro SITIA (ilustrativo)</div><div class="body-s">Carabineros opera; la SPD administra. Sin registro público de errores.</div><div class="body-s" style="margin-top:4px;color:var(--md-primary)">Clic: ver SITIA en el grafo</div>`;
    } else if (cam) {
      tt.innerHTML = `<div class="tt-sub">Cámara · ${cam.c.nombre}</div><div class="body-s">Ubicación ilustrativa. Cada auto que pasa cerca envía una lectura al centro.</div><div class="body-s" style="margin-top:4px;color:var(--md-primary)">Clic: ver SITIA en el grafo</div>`;
    } else {
      const c = porIndice[M[y * grid.cols + x]];
      if (!c) { tt.classList.remove('on'); return; }
      tt.innerHTML = `<div class="tt-sub">${c.nombre}</div><div class="body-s">${c.piloto ? 'Nombrada por SITIA como colaboradora' : 'No nombrada en la fuente'}</div><div class="body-s" style="margin-top:4px;color:var(--md-primary)">Clic: ver Región Metropolitana en el grafo</div>`;
    }
    tt.classList.add('on');
    const rr = tt.getBoundingClientRect(); let tx = e.clientX + 14, ty = e.clientY + 14;
    if (tx + rr.width > innerWidth - 8) tx = e.clientX - rr.width - 14; if (ty + rr.height > innerHeight - 8) ty = e.clientY - rr.height - 14;
    tt.style.left = Math.max(8, tx) + 'px'; tt.style.top = Math.max(8, ty) + 'px';
  });
  cv.addEventListener('pointerleave', () => tt.classList.remove('on'));
  cv.style.cursor = 'pointer';
  cv.addEventListener('click', e => {
    const b = cv.getBoundingClientRect(), x = Math.floor((e.clientX - b.left) / b.width * grid.cols), y = Math.floor((e.clientY - b.top) / b.height * grid.rows);
    const enHub = Math.abs(x - hub.x - 3) <= 5 && Math.abs(y - hub.y - 3) <= 5, cam = camaras.find(q => x >= q.x - 1 && x <= q.x + 5 && y >= q.y - 1 && y <= q.y + 4);
    tt.classList.remove('on');
    if (enHub || cam) window.panoptes?.ver('PRG-SITIA');
    else if (porIndice[M[y * grid.cols + x]]) window.panoptes?.ver('TER-RM');
  });
  $('.px-hub').style.pointerEvents = 'auto'; $('.px-hub').style.cursor = 'pointer'; $('.px-hub').onclick = () => window.panoptes?.ver('PRG-SITIA');

  function estatico() {
    pulsos = [];
    camaras.forEach((q, i) => { if (i % 5 === 0) { q.flash = 0; pulsos.push({ ruta: linea(q.x + 2, q.y + 1, hub.x + 3, hub.y + 3), t0: -(10 + i * 3) / 45 }); } });
    dibujar(.1);
  }
  preparar(); syncBtn();
  if (!jugando) estatico();
  requestAnimationFrame(bucle);
  let rt; new ResizeObserver(() => { clearTimeout(rt); rt = setTimeout(() => { const prev = modo; preparar(); if (prev !== modo && !jugando) estatico(); }, 120); }).observe(root);
})();
