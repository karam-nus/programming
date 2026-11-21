/* Programming Guide labs — Part I: how Python executes (chapters 0–5) */
(function () {
  'use strict';
  var P = window.PG, C = P.C;

  // ---------------------------------------------------------------- pipeline (Ch 0, 1)
  // Outputs pasted from CPython 3.13 (tokenize, ast.dump, dis) and verified in the chapter text.
  P.lab('pipeline', 'From source to execution — one line through every stage (CPython 3.13)', function (f) {
    var stages = [
      { k: 'source', c: C.ink3, t: 'Source text', body: 'y = x * k', note: 'Just characters. Nothing has been decided yet.' },
      { k: 'tokens', c: C.blue, t: 'Tokens — tokenize', body: "NAME 'y'\nOP '='\nNAME 'x'\nOP '*'\nNAME 'k'\nNEWLINE '\\n'", note: 'Indentation would become explicit INDENT / DEDENT tokens here.' },
      { k: 'ast', c: C.purple, t: 'AST — PEG parser', tree: true, note: 'ctx=Store vs ctx=Load: the compiler already knows which names are assigned (Ch 3).' },
      { k: 'symtable', c: C.orange, t: 'Symbol table — scope analysis', body: "module scope:\n  y  → assigned  → global (STORE_NAME)\n  x  → read      → global (LOAD_NAME)\n  k  → read      → global (LOAD_NAME)\n\nInside a function the same line would give\nLOAD_FAST / STORE_FAST: array slots, not dicts.", note: 'Every scope decision is made here, before any code runs.' },
      { k: 'bytecode', c: C.green, t: 'Bytecode — compile()', body: "  0  RESUME          0\n  1  LOAD_NAME       0 (x)\n     LOAD_NAME       1 (k)\n     BINARY_OP       5 (*)\n     STORE_NAME      2 (y)\n     RETURN_CONST    0 (None)", note: 'A stack machine: two pushes, one multiply that pops two and pushes one, one store.' },
      { k: 'run', c: C.acc, t: 'Evaluation loop — frames', body: "frame <module>\n  LOAD_NAME x     stack: [6]\n  LOAD_NAME k     stack: [6, 7]\n  BINARY_OP *     stack: [42]      ← int.__mul__\n  STORE_NAME y    stack: []        globals['y'] = 42", note: 'After warm-up, BINARY_OP would specialize to BINARY_OP_MULTIPLY_INT (Ch 1, PEP 659).' }
    ];
    var cur = 0, out = P.readout(f.body), ctl = P.controls(f.body);
    var prev = P.button(ctl, '‹ previous stage'), next = P.button(ctl, 'next stage ›', 'primary');
    prev.onclick = function () { cur = Math.max(0, cur - 1); draw(); }; next.onclick = function () { cur = Math.min(stages.length - 1, cur + 1); draw(); };
    var W = 760, sv = P.svg(W, 300, f.stage);
    function draw() {
      P.clear(sv);
      var bw = (W - 20) / stages.length, s = stages[cur];
      var lines = s.tree ? 7 : s.body.split('\n').length, H = 104 + lines * 24 + (s.tree ? 30 : 0);
      sv.setAttribute('viewBox', '0 0 ' + W + ' ' + H); sv.setAttribute('height', H);
      stages.forEach(function (st, i) {
        var x = 10 + i * bw, g = P.S('g', { style: 'cursor:pointer' }, sv);
        g.addEventListener('click', function () { cur = i; draw(); });
        P.box(g, x + 4, 8, bw - 8, 40, { fill: i === cur ? '#10241b' : C.fill, stroke: i <= cur ? st.c : C.line, sw: i === cur ? 2.6 : 1.4 });
        P.text(g, x + bw / 2, 28, (i + 1) + '. ' + st.k, { anchor: 'middle', fill: i <= cur ? st.c : C.ink3, weight: 700 });
        if (i < stages.length - 1) P.arrow(sv, x + bw - 4, 28, x + bw + 4, 28, i < cur ? C.acc : C.line);
      });
      P.box(sv, 10, 62, W - 20, H - 70, { fill: '#0b0f14', stroke: s.c, sw: 1.6 });
      P.text(sv, 26, 84, s.t, { fill: s.c, weight: 700, size: 15 });
      if (s.tree) {
        var nodes = [
          ['Module', 380, 116], ['Assign', 380, 156], ["Name 'y'  ctx=Store", 200, 201], ['BinOp  op=Mult', 520, 201],
          ["Name 'x'  ctx=Load", 420, 251], ["Name 'k'  ctx=Load", 630, 251]
        ];
        var edges = [[0, 1], [1, 2], [1, 3], [3, 4], [3, 5]];
        edges.forEach(function (e) { P.S('line', { x1: nodes[e[0]][1], y1: nodes[e[0]][2] + 12, x2: nodes[e[1]][1], y2: nodes[e[1]][2] - 12, stroke: C.ink3, 'stroke-width': 1.6 }, sv); });
        nodes.forEach(function (n, i) {
          var w = n[0].length * 8.2 + 24, store = n[0].indexOf('Store') > 0;
          P.box(sv, n[1] - w / 2, n[2] - 13, w, 26, { fill: C.fill2, stroke: store ? C.orange : (i === 3 ? C.purple : C.line) });
          P.text(sv, n[1], n[2], n[0], { cls: 'tm', anchor: 'middle', fill: store ? C.orange : C.ink });
        });
      } else {
        s.body.split('\n').forEach(function (line, i) { P.text(sv, 30, 114 + i * 24, line, { cls: 'tm' }); });
      }
      prev.disabled = cur === 0; next.disabled = cur === stages.length - 1;
      out.innerHTML = '<b>' + s.t + '</b>\n' + s.note;
    }
    draw();
  });

  // ---------------------------------------------------------------- bytecode (Ch 1)
  // Instruction listing and executed path verified on CPython 3.13 with sys.settrace(f_trace_opcodes).
  P.lab('bytecode', 'The stack machine — step scale_sum(xs, k) one instruction at a time (CPython 3.13)', function (f) {
    var code = [
      [0, 'RESUME', '0'], [2, 'LOAD_CONST', '1 (0)'], [4, 'STORE_FAST', '2 (total)'], [6, 'LOAD_FAST', '0 (xs)'],
      [8, 'GET_ITER', ''], [10, 'FOR_ITER', '10 (to 34)'], [14, 'STORE_FAST', '3 (x)'], [16, 'LOAD_FAST_LOAD_FAST', '35 (total, x)'],
      [18, 'LOAD_FAST', '1 (k)'], [20, 'BINARY_OP', '5 (*)'], [24, 'BINARY_OP', '13 (+=)'], [28, 'STORE_FAST', '2 (total)'],
      [30, 'JUMP_BACKWARD', '12 (to 10)'], [34, 'END_FOR', ''], [36, 'POP_TOP', ''], [38, 'LOAD_FAST', '2 (total)'], [40, 'RETURN_VALUE', '']
    ];
    var src = ['def scale_sum(xs, k):', '    total = 0', '    for x in xs:', '        total += x * k', '    return total'];
    var lineOf = { 0: 0, 2: 1, 4: 1, 6: 2, 8: 2, 10: 2, 14: 2, 16: 3, 18: 3, 20: 3, 24: 3, 28: 3, 30: 3, 34: 2, 36: 2, 38: 4, 40: 4 };
    var ctl = P.controls(f.body);
    var inSel = P.select(ctl, 'call', [['2,5', 'scale_sum([2, 5], 3)'], ['1,2,3', 'scale_sum([1, 2, 3], 3)'], ['', 'scale_sum([], 3)']], '2,5');
    var st, out = P.readout(f.body);
    var W = 780, H = 420, sv = P.svg(W, H, f.stage);
    function reset() {
      var xs = inSel.value ? inSel.value.split(',').map(Number) : [];
      st = { ip: 0, stack: [], loc: { xs: '[' + xs.join(', ') + ']', k: '3', total: '—', x: '—' }, xsv: xs, it: null, done: false, n: 0, msg: 'Frame created: xs and k are already in slots 0 and 1. Press Step.', ret: null };
      draw();
    }
    function push(v, label) { st.stack.push({ v: v, s: label === undefined ? String(v) : label }); }
    function step() {
      if (st.done) return false;
      var ins = code[st.ip], op = ins[1], next = st.ip + 1, m = '';
      st.n++;
      switch (op) {
        case 'RESUME': m = 'RESUME: checks for interrupts/tracing at function entry.'; break;
        case 'LOAD_CONST': push(0); m = 'Push the constant 0 (co_consts[1]).'; break;
        case 'STORE_FAST':
          var name = ins[2].indexOf('total') > 0 ? 'total' : 'x', v = st.stack.pop(); st.loc[name] = v.s; st[name] = v.v;
          m = 'Pop the top of stack into local slot ' + (name === 'total' ? 2 : 3) + ' (' + name + ').'; break;
        case 'LOAD_FAST':
          if (ins[2].indexOf('xs') > 0) { push(st.xsv, st.loc.xs); m = 'Push the list referenced by slot 0 (xs).'; }
          else if (ins[2].indexOf('(k)') > 0) { push(3); m = 'Push k (slot 1).'; }
          else { push(st.total); m = 'Push total (slot 2) — the return value.'; }
          break;
        case 'GET_ITER': st.stack.pop(); st.it = 0; push('it', '<list_iterator>'); m = 'Replace the list with iter(list).'; break;
        case 'FOR_ITER':
          if (st.it < st.xsv.length) { push(st.xsv[st.it]); st.it++; m = 'Call __next__: got ' + st.xsv[st.it - 1] + '. Push it above the iterator.'; }
          else { st.stack.pop(); next = 15; m = 'Iterator exhausted: 3.13 pops it and jumps past END_FOR and POP_TOP (verified with an opcode trace) to offset 38.'; }
          break;
        case 'LOAD_FAST_LOAD_FAST': push(st.total); push(st.x); m = 'Superinstruction (3.13): two LOAD_FASTs in one dispatch — total, then x.'; break;
        case 'BINARY_OP':
          var b = st.stack.pop(), a = st.stack.pop();
          if (ins[2].indexOf('*') > 0) { push(a.v * b.v); m = 'Pop x and k, push x * k = ' + (a.v * b.v) + '. (Specializes to BINARY_OP_MULTIPLY_INT once warm.)'; }
          else { push(a.v + b.v); m = 'Pop total and the product, push total + product = ' + (a.v + b.v) + '. In-place add on ints rebinds: ints are immutable.'; }
          break;
        case 'JUMP_BACKWARD': next = 5; m = 'Jump back to FOR_ITER (also a hook: hot loops here are where the JIT starts tracing).'; break;
        case 'RETURN_VALUE': st.ret = st.stack.pop().v; st.done = true; m = 'Pop and return ' + st.ret + '. The frame is discarded.'; break;
        default: m = op;
      }
      st.msg = m; st.last = op + (ins[2] ? ' ' + ins[2] : ''); st.ip = st.done ? st.ip : next; draw();
      return !st.done;
    }
    function draw() {
      P.clear(sv);
      // source
      P.text(sv, 16, 20, 'SOURCE', { cls: 'ts', weight: 700 });
      var curLine = lineOf[code[st.ip][0]];
      src.forEach(function (l, i) {
        if (i === curLine) P.box(sv, 10, 34 + i * 22, 300, 22, { fill: '#10241b', stroke: C.acc, rx: 4 });
        P.text(sv, 18, 45 + i * 22, l, { cls: 'tm', fill: i === curLine ? C.ink : C.ink3 });
      });
      // locals
      P.text(sv, 16, 170, 'LOCAL SLOTS  (frame.f_localsplus)', { cls: 'ts', weight: 700 });
      ['xs', 'k', 'total', 'x'].forEach(function (n, i) {
        P.box(sv, 10, 184 + i * 34, 300, 28, { fill: C.fill });
        P.text(sv, 22, 198 + i * 34, i + '  ' + n, { cls: 'tm', fill: C.ink3 });
        P.text(sv, 300, 198 + i * 34, st.loc[n], { cls: 'tm', anchor: 'end', fill: st.loc[n] === '—' ? C.ink3 : C.cyan });
      });
      // stack
      P.text(sv, 335, 20, 'VALUE STACK', { cls: 'ts', weight: 700 });
      P.S('path', { d: 'M335 60 L335 330 L465 330 L465 60', stroke: C.line, 'stroke-width': 2, fill: 'none' }, sv);
      st.stack.forEach(function (v, i) {
        var y = 300 - i * 36;
        P.box(sv, 341, y, 118, 30, { fill: '#1d2b3a', stroke: C.blue });
        P.text(sv, 400, y + 15, v.s, { cls: 'tm', anchor: 'middle' });
      });
      if (!st.stack.length) P.text(sv, 400, 315, 'empty', { cls: 'ts', anchor: 'middle' });
      // listing
      P.text(sv, 490, 20, 'BYTECODE  (dis)', { cls: 'ts', weight: 700 });
      code.forEach(function (c, i) {
        var y = 32 + i * 21.5, here = i === st.ip && !st.done;
        if (here) P.box(sv, 484, y - 1, 290, 21, { fill: '#10241b', stroke: C.acc, rx: 4 });
        var skipped = (c[0] === 34 || c[0] === 36);
        P.text(sv, 492, y + 10, String(c[0]).padStart(2, ' '), { cls: 'tms' });
        P.text(sv, 516, y + 10, c[1], { cls: 'tm', fill: here ? C.acc : (skipped ? '#6e7681' : C.ink), size: 12 });
        P.text(sv, 774, y + 10, c[2], { cls: 'tms', anchor: 'end', size: 11 });
      });
      P.text(sv, 10, 395, 'instructions executed: ' + st.n + (st.done ? '   →   returned ' + st.ret : ''), { cls: 'tm', fill: st.done ? C.acc : C.ink2 });
      out.innerHTML = (st.last ? '<b>executed ' + st.last + '</b>\n' : '') + st.msg + (st.done ? '' : '\nnext: ' + code[st.ip][1]);
    }
    P.transport(f.body, step, reset, 700);
    inSel.onchange = reset;
    P.hint(f.body, 'Offsets 34 and 36 (greyed) never run on this path. Locals live in numbered slots, which is why LOAD_FAST is fast and locals() is only a snapshot.');
    reset();
  });

  // ---------------------------------------------------------------- names (Ch 2)
  P.lab('names', 'Names → objects — step through aliasing, rebinding, refcounts and cycles', function (f) {
    var scenarios = {
      alias: [
        ['a = [1, 2]', { a: 'L1' }, { L1: [1, 2] }, 'A list object is created; the name a is bound to it. refcount(L1) = 1.'],
        ['b = a', { a: 'L1', b: 'L1' }, { L1: [1, 2] }, 'Assignment never copies: b is a second name for the same object. refcount = 2.'],
        ['b.append(3)', { a: 'L1', b: 'L1' }, { L1: [1, 2, 3] }, 'Mutation through b is visible through a — there is only one list.'],
        ['b = b + [4]', { a: 'L1', b: 'L2' }, { L1: [1, 2, 3], L2: [1, 2, 3, 4], T: { list: [4], dead: true } }, 'b + [4] builds a NEW list L2 and rebinds b. The temporary [4] is freed as soon as + returns.'],
        ['del a', { b: 'L2' }, { L1: { list: [1, 2, 3], dead: true }, L2: [1, 2, 3, 4] }, 'del removes the name, not the object. L1 drops to refcount 0 and is freed immediately (CPython).'],
        ['c = [b, b]', { b: 'L2', c: 'L3' }, { L2: [1, 2, 3, 4], L3: ['@L2', '@L2'] }, 'A container slot is a reference too: L2 now has refcount 3 (b + two slots of L3).']
      ],
      defaults: [
        ['def append_to(item, bucket=[]): ...', { append_to: 'F' }, { F: { fn: true, def: 'L1' }, L1: [] }, 'The default list is created ONCE, when def executes, and stored in append_to.__defaults__.'],
        ['r1 = append_to(1)', { append_to: 'F', r1: 'L1' }, { F: { fn: true, def: 'L1' }, L1: [1] }, 'The call used the default: it mutated the one shared list.'],
        ['r2 = append_to(2)', { append_to: 'F', r1: 'L1', r2: 'L1' }, { F: { fn: true, def: 'L1' }, L1: [1, 2] }, 'Same list again. r1 is r2 → True. Fix: bucket=None, then bucket = [] inside the body.']
      ],
      grid: [
        ['row = [0] * 3', { row: 'R' }, { R: [0, 0, 0] }, 'Repeating a list of ints copies references to the (immutable) int 0 — harmless.'],
        ['grid = [row] * 3', { row: 'R', grid: 'G' }, { G: ['@R', '@R', '@R'], R: [0, 0, 0] }, 'Repeating a list of LISTS copies references to the same row three times. refcount(R) = 4.'],
        ['grid[0][0] = 1', { row: 'R', grid: 'G' }, { G: ['@R', '@R', '@R'], R: [1, 0, 0] }, 'Every "row" shows the change: [[1,0,0],[1,0,0],[1,0,0]]. The DP-table bug from Chapter 15.'],
        ['grid = [[0] * 3 for _ in range(3)]', { row: 'R', grid: 'G2' }, { G: { list: ['@R', '@R', '@R'], dead: true }, R: [1, 0, 0], G2: ['@A', '@B', '@C'], A: [0, 0, 0], B: [0, 0, 0], C: [0, 0, 0] }, 'The comprehension runs [0] * 3 three times: three independent rows. The old grid is freed.']
      ],
      cycle: [
        ['x = []', { x: 'L1' }, { L1: [] }, 'One list, refcount 1.'],
        ['x.append(x)', { x: 'L1' }, { L1: ['@L1'] }, 'The list now contains a reference to itself: refcount 2.'],
        ['del x', {}, { L1: { list: ['@L1'], orphan: true } }, 'No name reaches L1, but its refcount is still 1 (its own slot). Reference counting alone can never free it.'],
        ['gc.collect()', {}, { L1: { list: ['@L1'], dead: true } }, 'The cycle collector subtracts internal references, finds L1 unreachable from outside, and frees it.']
      ]
    };
    var ctl = P.controls(f.body);
    var sel = P.select(ctl, 'scenario', [['alias', 'aliasing & rebinding'], ['defaults', 'mutable default argument'], ['grid', '[[0]*3]*3 grid'], ['cycle', 'reference cycle']], 'alias');
    var out = P.readout(f.body), k = 0;
    var W = 760, H = 330, sv = P.svg(W, H, f.stage);
    function norm(o) { return Array.isArray(o) ? { list: o } : o; }
    function draw() {
      var steps = scenarios[sel.value], s = steps[k], names = s[1], objs = s[2];
      P.clear(sv);
      P.text(sv, 16, 18, 'CODE', { cls: 'ts', weight: 700 });
      steps.forEach(function (st, i) { P.text(sv, 16, 40 + i * 22, (i === k ? '▶ ' : '  ') + st[0], { cls: 'tm', fill: i === k ? C.acc : (i < k ? C.ink2 : '#6e7681'), size: 12.5 }); });
      var y0 = 40 + steps.length * 22 + 18;
      P.text(sv, 16, y0, 'NAMES (frame)', { cls: 'ts', weight: 700 });
      P.text(sv, 330, 18, 'OBJECTS (heap)', { cls: 'ts', weight: 700 });
      // refcounts
      var rc = {};
      Object.keys(objs).forEach(function (id) { rc[id] = 0; });
      Object.keys(names).forEach(function (n) { rc[names[n]] = (rc[names[n]] || 0) + 1; });
      Object.keys(objs).forEach(function (id) { var o = norm(objs[id]); if (o.dead) return; (o.list || []).forEach(function (v) { if (typeof v === 'string' && v[0] === '@') rc[v.slice(1)] = (rc[v.slice(1)] || 0) + 1; }); if (o.def) rc[o.def] = (rc[o.def] || 0) + 1; });
      var pos = {}, oy = 34;
      Object.keys(objs).forEach(function (id) {
        var o = norm(objs[id]), w = o.fn ? 230 : Math.max(120, 30 + (o.list.length || 1) * 46), x = 330;
        pos[id] = { x: x, y: oy, w: w, h: 46 };
        var dead = o.dead, stroke = dead ? '#6e7681' : (o.orphan ? C.orange : C.blue);
        P.box(sv, x, oy, w, 46, { fill: dead ? '#111' : C.fill, stroke: stroke, sw: 1.6, opacity: dead ? 0.55 : 1 });
        P.text(sv, x + w + 10, oy + 14, id === 'T' ? 'temp' : id, { cls: 'tm', fill: dead ? '#6e7681' : C.ink2 });
        P.text(sv, x + w + 10, oy + 33, dead ? 'freed' : 'refcount ' + rc[id], { cls: 'tms', fill: dead ? C.red : (o.orphan ? C.orange : C.cyan) });
        if (o.fn) { P.text(sv, x + 12, oy + 16, 'function append_to', { cls: 'tm' }); P.text(sv, x + 12, oy + 34, '__defaults__ = (●,)', { cls: 'tms' }); }
        else if (!o.list.length) P.text(sv, x + 14, oy + 23, 'list  [ ]', { cls: 'tm', fill: C.ink3 });
        else o.list.forEach(function (v, i) {
          P.box(sv, x + 14 + i * 46, oy + 8, 40, 30, { fill: C.fill2, stroke: C.line, rx: 4, opacity: dead ? 0.5 : 1 });
          P.text(sv, x + 34 + i * 46, oy + 23, typeof v === 'string' ? '●' : String(v), { cls: 'tm', anchor: 'middle', fill: dead ? '#6e7681' : C.ink });
        });
        oy += 62;
      });
      // slot pointers
      Object.keys(objs).forEach(function (id) {
        var o = norm(objs[id]); if (o.dead) return;
        (o.list || []).forEach(function (v, i) {
          if (typeof v !== 'string') return;
          var t = pos[v.slice(1)], p = pos[id], sx = p.x + 34 + i * 46, sy = p.y + 23;
          if (v.slice(1) === id) P.arrow(sv, sx, sy + 8, p.x + p.w - 6, p.y + 40, C.purple, { curve: true, cy: 40, cx: 20 });
          else P.arrow(sv, sx, sy + 10, t.x + 30 + i * 6, t.y + (t.y > p.y ? 2 : 44), C.purple, { curve: true, cx: -60 + i * 10 });
        });
        if (o.def) { var t2 = pos[o.def], p2 = pos[id]; P.arrow(sv, p2.x + 160, p2.y + 34, t2.x + 40, t2.y, C.purple, { curve: true, cx: 30 }); }
      });
      // name boxes + pointers
      var ny = y0 + 16;
      Object.keys(names).forEach(function (n) {
        P.box(sv, 16, ny, 110, 30, { fill: C.fill, stroke: C.green });
        P.text(sv, 30, ny + 15, n, { cls: 'tm', fill: C.green });
        var t = pos[names[n]]; P.arrow(sv, 126, ny + 15, t.x - 2, t.y + 23, C.green, { curve: true, cx: 20 });
        ny += 40;
      });
      if (!Object.keys(names).length) P.text(sv, 16, ny + 12, '(no names)', { cls: 'ts' });
      out.innerHTML = '<b>' + s[0] + '</b>\n' + s[3];
    }
    P.transport(f.body, function () { var n = scenarios[sel.value].length; if (k < n - 1) { k++; draw(); return k < n - 1; } return false; },
      function () { k = 0; draw(); }, 1400);
    sel.onchange = function () { k = 0; draw(); };
    P.hint(f.body, 'Small ints are drawn inline for clarity; they are objects too (cached and immortal in CPython 3.12+). Refcounts shown count only the references in the diagram.');
    draw();
  });

  // ---------------------------------------------------------------- lookup (Ch 4)
  P.lab('lookup', 'obj.attr — watch object.__getattribute__ walk its five steps', function (f) {
    var cases = {
      p:    { q: 'd.p', cls: { Demo: { p: 'property (data descriptor)' } }, inst: { p: "'shadow?'" }, steps: ['desc', 'hit', '', '', ''], res: "property.__get__(d, Demo) runs → 'property'. The instance dict entry is never consulted." },
      kind: { q: 'd.kind', cls: { Demo: { kind: "str 'class attr'" } }, inst: { kind: "'instance attr'" }, steps: ['plain', 'no', 'hit', '', ''], res: "'instance attr' — a plain class attribute loses to the instance dict." },
      m:    { q: 'd.m', cls: { Demo: { m: 'function (non-data descriptor)' } }, inst: {}, steps: ['desc', 'no', 'no', 'hit', ''], res: 'function.__get__(d, Demo) → a new bound method object each time.' },
      cp1:  { q: 'd.stats  (1st access)', cls: { Dataset: { stats: 'cached_property (non-data)' } }, inst: {}, steps: ['desc', 'no', 'no', 'hit', ''], res: "cached_property.__get__ computes the value AND stores it in d.__dict__['stats']." },
      cp2:  { q: 'd.stats  (2nd access)', cls: { Dataset: { stats: 'cached_property (non-data)' } }, inst: { stats: "{'mean': 0.5}" }, steps: ['desc', 'no', 'hit', '', ''], res: 'Found in the instance dict at step 3 — the descriptor is never called again.' },
      ga:   { q: 'm.weights', cls: { Lazy: { __getattr__: 'function' } }, inst: {}, steps: ['none', 'no', 'no', 'no', 'hit'], res: 'The generic lookup raises AttributeError, so type(m).__getattr__(m, "weights") runs.' },
      err:  { q: 'd.nope', cls: { Demo: {} }, inst: {}, steps: ['none', 'no', 'no', 'no', 'err'], res: 'AttributeError: no class attribute, no instance entry, no __getattr__.' }
    };
    var labels = ['1. Look up the name on type(obj).__mro__', '2. Is that a DATA descriptor? → call its __get__', '3. Is the name in obj.__dict__? → return it', '4. Non-data descriptor → __get__ · plain class attribute → itself', '5. Nothing found → AttributeError → __getattr__ if defined'];
    var ctl = P.controls(f.body);
    var sel = P.select(ctl, 'expression', Object.keys(cases).map(function (k) { return [k, cases[k].q]; }), 'p');
    var go = P.button(ctl, '▶ Run lookup', 'primary');
    var wrap = P.el('div', { style: 'text-align:left' }); f.stage.appendChild(wrap);
    var out = P.readout(f.body), timer = null;
    function render(upto) {
      var c = cases[sel.value]; P.clear(wrap);
      var ctx = P.el('div', { style: 'display:grid;grid-template-columns:1fr 1fr;gap:.6rem;margin-bottom:.8rem' });
      var cn = Object.keys(c.cls)[0];
      ctx.appendChild(P.el('div', { 'class': 'lab-readout', style: 'margin:0' }, '<b>type(obj).__mro__</b>\n' + cn + '.__dict__: ' + (Object.keys(c.cls[cn]).map(function (k) { return k + ' → ' + c.cls[cn][k]; }).join('\n  ') || '(no match)') + '\nobject.__dict__: (no match)'));
      ctx.appendChild(P.el('div', { 'class': 'lab-readout', style: 'margin:0' }, '<b>obj.__dict__</b>\n' + (Object.keys(c.inst).map(function (k) { return k + ': ' + c.inst[k]; }).join('\n') || '{}')));
      wrap.appendChild(ctx);
      labels.forEach(function (l, i) {
        var s = c.steps[i], state = i >= upto ? 'todo' : (s.indexOf('hit') === 0 ? 'hit' : (s === 'err' ? 'err' : (s ? 'pass' : 'skip')));
        var col = { todo: C.line, hit: C.acc, err: C.red, pass: C.ink3, skip: '#262c34' }[state];
        var mark = { todo: '·', hit: i === 4 ? '✔ __getattr__ runs' : '✔ answer', err: '✖ AttributeError', pass: '— no, continue', skip: '' }[state];
        if (state === 'pass' && i === 0) mark = s === 'none' ? '— nothing on the class' : (s === 'plain' ? '— plain attribute: remember it' : '— a descriptor: remember it');
        var row = P.el('div', { style: 'display:flex;justify-content:space-between;gap:1rem;align-items:center;padding:.55rem .8rem;margin:.3rem 0;border-radius:8px;background:#161b22;border:1px solid ' + col + ';border-left:6px solid ' + col + ';opacity:' + (state === 'skip' ? .35 : 1) },
          '<span style="color:var(--ink);font-size:.95rem">' + l + '</span><span style="font-family:var(--font-mono);font-size:.85rem;color:' + col + ';white-space:nowrap">' + mark + '</span>');
        wrap.appendChild(row);
      });
      out.innerHTML = upto >= 5 || c.steps[upto - 1] && (c.steps[upto - 1].indexOf('hit') === 0 || c.steps[upto - 1] === 'err') ? '<b>' + c.q + '</b> → ' + c.res : '<b>' + c.q + '</b> …';
    }
    function run() {
      if (timer) clearInterval(timer);
      var c = cases[sel.value], last = c.steps.findIndex(function (s) { return s.indexOf('hit') === 0 || s === 'err'; }), i = 0;
      render(0);
      timer = setInterval(function () { i++; render(i); if (i > last) { clearInterval(timer); timer = null; } }, 650);
    }
    go.onclick = run; sel.onchange = run;
    P.hint(f.body, 'Steps after the first hit are skipped. Data descriptors (property, slots) outrank the instance dict; non-data descriptors (functions, cached_property) do not.');
    render(5);
  });

  // ---------------------------------------------------------------- c3 (Ch 4)
  P.lab('c3', 'C3 linearization — the merge, one head at a time', function (f) {
    var H = {
      diamond: { name: 'D', bases: ['B', 'C'], cls: { A: [], B: ['A'], C: ['A'], D: ['B', 'C'] } },
      service: { name: 'Service', bases: ['Logging', 'Caching'], cls: { Base: [], Logging: ['Base'], Caching: ['Base'], Service: ['Logging', 'Caching'] } },
      bad: { name: 'Bad', bases: ['D', 'E'], cls: { A: [], B: ['A'], C: ['A'], D: ['B', 'C'], E: ['C', 'B'], Bad: ['D', 'E'] } }
    };
    function lin(cls, c) { if (!cls[c].length) return [c, 'object']; return [c].concat(merge(cls[c].map(function (b) { return lin(cls, b); }).concat([cls[c].slice()]), null)); }
    function merge(seqs, trace) {
      seqs = seqs.map(function (s) { return s.slice(); }).filter(function (s) { return s.length; });
      var out = [];
      while (seqs.length) {
        var pick = null, tried = [];
        for (var i = 0; i < seqs.length; i++) {
          var h = seqs[i][0], inTail = seqs.some(function (s) { return s.indexOf(h, 1) > 0; });
          tried.push([h, inTail]);
          if (!inTail) { pick = h; break; }
        }
        if (trace) trace.push({ seqs: seqs.map(function (s) { return s.slice(); }), tried: tried, pick: pick, out: out.slice() });
        if (pick === null) throw { inconsistent: true };
        out.push(pick);
        seqs = seqs.map(function (s) { return s.filter(function (x) { return x !== pick; }); }).filter(function (s) { return s.length; });
      }
      if (trace) trace.push({ seqs: [], tried: [], pick: null, out: out.slice(), done: true });
      return out;
    }
    var ctl = P.controls(f.body);
    var sel = P.select(ctl, 'class', [['diamond', 'class D(B, C)  — diamond'], ['service', 'class Service(Logging, Caching)'], ['bad', 'class Bad(D, E)  — E(C, B) conflicts']], 'diamond');
    var out = P.readout(f.body), trace, k, err;
    var W = 760, Hh = 300, sv = P.svg(W, Hh, f.stage);
    function build() {
      var h = H[sel.value], seqs = h.bases.map(function (b) { return lin(h.cls, b); }).concat([h.bases.slice()]);
      trace = []; err = false; k = 0;
      try { merge(seqs, trace); } catch (e) { err = true; }
      draw();
    }
    function draw() {
      var h = H[sel.value], t = trace[k];
      P.clear(sv);
      P.text(sv, 16, 20, 'L[' + h.name + '] = ' + h.name + ' + merge(' + h.bases.map(function (b) { return 'L[' + b + ']'; }).join(', ') + ', [' + h.bases.join(', ') + '])', { cls: 'tm', fill: C.ink2 });
      t.seqs.forEach(function (s, i) {
        var y = 60 + i * 50;
        P.text(sv, 16, y + 16, i < h.bases.length ? 'L[' + h.bases[i] + ']' : 'bases', { cls: 'tms' });
        s.forEach(function (c, j) {
          var tr = t.tried.filter(function (q) { return q[0] === c; })[0], isHead = j === 0;
          var stroke = c === t.pick ? C.acc : (isHead && tr && tr[1] ? C.red : (j > 0 ? C.line : C.blue));
          var w = 18 + c.length * 9;
          var x = 90 + s.slice(0, j).reduce(function (a, cc) { return a + 26 + cc.length * 9; }, 0);
          P.box(sv, x, y, w, 32, { fill: c === t.pick ? '#10241b' : C.fill, stroke: stroke, sw: c === t.pick ? 2.4 : 1.5 });
          P.text(sv, x + w / 2, y + 16, c, { cls: 'tm', anchor: 'middle', fill: j > 0 ? C.ink3 : C.ink });
        });
      });
      var oy = 60 + Math.max(t.seqs.length, 1) * 50 + 20;
      P.text(sv, 16, oy, 'result', { cls: 'tms' });
      [h.name].concat(t.out).forEach(function (c, j) {
        var w = 18 + c.length * 9, x = 90 + [h.name].concat(t.out).slice(0, j).reduce(function (a, cc) { return a + 26 + cc.length * 9; }, 0);
        P.box(sv, x, oy - 16, w, 32, { fill: '#10241b', stroke: C.acc });
        P.text(sv, x + w / 2, oy, c, { cls: 'tm', anchor: 'middle' });
      });
      var msg;
      if (t.done) msg = '<b>MRO</b> ' + [h.name].concat(t.out).join(' → ') + '\nEvery class precedes its bases, and bases keep their listed order (local precedence + monotonicity).';
      else if (t.pick === null) msg = '<b>TypeError</b>: every head appears in some tail — ' + t.tried.map(function (q) { return q[0]; }).join(', ') + '.\nD needs B before C but E needs C before B: no order satisfies both. Python refuses to create the class.';
      else msg = t.tried.map(function (q) { return q[1] ? q[0] + ' is in a tail → skip' : q[0] + ' is in no tail → take it'; }).join('\n');
      out.innerHTML = msg;
    }
    P.transport(f.body, function () { if (k < trace.length - 1) { k++; draw(); return k < trace.length - 1; } return false; }, function () { k = 0; draw(); }, 1100);
    sel.onchange = build;
    P.hint(f.body, 'Green = chosen head. Red = rejected head (appears in some tail). Grey = tail entries. The same algorithm decides where super() goes next.');
    build();
  });

  // ---------------------------------------------------------------- eventloop (Ch 5, 8)
  P.lab('eventloop', 'A toy event loop — three generator tasks, one thread, switches only at yield', function (f) {
    var spec = [['a', [3, 3]], ['b', [1, 1, 1]], ['c', [5]]];
    var colors = { a: C.cyan, b: C.purple, c: C.orange };
    var st, out = P.readout(f.body), W = 760, H = 270, sv = P.svg(W, H, f.stage);
    function reset() {
      st = { now: 0, ready: spec.map(function (s) { return { n: s[0], d: s[1].slice(), i: 0 }; }), sleeping: [], log: [], hist: [], done: false, msg: 'All three tasks are ready. Each run step sends None into one task until it yields Sleep(n).' };
      draw();
    }
    function step() {
      if (st.done) return false;
      if (!st.ready.length) {
        st.sleeping.sort(function (a, b) { return a.t - b.t || a.seq - b.seq; });
        var w = st.sleeping.shift(); st.now = w.t; st.ready.push(w.task);
        st.msg = 'Nothing ready: advance the clock to the earliest wake-up (t=' + st.now + ') and move task ' + w.task.n + ' to the ready queue.';
      } else {
        var task = st.ready.shift();
        if (task.i < task.d.length) {
          var d = task.d[task.i++];
          st.sleeping.push({ t: st.now + d, task: task, seq: st.log.length * 10 + st.hist.length });
          st.hist.push([task.n, st.now]);
          st.msg = 'task.send(None): ' + task.n + ' runs until it yields Sleep(' + d + ') → wakes at t=' + (st.now + d) + '.';
        } else {
          st.log.push([st.now, task.n]);
          st.msg = 'task ' + task.n + ' returns → StopIteration(' + task.n + ') recorded at t=' + st.now + '.';
        }
      }
      if (!st.ready.length && !st.sleeping.length) { st.done = true; st.msg += '\nAll tasks finished: ' + JSON.stringify(st.log.map(function (l) { return [l[0], l[1]]; })).replace(/"/g, "'") + ' — matches the chapter output.'; }
      draw(); return !st.done;
    }
    function draw() {
      P.clear(sv);
      P.text(sv, 16, 20, 'clock t = ' + st.now, { cls: 'tm', fill: C.acc, weight: 700 });
      P.text(sv, 16, 52, 'READY QUEUE', { cls: 'ts', weight: 700 });
      st.ready.forEach(function (t, i) { P.box(sv, 16 + i * 60, 64, 50, 36, { fill: C.fill, stroke: colors[t.n], sw: 2 }); P.text(sv, 41 + i * 60, 82, t.n, { cls: 'tm', anchor: 'middle', fill: colors[t.n] }); });
      P.text(sv, 260, 52, 'SLEEPING (heap by wake time)', { cls: 'ts', weight: 700 });
      st.sleeping.slice().sort(function (a, b) { return a.t - b.t; }).forEach(function (s, i) { P.box(sv, 260 + i * 92, 64, 82, 36, { fill: C.fill, stroke: colors[s.task.n] }); P.text(sv, 301 + i * 92, 82, s.task.n + ' @ t=' + s.t, { cls: 'tm', anchor: 'middle', fill: colors[s.task.n] }); });
      // timeline
      var x0 = 60, sc = 100;
      P.text(sv, 16, 130, 'TIMELINE', { cls: 'ts', weight: 700 });
      for (var t = 0; t <= 6; t++) { P.S('line', { x1: x0 + t * sc, y1: 142, x2: x0 + t * sc, y2: 240, stroke: '#21262d' }, sv); P.text(sv, x0 + t * sc, 252, 't=' + t, { cls: 'tms', anchor: 'middle' }); }
      spec.forEach(function (s, r) {
        var y = 150 + r * 30; P.text(sv, 16, y + 10, s[0], { cls: 'tm', fill: colors[s[0]] });
        st.hist.filter(function (h) { return h[0] === s[0]; }).forEach(function (h) {
          var dur = s[1][st.hist.filter(function (q) { return q[0] === s[0] && q[1] < h[1]; }).length];
          P.box(sv, x0 + h[1] * sc, y, Math.max(4, dur * sc - 4), 20, { fill: colors[s[0]], stroke: 'none', opacity: 0.22, rx: 4 });
          P.box(sv, x0 + h[1] * sc - 3, y - 2, 6, 24, { fill: colors[s[0]], stroke: 'none', rx: 2 });
        });
        st.log.filter(function (l) { return l[1] === s[0]; }).forEach(function (l) { P.text(sv, x0 + l[0] * sc + 6, y + 10, '✔', { fill: C.acc, weight: 700 }); });
      });
      out.innerHTML = st.msg;
    }
    P.transport(f.body, step, reset, 900);
    P.hint(f.body, 'Bright ticks = the moment a task actually runs Python code; faded bars = waiting. One thread, never two ticks at the same instant on different rows: concurrency without parallelism.');
    reset();
  });
})();
