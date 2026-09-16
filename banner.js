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
    auto1: '#f2c14e', auto2: '#e2e2e9', auto3: '#e0703f', auto4: '#1faa78', faro: '#fff4c2' };
  const RGB = Object.fromEntries(Object.entries(C).map(([k, h]) => [k, [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16))]));
  // sprites sin fondo: '.' = transparente
  const CAM = ['BBL', '.p.'];                 // cámara 3×2: cuerpo, lente, poste
  const HUB = ['.HHHHH.', 'HhhhhhH', 'HHHHHHH', 'HhhhhhH', 'HHHHHHH', 'HhhhhhH', 'HHHHHHH', '.H...H.'];
  const COLORES = ['auto1', 'auto2', 'auto2', 'auto3', 'auto4'];
  const porIndice = Object.fromEntries(G.comunas.map(c => [c.i, c]));
  const aus = D.nodos.filter(n => n.familia === 'ausencia');
  let modo, grid, M, img, camaras = [], autos = [], pulsos = [], hub, t0 = performance.now(), tPrev = t0, jugando = !reduce;

  const hash = i => { let x = (i + 1) * 2654435761 >>> 0; x ^= x >>> 16; x = Math.imul(x, 2246822507) >>> 0; x ^= x >>> 13; return (x >>> 0) / 4294967296; };
  const linea = (x0, y0, x1, y1) => { const p = []; let dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1, dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1, e = dx + dy;
    for (;;) { p.push([x0, y0]); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } } return p; };

  function preparar() {
    const m = root.clientWidth < 640 ? 'movil' : 'escritorio';
    if (m === modo) return; modo = m; grid = G[m];
    const { cols, rows } = grid;
    M = new Uint8Array(cols * rows);
    for (let k = 0; k < M.length; k++) M[k] = G.alfabeto.indexOf(grid.celdas[k]);
    cv.width = cols; cv.height = rows; img = ctx.createImageData(cols, rows);
    root.style.setProperty('--aspect', `${cols} / ${rows}`);
    hub = m === 'escritorio' ? { x: Math.round(cols * .9), y: Math.round(rows * .70) } : { x: Math.round(cols * .62), y: Math.round(rows * .78) };
    const libreDeHub = (x, y) => Math.abs(x - hub.x - 3) > 7 || Math.abs(y - hub.y - 3) > 7;
    const copyW = m === 'escritorio' ? cols * .36 : 0;               // sin sprites bajo el panel de texto

    /* cámaras: varias por comuna nombrada, con distancia mínima */
    const celdasPor = {};
    for (let y = 2; y < rows - 3; y++) for (let x = 1; x < cols - 4; x++) { const v = M[y * cols + x]; if (v && porIndice[v].piloto) (celdasPor[v] ||= []).push([x, y]); }
    camaras = [];
    const dmin = m === 'escritorio' ? 7 : 6;
    Object.entries(celdasPor).forEach(([v, celdas]) => {
      const c = porIndice[v], n = Math.max(3, Math.min(m === 'escritorio' ? 9 : 5, Math.round(celdas.length / (m === 'escritorio' ? 70 : 45))));
      let puestas = 0;
      for (let k = 0; k < celdas.length * 3 && puestas < n; k++) {
        const [x, y] = celdas[Math.floor(hash(c.cod * 131 + k) * celdas.length)];
        if (x < copyW || !libreDeHub(x, y)) continue;
        if (M[y * cols + x + 2] !== +v || M[(y + 1) * cols + x + 1] !== +v) continue;
        if (camaras.some(q => Math.abs(q.x - x) < dmin && Math.abs(q.y - y) < dmin)) continue;
        camaras.push({ c, x, y, flash: -9 }); puestas++;
      }
    });

    /* autos: recorridos en L (tramo horizontal y vertical) dentro de la RM, como calles */
    autos = [];
    const nAutos = m === 'escritorio' ? 34 : 16;
    const enRM = (x, y) => x >= 0 && y >= 0 && x < cols && y < rows && M[y * cols + x] > 0;
    for (let k = 0; autos.length < nAutos && k < 6000; k++) {
      const x0 = Math.floor(hash(k * 7 + 3) * cols), y0 = Math.floor(hash(k * 11 + 5) * rows);
      const x1 = Math.floor(hash(k * 13 + 7) * cols), y1 = Math.floor(hash(k * 17 + 9) * rows);
      if (Math.abs(x1 - x0) < cols * .12 && Math.abs(y1 - y0) < rows * .12) continue;
      const tramo = [...linea(x0, y0, x1, y0), ...linea(x1, y0, x1, y1).slice(1)];
      if (tramo.length < 20 || tramo.some(([x]) => x < copyW)) continue;
      if (tramo.filter(([x, y]) => enRM(x, y)).length / tramo.length < .97) continue;
      autos.push({ ruta: tramo, pos: hash(k * 19) * tramo.length, vel: (m === 'escritorio' ? 9 : 6) + hash(k * 23) * 8, dir: 1, color: COLORES[autos.length % COLORES.length] });
    }
    pulsos = [];
    const hl = $('.px-hub'); hl.style.left = (hub.x + 3.5) / cols * 100 + '%'; hl.style.top = (hub.y + 8) / rows * 100 + '%';
  }

  function avanzar(dt, t) {
    autos.forEach(a => {
      a.pos += a.vel * dt * a.dir;
      if (a.pos >= a.ruta.length - 1) { a.pos = a.ruta.length - 1; a.dir = -1; }
      if (a.pos <= 0) { a.pos = 0; a.dir = 1; }
      const [x, y] = a.ruta[Math.floor(a.pos)];
      camaras.forEach(q => {
        if (t - q.flash > 1.2 && Math.abs(q.x + 1 - x) <= 3 && Math.abs(q.y - y) <= 3) {
          q.flash = t;
          if (pulsos.length < 40) pulsos.push({ ruta: linea(q.x + 1, q.y, hub.x + 3, hub.y + 3), t0: t });
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
      if (!v) { set(x, y, (x % 6 === 0 && y % 6 === 0) ? RGB.trama : RGB.vacio); continue; }
      const vec = (dx, dy) => { const xx = x + dx, yy = y + dy; return xx < 0 || yy < 0 || xx >= cols || yy >= rows ? v : M[yy * cols + xx]; };
      const borde = vec(1, 0) !== v || vec(-1, 0) !== v || vec(0, 1) !== v || vec(0, -1) !== v, nom = porIndice[v].piloto;
      set(x, y, nom ? (borde ? RGB.nombradaB : ((x + y) % 2 ? RGB.nombrada : RGB.red)) : (borde ? RGB.borde : RGB.rm));
    }
    // lecturas viajando al centro
    pulsos.forEach(p => {
      const cabeza = Math.floor((t - p.t0) * 45);
      p.ruta.forEach(([x, y], j) => { if (j <= cabeza && j > cabeza - 14 && j % 2 === 0) set(x, y, RGB.red); });
      for (let q = 0; q < 2; q++) { const pt = p.ruta[cabeza - q]; if (pt) set(pt[0], pt[1], q ? RGB.nombradaB : RGB.pulso); }
    });
    // autos
    autos.forEach(a => {
      const i = Math.floor(a.pos), [x, y] = a.ruta[i], sig = a.ruta[Math.min(a.ruta.length - 1, i + 1)], ant = a.ruta[Math.max(0, i - 1)];
      const col = RGB[a.color];
      if (sig[1] === y && ant[1] === y) {
        const s = (sig[0] - ant[0]) * a.dir >= 0 ? 1 : -1;
        set(x - s, y, col); set(x, y, col); set(x + s, y, RGB.faro);
      } else { set(x, y, col); set(x, y + ((sig[1] - ant[1]) * a.dir >= 0 ? 1 : -1), RGB.faro); }
    });
    // cámaras (sin fondo)
    camaras.forEach(q => {
      const lee = t - q.flash < .35;
      CAM.forEach((f, dy) => [...f].forEach((ch, dx) => { if (ch !== '.') set(q.x + dx, q.y + dy, ch === 'L' ? (lee ? RGB.brillo : RGB.lente) : ch === 'p' ? RGB.poste : RGB.cuerpo); }));
      if (lee) { set(q.x + 3, q.y - 1, RGB.brillo); set(q.x + 3, q.y + 1, RGB.brillo); }
    });
    // centro
    for (let y = -1; y <= HUB.length; y++) for (let x = -1; x <= HUB[0].length; x++) set(hub.x + x, hub.y + y, RGB.oscuro);
    const parpadeo = Math.floor(t * 3) % 2;
    HUB.forEach((f, dy) => [...f].forEach((ch, dx) => { if (ch !== '.') set(hub.x + dx, hub.y + dy, ch === 'H' ? RGB.hub : ((dx + dy + parpadeo) % 2 ? RGB.pulso : RGB.oscuro)); }));
    ctx.putImageData(img, 0, 0);
  }

  function bucle(now) {
    if (jugando) { const dt = Math.min(.1, (now - tPrev) / 1000); avanzar(dt, (now - t0) / 1000); dibujar((now - t0) / 1000); }
    tPrev = now; requestAnimationFrame(bucle);
  }

  /* íconos de la leyenda */
  root.querySelectorAll('.px-ico').forEach(c => {
    const g = c.getContext('2d'), put = (x, y, h) => { g.fillStyle = h; g.fillRect(x, y, 1, 1); };
    if (c.dataset.ico === 'cam') { put(0, 0, C.cuerpo); put(1, 0, C.cuerpo); put(2, 0, C.lente); put(1, 1, C.poste); }
    else { put(0, 1, C.auto1); put(1, 1, C.auto1); put(2, 1, C.faro); }
  });

  /* texto dinámico */
  const prog = D.nodos.find(n => n.id === 'PRG-SITIA').atributos;
  $('.px-camaras').textContent = prog.camaras; $('.px-lectores').textContent = prog.lectores_patentes; $('.px-comunas').textContent = prog.comunas_RM;
  const CORTO = { 'AUS-PROTOCOLO-ERROR': 'falsos positivos', 'AUS-PROVEEDOR-FAQ': 'proveedor', 'AUS-RETENCION': 'retención', 'AUS-CODIGO-LICIT': 'licitación', 'AUS-REGISTRO-DIV': 'registro de errores', 'AUS-NOMINA-ETICA': 'comité de ética' };
  const lista = $('.px-aus');
  aus.forEach(n => { const li = document.createElement('li'); li.textContent = CORTO[n.id] || n.nombre.split(' (')[0]; li.title = n.nombre; lista.append(li); });
  $('.px-aus-n').textContent = aus.length;

  const btn = $('.px-play');
  const syncBtn = () => { btn.querySelector('span').textContent = jugando ? 'pause' : 'play_arrow'; btn.setAttribute('aria-label', jugando ? 'Pausar animación' : 'Reproducir animación'); };
  btn.onclick = () => { jugando = !jugando; syncBtn(); };

  const tt = document.getElementById('tt');
  cv.addEventListener('pointermove', e => {
    const b = cv.getBoundingClientRect(), x = Math.floor((e.clientX - b.left) / b.width * grid.cols), y = Math.floor((e.clientY - b.top) / b.height * grid.rows);
    const cam = camaras.find(q => x >= q.x - 1 && x <= q.x + 3 && y >= q.y - 1 && y <= q.y + 2);
    if (Math.abs(x - hub.x - 3) <= 5 && Math.abs(y - hub.y - 3) <= 5) {
      tt.innerHTML = `<div class="tt-sub">Centro SITIA (ilustrativo)</div><div class="body-s">Carabineros opera; la SPD administra. Sin registro público de errores.</div>`;
    } else if (cam) {
      tt.innerHTML = `<div class="tt-sub">Cámara · ${cam.c.nombre}</div><div class="body-s">Ubicación ilustrativa. Cada auto que pasa cerca envía una lectura al centro.</div>`;
    } else {
      const c = porIndice[M[y * grid.cols + x]];
      if (!c) { tt.classList.remove('on'); return; }
      tt.innerHTML = `<div class="tt-sub">${c.nombre}</div><div class="body-s">${c.piloto ? 'Nombrada por SITIA como colaboradora' : 'No nombrada en la fuente'}</div>`;
    }
    tt.classList.add('on');
    const rr = tt.getBoundingClientRect(); let tx = e.clientX + 14, ty = e.clientY + 14;
    if (tx + rr.width > innerWidth - 8) tx = e.clientX - rr.width - 14; if (ty + rr.height > innerHeight - 8) ty = e.clientY - rr.height - 14;
    tt.style.left = Math.max(8, tx) + 'px'; tt.style.top = Math.max(8, ty) + 'px';
  });
  cv.addEventListener('pointerleave', () => tt.classList.remove('on'));

  function estatico() {
    pulsos = [];
    camaras.forEach((q, i) => { if (i % 5 === 0) { q.flash = 0; pulsos.push({ ruta: linea(q.x + 1, q.y, hub.x + 3, hub.y + 3), t0: -(10 + i * 3) / 45 }); } });
    dibujar(.1);
  }
  preparar(); syncBtn();
  if (!jugando) estatico();
  requestAnimationFrame(bucle);
  let rt; new ResizeObserver(() => { clearTimeout(rt); rt = setTimeout(() => { const prev = modo; preparar(); if (prev !== modo && !jugando) estatico(); }, 120); }).observe(root);
})();
