/* Grafo del encargo · red de nodos con tooltips (Material 3 + método dataviz) */
(async function () {
  const D = await (await fetch('data.json')).json();
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '—').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const root = document.documentElement;

  /* familias: forma = tipo de objeto; color = sector (3 slots validados + neutro + crítico) */
  const FAM = {
    programa:    { label: 'Sistema algorítmico', symbol: d3.symbolStar,     sector: 'publico' },
    estado:      { label: 'Organismo o unidad del Estado', symbol: d3.symbolCircle, sector: 'publico' },
    instrumento: { label: 'Instrumento o norma', symbol: d3.symbolSquare,   sector: 'publico' },
    territorio:  { label: 'Territorio', symbol: d3.symbolCross,  sector: 'neutro' },
    privado:     { label: 'Empresa', symbol: d3.symbolDiamond, sector: 'privado' },
    asesoria:    { label: 'Comité asesor', symbol: d3.symbolWye, sector: 'asesoria' },
    persona:     { label: 'Persona en rol público', symbol: d3.symbolTriangle, sector: 'neutro' },
    resultado:   { label: 'Resultado declarado', symbol: d3.symbolSquare2, sector: 'neutro' },
    ausencia:    { label: 'Ausencia documentada', symbol: d3.symbolCircle, sector: 'ausencia' }
  };
  const SECTOR = { publico: ['--viz-1', 'Público'], privado: ['--viz-2', 'Privado'], asesoria: ['--viz-3', 'Academia y sociedad civil'], neutro: ['--md-outline', 'Contexto'], ausencia: ['--viz-critical', 'Ausencia'] };
  const col = f => css(SECTOR[FAM[f].sector][0]);
  const TIPO_V = t => t.replaceAll('_', ' ');
  let visibles = new Set(Object.keys(FAM)), seleccion = null, query = '';

  /* tema y chrome */
  try { const t = localStorage.getItem('encargo-theme'); if (t) root.dataset.theme = t; } catch (e) {}
  const isDark = () => (root.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')) === 'dark';
  const setIcon = () => $('#theme span').textContent = isDark() ? 'light_mode' : 'dark_mode';
  setIcon();
  $('#theme').onclick = () => { root.dataset.theme = isDark() ? 'light' : 'dark'; try { localStorage.setItem('encargo-theme', root.dataset.theme); } catch (e) {} setIcon(); restyle(); drawIA(); };
  addEventListener('scroll', () => $('#appbar').classList.toggle('scrolled', scrollY > 4), { passive: true });
  const tt = $('#tt');
  const showTT = (e, html) => { tt.innerHTML = html; tt.classList.add('on'); const r = tt.getBoundingClientRect(); let x = e.clientX + 16, y = e.clientY + 16; if (x + r.width > innerWidth - 8) x = e.clientX - r.width - 16; if (y + r.height > innerHeight - 8) y = e.clientY - r.height - 16; tt.style.left = Math.max(8, x) + 'px'; tt.style.top = Math.max(8, y) + 'px'; };
  const hideTT = () => tt.classList.remove('on');

  /* datos */
  const nodes = D.nodos.map(n => ({ ...n })), byId = new Map(nodes.map(n => [n.id, n]));
  const links = D.vinculos.map(l => ({ ...l }));
  nodes.forEach(n => { n.deg = 0; n.out = []; n.in = []; });
  links.forEach(l => { byId.get(l.source).deg++; byId.get(l.target).deg++; byId.get(l.source).out.push(l); byId.get(l.target).in.push(l); });
  const nombre = n => n.nombre.split(' · ')[0];
  const aus = nodes.filter(n => n.familia === 'ausencia');

  /* stats */
  const fuentesDoc = D.fuentes.filter(f => f.plano_evidencia === 'documentado').length;
  $('#stats').innerHTML = [['scatter_plot', nodes.length, 'objetos', 'actores, instrumentos, territorios'], ['conversion_path', links.length, 'vínculos', 'cada uno con fuente y cita'],
    ['report', aus.length, 'ausencias', 'lo que el encargo no documenta', 'err'], ['menu_book', D.fuentes.length, 'fuentes', `${fuentesDoc} documentadas · ${D.fuentes.length - fuentesDoc} reconstrucción o hipótesis`]]
    .map(([ic, v, l, s, c]) => `<div class="card elevated stat ${c || ''}"><div class="ic"><span class="material-symbols-outlined">${ic}</span></div><div class="label-l muted">${l}</div><div class="v">${v}</div><div class="body-s muted">${s}</div></div>`).join('');
  $('#gen').textContent = 'Datos generados el ' + D.generado;

  /* leyenda y chips */
  const glyph = (f, size = 14) => { const sym = d3.symbol(FAM[f].symbol, f === 'programa' ? 90 : 60)(); const au = f === 'ausencia';
    return `<svg width="${size + 4}" height="${size + 4}" viewBox="-9 -9 18 18"><path d="${sym}" fill="${au ? 'none' : col(f)}" stroke="${au ? col(f) : 'none'}" stroke-width="${au ? 1.8 : 0}" stroke-dasharray="${au ? '2.5 2' : ''}"/></svg>`; };
  const drawLegend = () => {
    $('#legend-body').innerHTML = Object.keys(FAM).map(f => `<div class="row">${glyph(f)}<span>${FAM[f].label}</span></div>`).join('')
      + `<hr class="divider" style="margin:8px 0"><div class="row"><svg width="22" height="8"><line x1="0" y1="4" x2="22" y2="4" stroke="${css('--md-outline')}" stroke-width="1.5"/></svg>Vínculo documentado</div>`
      + `<div class="row"><svg width="22" height="8"><line x1="0" y1="4" x2="22" y2="4" stroke="${css('--viz-critical')}" stroke-width="1.5" stroke-dasharray="4 3"/></svg>Carece de · asimetría</div>`
      + `<div class="row"><svg width="22" height="8"><line x1="0" y1="4" x2="22" y2="4" stroke="${css('--md-outline')}" stroke-width="1.5" stroke-dasharray="1 3"/></svg>Hipótesis (POC)</div>`
      + `<hr class="divider" style="margin:8px 0">` + Object.entries(SECTOR).map(([k, [v, l]]) => `<div class="row"><span style="width:10px;height:10px;border-radius:2px;background:${css(v)}"></span>${l}</div>`).join('');
  };
  const drawChips = () => { $('#chips').innerHTML = Object.keys(FAM).map(f => `<button class="chip" aria-pressed="${visibles.has(f)}" data-f="${f}">${FAM[f].label}</button>`).join(''); };
  drawLegend(); drawChips();
  if (innerWidth < 600) $('#legend').open = false;
  $('#chips').onclick = e => { const b = e.target.closest('button'); if (!b) return; const f = b.dataset.f; visibles.has(f) ? visibles.delete(f) : visibles.add(f); if (!visibles.size) visibles = new Set(Object.keys(FAM)); drawChips(); applyVisibility(); };

  /* grafo */
  const svg = d3.select('#graph'), g = svg.append('g');
  let W = svg.node().clientWidth, H = svg.node().clientHeight;
  let kActual = 1;
  const zoom = d3.zoom().scaleExtent([.25, 5]).on('zoom', e => { g.attr('transform', e.transform); kActual = e.transform.k; if (typeof label !== 'undefined') label.attr('font-size', 12 / kActual).attr('stroke-width', 3 / kActual).attr('dy', n => (Math.sqrt(r(n)) / 1.6 + 4) + 11 / kActual); });
  svg.call(zoom).on('dblclick.zoom', null);
  svg.on('click', e => { if (e.target === svg.node()) select(null); });
  const r = n => n.familia === 'programa' ? 900 : 150 + n.deg * 45;
  const linkStyle = l => l.tipo === 'carece_de' || l.tipo === 'asimetria_con' ? 'aus' : l.plano_evidencia === 'hipotesis' ? 'hip' : 'doc';
  const L = g.append('g').selectAll('line').data(links).join('line').attr('class', 'link').attr('stroke-width', 1.5).attr('stroke-linecap', 'round');
  const Lhit = g.append('g').selectAll('line').data(links).join('line').attr('stroke', 'transparent').attr('stroke-width', 12).attr('class', 'link')
    .on('pointermove', (e, l) => { d3.select(L.nodes()[links.indexOf(l)]).attr('stroke-width', 3); showTT(e, `<div class="tt-sub">${esc(nombre(l.source))} → ${esc(nombre(l.target))}</div><div class="label-m" style="margin-bottom:2px">Evidencia extraída</div><div class="label-l" style="color:var(--md-on-surface);margin-bottom:6px">${esc(TIPO_V(l.tipo))}</div><div class="quote ${linkStyle(l) === 'aus' ? 'aus' : ''}">${esc(l.cita)}</div><div class="body-s" style="margin-top:6px">${l.fecha ? esc(l.fecha) + ' · ' : ''}${esc(l.fuente)} · ${esc(l.plano_evidencia)}</div>`); })
    .on('pointerleave', (e, l) => { d3.select(L.nodes()[links.indexOf(l)]).attr('stroke-width', 1.5); hideTT(); })
    .on('click', (e, l) => { e.stopPropagation(); select(l.source); });
  const N = g.append('g').selectAll('g').data(nodes).join('g').attr('class', 'node').attr('tabindex', 0).attr('role', 'button').attr('aria-label', n => `${n.nombre}, ${FAM[n.familia].label}, ${n.deg} vínculos`)
    .call(d3.drag().on('start', (e, d) => { if (!e.active) sim.alphaTarget(.25).restart(); d.fx = d.x; d.fy = d.y; }).on('drag', (e, d) => { d.fx = e.x; d.fy = e.y; }).on('end', (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null; }))
    .on('pointermove', (e, n) => { focusNeighborhood(n); showTT(e, nodeTT(n)); })
    .on('pointerleave', () => { hideTT(); focusNeighborhood(seleccion); })
    .on('click', (e, n) => { e.stopPropagation(); hideTT(); select(n); })
    .on('keydown', (e, n) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(n); } })
    .on('focus', (e, n) => { if (!e.currentTarget.matches(':focus-visible')) return; const b = e.currentTarget.getBoundingClientRect(); showTT({ clientX: b.right, clientY: b.bottom }, nodeTT(n)); focusNeighborhood(n); })
    .on('blur', () => { hideTT(); focusNeighborhood(seleccion); });
  N.append('circle').attr('r', 16).attr('fill', 'transparent');
  const shape = N.append('path').attr('class', 'shape').attr('d', n => d3.symbol(FAM[n.familia].symbol, r(n))());
  const label = N.append('text').attr('dy', n => Math.sqrt(r(n)) / 1.6 + 12).attr('text-anchor', 'middle').text(n => { const s = nombre(n).split(' (')[0]; return s.length > 32 ? s.slice(0, 30) + '…' : s; });
  function nodeTT(n) {
    const f = FAM[n.familia], extra = n.familia === 'ausencia' && n.atributos && (n.atributos.evidencia_de_ausencia || n.atributos.contraste || n.atributos.cita);
    return `<div class="row" style="justify-content:flex-start;gap:8px;margin-bottom:4px">${glyph(n.familia)}<span class="label-m">${esc(f.label)}</span></div><div class="tt-sub" style="font-size:16px;line-height:22px">${esc(n.nombre)}</div>${extra ? `<div class="quote aus">${esc(extra)}</div>` : ''}<div class="body-s" style="margin-top:6px">${n.deg} vínculo${n.deg === 1 ? '' : 's'} · ${esc(n.plano_evidencia)} · ${esc(n.fuente)}</div>`;
  }
  function restyle() {
    L.attr('stroke', l => linkStyle(l) === 'aus' ? css('--viz-critical') : css('--md-outline-variant')).attr('stroke-dasharray', l => ({ aus: '5 4', hip: '1 4', doc: null })[linkStyle(l)]);
    shape.attr('fill', n => n.familia === 'ausencia' ? css('--md-surface-container-lowest') : col(n.familia)).attr('stroke', n => n.familia === 'ausencia' ? col('ausencia') : css('--md-surface-container-lowest')).attr('stroke-width', 2).attr('stroke-dasharray', n => n.familia === 'ausencia' ? '3 2.5' : null);
    label.attr('display', n => (innerWidth < 600 ? n.deg >= 6 : (n.deg >= 3 || n.familia === 'ausencia' || n.familia === 'privado')) || n === seleccion ? null : 'none');
    drawLegend();
  }
  const sim = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links).id(d => d.id).distance(l => String(l.source.id || l.source).startsWith('MUN-') ? 45 : 70).strength(.7))
    .force('charge', d3.forceManyBody().strength(n => n.familia === 'programa' ? -700 : -190))
    .force('collide', d3.forceCollide(n => Math.sqrt(r(n)) + 22))
    .force('x', d3.forceX(W / 2).strength(.05)).force('y', d3.forceY(H / 2).strength(.07));
  sim.on('tick', () => {
    [L, Lhit].forEach(s => s.attr('x1', l => l.source.x).attr('y1', l => l.source.y).attr('x2', l => l.target.x).attr('y2', l => l.target.y));
    N.attr('transform', n => `translate(${n.x},${n.y})`);
  });
  sim.stop();
  for (let i = 0; i < 400; i++) sim.tick();
  sim.on('tick')();
  restyle();
  fit(0);

  function fit(dur = 500) {
    const vis = nodes.filter(n => visibles.has(n.familia)); if (!vis.length) return;
    const [x0, x1] = d3.extent(vis, n => n.x), [y0, y1] = d3.extent(vis, n => n.y), pad = 56;
    W = svg.node().clientWidth; H = svg.node().clientHeight;
    const lg = $('#legend'), padL = lg.open && getComputedStyle(lg).position === 'absolute' ? lg.getBoundingClientRect().width + 24 : pad;
    const k = Math.min(2, (W - padL - pad) / Math.max(1, x1 - x0), (H - pad * 2) / Math.max(1, y1 - y0));
    const t = d3.zoomIdentity.translate(padL + (W - padL - pad) / 2 - k * (x0 + x1) / 2, H / 2 - k * (y0 + y1) / 2).scale(k);
    (dur ? svg.transition().duration(dur) : svg).call(zoom.transform, t);
  }
  $('#zin').onclick = () => svg.transition().duration(250).call(zoom.scaleBy, 1.4);
  $('#zout').onclick = () => svg.transition().duration(250).call(zoom.scaleBy, 1 / 1.4);
  $('#zfit').onclick = () => fit();

  function vecinos(n) { const s = new Set([n.id]); n.out.forEach(l => s.add(l.target.id)); n.in.forEach(l => s.add(l.source.id)); return s; }
  function focusNeighborhood(n) {
    const qm = query ? new Set(nodes.filter(x => (x.nombre + ' ' + x.tipo).toLowerCase().includes(query)).map(x => x.id)) : null;
    if (!n && !qm) { N.attr('opacity', x => visibles.has(x.familia) ? 1 : 0); L.attr('opacity', l => visibles.has(l.source.familia) && visibles.has(l.target.familia) ? 1 : 0); label.attr('display', x => (innerWidth < 600 ? x.deg >= 6 : (x.deg >= 3 || ['ausencia', 'privado'].includes(x.familia))) ? null : 'none'); return; }
    const keep = n ? vecinos(n) : qm;
    N.attr('opacity', x => !visibles.has(x.familia) ? 0 : keep.has(x.id) ? 1 : .15);
    L.attr('opacity', l => !(visibles.has(l.source.familia) && visibles.has(l.target.familia)) ? 0 : (n ? (l.source === n || l.target === n) : (keep.has(l.source.id) && keep.has(l.target.id))) ? 1 : .08);
    label.attr('display', x => keep.has(x.id) ? null : 'none');
  }
  function applyVisibility() {
    N.attr('pointer-events', n => visibles.has(n.familia) ? null : 'none');
    Lhit.attr('pointer-events', l => visibles.has(l.source.familia) && visibles.has(l.target.familia) ? null : 'none');
    if (seleccion && !visibles.has(seleccion.familia)) select(null); else focusNeighborhood(seleccion);
  }
  $('#q').addEventListener('input', e => { query = e.target.value.trim().toLowerCase(); focusNeighborhood(seleccion);
    if (query) { const hit = nodes.filter(x => visibles.has(x.familia) && (x.nombre + ' ' + x.tipo).toLowerCase().includes(query)); if (hit.length === 1) select(hit[0]); } });

  /* panel lateral */
  function select(n) {
    seleccion = n; focusNeighborhood(n);
    shape.attr('stroke-width', x => x === n ? 4 : 2).attr('stroke', x => x === n ? css('--md-primary') : x.familia === 'ausencia' ? col('ausencia') : css('--md-surface-container-lowest'));
    const side = $('#side');
    if (!n) { side.innerHTML = `<div class="empty"><span class="material-symbols-outlined">touch_app</span><p class="title-m" style="color:var(--md-on-surface)">Seleccione un nodo</p><p class="body-m">El detalle muestra atributos, fuente y cada vínculo con su cita. Empiece por <button class="btn text" id="go-sitia" style="height:32px;padding:0 8px">SITIA</button> o por una ausencia.</p></div>`; $('#go-sitia').onclick = () => select(byId.get('PRG-SITIA')); return; }
    const f = FAM[n.familia];
    const attrs = Object.entries(n.atributos || {}).map(([k, v]) => `<dt>${esc(k.replaceAll('_', ' '))}</dt><dd>${esc(typeof v === 'object' ? JSON.stringify(v).replace(/[{}"]/g, '').replaceAll(',', ', ') : v)}</dd>`).join('');
    const item = (l, dir) => { const o = dir === 'out' ? l.target : l.source; return `<div class="edge-item"><span class="muted">${dir === 'out' ? '→' : '←'} ${esc(TIPO_V(l.tipo))}</span> <button data-id="${esc(o.id)}">${esc(nombre(o))}</button><div class="quote ${linkStyle(l) === 'aus' ? 'aus' : ''}">${esc(l.cita)}</div><div class="body-s muted" style="margin-top:4px">${l.fecha ? esc(l.fecha) + ' · ' : ''}${l.url ? `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.fuente)}</a>` : esc(l.fuente)}</div></div>`; };
    side.innerHTML = `<div style="display:flex;gap:12px;align-items:flex-start"><div style="padding-top:4px">${glyph(n.familia, 20)}</div><div style="flex:1;min-width:0"><span class="label-m muted">${esc(f.label)}</span><h3 class="title-l" style="margin-top:2px">${esc(n.nombre)}</h3></div><button class="icon-btn" id="close" aria-label="Cerrar detalle"><span class="material-symbols-outlined">close</span></button></div>
      <div class="chip-set" style="margin-top:12px"><span class="badge ${n.plano_evidencia === 'documentado' ? 'pri' : 'err'}">${esc(n.plano_evidencia)}</span><span class="badge sec">${n.deg} vínculos</span>${n.familia === 'ausencia' ? '<span class="badge err">ausencia</span>' : ''}</div>
      <dl class="kv"><dt>Fuente</dt><dd>${n.url ? `<a href="${esc(n.url)}" target="_blank" rel="noopener">${esc(n.fuente)}</a>` : esc(n.fuente)}</dd><dt>Acceso</dt><dd style="font-family:var(--mono);font-size:12px">${esc(n.via_acceso)}</dd>${attrs}</dl>
      ${n.out.length ? `<p class="title-s" style="margin-top:8px">Vínculos salientes</p>${n.out.map(l => item(l, 'out')).join('')}` : ''}
      ${n.in.length ? `<p class="title-s" style="margin-top:16px">Vínculos entrantes</p>${n.in.map(l => item(l, 'in')).join('')}` : ''}`;
    $('#close').onclick = () => select(null);
    side.querySelectorAll('.edge-item button').forEach(b => b.onclick = () => select(byId.get(b.dataset.id)));
  }
  select(null);

  /* ausencias */
  $('#aus').innerHTML = aus.map(n => { const a = n.atributos || {}, via = n.in.concat(n.out)[0];
    return `<article class="card outlined aus-card"><div style="display:flex;gap:10px;align-items:center;margin-bottom:8px"><span class="material-symbols-outlined">report</span><span class="label-m muted">Ausencia · ${esc(n.plano_evidencia)}</span></div><h3 class="title-m">${esc(n.nombre)}</h3>
      ${a.evidencia_de_ausencia || a.contraste || a.cita ? `<div class="quote aus" style="margin-top:8px">${esc(a.evidencia_de_ausencia || a.contraste || a.cita)}</div>` : ''}
      <p class="body-s muted" style="margin-top:8px">${via ? `${esc(nombre(via.source))} → ${esc(TIPO_V(via.tipo))}` : ''} · ${n.url ? `<a href="${esc(n.url)}" target="_blank" rel="noopener">${esc(n.fuente)}</a>` : esc(n.fuente)}</p>
      <button class="btn text" style="margin:8px 0 0 -12px" data-id="${esc(n.id)}"><span class="material-symbols-outlined">my_location</span>Ver en el grafo</button></article>`; }).join('');
  $('#aus').querySelectorAll('button').forEach(b => b.onclick = () => { select(byId.get(b.dataset.id)); $('#grafo').scrollIntoView({ behavior: 'smooth' }); });

  /* resolución de entidades */
  const resA = D.autorregistro.find(a => a.componente === 'C·resolución');
  const met = resA ? JSON.parse(resA.metrica || '[]') : [];
  $('#res').innerHTML = `<table class="data"><thead><tr><th>Empresa en el grafo</th><th class="n">Coincidencias por subcadena</th><th class="n">Por palabra</th><th>Estado</th></tr></thead><tbody>${met.map(m => `<tr><td>${esc(m.nombre)}</td><td class="n">${m.coincidencias_subcadena}</td><td class="n">${m.coincidencias_token}</td><td><span class="badge err">sin resolver</span></td></tr>`).join('')}</tbody></table>`;

  /* capa material: columnas con tooltip */
  function drawIA() {
    const el = d3.select('#c-ia'), w = el.node().getBoundingClientRect().width || 400, h = 220, m = { t: 20, r: 8, b: 28, l: 32 };
    el.attr('viewBox', `0 0 ${w} ${h}`).attr('height', h).selectAll('*').remove();
    const data = D.ia_res, x = d3.scaleBand().domain(data.map(d => d.anio)).range([m.l, w - m.r]).paddingInner(.2), y = d3.scaleLinear().domain([0, d3.max(data, d => d.n)]).nice().range([h - m.b, m.t]);
    el.append('g').attr('class', 'gridline').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(4).tickSize(-(w - m.l - m.r)).tickFormat(''));
    el.append('g').attr('class', 'axis').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(4).tickSizeOuter(0)).call(s => s.select('.domain').remove());
    el.append('g').attr('class', 'axis').attr('transform', `translate(0,${h - m.b})`).call(d3.axisBottom(x).tickValues(data.map(d => d.anio).filter((a, i) => i % 2 === 0 || a === 2026)).tickSizeOuter(0));
    const bw = Math.min(24, x.bandwidth());
    el.append('g').selectAll('path').data(data).join('path').style('cursor', 'pointer')
      .attr('d', d => { const x0 = x(d.anio) + (x.bandwidth() - bw) / 2, y0 = y(d.n), hh = y(0) - y(d.n), rr = Math.min(4, hh); return `M${x0},${y0 + hh}V${y0 + rr}Q${x0},${y0} ${x0 + rr},${y0}H${x0 + bw - rr}Q${x0 + bw},${y0} ${x0 + bw},${y0 + rr}V${y0 + hh}Z`; })
      .attr('fill', css('--viz-seq')).attr('opacity', d => d.anio === 2026 ? .5 : 1)
      .on('pointermove', (e, d) => showTT(e, `<div class="tt-sub">${d.anio}${d.anio === 2026 ? ' (parcial)' : ''}</div><div class="tt-val">${d.n}</div><div>sociedades constituidas</div>`)).on('pointerleave', hideTT);
    const last = data.find(d => d.anio === 2025); if (last) el.append('text').attr('x', x(2025) + x.bandwidth() / 2).attr('y', y(last.n) - 6).attr('text-anchor', 'middle').attr('font-size', 12).attr('fill', css('--md-on-surface')).text(last.n);
  }
  drawIA();

  /* tabla de vínculos */
  $('#tabla-v').innerHTML = `<table class="data"><thead><tr><th>Origen</th><th>Vínculo</th><th>Destino</th><th>Evidencia extraída</th><th>Fecha</th><th>Fuente</th></tr></thead><tbody>${links.map(l => `<tr><td>${esc(nombre(l.source))}</td><td>${esc(TIPO_V(l.tipo))}</td><td>${esc(nombre(l.target))}</td><td class="body-s">${esc(l.cita)}</td><td class="body-s">${esc(l.fecha)}</td><td class="body-s">${l.url ? `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.fuente)}</a>` : esc(l.fuente)}</td></tr>`).join('')}</tbody></table>`;

  /* autorregistro y fuentes */
  $('#auto').innerHTML = D.autorregistro.map(a => `<details class="exp"><summary><span class="material-symbols-outlined" style="color:var(--md-error)">report</span><span><span class="label-m muted">${esc(a.componente)}</span><br><span class="title-s">${esc(a.que_registro)}</span></span></summary><div class="body"><table class="data"><tbody><tr><td class="muted">Efecto</td><td>${esc(a.efecto)}</td></tr><tr><td class="muted">Inexactitud</td><td>${esc(a.inexactitud)}</td></tr><tr><td class="muted">Detección</td><td>${esc(a.deteccion)}</td></tr><tr><td class="muted">Corrección</td><td>${esc(a.correccion || 'No requerida')}</td></tr></tbody></table></div></details>`).join('');
  $('#fuentes').innerHTML = `<table class="data"><thead><tr><th>Fuente</th><th>Publicación</th><th>Acceso</th><th>Plano</th><th>Nota</th></tr></thead><tbody>${D.fuentes.map(f => `<tr><td>${f.url ? `<a href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.nombre)}</a>` : esc(f.nombre)}<div class="body-s muted">${esc(f.institucion)}</div></td><td>${esc(f.fecha_publicacion || f.anio_referencia)}</td><td class="body-s" style="font-family:var(--mono)">${esc(f.via_acceso)}</td><td><span class="badge ${f.plano_evidencia === 'documentado' ? 'pri' : 'err'}">${esc(f.plano_evidencia)}</span></td><td class="body-s muted">${esc(f.nota_homologacion)}</td></tr>`).join('')}</tbody></table>`;

  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { fit(0); drawIA(); }, 150); });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { setIcon(); restyle(); drawIA(); });
})();
