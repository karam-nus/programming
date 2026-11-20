/* Programming Guide labs — algorithmic techniques (chapters 13–18, 23) */
(function () {
  'use strict';
  var P = window.PG, C = P.C;

  // ---------------------------------------------------------------- growth (Ch 13, 23)
  P.lab('growth', 'How big can n get? Growth curves against a one-second budget', function (f) {
    var ctl = P.controls(f.body);
    var nS = P.slider(ctl, 'n = 10^', 0, 7, 0.1, 3, function (v) { return Math.round(Math.pow(10, v)).toLocaleString(); });
    var rate = P.select(ctl, 'speed', [['1e7', 'pure Python ≈ 10⁷ ops/s'], ['1e9', 'C / NumPy ≈ 10⁹ ops/s']], '1e7');
    var out = P.readout(f.body), W = 760, H = 340, sv = P.svg(W, H, f.stage);
    var fns = [
      ['1', C.ink3, function (n) { return 0; }], ['log n', C.teal, function (n) { return Math.log10(Math.max(1, Math.log2(n))); }],
      ['n', C.green, function (n) { return Math.log10(n); }], ['n log n', C.cyan, function (n) { return Math.log10(n * Math.max(1, Math.log2(n))); }],
      ['n²', C.yellow, function (n) { return 2 * Math.log10(n); }], ['n³', C.orange, function (n) { return 3 * Math.log10(n); }],
      ['2ⁿ', C.red, function (n) { return n * Math.log10(2); }], ['n!', C.pink, function (n) { return n < 2 ? 0 : (n * Math.log(n) - n + 0.5 * Math.log(2 * Math.PI * n)) / Math.LN10; }]  // Stirling
    ];
    var x0 = 60, y0 = 300, xw = 620, yh = 262, ymax = 16;
    function X(l) { return x0 + l / 7 * xw; } function Y(l) { return y0 - Math.min(l, ymax) / ymax * yh; }
    function draw() {
      P.clear(sv);
      var budget = Math.log10(+rate.value);
      P.S('rect', { x: x0, y: Y(ymax), width: xw, height: Y(budget) - Y(ymax), fill: 'rgba(252,165,165,0.07)' }, sv);
      P.S('line', { x1: x0, y1: Y(budget), x2: x0 + xw, y2: Y(budget), stroke: C.red, 'stroke-dasharray': '6 4', 'stroke-width': 1.6 }, sv);
      P.text(sv, x0 + 6, Y(budget) - 10, '≈ 1 second of work', { fill: C.red, cls: 'ts', weight: 700 });
      for (var e = 0; e <= 7; e++) { P.S('line', { x1: X(e), y1: y0, x2: X(e), y2: Y(ymax), stroke: '#21262d' }, sv); P.text(sv, X(e), y0 + 16, '10' + ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷'][e], { cls: 'tms', anchor: 'middle' }); }
      for (var g = 0; g <= ymax; g += 4) P.text(sv, x0 - 8, Y(g), '10^' + g, { cls: 'tms', anchor: 'end' });
      P.text(sv, x0 + xw / 2, y0 + 34, 'input size n (log scale)', { cls: 'ts', anchor: 'middle' });
      P.text(sv, x0, 12, 'operations (log scale)', { cls: 'ts' });
      var nNow = Math.pow(10, +nS.value), rows = [];
      fns.forEach(function (fn, idx) {
        var d = '';
        for (var l = 0; l <= 7.001; l += 0.02) { var v = fn[2](Math.pow(10, l)); if (v > ymax + 0.5) break; d += (d ? ' L' : 'M') + X(l).toFixed(1) + ',' + Y(v).toFixed(1); }
        P.S('path', { d: d, stroke: fn[1], 'stroke-width': 2.4, fill: 'none' }, sv);
        var lv = fn[2](nNow); if (lv <= ymax) P.S('circle', { cx: X(+nS.value), cy: Y(lv), r: 5, fill: fn[1] }, sv);
        P.text(sv, x0 + xw + 14, 44 + idx * 22, fn[0], { fill: fn[1], cls: 'ts', weight: 700, size: 14 });
        var secs = Math.pow(10, lv - budget);
        rows.push((fn[0] + '        ').slice(0, 8) + (lv > 30 ? '   astronomically long' : secs < 1e-3 ? '   < 1 ms' : secs < 1 ? '   ' + (secs * 1000).toFixed(1) + ' ms' : secs < 3600 ? '   ' + secs.toFixed(1) + ' s' : secs < 3.15e7 ? '   ' + (secs / 3600).toFixed(1) + ' h' : '   ' + (secs / 3.15e7).toExponential(1) + ' years'));
      });
      P.S('line', { x1: X(+nS.value), y1: y0, x2: X(+nS.value), y2: Y(ymax), stroke: C.acc, 'stroke-width': 1.5 }, sv);
      out.innerHTML = '<b>n = ' + Math.round(nNow).toLocaleString() + '</b>   estimated time at ' + (rate.value === '1e7' ? '10⁷' : '10⁹') + ' simple ops/s (order of magnitude, not measured)\n' + rows.join('\n');
    }
    nS.addEventListener('input', draw); rate.onchange = draw; draw();
  });

  // ---------------------------------------------------------------- append (Ch 13, 19)
  P.lab('append', 'list.append — over-allocation and amortized O(1), using CPython\'s growth rule', function (f) {
    var ctl = P.controls(f.body);
    var a1 = P.button(ctl, 'append', 'primary'), a10 = P.button(ctl, 'append ×10'), a100 = P.button(ctl, 'append ×100'), rs = P.button(ctl, '↺ Reset');
    var out = P.readout(f.body), W = 760, H = 330, sv = P.svg(W, H, f.stage), st;
    function newcap(m) { return (m + (m >> 3) + 6) & ~3; }       // Objects/listobject.c, list_resize (3.9+)
    function reset() { st = { size: 0, cap: 0, copies: 0, hist: [], last: '' }; draw(); }
    function append(k) {
      for (var j = 0; j < k; j++) {
        if (st.size === st.cap) { var nc = newcap(st.size + 1); st.copies += st.size; st.last = 'resize ' + st.cap + ' → ' + nc + ' slots: realloc copies ' + st.size + ' pointers'; st.cap = nc; }
        else st.last = 'spare slot available: one pointer write';
        st.size++; st.hist.push(st.copies / st.size);
      }
      draw();
    }
    function draw() {
      P.clear(sv);
      var show = Math.max(st.cap, 8), per = 40, cw = (W - 28) / per;
      P.text(sv, 14, 16, 'ob_item[ ]  — ' + st.size + ' used of ' + st.cap + ' allocated', { cls: 'ts', weight: 700 });
      for (var i = 0; i < Math.min(show, 160); i++) {
        var r = Math.floor(i / per), c = i % per, used = i < st.size, alloc = i < st.cap;
        P.box(sv, 14 + c * cw, 28 + r * 26, cw - 2, 22, { fill: used ? 'rgba(103,232,249,0.35)' : (alloc ? C.fill : 'transparent'), stroke: used ? C.cyan : (alloc ? C.line : '#21262d'), rx: 2, sw: 1 });
      }
      if (st.cap > 160) P.text(sv, 14, 28 + 4 * 26 + 12, '… (' + (st.cap - 160) + ' more slots)', { cls: 'ts' });
      // ratio chart
      var cx = 60, cy = 300, cwid = 660, ch = 140;
      P.text(sv, 14, 162, 'total copies ÷ n  (bound: 9)', { cls: 'ts', weight: 700 });
      P.S('line', { x1: cx, y1: cy - ch * 9 / 10, x2: cx + cwid, y2: cy - ch * 9 / 10, stroke: C.red, 'stroke-dasharray': '6 4' }, sv);
      P.text(sv, cx + cwid, cy - ch * 9 / 10 - 9, '9 = r/(r−1), r = 9/8', { cls: 'ts', anchor: 'end', fill: C.red });
      P.S('line', { x1: cx, y1: cy, x2: cx + cwid, y2: cy, stroke: C.line }, sv);
      [0, 5, 10].forEach(function (v) { P.text(sv, cx - 8, cy - ch * v / 10, String(v), { cls: 'tms', anchor: 'end' }); });
      if (st.hist.length > 1) {
        var d = '', n = st.hist.length;
        st.hist.forEach(function (v, i) { d += (i ? ' L' : 'M') + (cx + i / (n - 1) * cwid).toFixed(1) + ',' + (cy - ch * Math.min(v, 10) / 10).toFixed(1); });
        P.S('path', { d: d, stroke: C.acc, 'stroke-width': 2, fill: 'none' }, sv);
      }
      P.text(sv, cx + cwid, cy + 16, 'n = ' + st.size, { cls: 'tms', anchor: 'end' });
      out.innerHTML = '<b>' + (st.last || 'empty list: 0 slots allocated') + '</b>\nappends ' + st.size + ' · pointer copies so far ' + st.copies + ' · copies per append ' + (st.size ? (st.copies / st.size).toFixed(2) : '—') +
        '\ncapacity rule: (m + m//8 + 6) & ~3 → 4, 8, 16, 24, 32, 40, 52, 64, 76, 92, … (matches sys.getsizeof in Chapter 13)';
    }
    a1.onclick = function () { append(1); }; a10.onclick = function () { append(10); }; a100.onclick = function () { append(100); }; rs.onclick = reset;
    reset();
  });

  // ---------------------------------------------------------------- fibtree (Ch 0, 14, 15)
  P.lab('fibtree', 'fib(n): the recursion tree, with and without a cache', function (f) {
    var ctl = P.controls(f.body);
    var nSel = P.select(ctl, 'n', [3, 4, 5, 6, 7], 6), memo = P.select(ctl, '', [['0', 'no cache'], ['1', '@functools.cache']], '0');
    var out = P.readout(f.body), W = 780, H = 330, sv = P.svg(W, H, f.stage), tree, order, k;
    function build() {
      var n = +nSel.value, useMemo = memo.value === '1', seen = {}, leaves = 0; order = [];
      function go(m, depth) {
        var node = { n: m, depth: depth, kids: [], hit: false };
        order.push(node);
        if (useMemo && seen[m]) { node.hit = true; node.x = leaves++; return node; }
        if (m >= 2) { node.kids.push(go(m - 1, depth + 1)); node.kids.push(go(m - 2, depth + 1)); node.x = (node.kids[0].x + node.kids[1].x) / 2; }
        else node.x = leaves++;
        seen[m] = true; node.v = fib(m);
        return node;
      }
      tree = go(n, 0); tree.leaves = leaves; k = 0; draw();
    }
    function fib(m) { var a = 0, b = 1; for (var i = 0; i < m; i++) { var t = a + b; a = b; b = t; } return a; }
    function naiveCalls(m) { var c = [1, 1]; for (var i = 2; i <= m; i++) c[i] = c[i - 1] + c[i - 2] + 1; return c[m]; }
    function draw() {
      P.clear(sv);
      var maxD = 0; order.forEach(function (o) { maxD = Math.max(maxD, o.depth); });
      var sx = (W - 40) / Math.max(tree.leaves, 1), sy = Math.min(60, (H - 60) / Math.max(maxD, 1));
      function pos(o) { return [20 + (o.x + 0.5) * sx, 26 + o.depth * sy]; }
      order.forEach(function (o) { o.kids.forEach(function (c) { var a = pos(o), b = pos(c); P.S('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: order.indexOf(c) < k ? C.ink3 : '#21262d', 'stroke-width': 1.5 }, sv); }); });
      order.forEach(function (o, i) {
        var p = pos(o), on = i < k, cur = i === k - 1;
        var col = o.hit ? C.purple : (o.n < 2 ? C.green : C.cyan);
        P.S('circle', { cx: p[0], cy: p[1], r: 14, fill: on ? (o.hit ? '#2a2140' : '#132a33') : '#0d1117', stroke: cur ? C.acc : (on ? col : '#30363d'), 'stroke-width': cur ? 3 : 1.6 }, sv);
        P.text(sv, p[0], p[1], String(o.n), { cls: 'tm', anchor: 'middle', fill: on ? C.ink : '#484f58', size: 12 });
      });
      var n = +nSel.value, calls = order.length, distinct = n + 1;
      out.innerHTML = '<b>fib(' + n + ')</b>   calls drawn so far ' + Math.min(k, calls) + ' / ' + calls + '   distinct subproblems ' + distinct +
        '\nnaive call counts grow like φⁿ: fib(10) → ' + naiveCalls(10) + ' calls, fib(20) → ' + naiveCalls(20).toLocaleString() + ', fib(25) → ' + naiveCalls(25).toLocaleString() + '  (cached: n + 1 misses)' +
        (memo.value === '1' ? '\npurple = cache hit: the call returns immediately and its subtree is never expanded.' : '\nevery repeated subtree is recomputed from scratch — that repetition is what DP removes.');
    }
    P.transport(f.body, function () { if (k < order.length) { k++; draw(); return k < order.length; } return false; }, function () { k = 0; draw(); }, 280);
    nSel.onchange = build; memo.onchange = build;
    build(); k = order.length; draw();
  });

  // ---------------------------------------------------------------- dptable (Ch 15, 16)
  P.lab('dptable', 'Fill a DP table — watch each cell read its dependencies, then reconstruct the answer', function (f, root) {
    var ctl = P.controls(f.body);
    var prob = P.select(ctl, 'problem', [['lcs', 'LCS("ABCBDAB", "BDCABA")'], ['edit', 'edit distance("kitten", "sitting")'], ['coin', 'min coins {1,5,6,9} → 11'], ['k01', '0/1 knapsack (2,5) (3,6), W=6'], ['kunb', 'unbounded knapsack (2,5) (3,6), W=6']], root.getAttribute('data-problem') || 'lcs');
    var out = P.readout(f.body), W = 780, H = 340, sv = P.svg(W, H, f.stage), M;
    function setup() {
      var p = prob.value, m = { cells: [], order: [], deps: {}, k: 0, path: [] };
      if (p === 'lcs' || p === 'edit') {
        var a = p === 'lcs' ? 'ABCBDAB' : 'kitten', b = p === 'lcs' ? 'BDCABA' : 'sitting', n = a.length, mm = b.length;
        m.rows = ['ε'].concat(a.split('')); m.cols = ['ε'].concat(b.split('')); m.R = n + 1; m.Cn = mm + 1;
        var dp = []; for (var i = 0; i <= n; i++) { dp.push([]); for (var j = 0; j <= mm; j++) dp[i].push(p === 'lcs' ? 0 : (i === 0 ? j : (j === 0 ? i : null))); }
        for (i = 1; i <= n; i++) for (j = 1; j <= mm; j++) {
          var key = i + ',' + j; m.order.push([i, j]);
          if (p === 'lcs') { if (a[i - 1] === b[j - 1]) { dp[i][j] = dp[i - 1][j - 1] + 1; m.deps[key] = [[i - 1, j - 1, '+1 match']]; } else { dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]); m.deps[key] = [[i - 1, j], [i, j - 1]]; } }
          else { var sub = a[i - 1] !== b[j - 1] ? 1 : 0; dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + sub); m.deps[key] = [[i - 1, j, 'del'], [i, j - 1, 'ins'], [i - 1, j - 1, sub ? 'sub' : 'match']]; }
        }
        m.dp = dp;
        // reconstruction
        i = n; j = mm;
        if (p === 'lcs') { var s = ''; while (i && j) { m.path.push([i, j]); if (a[i - 1] === b[j - 1]) { s = a[i - 1] + s; i--; j--; } else if (dp[i - 1][j] >= dp[i][j - 1]) i--; else j--; } m.answer = 'LCS length ' + dp[n][mm] + ' — reconstructed "' + s + '" (green path; diagonal steps emit a character)'; }
        else { while (i || j) { m.path.push([i, j]); if (i && j && dp[i][j] === dp[i - 1][j - 1] + (a[i - 1] !== b[j - 1] ? 1 : 0)) { i--; j--; } else if (i && dp[i][j] === dp[i - 1][j] + 1) i--; else j--; } m.path.push([0, 0]); m.answer = 'edit distance ' + dp[n][mm] + ' (k→s substitute, e→i substitute, insert g)'; }
        m.label = p === 'lcs' ? 'dp[i][j] = LCS length of a[:i], b[:j]' : 'dp[i][j] = edits turning a[:i] into b[:j]';
      } else if (p === 'coin') {
        var coins = [1, 5, 6, 9], A = 11, d1 = [0], ch = [null];
        m.rows = ['dp']; m.cols = []; for (var x = 0; x <= A; x++) m.cols.push(String(x)); m.R = 1; m.Cn = A + 1;
        for (x = 1; x <= A; x++) { d1[x] = Infinity; m.order.push([0, x]); m.deps['0,' + x] = []; coins.forEach(function (c) { if (c <= x) { m.deps['0,' + x].push([0, x - c, 'coin ' + c]); if (d1[x - c] + 1 < d1[x]) { d1[x] = d1[x - c] + 1; ch[x] = c; } } }); }
        m.dp = [d1]; x = A; while (x) { m.path.push([0, x]); x -= ch[x]; } m.path.push([0, 0]);
        m.answer = 'dp[11] = 2 coins: 6 + 5 (greedy would take 9 + 1 + 1). Path follows the stored best coin.';
        m.label = 'dp[a] = fewest coins summing to a';
      } else {
        var items = [[2, 5], [3, 6]], Wc = 6, unb = p === 'kunb', dk = [];
        m.rows = ['0 items', '+ (2,5)', '+ (3,6)']; m.cols = []; for (var c2 = 0; c2 <= Wc; c2++) m.cols.push(String(c2)); m.R = 3; m.Cn = Wc + 1;
        dk.push(new Array(Wc + 1).fill(0));
        for (var r = 1; r <= 2; r++) {
          dk.push([]); var w = items[r - 1][0], v = items[r - 1][1];
          for (c2 = 0; c2 <= Wc; c2++) {
            var keyk = r + ',' + c2; m.order.push([r, c2]); m.deps[keyk] = [[r - 1, c2, 'skip']];
            var best = dk[r - 1][c2];
            if (c2 >= w) { var tr = unb ? r : r - 1; m.deps[keyk].push([tr, c2 - w, 'take +' + v]); best = Math.max(best, dk[tr][c2 - w] + v); }
            dk[r][c2] = best;
          }
        }
        m.dp = dk; m.R = 3;
        m.answer = unb ? 'best value 15 = (2,5) taken three times. "take" reads the SAME row: the item can be reused — that is the upward loop in one-row form.'
                       : 'best value 11 = both items once. "take" reads the row ABOVE: each item at most once — the downward loop in one-row form.';
        m.label = 'dp[i][c] = best value with the first i items and capacity c';
        // reconstruction path
        r = 2; c2 = Wc; while (r > 0 && c2 >= 0) { m.path.push([r, c2]); var it = items[r - 1]; if (dk[r][c2] === dk[r - 1][c2]) r--; else { c2 -= it[0]; if (!unb) r--; } } m.path.push([r, c2]);
      }
      M = m; draw();
    }
    function draw() {
      P.clear(sv);
      var cw = Math.min(64, (W - 110) / M.Cn), chh = Math.min(34, 260 / M.R), x0 = 96, y0 = 54;
      P.text(sv, 14, 16, M.label, { cls: 'ts', weight: 700 });
      M.cols.forEach(function (c, j) { P.text(sv, x0 + j * cw + cw / 2, y0 - 14, c, { cls: 'tm', anchor: 'middle', fill: C.ink2 }); });
      var cur = M.k > 0 && M.k <= M.order.length ? M.order[M.k - 1] : null, deps = cur ? M.deps[cur[0] + ',' + cur[1]] : [];
      var filled = {}; M.order.slice(0, M.k).forEach(function (o) { filled[o[0] + ',' + o[1]] = 1; });
      var done = M.k >= M.order.length, onPath = {}; if (done) M.path.forEach(function (q) { onPath[q[0] + ',' + q[1]] = 1; });
      for (var i = 0; i < M.R; i++) {
        P.text(sv, x0 - 10, y0 + i * chh + chh / 2, M.rows[i], { cls: 'tm', anchor: 'end', fill: C.ink2, size: 12.5 });
        for (var j = 0; j < M.Cn; j++) {
          var key = i + ',' + j, isBase = !M.deps[key], show = isBase || filled[key];
          var isCur = cur && cur[0] === i && cur[1] === j, isDep = deps && deps.some(function (d) { return d[0] === i && d[1] === j; });
          var stroke = isCur ? C.acc : (isDep ? C.orange : (onPath[key] ? C.green : C.line));
          P.box(sv, x0 + j * cw, y0 + i * chh, cw - 3, chh - 3, { fill: onPath[key] ? '#10241b' : (isCur ? '#10241b' : (isDep ? '#3a2a12' : (isBase ? '#1a1f27' : C.fill))), stroke: stroke, sw: isCur || isDep ? 2.4 : 1.2, rx: 4 });
          var v = M.dp[i][j]; if (show) P.text(sv, x0 + j * cw + (cw - 3) / 2, y0 + i * chh + (chh - 3) / 2, v === Infinity ? '∞' : String(v), { cls: 'tm', anchor: 'middle', fill: isBase ? C.ink3 : C.ink });
        }
      }
      if (cur) deps.forEach(function (d) { var cx = x0 + cur[1] * cw + cw / 2, cy = y0 + cur[0] * chh + chh / 2, dx = x0 + d[1] * cw + cw / 2, dy = y0 + d[0] * chh + chh / 2, same = d[0] === cur[0]; P.arrow(sv, dx, dy - (same ? 10 : 0), cx + (dx < cx ? -6 : dx > cx ? 6 : 0), cy + (dy < cy ? -6 : 0) - (same ? 10 : 0), C.orange, { curve: same, cy: -26 - Math.abs(cx - dx) / 8, w: 2 }); });
      sv.setAttribute('viewBox', '0 0 ' + W + ' ' + Math.max(140, y0 + M.R * chh + 16)); sv.setAttribute('height', Math.max(140, y0 + M.R * chh + 16));
      var msg;
      if (!M.k) msg = 'Base cases (dim) are known directly. Press Step to fill cells in dependency order.';
      else if (!done) msg = 'cell [' + cur.join('][') + '] reads ' + deps.map(function (d) { return '[' + d[0] + '][' + d[1] + ']' + (d[2] ? ' (' + d[2] + ')' : ''); }).join(', ') + '  →  ' + (M.dp[cur[0]][cur[1]] === Infinity ? '∞' : M.dp[cur[0]][cur[1]]);
      else msg = M.answer;
      out.innerHTML = '<b>' + (done ? 'answer' : 'step ' + M.k + ' / ' + M.order.length) + '</b>  ' + msg;
    }
    P.transport(f.body, function () { if (M.k < M.order.length) { M.k++; draw(); return M.k < M.order.length; } return false; }, function () { M.k = 0; draw(); }, 420);
    prob.onchange = setup;
    P.hint(f.body, 'Orange = cells this cell reads. Compare the two knapsack variants: the only difference is which row "take" reads.');
    setup();
  });

  // ---------------------------------------------------------------- bsearch (Ch 14)
  P.lab('bsearch', 'Binary search from its invariant: everything < lo is False, everything ≥ hi is True', function (f) {
    var xs = [1, 3, 3, 3, 7, 9, 12, 15, 15, 18, 21, 24, 30, 33, 41, 50];
    var ctl = P.controls(f.body), tIn = P.input(ctl, 'first index with xs[i] ≥', '15', 'number');
    var out = P.readout(f.body), W = 780, H = 170, sv = P.svg(W, H, f.stage), st;
    function reset() { st = { lo: 0, hi: xs.length, mid: null, log: 'lo = 0, hi = len(xs) = 16: the invariant holds vacuously.', steps: 0 }; draw(); }
    function step() {
      if (st.lo >= st.hi) return false;
      var t = +tIn.value, mid = (st.lo + st.hi) >> 1; st.mid = mid; st.steps++;
      if (xs[mid] >= t) { st.hi = mid; st.log = 'mid = ' + mid + ': xs[' + mid + '] = ' + xs[mid] + ' ≥ ' + t + ' → True → hi = mid'; }
      else { st.lo = mid + 1; st.log = 'mid = ' + mid + ': xs[' + mid + '] = ' + xs[mid] + ' < ' + t + ' → False → lo = mid + 1'; }
      if (st.lo >= st.hi) st.log += '\nlo == hi == ' + st.lo + ' after ' + st.steps + ' steps (≤ ⌈log₂ 17⌉ = 5). bisect.bisect_left(xs, ' + t + ') returns the same.';
      draw(); return st.lo < st.hi;
    }
    function draw() {
      P.clear(sv); var cw = (W - 30) / xs.length;
      xs.forEach(function (v, i) {
        var region = i < st.lo ? 'F' : (i >= st.hi ? 'T' : 'U'), fill = region === 'F' ? 'rgba(252,165,165,0.16)' : region === 'T' ? 'rgba(74,222,128,0.16)' : C.fill;
        var stroke = i === st.mid ? C.yellow : (region === 'F' ? C.red : region === 'T' ? C.green : C.line);
        P.box(sv, 15 + i * cw, 50, cw - 4, 42, { fill: fill, stroke: stroke, sw: i === st.mid ? 2.6 : 1.3 });
        P.text(sv, 15 + i * cw + (cw - 4) / 2, 71, String(v), { cls: 'tm', anchor: 'middle' });
        P.text(sv, 15 + i * cw + (cw - 4) / 2, 106, String(i), { cls: 'tms', anchor: 'middle', size: 10 });
      });
      function mark(i, lab, col, y) { var x = 15 + Math.min(i, xs.length) * cw - 2; P.S('line', { x1: x, y1: 40, x2: x, y2: 100, stroke: col, 'stroke-width': 2.5 }, sv); P.text(sv, x, y, lab, { anchor: 'middle', fill: col, weight: 700 }); }
      mark(st.lo, 'lo', C.cyan, 28); mark(st.hi, 'hi', C.orange, 128);
      P.text(sv, 15, 152, 'red: known False · green: known True · neutral: still unknown — each step halves the unknown region', { cls: 'ts' });
      out.innerHTML = st.log;
    }
    P.transport(f.body, step, reset, 900); tIn.addEventListener('input', reset); reset();
  });

  // ---------------------------------------------------------------- intervals (Ch 17)
  P.lab('intervals', 'Interval scheduling — four greedy rules, one of them provably optimal', function (f) {
    var ivs = [[1, 4], [3, 5], [0, 6], [5, 7], [3, 9], [5, 9], [6, 10], [8, 11], [8, 12], [2, 14], [12, 16]];
    var ctl = P.controls(f.body);
    var rule = P.select(ctl, 'greedy rule', [['finish', 'earliest finish'], ['start', 'earliest start'], ['short', 'shortest first'], ['conf', 'fewest conflicts']], 'finish');
    var out = P.readout(f.body), W = 780, H = 330, sv = P.svg(W, H, f.stage), order, k, taken, status;
    function overlaps(a, b) { return a[0] < b[1] && b[0] < a[1]; }
    function setup() {
      var r = rule.value, idx = ivs.map(function (_, i) { return i; });
      var conf = ivs.map(function (a) { return ivs.filter(function (b) { return a !== b && overlaps(a, b); }).length; });
      idx.sort(function (i, j) { var a = ivs[i], b = ivs[j]; return r === 'finish' ? a[1] - b[1] || a[0] - b[0] : r === 'start' ? a[0] - b[0] || a[1] - b[1] : r === 'short' ? (a[1] - a[0]) - (b[1] - b[0]) || a[0] - b[0] : conf[i] - conf[j] || a[1] - b[1]; });
      order = idx; k = 0; taken = []; status = {}; draw();
    }
    function step() {
      if (k >= order.length) return false;
      var i = order[k++], ok = taken.every(function (t) { return !overlaps(ivs[t], ivs[i]); });
      status[i] = ok ? 'take' : 'reject'; if (ok) taken.push(i); draw(); return k < order.length;
    }
    function draw() {
      P.clear(sv); var x0 = 40, sc = (W - 70) / 16;
      for (var t = 0; t <= 16; t += 2) { P.S('line', { x1: x0 + t * sc, y1: 14, x2: x0 + t * sc, y2: 292, stroke: '#21262d' }, sv); P.text(sv, x0 + t * sc, 306, String(t), { cls: 'tms', anchor: 'middle' }); }
      ivs.forEach(function (iv, i) {
        var y = 18 + i * 25, s = status[i], cur = order[k - 1] === i;
        var col = s === 'take' ? C.acc : (s === 'reject' ? C.red : C.ink3);
        P.box(sv, x0 + iv[0] * sc, y, (iv[1] - iv[0]) * sc - 3, 18, { fill: s === 'take' ? 'rgba(52,211,153,0.35)' : (s === 'reject' ? 'rgba(252,165,165,0.12)' : '#1a1f27'), stroke: cur ? C.yellow : col, sw: cur ? 2.5 : 1.3, rx: 4 });
        P.text(sv, x0 + iv[1] * sc + 4, y + 9, '[' + iv[0] + ', ' + iv[1] + ')', { cls: 'tms', size: 11 });
      });
      var done = k >= order.length;
      out.innerHTML = '<b>' + taken.length + ' chosen</b>' + (done ? '   optimum is 4 (brute force, Chapter 17)' + (taken.length < 4 ? ' — this rule is NOT optimal on this input' : ' — matches') : '') +
        '\nconsidered in order: ' + order.slice(0, k).map(function (i) { return '[' + ivs[i] + ')' + (status[i] === 'take' ? '✓' : '✗'); }).join(' ');
    }
    P.transport(f.body, step, setup, 500); rule.onchange = setup; setup();
  });

  // ---------------------------------------------------------------- graph (Ch 18)
  P.lab('graph', 'BFS, DFS, Dijkstra and Kahn — the frontier decides everything', function (f, root) {
    var N = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
    var XY = { A: [70, 150], B: [210, 60], C: [210, 240], D: [370, 150], E: [520, 60], F: [520, 240], G: [680, 150] };
    var E = [['A', 'B', 4], ['A', 'C', 1], ['C', 'B', 2], ['B', 'D', 5], ['C', 'D', 8], ['D', 'E', 3], ['D', 'F', 6], ['E', 'G', 2], ['F', 'G', 1], ['E', 'F', 1]];
    var ctl = P.controls(f.body);
    var alg = P.select(ctl, 'algorithm', [['bfs', 'BFS (queue)'], ['dfs', 'DFS (stack)'], ['dij', 'Dijkstra (min-heap)'], ['kahn', 'Kahn topological sort (directed)']], root.getAttribute('data-alg') || 'bfs');
    var out = P.readout(f.body), W = 760, H = 300, sv = P.svg(W, H, f.stage), st, trace, k;
    function adj(directed) { var a = {}; N.forEach(function (n) { a[n] = []; }); E.forEach(function (e) { a[e[0]].push([e[1], e[2]]); if (!directed) a[e[1]].push([e[0], e[2]]); }); N.forEach(function (n) { a[n].sort(); }); return a; }
    function snap(s) { trace.push(JSON.parse(JSON.stringify(s))); }
    function setup() {
      trace = []; k = 0; var a = adj(alg.value === 'kahn'), s = { visited: [], frontier: [], dist: {}, cur: null, edge: null, msg: '' };
      if (alg.value === 'bfs') {
        s.dist.A = 0; s.frontier = ['A']; s.visited = ['A']; s.msg = 'Start: enqueue A, mark it visited (mark on push).'; snap(s);
        while (s.frontier.length) { var v = s.frontier.shift(); s.cur = v; s.msg = 'popleft ' + v + ' (distance ' + s.dist[v] + ')'; snap(s);
          a[v].forEach(function (p) { var u = p[0]; if (s.visited.indexOf(u) < 0) { s.visited.push(u); s.dist[u] = s.dist[v] + 1; s.frontier.push(u); s.edge = [v, u]; s.msg = 'discover ' + u + ' via ' + v + ' → distance ' + s.dist[u] + ' edges'; snap(s); } }); }
        s.cur = null; s.edge = null; s.msg = 'Done: distances count EDGES (weights ignored). Queue order = non-decreasing distance.'; snap(s);
      } else if (alg.value === 'dfs') {
        s.frontier = ['A']; s.msg = 'Start: push A.'; snap(s);
        while (s.frontier.length) { var v2 = s.frontier.pop(); if (s.visited.indexOf(v2) >= 0) { s.msg = 'pop ' + v2 + ': already visited, skip'; snap(s); continue; }
          s.visited.push(v2); s.cur = v2; var nb = a[v2].map(function (p) { return p[0]; }).filter(function (u) { return s.visited.indexOf(u) < 0; });
          s.frontier = s.frontier.concat(nb.slice().reverse()); s.msg = 'visit ' + v2 + ', push unvisited neighbours ' + (nb.join(', ') || '(none)'); snap(s); }
        s.cur = null; s.msg = 'Done: order ' + s.visited.join(' → ') + '. Deep before wide.'; snap(s);
      } else if (alg.value === 'dij') {
        s.dist.A = 0; s.frontier = [[0, 'A']]; s.msg = 'Start: heap = [(0, A)].'; snap(s);
        while (s.frontier.length) { s.frontier.sort(function (x, y) { return x[0] - y[0] || (x[1] < y[1] ? -1 : 1); }); var top = s.frontier.shift(), d = top[0], v3 = top[1];
          if (s.visited.indexOf(v3) >= 0) { s.msg = 'pop (' + d + ', ' + v3 + '): stale entry, ' + v3 + ' already settled — skip'; snap(s); continue; }
          s.visited.push(v3); s.cur = v3; s.msg = 'pop (' + d + ', ' + v3 + '): settle ' + v3 + ' — no unsettled path can be shorter (weights ≥ 0)'; snap(s);
          a[v3].forEach(function (p) { var u = p[0], nd = d + p[1]; if (s.dist[u] === undefined || nd < s.dist[u]) { s.dist[u] = nd; s.frontier.push([nd, u]); s.edge = [v3, u]; s.msg = 'relax ' + v3 + '→' + u + ': ' + nd + ' < previous → push (' + nd + ', ' + u + ')'; snap(s); } }); }
        s.cur = null; s.edge = null; s.msg = 'Done: shortest weighted distances. Note B = 3 via C, not 4 directly.'; snap(s);
      } else {
        var indeg = {}; N.forEach(function (n) { indeg[n] = 0; }); E.forEach(function (e) { indeg[e[1]]++; }); s.dist = indeg;
        s.frontier = N.filter(function (n) { return indeg[n] === 0; }); s.msg = 'Edges now point left → right. Labels show in-degree; queue the vertices with in-degree 0.'; snap(s);
        while (s.frontier.length) { var v4 = s.frontier.shift(); s.visited.push(v4); s.cur = v4; s.msg = 'output ' + v4 + '; decrement its successors'; snap(s);
          a[v4].forEach(function (p) { indeg[p[0]]--; s.edge = [v4, p[0]]; if (indeg[p[0]] === 0) { s.frontier.push(p[0]); s.msg = p[0] + ' reaches in-degree 0 → enqueue'; } else s.msg = p[0] + ' in-degree now ' + indeg[p[0]]; snap(s); }); }
        s.cur = null; s.edge = null; s.msg = 'Topological order: ' + s.visited.join(' → ') + '. Reverse it and you have the order backprop visits a graph.'; snap(s);
      }
      draw();
    }
    function draw() {
      var s = trace[k], dir = alg.value === 'kahn';
      P.clear(sv);
      E.forEach(function (e) {
        var a = XY[e[0]], b = XY[e[1]], hot = s.edge && ((s.edge[0] === e[0] && s.edge[1] === e[1]) || (!dir && s.edge[0] === e[1] && s.edge[1] === e[0]));
        var dx = b[0] - a[0], dy = b[1] - a[1], L = Math.sqrt(dx * dx + dy * dy), ux = dx / L, uy = dy / L;
        if (dir) P.arrow(sv, a[0] + ux * 24, a[1] + uy * 24, b[0] - ux * 26, b[1] - uy * 26, hot ? C.acc : C.ink3, { w: hot ? 3 : 1.6 });
        else P.S('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: hot ? C.acc : '#4b5563', 'stroke-width': hot ? 3.5 : 1.8 }, sv);
        if (alg.value === 'dij') { P.box(sv, (a[0] + b[0]) / 2 - 11, (a[1] + b[1]) / 2 - 11, 22, 22, { fill: '#0d1117', stroke: 'none' }); P.text(sv, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, String(e[2]), { cls: 'tm', anchor: 'middle', fill: C.yellow, size: 12.5 }); }
      });
      N.forEach(function (n) {
        var p = XY[n], vis = s.visited.indexOf(n) >= 0, cur = s.cur === n, inF = JSON.stringify(s.frontier).indexOf('"' + n + '"') >= 0;
        P.S('circle', { cx: p[0], cy: p[1], r: 22, fill: cur ? '#10241b' : (vis ? '#132a33' : C.fill), stroke: cur ? C.acc : (inF ? C.orange : (vis ? C.cyan : C.line)), 'stroke-width': cur ? 3.5 : 2 }, sv);
        P.text(sv, p[0], p[1], n, { anchor: 'middle', weight: 700, fill: C.ink });
        if (s.dist[n] !== undefined) P.text(sv, p[0] + (p[1] > 200 ? 0 : 0), p[1] + (p[1] > 200 ? 36 : -34), (alg.value === 'kahn' ? 'in ' : 'd=') + s.dist[n], { cls: 'tms', anchor: 'middle', fill: alg.value === 'kahn' ? C.purple : C.yellow });
      });
      var fr = alg.value === 'dij' ? s.frontier.slice().sort(function (x, y) { return x[0] - y[0]; }).map(function (q) { return '(' + q[0] + ',' + q[1] + ')'; }).join(' ') : s.frontier.join(' ');
      out.innerHTML = '<b>' + { bfs: 'queue', dfs: 'stack (top on the right)', dij: 'heap', kahn: 'ready queue' }[alg.value] + '</b> [' + fr + ']   <b>done</b> ' + s.visited.join(' ') + '\n' + s.msg;
    }
    P.transport(f.body, function () { if (k < trace.length - 1) { k++; draw(); return k < trace.length - 1; } return false; }, function () { k = 0; draw(); }, 750);
    alg.onchange = setup;
    P.hint(f.body, 'Same graph, three frontiers: a FIFO queue gives BFS, a LIFO stack gives DFS, a priority queue keyed on distance gives Dijkstra.');
    setup();
  });
})();
