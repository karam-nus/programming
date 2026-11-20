/* ============================================================
   Programming Guide — interactive labs: core helpers + registry
   A page opts in with  <div class="lab" data-lab="NAME"></div>
   Lab modules (pg-labs-*.js) register with PG.lab(name, title, fn).
   Vanilla JS, no dependencies. Every lab re-implements the algorithm
   from its chapter, so the numbers on the page match the verified
   snippets (see tools/check_snippets.py).
   ============================================================ */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var C = {
    ink: '#f0f3f6', ink2: '#c9d1d9', ink3: '#9da7b3', line: '#3b4350', fill: '#161b22', fill2: '#1c2128', bg: '#0d1117',
    acc: '#34d399', green: '#4ade80', cyan: '#67e8f9', blue: '#93c5fd', purple: '#c4b5fd', pink: '#f9a8d4',
    orange: '#fdba74', yellow: '#fde047', red: '#fca5a5', teal: '#5eead4', dim: '#30363d'
  };
  var registry = {};

  function el(tag, attrs, html) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) if (attrs[k] !== undefined) e.setAttribute(k, attrs[k]);
    if (html !== undefined) e.innerHTML = html;
    return e;
  }
  function svg(w, h, parent) {
    var s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', '0 0 ' + w + ' ' + h); s.setAttribute('width', w); s.setAttribute('role', 'img');
    if (parent) parent.appendChild(s);
    return s;
  }
  function S(tag, attrs, parent, text) {
    var e = document.createElementNS(NS, tag);
    if (attrs) for (var k in attrs) if (attrs[k] !== undefined) e.setAttribute(k, attrs[k]);
    if (text !== undefined) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }
  // Explicit colours go into inline style: the .lab svg .t/.box classes would otherwise override
  // SVG presentation attributes (CSS rules beat attributes).
  function styleOf(o) {
    var st = [];
    if (o.fill !== undefined) st.push('fill:' + o.fill);
    if (o.stroke !== undefined) st.push('stroke:' + o.stroke);
    if (o.sw !== undefined) st.push('stroke-width:' + o.sw);
    if (o.opacity !== undefined) st.push('opacity:' + o.opacity);
    if (o.size !== undefined) st.push('font-size:' + o.size + 'px');
    if (o.weight !== undefined) st.push('font-weight:' + o.weight);
    return st.join(';');
  }
  function text(parent, x, y, s, opts) {
    opts = opts || {};
    var t = S('text', { x: x, y: y, 'class': opts.cls || 't', 'text-anchor': opts.anchor || 'start', 'dominant-baseline': 'middle' }, parent, s);
    t.setAttribute('style', 'white-space:pre;' + styleOf(opts));
    return t;
  }
  function box(parent, x, y, w, h, opts) {
    opts = opts || {};
    var r = S('rect', { x: x, y: y, width: w, height: h, rx: opts.rx === undefined ? 6 : opts.rx, 'class': opts.cls || 'box' }, parent);
    var st = styleOf({ fill: opts.fill, stroke: opts.stroke, sw: opts.sw, opacity: opts.opacity });
    if (st) r.setAttribute('style', st);
    return r;
  }
  function arrow(parent, x1, y1, x2, y2, color, opts) {
    opts = opts || {};
    var id = 'ah' + Math.random().toString(36).slice(2, 8);
    var defs = S('defs', null, parent);
    var m = S('marker', { id: id, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, defs);
    S('path', { d: 'M0,0 L10,5 L0,10 z', fill: color || C.ink3 }, m);
    var d;
    if (opts.curve) {
      var mx = (x1 + x2) / 2 + (opts.cx || 0), my = (y1 + y2) / 2 + (opts.cy || 0);
      d = 'M' + x1 + ',' + y1 + ' Q' + mx + ',' + my + ' ' + x2 + ',' + y2;
    } else d = 'M' + x1 + ',' + y1 + ' L' + x2 + ',' + y2;
    return S('path', { d: d, stroke: color || C.ink3, 'stroke-width': opts.w || 1.8, fill: 'none', 'marker-end': 'url(#' + id + ')',
      'stroke-dasharray': opts.dash ? '5 4' : undefined, opacity: opts.opacity }, parent);
  }

  // ---- lab chrome -------------------------------------------------------
  function frame(root, title) {
    clear(root);
    root.appendChild(el('div', { 'class': 'lab-title' }, title));
    var body = el('div', { 'class': 'lab-body' }); root.appendChild(body);
    var stage = el('div', { 'class': 'lab-stage' }); body.appendChild(stage);
    return { body: body, stage: stage };
  }
  function controls(parent) { var c = el('div', { 'class': 'lab-controls' }); parent.appendChild(c); return c; }
  function button(parent, label, cls) { var b = el('button', { type: 'button', 'class': cls }, label); parent.appendChild(b); return b; }
  function select(parent, label, opts, val) {
    var l = el('label', null, label ? label : ''), s = el('select');
    opts.forEach(function (o) {
      var v = Array.isArray(o) ? o[0] : o, t = Array.isArray(o) ? o[1] : o;
      var op = el('option', { value: v }, t); if (String(v) === String(val)) op.selected = true; s.appendChild(op);
    });
    l.appendChild(s); parent.appendChild(l); return s;
  }
  function slider(parent, label, min, max, step, val, fmt) {
    var l = el('label', null, label), s = el('input', { type: 'range', min: min, max: max, step: step, value: val });
    var out = el('span', { style: 'font-family:var(--font-mono);min-width:3.5em;display:inline-block;color:var(--ink)' });
    function upd() { out.textContent = fmt ? fmt(+s.value) : s.value; }
    s.addEventListener('input', upd); upd();
    l.appendChild(s); l.appendChild(out); parent.appendChild(l); return s;
  }
  function input(parent, label, val, type) {
    var l = el('label', null, label), s = el('input', { type: type || 'text', value: val });
    l.appendChild(s); parent.appendChild(l); return s;
  }
  function readout(parent) { var r = el('div', { 'class': 'lab-readout' }); parent.appendChild(r); return r; }
  function hint(parent, h) { parent.appendChild(el('div', { 'class': 'lab-hint' }, h)); }

  // A step/play/reset transport bound to a step function returning false when done.
  function transport(parent, onStep, onReset, speed) {
    var c = controls(parent), timer = null;
    var stepB = button(c, 'Step ›', 'primary'), playB = button(c, '▶ Play'), resetB = button(c, '↺ Reset');
    function stop() { if (timer) { clearInterval(timer); timer = null; playB.textContent = '▶ Play'; } }
    stepB.onclick = function () { stop(); onStep(); };
    playB.onclick = function () {
      if (timer) { stop(); return; }
      playB.textContent = '❚❚ Pause';
      timer = setInterval(function () { if (onStep() === false) stop(); }, speed || 650);
    };
    resetB.onclick = function () { stop(); onReset(); };
    return { controls: c, stop: stop };
  }
  function rng(seed) { var s = seed >>> 0 || 1; return function () { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }

  window.PG = {
    C: C, el: el, svg: svg, S: S, clear: clear, text: text, box: box, arrow: arrow,
    frame: frame, controls: controls, button: button, select: select, slider: slider, input: input,
    readout: readout, hint: hint, transport: transport, rng: rng,
    lab: function (name, title, fn) { registry[name] = { title: title, fn: fn }; }
  };

  function boot() {
    var nodes = document.querySelectorAll('.lab[data-lab]');
    Array.prototype.forEach.call(nodes, function (root) {
      var spec = registry[root.getAttribute('data-lab')];
      if (!spec) { root.innerHTML = '<div class="lab-noscript">Unknown lab: ' + root.getAttribute('data-lab') + '</div>'; return; }
      try { spec.fn(frame(root, spec.title), root); }
      catch (e) { root.innerHTML = '<div class="lab-noscript">Lab failed to load: ' + e.message + '</div>'; if (window.console) console.error(e); }
    });
  }
  // Deferred scripts execute while readyState is already 'interactive' but before DOMContentLoaded,
  // so wait for that event unless the document has fully loaded: every lab module must register first.
  if (document.readyState === 'complete') setTimeout(boot, 0); else document.addEventListener('DOMContentLoaded', boot);
})();
