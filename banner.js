/* SITIA · banner pixel art: comunas nombradas, cámaras que leen y un centro que no rinde cuentas */
(async function () {
  const root = document.getElementById('banner');
  if (!root) return;
  const [G, D] = await Promise.all([fetch('assets/banner_grid_sitia.json').then(r => r.json()), fetch('data.json').then(r => r.json())]);
  const $ = s => root.querySelector(s);
  const cv = $('canvas'), ctx = cv.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const C = { vacio: '#0c0e13', trama: '#171a20', rm: '#1b1e24', borde: '#2e3139', nombrada: '#1c3a63', nombradaB: '#3987e5', brillo: '#e2e2e9',
    red: '#243a5a', pulso: '#aac7ff', lente: '#ff8a80', cuerpo: '#b9bcc6', oscuro: '#0c0e13', hub: '#3987e5' };
  const RGB = Object.fromEntries(Object.entries(C).map(([k, h]) => [k, [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16))]));
  const CAM = ['BBBB.', 'BLBBB', 'BBBB.', '.p...'];              // cámara: B cuerpo, L lente, p poste
  const HUB = ['.HHHHH.', 'HhhhhhH', 'HHHHHHH', 'HhhhhhH', 'HHHHHHH', 'HhhhhhH', 'HHHHHHH', '.H...H.'];
  const porIndice = Object.fromEntries(G.comunas.map(c => [c.i, c]));
  const aus = D.nodos.filter(n => n.familia === 'ausencia');
  let modo, grid, M, img, camaras = [], hub, rutas = [], t0 = performance.now(), jugando = !reduce;

  const hash = i => { let x = (i + 1) * 2654435761 >>> 0; x ^= x >>> 16; x = Math.imul(x, 2246822507) >>> 0; x ^= x >>> 13; return (x >>> 0) / 4294967296; };
  const linea = (x0, y0, x1, y1) => { const p = []; let dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1, dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1, e = dx + dy;
    for (;;) { p.push([x0, y0]); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } } return p; };

  function preparar() {
    const m = root.clientWidth < 640 ? 'movil' : 'escritorio';
    if (m === modo) return; modo = m; grid = G[m];
    M = new Uint8Array(grid.cols * grid.rows);
    for (let k = 0; k < M.length; k++) M[k] = G.alfabeto.indexOf(grid.celdas[k]);
    cv.width = grid.cols; cv.height = grid.rows; img = ctx.createImageData(grid.cols, grid.rows);
    root.style.setProperty('--aspect', `${grid.cols} / ${grid.rows}`);
    hub = m === 'escritorio' ? { x: Math.round(grid.cols * .9), y: Math.round(grid.rows * .70) } : { x: Math.round(grid.cols * .62), y: Math.round(grid.rows * .78) };
    camaras = G.comunas.filter(c => c.piloto && grid.etiquetas[c.cod]).map(c => {
      const e = grid.etiquetas[c.cod];
      return { c, x: Math.round(e.cx * grid.cols) - 2, y: Math.round(e.cy * grid.rows) - 2, fase: hash(c.cod) };
    });
    rutas = camaras.map(k => linea(k.x + 2, k.y + 1, hub.x + 3, hub.y + 3));
    const hl = $('.px-hub'); hl.style.left = (hub.x + 3.5) / grid.cols * 100 + '%'; hl.style.top = (hub.y + 8) / grid.rows * 100 + '%';
  }

  function dibujar(t) {
    const { cols, rows } = grid, px = img.data;
    const set = (x, y, rgb) => { if (x < 0 || y < 0 || x >= cols || y >= rows) return; const o = (y * cols + x) * 4; px[o] = rgb[0]; px[o + 1] = rgb[1]; px[o + 2] = rgb[2]; px[o + 3] = 255; };
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const k = y * cols + x, v = M[k];
      if (!v) { set(x, y, (x % 6 === 0 && y % 6 === 0) ? RGB.trama : RGB.vacio); continue; }
      const vec = (dx, dy) => { const xx = x + dx, yy = y + dy; return xx < 0 || yy < 0 || xx >= cols || yy >= rows ? v : M[yy * cols + xx]; };
      const borde = vec(1, 0) !== v || vec(-1, 0) !== v || vec(0, 1) !== v || vec(0, -1) !== v, nom = porIndice[v].piloto;
      set(x, y, nom ? (borde ? RGB.nombradaB : ((x + y) % 2 ? RGB.nombrada : RGB.red)) : (borde ? RGB.borde : RGB.rm));
    }
    const fase = jugando ? (t - t0) / 1000 : 2.2;
    rutas.forEach((ruta, i) => {
      ruta.forEach(([x, y], j) => { if (j % 2 === 0) set(x, y, RGB.red); });
      const pos = Math.floor(((fase * .55 + camaras[i].fase) % 1) * ruta.length);
      for (let q = 0; q < 3; q++) { const p = ruta[Math.max(0, pos - q)]; if (p) set(p[0], p[1], q ? RGB.nombradaB : RGB.pulso); }
    });
    camaras.forEach(k => {
      const lectura = ((fase * .55 + k.fase) % 1) < .08;
      for (let y = -1; y <= CAM.length; y++) for (let x = -1; x <= CAM[0].length; x++) set(k.x + x, k.y + y, RGB.oscuro);
      CAM.forEach((f, dy) => [...f].forEach((ch, dx) => { if (ch !== '.') set(k.x + dx, k.y + dy, ch === 'L' ? (lectura ? RGB.brillo : RGB.lente) : RGB.cuerpo); }));
    });
    for (let y = -1; y <= HUB.length; y++) for (let x = -1; x <= HUB[0].length; x++) set(hub.x + x, hub.y + y, RGB.oscuro);
    const parpadeo = Math.floor(fase * 3) % 2;
    HUB.forEach((f, dy) => [...f].forEach((ch, dx) => { if (ch !== '.') set(hub.x + dx, hub.y + dy, ch === 'H' ? RGB.hub : ((dx + dy + parpadeo) % 2 ? RGB.pulso : RGB.oscuro)); }));
    ctx.putImageData(img, 0, 0);
  }

  function bucle(t) { if (jugando) dibujar(t); requestAnimationFrame(bucle); }

  /* texto dinámico */
  const prog = D.nodos.find(n => n.id === 'PRG-SITIA').atributos;
  $('.px-camaras').textContent = prog.camaras; $('.px-lectores').textContent = prog.lectores_patentes; $('.px-comunas').textContent = prog.comunas_RM;
  const lista = $('.px-aus');
  const CORTO = { 'AUS-PROTOCOLO-ERROR': 'falsos positivos', 'AUS-PROVEEDOR-FAQ': 'proveedor', 'AUS-RETENCION': 'retención', 'AUS-CODIGO-LICIT': 'licitación', 'AUS-REGISTRO-DIV': 'registro de errores', 'AUS-NOMINA-ETICA': 'comité de ética' };
  aus.forEach(n => { const li = document.createElement('li'); li.textContent = CORTO[n.id] || n.nombre.split(' (')[0]; li.title = n.nombre; lista.append(li); });
  $('.px-aus-n').textContent = aus.length;

  const btn = $('.px-play');
  const syncBtn = () => { btn.querySelector('span').textContent = jugando ? 'pause' : 'play_arrow'; btn.setAttribute('aria-label', jugando ? 'Pausar animación' : 'Reproducir animación'); };
  btn.onclick = () => { jugando = !jugando; syncBtn(); if (!jugando) dibujar(performance.now()); };

  const tt = document.getElementById('tt');
  cv.addEventListener('pointermove', e => {
    const b = cv.getBoundingClientRect(), x = Math.floor((e.clientX - b.left) / b.width * grid.cols), y = Math.floor((e.clientY - b.top) / b.height * grid.rows);
    if (Math.abs(x - hub.x - 3) <= 5 && Math.abs(y - hub.y - 3) <= 5) {
      tt.innerHTML = `<div class="tt-sub">Centro SITIA (ilustrativo)</div><div class="body-s">Carabineros opera; la SPD administra. Sin registro público de errores.</div>`;
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

  preparar(); syncBtn(); dibujar(performance.now()); requestAnimationFrame(bucle);
  let rt; new ResizeObserver(() => { clearTimeout(rt); rt = setTimeout(() => { const prev = modo; preparar(); if (prev !== modo || !jugando) dibujar(performance.now()); }, 120); }).observe(root);
})();
