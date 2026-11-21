/* Programming Guide labs — concurrency, data-structure internals, bits (chapters 8, 19, 20) */
(function () {
  'use strict';
  var P = window.PG, C = P.C;

  // ---------------------------------------------------------------- gil (Ch 8)
  // A discrete-time MODEL, not a measurement: one tick = one switch interval. Measured numbers are quoted in the readout.
  P.lab('gil', 'Who runs when? Four jobs under serial, GIL threads, asyncio, processes, free threading (model)', function (f) {
    var ctl = P.controls(f.body);
    var wl = P.select(ctl, 'workload', [['cpu', 'CPU-bound (pure Python loop)'], ['io', 'I/O-bound (wait on network)'], ['mix', 'mixed: compute, wait, compute']], 'cpu');
    var mode = P.select(ctl, 'run with', [['serial', 'one thread, serial'], ['gil', '4 threads, GIL build'], ['async', 'asyncio, 1 thread'], ['proc', '4 processes'], ['ft', '4 threads, free-threaded build']], 'gil');
    var out = P.readout(f.body), W = 760, H = 262, sv = P.svg(W, H, f.stage), reveal = 0, sched, timer = null;
    function job() {
      return wl.value === 'cpu' ? [['c', 6]] : wl.value === 'io' ? [['c', 1], ['w', 5], ['c', 1]] : [['c', 2], ['w', 3], ['c', 2]];
    }
    function simulate() {
      var jobs = [0, 1, 2, 3].map(function () { return { segs: job().map(function (s) { return s.slice(); }), row: [] }; });
      var m = mode.value, t = 0, gilOwner = 0, rr = 0, startup = m === 'proc' ? 2 : 0;
      if (m === 'serial' || m === 'async') jobs.forEach(function (j) { j.row = []; });
      while (jobs.some(function (j) { return j.segs.length; }) && t < 80) {
        var wantCPU = [];
        jobs.forEach(function (j, i) {
          if (!j.segs.length) { j.row[t] = ''; return; }
          if (t < startup) { j.row[t] = 's'; return; }
          var seg = j.segs[0];
          if (seg[0] === 'w') { j.row[t] = (m === 'serial' && serialTurn(i) !== i) ? 'q' : 'w'; if (j.row[t] === 'w') { seg[1]--; } }
          else wantCPU.push(i);
        });
        var runs = [];
        if (m === 'proc' || m === 'ft') runs = wantCPU.slice();
        else if (m === 'gil') { if (wantCPU.length) { var order = wantCPU.slice().sort(function (a, b) { return ((a - rr + 4) % 4) - ((b - rr + 4) % 4); }); runs = [order[0]]; rr = (order[0] + 1) % 4; } }
        else if (m === 'async') { if (wantCPU.indexOf(gilOwner) >= 0) runs = [gilOwner]; else if (wantCPU.length) { gilOwner = wantCPU[0]; runs = [gilOwner]; } }
        else if (m === 'serial') { var turn = serialTurn(); if (wantCPU.indexOf(turn) >= 0) runs = [turn]; }
        wantCPU.forEach(function (i) {
          var j = jobs[i];
          if (runs.indexOf(i) >= 0) { j.row[t] = 'r'; j.segs[0][1]--; } else j.row[t] = m === 'gil' ? 'g' : 'q';
        });
        jobs.forEach(function (j) { if (j.segs.length && j.segs[0][1] <= 0) { j.segs.shift(); if (m === 'async' && jobs.indexOf(j) === gilOwner) gilOwner = -1; } });
        t++;
      }
      function serialTurn() { for (var k = 0; k < 4; k++) if (jobs[k].segs.length) return k; return -1; }
      return { jobs: jobs, T: t };
    }
    function draw() {
      P.clear(sv);
      var x0 = 120, sc = Math.min(30, (W - x0 - 20) / Math.max(sched.T, 8)), col = { r: C.acc, w: C.blue, g: C.red, q: '#6e7681', s: C.yellow };
      ['thread/proc 1', 'thread/proc 2', 'thread/proc 3', 'thread/proc 4'].forEach(function (lab, i) {
        var y = 20 + i * 44;
        P.text(sv, 14, y + 15, mode.value === 'serial' || mode.value === 'async' ? 'job ' + (i + 1) : lab.replace('thread/proc', mode.value === 'proc' ? 'process' : 'thread'), { cls: 'ts' });
        for (var t = 0; t < Math.min(reveal, sched.T); t++) {
          var s = sched.jobs[i].row[t]; if (!s) continue;
          P.box(sv, x0 + t * sc, y, sc - 2, 30, { fill: col[s], stroke: 'none', rx: 3, opacity: s === 'r' ? 0.95 : 0.4 });
        }
      });
      for (var t = 0; t <= sched.T; t += Math.max(1, Math.round(sched.T / 12))) P.text(sv, x0 + t * sc, 202, String(t), { cls: 'tms', anchor: 'middle' });
      var legend = [['r', 'running Python bytecode'], ['g', 'ready, waiting for the GIL'], ['w', 'blocked on I/O (GIL released)'], ['q', 'not started / not its turn'], ['s', 'process start-up']];
      legend.forEach(function (l, i) { var lx = 14 + (i % 3) * 250, ly = 216 + Math.floor(i / 3) * 22; P.box(sv, lx, ly, 14, 14, { fill: col[l[0]], stroke: 'none', opacity: l[0] === 'r' ? 1 : 0.5, rx: 2 }); P.text(sv, lx + 20, ly + 7, l[1], { cls: 'ts' }); });
    }
    function run() {
      sched = simulate(); reveal = 0; if (timer) clearInterval(timer);
      timer = setInterval(function () { reveal++; draw(); if (reveal >= sched.T) { clearInterval(timer); timer = null; summarize(); } }, 60);
      draw(); out.textContent = 'simulating…';
    }
    function summarize() {
      var busy = 0; sched.jobs.forEach(function (j) { j.row.forEach(function (s) { if (s === 'r') busy++; }); });
      var measured = wl.value === 'cpu' ? 'Measured (bench/concurrency.py, 8 CPU jobs): serial 0.66 s · 4 threads 0.65 s · 4 processes 0.25 s'
        : wl.value === 'io' ? 'Measured (bench/concurrency.py, 8 × 50 ms sleeps): serial 0.40 s · 4 threads 0.10 s · 4 processes 0.11 s' : 'Mixed workloads land in between: threads overlap the waits but not the compute.';
      out.innerHTML = '<b>model</b>  finished in ' + sched.T + ' ticks · Python executing ' + busy + ' of ' + (sched.T * 4) + ' thread-ticks (' + Math.round(100 * busy / (sched.T * 4)) + '% of 4 cores)\n' + measured;
    }
    wl.onchange = run; mode.onchange = run;
    P.button(P.controls(f.body), '▶ Replay', 'primary').onclick = run;
    P.hint(f.body, 'Try CPU-bound with "4 threads, GIL build": red everywhere — threads queue for one lock. Switch to I/O-bound: blue bars overlap because blocking calls release the GIL.');
    run();
  });

  // ---------------------------------------------------------------- race (Ch 8)
  P.lab('race', 'balance += 1 is three steps — interleave two threads and lose an update', function (f) {
    var st, out = P.readout(f.body), W = 760, H = 230, sv = P.svg(W, H, f.stage);
    var ctl = P.controls(f.body);
    var b1 = P.button(ctl, 'T1 next step'), b2 = P.button(ctl, 'T2 next step');
    var pre = P.select(ctl, 'or replay', [['', '—'], ['serial', 'T1 fully, then T2'], ['bad', 'R1 R2 W1 W2 (race)'], ['lock', 'with a Lock']], '');
    var rs = P.button(ctl, '↺ Reset');
    var STEPS = ['acquire?', 'read', 'write'];
    function reset() { st = { bal: 0, th: [{ pc: 0, cur: null, lock: false }, { pc: 0, cur: null, lock: false }], lockOwner: -1, log: [], useLock: false }; draw(); }
    function adv(i) {
      var t = st.th[i], other = st.th[1 - i];
      if (t.pc >= 3) return;
      if (t.pc === 0) { if (st.useLock) { if (st.lockOwner >= 0 && st.lockOwner !== i) { st.log.push('T' + (i + 1) + ' blocks: lock held by T' + (st.lockOwner + 1)); draw(); return; } st.lockOwner = i; st.log.push('T' + (i + 1) + ' acquires the lock'); } t.pc = 1; if (!st.useLock) return adv(i); draw(); return; }
      if (t.pc === 1) { t.cur = st.bal; st.log.push('T' + (i + 1) + ' reads balance = ' + st.bal + ' into its local'); t.pc = 2; }
      else if (t.pc === 2) { st.bal = t.cur + 1; st.log.push('T' + (i + 1) + ' writes balance = ' + t.cur + ' + 1 = ' + st.bal); t.pc = 3; if (st.useLock) { st.lockOwner = -1; st.log.push('T' + (i + 1) + ' releases the lock'); } }
      draw();
    }
    function play(seq, lock) { reset(); st.useLock = lock; var k = 0, tm = setInterval(function () { if (k >= seq.length) { clearInterval(tm); return; } adv(seq[k++]); }, 700); }
    function draw() {
      P.clear(sv);
      P.box(sv, 300, 20, 160, 70, { fill: C.fill, stroke: C.yellow, sw: 2 });
      P.text(sv, 380, 42, 'shared: balance', { cls: 'ts', anchor: 'middle' });
      P.text(sv, 380, 68, String(st.bal), { anchor: 'middle', fill: C.yellow, size: 26, weight: 800 });
      if (st.useLock) P.text(sv, 380, 106, st.lockOwner >= 0 ? '🔒 held by T' + (st.lockOwner + 1) : '🔓 lock free', { cls: 'ts', anchor: 'middle' });
      [0, 1].forEach(function (i) {
        var x = i === 0 ? 20 : 520, t = st.th[i], c = i === 0 ? C.cyan : C.pink;
        P.box(sv, x, 20, 220, 150, { fill: C.fill, stroke: c, sw: 1.6 });
        P.text(sv, x + 12, 40, 'thread T' + (i + 1), { fill: c, weight: 700 });
        ['cur = balance      # LOAD', 'balance = cur + 1  # STORE'].forEach(function (l, j) {
          var active = t.pc === j + 1, done = t.pc > j + 1;
          P.text(sv, x + 14, 72 + j * 26, (active ? '▶ ' : done ? '✓ ' : '  ') + l, { cls: 'tm', size: 12.5, fill: active ? C.acc : done ? C.ink2 : '#6e7681' });
        });
        P.text(sv, x + 14, 140, 'local cur = ' + (t.cur === null ? '—' : t.cur), { cls: 'tm', fill: C.ink2 });
        if (st.th[i].pc >= 1) P.arrow(sv, i === 0 ? 240 : 520, 80, i === 0 ? 300 : 460, 60, c, { dash: true });
      });
      var both = st.th[0].pc === 3 && st.th[1].pc === 3;
      P.text(sv, 380, 200, both ? (st.bal === 2 ? '✔ expected 2, got 2' : '✖ expected 2, got ' + st.bal + ' — lost update') : '', { anchor: 'middle', fill: st.bal === 2 ? C.acc : C.red, weight: 700, size: 15 });
      out.textContent = st.log.slice(-6).join('\n') || 'Click T1/T2 to choose the interleaving yourself. The GIL can switch threads between ANY two bytecode instructions.';
    }
    b1.onclick = function () { adv(0); }; b2.onclick = function () { adv(1); }; rs.onclick = function () { pre.value = ''; reset(); };
    pre.onchange = function () { if (pre.value === 'serial') play([0, 0, 1, 1], false); if (pre.value === 'bad') play([0, 1, 0, 1], false); if (pre.value === 'lock') play([0, 1, 0, 0, 1, 1, 1], true); };
    reset();
  });

  // ---------------------------------------------------------------- hashtable (Ch 19)
  // CPython dict: sparse index table + dense entries; probe i = (5*i + perturb + 1) & mask after perturb >>= 5;
  // usable = 2/3 of size; on exhaustion resize to the smallest power of two >= 3*used.  (Objects/dictobject.c)
  P.lab('hashtable', 'Inside a dict — indices, entries, probing and the 2/3 resize (CPython layout)', function (f) {
    var ctl = P.controls(f.body);
    var keyIn = P.input(ctl, 'key', '42');
    var ins = P.button(ctl, 'Insert', 'primary'), nxt = P.button(ctl, 'Insert next int'), col = P.button(ctl, 'Insert colliding (k+8)'), rs = P.button(ctl, '↺ Reset');
    var out = P.readout(f.body), W = 780, H = 360, sv = P.svg(W, H, f.stage), d, nextInt;
    function hash(k) {
      if (/^-?\d{1,15}$/.test(k)) { var n = parseInt(k, 10); return n === -1 ? -2 : n; }   // hash(int) == int for |n| < 2**61 - 1
      var h = 2166136261; for (var i = 0; i < k.length; i++) { h ^= k.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h;
    }
    function reset() { d = { size: 8, idx: new Array(8).fill(-1), ent: [], usable: 5, probe: [], msg: 'Empty dict: index table of 8 slots, room for 5 entries (2/3 load).' }; nextInt = 0; draw(); }
    function place(e) {
      // exact CPython arithmetic: the hash is used as an unsigned 64-bit size_t
      var mask = BigInt(d.size - 1), perturb = BigInt.asUintN(64, BigInt(e.h)), i = Number(perturb & mask), path = [i];
      while (d.idx[i] !== -1) { perturb >>= 5n; i = Number((BigInt(i) * 5n + perturb + 1n) & mask); path.push(i); }
      d.idx[i] = d.ent.indexOf(e); return path;
    }
    function insert(k) {
      if (d.ent.some(function (e) { return e.k === k; })) { d.msg = 'Key ' + k + ' already present: its value is replaced in place; nothing moves.'; draw(); return; }
      var msg = '';
      if (d.usable === 0) {
        var used = d.ent.length, ns = 8; while (ns < used * 3) ns *= 2;
        msg = 'RESIZE: no usable entries left (used ' + used + ' of ' + d.size + '). New size = smallest power of two ≥ 3 × ' + used + ' = ' + ns + '; every entry is re-inserted. ';
        d.size = ns; d.idx = new Array(ns).fill(-1); d.usable = Math.floor(ns * 2 / 3) - used;
        d.ent.forEach(function (e) { place(e); });
      }
      var e = { k: k, h: hash(k) }; d.ent.push(e); d.usable--;
      d.probe = place(e);
      msg += 'hash(' + k + ') = ' + e.h + ' → start at slot ' + d.probe[0] + ' (hash & ' + (d.size - 1) + ')' + (d.probe.length > 1 ? '; collisions probed ' + d.probe.join(' → ') : '; empty, stored there') + '. Entry #' + (d.ent.length - 1) + ' appended to the dense array.';
      d.msg = msg; draw();
    }
    function draw() {
      P.clear(sv);
      P.text(sv, 14, 18, 'dk_indices  (sparse, size ' + d.size + ', usable left ' + d.usable + ')', { cls: 'ts', weight: 700 });
      var per = Math.min(d.size, 16), cw = Math.min(44, (W - 40) / per);
      for (var i = 0; i < d.size; i++) {
        var r = Math.floor(i / 16), c = i % 16, x = 14 + c * cw, y = 30 + r * 52;
        var onPath = d.probe.indexOf(i), last = d.probe[d.probe.length - 1] === i;
        P.box(sv, x, y, cw - 4, 34, { fill: last ? '#10241b' : C.fill, stroke: last ? C.acc : (onPath >= 0 ? C.orange : C.line), sw: onPath >= 0 ? 2 : 1.2, rx: 4 });
        P.text(sv, x + (cw - 4) / 2, y + 17, d.idx[i] === -1 ? '·' : String(d.idx[i]), { cls: 'tm', anchor: 'middle', fill: d.idx[i] === -1 ? '#6e7681' : C.cyan });
        P.text(sv, x + (cw - 4) / 2, y + 44, String(i), { cls: 'tms', anchor: 'middle', size: 10 });
      }
      var ey = 30 + Math.ceil(d.size / 16) * 52 + 14;
      P.text(sv, 14, ey, 'dk_entries  (dense, insertion order → iteration order)', { cls: 'ts', weight: 700 });
      d.ent.slice(-12).forEach(function (e, j) {
        var idx = d.ent.length - Math.min(12, d.ent.length) + j, x = 14 + (j % 6) * 125, y = ey + 12 + Math.floor(j / 6) * 40;
        P.box(sv, x, y, 118, 32, { fill: C.fill, stroke: idx === d.ent.length - 1 ? C.acc : C.line, rx: 4 });
        P.text(sv, x + 8, y + 16, '#' + idx + '  ' + e.k, { cls: 'tm', size: 12.5 });
        P.text(sv, x + 112, y + 16, 'h=' + (String(e.h).length > 6 ? String(e.h).slice(0, 5) + '…' : e.h), { cls: 'tms', anchor: 'end', size: 10.5 });
      });
      if (d.ent.length > 12) P.text(sv, 14, ey + 105, '… ' + (d.ent.length - 12) + ' earlier entries not shown', { cls: 'ts' });
      out.innerHTML = '<b>' + d.ent.length + ' keys</b>  ' + d.msg;
    }
    ins.onclick = function () { var k = keyIn.value.trim(); if (k) insert(k); };
    nxt.onclick = function () { while (d.ent.some(function (e) { return e.k === String(nextInt); })) nextInt++; insert(String(nextInt++)); };
    col.onclick = function () { var last = d.ent.length ? parseInt(d.ent[d.ent.length - 1].k, 10) : 0; if (isNaN(last)) last = 0; var k = last + d.size; insert(String(k)); };
    rs.onclick = reset;
    P.hint(f.body, 'Small ints hash to themselves in CPython, so the slots here are exact for int keys. Strings use a toy hash in this lab (real str hashes are SipHash and randomized per process). Insert ints 0…10: resizes happen on the 6th and 11th key, as Chapter 19 measured.');
    reset();
  });

  // ---------------------------------------------------------------- heap (Ch 19, 17, 18)
  P.lab('heap', 'heapq — a binary heap living in a plain list', function (f) {
    var ctl = P.controls(f.body);
    var vIn = P.input(ctl, 'value', '7', 'number');
    var push = P.button(ctl, 'heappush', 'primary'), pop = P.button(ctl, 'heappop'), rnd = P.button(ctl, 'push random'), rs = P.button(ctl, '↺ Reset');
    var out = P.readout(f.body), W = 760, H = 330, sv = P.svg(W, H, f.stage), heap, hl = [], queue = [], timer = null, rand = P.rng(7);
    function frameState(msg, cmp) { queue.push({ h: heap.slice(), hl: (cmp || []).slice(), msg: msg }); }
    function animate() { if (timer) return; timer = setInterval(function () { var s = queue.shift(); if (!s) { clearInterval(timer); timer = null; return; } drawState(s); }, 450); }
    function siftUp(i) { while (i > 0) { var p = (i - 1) >> 1; frameState('compare child heap[' + i + ']=' + heap[i] + ' with parent heap[' + p + ']=' + heap[p], [i, p]); if (heap[i] < heap[p]) { var t = heap[i]; heap[i] = heap[p]; heap[p] = t; frameState('swap: smaller value moves up', [p]); i = p; } else break; } }
    function siftDown(i) { var n = heap.length; for (;;) { var l = 2 * i + 1, r = l + 1, m = i; if (l < n && heap[l] < heap[m]) m = l; if (r < n && heap[r] < heap[m]) m = r; frameState('compare heap[' + i + '] with its children', [i, l < n ? l : i, r < n ? r : i]); if (m === i) break; var t = heap[i]; heap[i] = heap[m]; heap[m] = t; frameState('swap with the smaller child', [m]); i = m; } }
    function doPush(v) { if (heap.length >= 15) { frameState('demo heap is full (15 nodes); pop first'); animate(); return; } heap.push(v); frameState('append ' + v + ' at index ' + (heap.length - 1) + ' (end of the list)', [heap.length - 1]); siftUp(heap.length - 1); frameState('invariant restored: heap[parent] ≤ heap[child] everywhere. Θ(log n) swaps at most.'); animate(); }
    function doPop() { if (!heap.length) return; var top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; frameState('popped ' + top + '; moved the last element ' + last + ' to the root', [0]); siftDown(0); } frameState('heappop returned ' + top + ' — the minimum, always heap[0]'); animate(); }
    function drawState(s) {
      P.clear(sv);
      var pos = [];
      for (var i = 0; i < 15; i++) { var lvl = Math.floor(Math.log2(i + 1)), first = (1 << lvl) - 1, k = i - first, cnt = 1 << lvl; pos.push([30 + (W - 60) * (k + 0.5) / cnt, 30 + lvl * 56]); }
      s.h.forEach(function (v, i) { if (i > 0) { var p = (i - 1) >> 1; P.S('line', { x1: pos[p][0], y1: pos[p][1], x2: pos[i][0], y2: pos[i][1], stroke: C.line, 'stroke-width': 1.6 }, sv); } });
      s.h.forEach(function (v, i) { var on = s.hl.indexOf(i) >= 0; P.S('circle', { cx: pos[i][0], cy: pos[i][1], r: 19, fill: on ? '#3a2a12' : C.fill, stroke: on ? C.orange : (i === 0 ? C.acc : C.blue), 'stroke-width': on ? 2.6 : 1.6 }, sv); P.text(sv, pos[i][0], pos[i][1], String(v), { cls: 'tm', anchor: 'middle' }); P.text(sv, pos[i][0] + 22, pos[i][1] - 14, String(i), { cls: 'tms', size: 10 }); });
      P.text(sv, 14, 256, 'the same heap as a Python list:', { cls: 'ts' });
      s.h.forEach(function (v, i) { var on = s.hl.indexOf(i) >= 0; P.box(sv, 14 + i * 49, 270, 45, 34, { fill: on ? '#3a2a12' : C.fill, stroke: on ? C.orange : C.line, rx: 4 }); P.text(sv, 36 + i * 49, 287, String(v), { cls: 'tm', anchor: 'middle' }); P.text(sv, 36 + i * 49, 316, String(i), { cls: 'tms', anchor: 'middle', size: 10 }); });
      out.innerHTML = '<b>heap</b> ' + JSON.stringify(s.h) + '\n' + s.msg + '\nchildren of i: 2i+1, 2i+2 · parent of i: (i−1)//2';
    }
    function reset() { heap = [3, 5, 4, 9, 6, 8]; queue = []; drawState({ h: heap.slice(), hl: [], msg: 'A valid min-heap. Push or pop to watch sift-up / sift-down.' }); }
    push.onclick = function () { doPush(+vIn.value || 0); }; pop.onclick = doPop; rnd.onclick = function () { doPush(Math.floor(rand() * 50)); }; rs.onclick = reset;
    reset();
  });

  // ---------------------------------------------------------------- bits (Ch 20)
  P.lab('bits', 'Bit playground — two\'s complement identities and IEEE-754 floats', function (f) {
    var ctl = P.controls(f.body);
    var mode = P.select(ctl, 'mode', [['int', 'integer'], ['float', 'float64']], 'int');
    var vIn = P.input(ctl, 'value', '180');
    var wSel = P.select(ctl, 'width', [8, 16, 32], 8);
    var out = P.readout(f.body), wrap = P.el('div', { style: 'text-align:left;overflow-x:auto' }); f.stage.appendChild(wrap);
    function bitsOf(v, w) { var m = (1n << BigInt(w)) - 1n; var u = ((v % (1n << BigInt(w))) + (1n << BigInt(w))) & m; var s = u.toString(2); return '0'.repeat(w - s.length) + s; }
    function row(label, bits, colors, note) {
      var cells = bits.split('').map(function (b, i) { var c = colors ? colors(i) : (b === '1' ? C.cyan : null); return '<span style="display:inline-block;width:1.45em;text-align:center;margin:1px;border-radius:3px;font-family:var(--font-mono);font-size:.9rem;padding:.12em 0;border:1px solid ' + (c || '#30363d') + ';background:' + (b === '1' ? 'rgba(103,232,249,.16)' : '#161b22') + ';color:' + (b === '1' ? '#f0f3f6' : '#6e7681') + '">' + b + '</span>'; }).join('');
      return '<div style="display:flex;align-items:center;gap:.8rem;margin:.25rem 0;flex-wrap:nowrap"><span style="min-width:9.5em;font-family:var(--font-mono);font-size:.88rem;color:#c9d1d9">' + label + '</span><span style="white-space:nowrap">' + cells + '</span><span style="font-family:var(--font-mono);font-size:.85rem;color:#9da7b3;white-space:nowrap">' + (note || '') + '</span></div>';
    }
    function draw() {
      var html = '';
      if (mode.value === 'int') {
        wSel.parentNode.style.display = '';
        var v; try { v = BigInt(vIn.value.trim()); } catch (e) { out.textContent = 'Enter an integer (negative allowed).'; return; }
        var w = +wSel.value, pos = v < 0n ? -v : v;
        var ops = [['x', v], ['x - 1', v - 1n], ['x & (x - 1)', v & (v - 1n)], ['-x', -v], ['x & -x', v & -v], ['~x', ~v], ['x >> 1', v >> 1n]];
        ops.forEach(function (o) { html += row(o[0], bitsOf(o[1], w), null, '= ' + o[1].toString()); });
        wrap.innerHTML = html;
        var bl = pos.toString(2).length - (pos === 0n ? 1 : 0), pc = pos.toString(2).split('1').length - 1;
        out.innerHTML = '<b>x = ' + v + '</b>   bit_length() = ' + bl + '   bit_count() = ' + pc + '   power of two: ' + (v > 0n && (v & (v - 1n)) === 0n) +
          '\nx & (x-1) clears the lowest set bit · x & -x isolates it · ~x == -x - 1. Bits shown are the low ' + w + ' bits of Python\'s infinite two\'s complement.';
      } else {
        wSel.parentNode.style.display = 'none';
        var x = Number(vIn.value); if (isNaN(x) && vIn.value.trim().toLowerCase() !== 'nan') { out.textContent = 'Enter a float, e.g. 0.1, -2.5, 5e-324, inf'; return; }
        if (/^-?inf/i.test(vIn.value.trim())) x = vIn.value.trim()[0] === '-' ? -Infinity : Infinity;
        var dv = new DataView(new ArrayBuffer(8)); dv.setFloat64(0, x);
        var hi = dv.getUint32(0), lo = dv.getUint32(4), bits = hi.toString(2).padStart(32, '0') + lo.toString(2).padStart(32, '0');
        var colors = function (i) { return i === 0 ? '#fca5a5' : i < 12 ? '#fdba74' : '#67e8f9'; };
        var e = parseInt(bits.slice(1, 12), 2), fr = BigInt('0b' + bits.slice(12));
        html += row('sign | exponent | fraction', bits, colors, '');
        wrap.innerHTML = html;
        var kind = e === 2047 ? (fr === 0n ? 'infinity' : 'NaN') : e === 0 ? (fr === 0n ? 'zero' : 'subnormal: 0.fraction × 2^-1022') : 'normal: 1.fraction × 2^(' + e + ' − 1023) = 1.fraction × 2^' + (e - 1023);
        out.innerHTML = '<b>' + x + '</b>   sign=' + bits[0] + '   exp_field=' + e + '   frac=0x' + fr.toString(16).padStart(13, '0') + '\n' + kind + (x === 0.1 ? '\n0.1 has a repeating binary fraction: 0x999999999999a is rounded up in the last digit.' : '');
      }
    }
    vIn.addEventListener('input', draw); mode.onchange = function () { vIn.value = mode.value === 'int' ? '180' : '0.1'; draw(); }; wSel.onchange = draw;
    P.hint(f.body, 'Try 180, -6, 96 (a power-of-two multiple), 0. In float mode: 1.0, -2.5, 0.1, 5e-324, inf.');
    draw();
  });
})();
