/* Beholder · la vida del dato
   Recorrido de una lectura, de la cámara municipal a la orden de salida.
   Cada estación cita la documentación del propio programa y nombra lo que no consta. */
(async () => {
  const host = document.getElementById('vida-linea'); if (!host) return;
  const D = await (await fetch('data.json')).json();
  const V = D.vida_dato; if (!V) return;
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fuente = id => D.fuentes.find(f => f.id === id);
  const sello = v => !v ? '' : `<span class="ver ${v.estado}">${v.estado === 'verificada' ? 'verificada ' + v.fecha : v.estado}</span>`;

  /* ── línea de estaciones ── */
  host.innerHTML = V.estaciones.map((e, i) => `<li><button type="button" class="vp" data-i="${i}" role="tab" aria-selected="${i === 0}">
    <span class="vp-n">${e.n}</span><span class="vp-t">${esc(e.titulo)}</span><span class="vp-s">${esc(e.sub)}</span></button></li>`).join('');

  const detalle = $('#vida-detalle');
  let activa = 0, redibujar = () => {};
  const pintarDetalle = () => {
    const e = V.estaciones[activa], f = fuente(e.fuente_id);
    detalle.innerHTML = `<p class="body-l" style="margin:0 0 10px">${esc(e.que)}</p>
      <blockquote class="quote">«${esc(e.cita)}»</blockquote>
      <p class="body-s muted" style="margin:6px 0 14px">${f ? `<a href="${esc(e.url)}" target="_blank" rel="noopener">${esc(f.nombre)}</a>` : esc(e.url)} ${sello(f && f.verificacion)}</p>
      <p class="vida-falta"><span class="material-symbols-outlined">help</span><span><b>No consta:</b> ${esc(e.no_consta)}</span></p>`;
    host.querySelectorAll('.vp').forEach((b, i) => { b.classList.toggle('on', i === activa); b.setAttribute('aria-selected', i === activa); });
    redibujar();
  };
  host.addEventListener('click', ev => { const b = ev.target.closest('.vp'); if (!b) return; activa = +b.dataset.i; pintarDetalle(); });
  host.addEventListener('keydown', ev => {
    if (!['ArrowRight', 'ArrowLeft'].includes(ev.key)) return;
    ev.preventDefault();
    activa = (activa + (ev.key === 'ArrowRight' ? 1 : V.estaciones.length - 1)) % V.estaciones.length;
    pintarDetalle(); host.querySelectorAll('.vp')[activa].focus();
  });
  pintarDetalle();

  /* ── el evento ── */
  const fe = fuente(V.evento.fuente_id);
  $('#vida-evento').innerHTML = `<div class="ev-grupos">${V.evento.grupos.map(g => `<div class="ev-g">
      <h4 class="title-s">${esc(g.nombre)}</h4>
      <p class="ev-campos">${g.campos.map(c => `<code>${esc(c)}</code>`).join('')}</p>
      <p class="body-s muted">${esc(g.nota)}</p></div>`).join('')}</div>
    <p class="body-s muted" style="margin-top:10px">${esc(V.evento.estandar)} · <a href="${esc(V.evento.url)}" target="_blank" rel="noopener">${esc(fe ? fe.nombre : 'especificación')}</a> ${sello(fe && fe.verificacion)}</p>`;

  /* ── errores ── */
  const fr = fuente(V.errores_fuente_id);
  $('#vida-errores').innerHTML = `<ul class="err-lista">${V.errores.map(e => `<li><code>${esc(e.codigo)}</code><span>${esc(e.que)}</span></li>`).join('')}</ul>
    <p class="vida-falta" style="margin-top:12px"><span class="material-symbols-outlined">error</span><span>${esc(V.cierre)}</span></p>
    <p class="body-s muted" style="margin-top:8px"><a href="${esc(V.errores_url)}" target="_blank" rel="noopener">${esc(fr ? fr.nombre : 'documentación')}</a> ${sello(fr && fr.verificacion)}</p>`;

  /* ── pista animada ─────────────────────────────────────────────────── */
  const cv = $('#vida-pista'); if (!cv) return;
  const g = cv.getContext('2d');
  const CEL = 6;
  const COL = { off: '#2b2f36', on: '#e2e2e9', azul: '#3987e5', cian: '#aac7ff', rojo: '#ff8a80', gris: '#6b6e76', linea: '#1a1d22' };
  const ICO = {
    1: ['.bbbb.', 'bbbbbb', 'bwbbbb', '.bbbb.', '..b...', '..b...'],
    2: ['.b.b.b.', 'bbbbbbb', 'b.....b', 'b..w..b', 'b.....b', 'bbbbbbb', '.b.b.b.'],
    3: ['bbbbbbb', 'bw...wb', 'b.w.w.b', 'b..w..b', 'b.....b', 'bbbbbbb'],
    4: ['..bbb..', '.b...b.', '.b...b.', 'bbbbbbb', 'bb.w.bb', 'bbbbbbb'],
    5: ['.bbbbb.', 'bbbbbbb', 'b.....b', 'bbbbbbb', 'b.....b', 'bbbbbbb', '.bbbbb.'],
    6: ['...b...', '..bbb..', '..b.b..', '.bbbbb.', '.b...b.', 'bbbbbbb'],
    7: ['bbbbbbb', 'b.w.w.b', 'bbbbbbb', 'b.w.w.b', 'bbbbbbb']
  };
  let cols = 0, rows = 0, xs = [];
  const medir = () => {
    const r = cv.getBoundingClientRect(); if (!r.width) return;
    cols = Math.max(40, Math.round(r.width / CEL)); rows = Math.max(16, Math.round(r.height / CEL));
    cv.width = cols; cv.height = rows;
    xs = V.estaciones.map((e, i) => Math.round((cols - 14) * i / (V.estaciones.length - 1)) + 7);
    dibujar(cuadro);
  };
  const px = (x, y, c) => { g.fillStyle = c; g.fillRect(x | 0, y | 0, 1, 1); };
  const spr = (x, y, filas, c, w = '#05050a') => {
    for (let j = 0; j < filas.length; j++) for (let i = 0; i < filas[j].length; i++) {
      const k = filas[j][i]; if (k === 'b') px(x + i, y + j, c); else if (k === 'w') px(x + i, y + j, w);
    }
  };
  let cuadro = 0;
  const dibujar = t => {
    if (!cols) return;
    g.fillStyle = '#05050a'; g.fillRect(0, 0, cols, rows);
    const yl = rows - 8;
    for (let x = 2; x < cols - 2; x++) if (x % 3 !== 2) px(x, yl, COL.linea);
    V.estaciones.forEach((e, i) => {
      const ic = ICO[e.n], x = xs[i] - 3, y = yl - ic.length - 2;
      const act = i === activa;
      spr(x, y, ic, act ? (e.id === 'alerta' ? COL.rojo : COL.on) : COL.off);
      if (act) { for (let k = 0; k < 3; k++) { px(x - 2, y + k, COL.cian); px(x + ic[0].length + 1, y + k, COL.cian); } }
      for (let k = 0; k < 3; k++) px(xs[i], yl - 1 - k, act ? COL.cian : COL.off);
      const m = ['111101101101111', '010110010010111', '111001111100111', '111001111001111', '101101111001001', '111100111001111', '111100111101111', '111001001010010'][e.n];
      for (let j = 0; j < 5; j++) for (let k = 0; k < 3; k++) if (m[j * 3 + k] === '1') px(xs[i] - 1 + k, yl + 2 + j, act ? COL.cian : '#3a3e46');
    });
    // el paquete recorre la línea y se detiene en la estación activa
    const meta = xs[activa], ini = xs[0];
    const f = RM ? 1 : Math.min(1, ((t % 150) / 95));
    const xp = Math.round(ini + (meta - ini) * f);
    const alto = yl - 3 - Math.round(Math.sin(f * Math.PI) * 3);
    px(xp, alto, COL.azul); px(xp + 1, alto, COL.azul); px(xp, alto - 1, COL.azul); px(xp + 1, alto - 1, COL.azul);
    if (f >= 1 && !RM && (t % 150) > 100 && ((t / 6) | 0) % 2) { for (let k = -2; k <= 3; k++) { px(xp + k, alto - 3, COL.cian); px(xp + k, alto + 2, COL.cian); } }
  };
  redibujar = () => dibujar(cuadro);
  new ResizeObserver(medir).observe(cv);
  medir();
  let vivo = false;
  new IntersectionObserver(es => {
    vivo = es[0].isIntersecting;
    if (vivo) requestAnimationFrame(bucle);
  }, { rootMargin: '100px 0px' }).observe(cv);
  const bucle = () => {
    if (!vivo) return;
    cuadro++; dibujar(cuadro);
    if (RM) return;
    setTimeout(() => requestAnimationFrame(bucle), 1000 / 20);
  };
})();
