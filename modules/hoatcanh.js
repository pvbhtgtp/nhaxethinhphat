'use strict';
/* Hoạt cảnh đón khách (màn Đặt vé) · 10 giây · tự chọn ngẫu nhiên hàng trăm tình huống (giờ trong ngày, thời tiết, cảnh nền, màu xe,
   số khách, kiểu khách, hành lý, câu nói…). Chỉ vẽ bằng SVG trong app: nhẹ, không ảnh, không tốn dữ liệu. Bật/tắt trong Giao diện của tôi. */
const HC = {
  Q: [], busy: false,
  R: a => a[Math.floor(Math.random() * a.length)],
  rnd: (a, b) => a + Math.random() * (b - a),
  ease: x => x < 0 ? 0 : x > 1 ? 1 : x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2,
  seg: (t, a, b) => HC.ease((t - a) / (b - a)),
  BUS: ['#2563eb', '#16a34a', '#dc2626', '#f59e0b', '#7c3aed', '#0891b2', '#db2777', '#475569', '#ea580c', '#0f766e'],
  SKY: { day: ['#7dd3fc', '#e0f2fe'], sunset: ['#fb923c', '#fde68a'], night: ['#0f172a', '#1e3a8a'], dawn: ['#c4b5fd', '#fef3c7'] },
  BG: ['city', 'sea', 'field', 'hill', 'station'],
  SHIRT: ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#f97316', '#14b8a6', '#64748b', '#ec4899'],
  KIND: ['adult', 'adult', 'woman', 'child', 'elder', 'student'],
  LUG: ['vali', 'vali', 'thung', 'bao', 'none', 'vali2'],
  SAY_D: ['Mời anh chị lên xe!', 'Để em xếp hành lý cho', 'Xe chạy đúng giờ nha!', 'Cẩn thận bậc lên xuống', 'Có ghế đẹp cho mình rồi', 'Hành lý để cốp an toàn nhé'],
  SAY_P: ['Cảm ơn tài xế!', 'Đi Vũng Tàu thôi!', 'Kịp giờ rồi', 'Xe sạch quá', 'Nhớ đón đúng chỗ nha', 'Lên đường nào!'],
  CALL: { ok: [['📞 Alo, xe sắp tới điểm đón rồi nha!', 'Dạ, em đang đợi!'], ['📞 Anh/chị ra điểm đón giúp em nhé', 'Ok, ra liền!'], ['📞 Còn khoảng 10 phút xe tới', 'Cảm ơn tài xế!']],
    nr: [['📞 Alo… alo…', '📵 Khách không nghe máy'], ['📞 Tút… tút…', '📵 Chưa liên lạc được']], hl: [['📞 Alo, xe sắp tới rồi ạ', '⏰ Khách hẹn gọi lại sau'], ['📞 Anh/chị ra điểm đón chưa?', '⏰ Chờ chút, gọi lại sau nha']],
    tb: [['📞 Alo…', '⚠ Thuê bao / sai số'], ['📞 Gọi mãi không được', '⚠ Số không liên lạc được']] },
  GO: ['Xuất bến!', 'Lên đường an toàn!', 'Bíp bíp!', 'Chúc quý khách thượng lộ bình an'],
  on() { try { return !!(THM.get() || {}).anim; } catch (e) { return false; } },   // người dùng đã tự bật thì luôn chạy (Windows tắt 'hiệu ứng động' cũng không chặn)
  /* vẽ 1 người; trả về nhóm SVG + thông tin để di chuyển */
  person(k, shirt) {
    const sc = k === 'child' ? .72 : k === 'student' ? .88 : 1, hair = k === 'elder' ? '#d1d5db' : '#1f2937';
    const hat = k === 'woman' ? `<path d="M-6,-27 L6,-27 L0,-33 Z" fill="#fbbf24"/>` : k === 'driver' ? `<rect x="-5" y="-30" width="10" height="3" rx="1" fill="#1e3a8a"/>` : k === 'student' ? `<rect x="2" y="-18" width="6" height="8" rx="1" fill="#1d4ed8"/>` : '';
    const cane = k === 'elder' ? `<line x1="6" y1="-12" x2="8" y2="0" stroke="#78350f" stroke-width="1.4"/>` : '';
    return `<g class="hc-p"><g transform="scale(${sc})"><line class="hc-l1" x1="-2" y1="-8" x2="-3" y2="0" stroke="#334155" stroke-width="2" stroke-linecap="round"/><line class="hc-l2" x1="2" y1="-8" x2="3" y2="0" stroke="#334155" stroke-width="2" stroke-linecap="round"/>
      <rect x="-4.5" y="-19" width="9" height="12" rx="3" fill="${k === 'driver' ? '#1e40af' : shirt}"/><circle cx="0" cy="-23" r="4.2" fill="#fcd9b8"/><path d="M-4.2,-24 a4.2,4.2 0 0 1 8.4,0 z" fill="${hair}"/>${hat}${cane}</g></g>`;
  },
  lug(t) {
    if (t === 'vali') return `<g><rect x="-4" y="-10" width="8" height="10" rx="1.5" fill="#7c2d12"/><path d="M-2,-10 v-3 h4 v3" fill="none" stroke="#7c2d12" stroke-width="1.2"/></g>`;
    if (t === 'vali2') return `<g><rect x="-4" y="-12" width="8" height="12" rx="1.5" fill="#0369a1"/><line x1="0" y1="-12" x2="0" y2="-16" stroke="#0369a1" stroke-width="1.2"/></g>`;
    if (t === 'thung') return `<g><rect x="-5" y="-9" width="10" height="9" fill="#d97706"/><line x1="-5" y1="-5" x2="5" y2="-5" stroke="#92400e" stroke-width=".8"/></g>`;
    if (t === 'bao') return `<g><ellipse cx="0" cy="-5" rx="5" ry="5" fill="#a3a3a3"/><path d="M-2,-10 l2,-2 l2,2" fill="none" stroke="#525252" stroke-width="1"/></g>`;
    return '';
  },
  bg(kind, tod) {
    const dk = tod === 'night', far = dk ? '#1e293b' : '#94a3b8';
    if (kind === 'city') return Array.from({ length: 9 }, (_, i) => { const h = 20 + ((i * 37) % 35), x = i * 38 - 5; return `<rect x="${x}" y="${100 - h}" width="30" height="${h}" fill="${far}" opacity=".55"/>${dk ? `<rect x="${x + 6}" y="${104 - h}" width="4" height="4" fill="#fde68a"/><rect x="${x + 18}" y="${110 - h}" width="4" height="4" fill="#fde68a"/>` : ''}`; }).join('');
    if (kind === 'sea') return `<rect x="0" y="82" width="340" height="18" fill="${dk ? '#1e3a8a' : '#38bdf8'}" opacity=".7"/><path d="M0,86 q10,-3 20,0 t20,0 t20,0 t20,0 t20,0 t20,0 t20,0 t20,0 t20,0 t20,0 t20,0 t20,0 t20,0 t20,0 t20,0 t20,0 t20,0" fill="none" stroke="#e0f2fe" stroke-width="1" opacity=".7"/>`;
    if (kind === 'field') return `<rect x="0" y="88" width="340" height="12" fill="${dk ? '#14532d' : '#86efac'}"/>` + Array.from({ length: 6 }, (_, i) => `<g transform="translate(${20 + i * 58},88)"><rect x="-1.5" y="-14" width="3" height="14" fill="#78350f"/><circle cx="0" cy="-18" r="8" fill="${dk ? '#166534' : '#22c55e'}"/></g>`).join('');
    if (kind === 'hill') return `<path d="M0,100 Q60,55 120,95 T240,90 T340,85 L340,100 Z" fill="${dk ? '#14532d' : '#4ade80'}" opacity=".6"/>`;
    return `<rect x="10" y="70" width="120" height="30" fill="${far}" opacity=".5"/><rect x="10" y="66" width="120" height="6" fill="#ef4444" opacity=".7"/><text x="70" y="84" font-size="7" text-anchor="middle" fill="#fff" font-weight="700">BẾN XE</text>`;
  },
  /* chạy 1 hoạt cảnh 10 giây; o: { cap } */
  play(o = {}) { if (HC.busy) { if (HC.Q.length < 3) HC.Q.push(o); return; } HC.busy = true; HC.run(o).finally(() => { HC.busy = false; const n = HC.Q.shift(); if (n) setTimeout(() => HC.play(n), 400); }); },
  run(o) {
    return new Promise(done => {
      const R = HC.R, tod = R(['day', 'day', 'sunset', 'night', 'dawn']), rain = Math.random() < .25, bgk = R(HC.BG), col = R(HC.BUS), np = 1 + Math.floor(Math.random() * 3);
      const P = Array.from({ length: np }, () => ({ k: R(HC.KIND), s: R(HC.SHIRT), l: R(HC.LUG) })), sky = HC.SKY[tod], dk = tod === 'night';
      const call = o.mode === 'call', cl = call ? R(HC.CALL[o.kq] || HC.CALL.ok) : null, sayD = call ? cl[0] : R(HC.SAY_D), sayP = call ? cl[1] : R(HC.SAY_P), go = R(HC.GO), dog = Math.random() < .2, birds = !dk && Math.random() < .35, honk = Math.random() < .5;
      const box = document.createElement('div'); box.className = 'hc-box'; box.dataset.runtime = '1';
      box.innerHTML = `<button type="button" class="hc-x" aria-label="Đóng">×</button>${o.cap ? `<div class="hc-cap">${esc(o.cap)}</div>` : ''}
        <svg viewBox="0 0 340 130" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="hcS" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/></linearGradient></defs>
        <rect width="340" height="130" fill="url(#hcS)"/>${dk ? '<circle cx="300" cy="22" r="9" fill="#fef9c3"/><circle cx="296" cy="19" r="9" fill="#1e3a8a"/>' : `<circle cx="300" cy="24" r="10" fill="${tod === 'sunset' ? '#f97316' : '#fde047'}"/>`}
        ${birds ? '<g class="hc-bird" stroke="#334155" fill="none" stroke-width="1.2"><path d="M0,0 q3,-3 6,0 q3,-3 6,0"/><path d="M16,6 q3,-3 6,0 q3,-3 6,0"/></g>' : ''}
        ${HC.bg(bgk, tod)}<rect x="0" y="100" width="340" height="30" fill="${dk ? '#334155' : '#64748b'}"/><g class="hc-dash">${Array.from({ length: 12 }, (_, i) => `<rect x="${i * 32}" y="114" width="16" height="2" fill="#f8fafc" opacity=".8"/>`).join('')}</g>
        <g transform="translate(282,100)"><rect x="-1" y="-34" width="2" height="34" fill="#475569"/><rect x="-11" y="-42" width="22" height="10" rx="2" fill="#16a34a"/><text x="0" y="-35" font-size="5.5" text-anchor="middle" fill="#fff" font-weight="700">ĐÓN KHÁCH</text></g>
        <g class="hc-bus"><rect x="0" y="-48" width="150" height="40" rx="7" fill="${col}"/><rect x="6" y="-44" width="112" height="15" rx="3" fill="${dk ? '#fde68a' : '#bae6fd'}" opacity=".9"/>
          ${Array.from({ length: 6 }, (_, i) => `<line x1="${6 + i * 18.7}" y1="-44" x2="${6 + i * 18.7}" y2="-29" stroke="${col}" stroke-width="1.5"/>`).join('')}
          <rect x="138" y="-44" width="10" height="16" rx="2" fill="#e0f2fe"/><rect x="146" y="-20" width="4" height="5" rx="1" fill="#fef08a"/><text x="62" y="-20" font-size="7" text-anchor="middle" fill="#fff" font-weight="800">THỊNH PHÁT</text>
          <g class="hc-hatch"><rect x="40" y="-16" width="46" height="9" rx="1.5" fill="#00000022" stroke="#0003"/></g><rect x="40" y="-16" width="46" height="9" fill="#0f172a" opacity="0" class="hc-hole"/>
          <rect class="hc-door" x="122" y="-44" width="14" height="36" rx="1.5" fill="#cbd5e1" stroke="#64748b" stroke-width=".8"/>
          <g transform="translate(28,-6)"><circle r="7" fill="#111827"/><circle r="3" fill="#9ca3af" class="hc-w"/></g><g transform="translate(118,-6)"><circle r="7" fill="#111827"/><circle r="3" fill="#9ca3af" class="hc-w"/></g></g>
        <g class="hc-drv">${HC.person('driver', '#1e40af')}</g>
        ${P.map((p, i) => `<g class="hc-px" data-i="${i}">${HC.person(p.k, p.s)}<g class="hc-lg">${HC.lug(p.l)}</g></g>`).join('')}
        ${dog ? '<g class="hc-dog"><ellipse cx="0" cy="-5" rx="6" ry="3.5" fill="#a16207"/><circle cx="6" cy="-8" r="2.8" fill="#a16207"/><line x1="-4" y1="-2" x2="-4" y2="0" stroke="#a16207" stroke-width="1.5"/><line x1="3" y1="-2" x2="3" y2="0" stroke="#a16207" stroke-width="1.5"/></g>' : ''}
        <g class="hc-say" opacity="0"><rect x="-2" y="-12" rx="5" height="14" fill="#fff" stroke="#0002"/><text x="4" y="-2.5" font-size="7.5" fill="#0f172a"></text></g>
        ${rain ? `<g class="hc-rain" stroke="#bfdbfe" stroke-width=".8" opacity=".7">${Array.from({ length: 40 }, () => `<line x1="${Math.random() * 340}" y1="${Math.random() * 130}" x2="${0}" y2="0"/>`).join('')}</g>` : ''}
        <g class="hc-dust" opacity="0">${[0, 1, 2].map(i => `<circle cx="${-6 - i * 7}" cy="${-4 - i}" r="${3 + i}" fill="#e2e8f0"/>`).join('')}</g></svg>`;
      document.body.appendChild(box);
      const q = s => box.querySelector(s), qa = s => [...box.querySelectorAll(s)], bus = q('.hc-bus'), door = q('.hc-door'), hatch = q('.hc-hatch'), hole = q('.hc-hole'), drv = q('.hc-drv'), say = q('.hc-say'), sayT = say.querySelector('text'), dust = q('.hc-dust');
      const PX = qa('.hc-px'), dogEl = q('.hc-dog'), birdEl = q('.hc-bird'), rainL = qa('.hc-rain line'), dash = q('.hc-dash'), wheels = qa('.hc-w');
      const STOP = 70, BX = t => call ? -160 + t * 20 : t < 1.6 ? -160 + (STOP + 160) * (1 - Math.pow(1 - t / 1.6, 2)) : t < 8.2 ? STOP : STOP + Math.pow((t - 8.2) / 1.8, 2) * 300;
      const walk = (g, x, y, mv, face = 1) => { g.setAttribute('transform', `translate(${x},${y}) scale(${face},1)`); const a = mv ? Math.sin(performance.now() / 70) * 3 : 0; const l1 = g.querySelector('.hc-l1'), l2 = g.querySelector('.hc-l2'); if (l1) { l1.setAttribute('x2', -3 + a); l2.setAttribute('x2', 3 - a); } };
      const talk = (txt, x, y) => { if (!txt) { say.setAttribute('opacity', 0); return; } if (sayT.textContent !== txt) { sayT.textContent = txt; const w = Math.min(200, txt.length * 4.1 + 10); say.querySelector('rect').setAttribute('width', w); } say.setAttribute('opacity', 1); say.setAttribute('transform', `translate(${Math.max(4, Math.min(336 - txt.length * 4.1 - 10, x))},${y})`); };
      const home = P.map((_, i) => 246 - i * 15), t0 = performance.now(); let stop = false;
      const end = () => { if (stop) return; stop = true; box.classList.add('out'); setTimeout(() => { box.remove(); done(); }, 300); };
      q('.hc-x').onclick = end;
      const frame = () => {
        if (stop) return; const t = (performance.now() - t0) / 1000; if (t > 10.2) return end();
        const bx = BX(t), moving = call || t < 1.6 || t > 8.2; bus.setAttribute('transform', `translate(${bx},108)`);
        wheels.forEach(w => w.setAttribute('transform', `rotate(${(bx * 6) % 360})`)); dash.setAttribute('transform', `translate(${moving ? -((performance.now() / 8) % 32) : 0},0)`);
        if (call) {   // gọi khách: xe đang trên đường tới điểm đón, tài xế gọi, khách ở điểm đón trả lời
          drv.setAttribute('opacity', 0); PX.forEach((g, i) => { g.setAttribute('opacity', 1); walk(g.firstElementChild, home[i], 108, false, -1); const lg = g.querySelector('.hc-lg'); if (lg) lg.setAttribute('transform', `translate(${home[i] + 7},108)`); });
          if (dogEl) dogEl.setAttribute('transform', `translate(${300 - t * 4},108)`); if (birdEl) birdEl.setAttribute('transform', `translate(${(t * 28) % 380 - 30},${22 + Math.sin(t * 2) * 4})`);
          rainL.forEach((l, k) => { const y = (k * 37 + t * 220) % 140 - 10, x = (k * 53 + t * 30) % 340; l.setAttribute('x1', x); l.setAttribute('y1', y); l.setAttribute('x2', x - 2); l.setAttribute('y2', y + 6); });
          if (t > .6 && t < 4.6) talk(sayD, Math.max(4, bx + 60), 46); else if (t > 5 && t < 9.6) talk(sayP, home[0] - 110, 62); else talk(''); dust.setAttribute('opacity', 0);
          requestAnimationFrame(frame); return;
        }
        const dOpen = t < 1.8 ? 0 : t < 2.3 ? HC.seg(t, 1.8, 2.3) : t < 7.6 ? 1 : 1 - HC.seg(t, 7.6, 8.1); door.setAttribute('width', 14 - 11 * dOpen);
        const hOpen = t < 3 ? 0 : t < 3.5 ? HC.seg(t, 3, 3.5) : t < 5.8 ? 1 : 1 - HC.seg(t, 5.8, 6.3); hatch.setAttribute('transform', `translate(0,${-12 * hOpen}) scale(1,${1 - .6 * hOpen})`); hole.setAttribute('opacity', .8 * hOpen);
        // tài xế: bước xuống cửa → ra cốp → quay lại cửa
        const dx0 = bx + 130, dxH = bx + 92; let dxp = dx0, dvis = t > 2.2 && t < 7.4, dmv = false;
        if (t >= 2.2 && t < 3) { dxp = dx0 + (dxH - dx0) * HC.seg(t, 2.2, 3); dmv = true; } else if (t >= 3 && t < 6.6) dxp = dxH; else if (t >= 6.6 && t < 7.4) { dxp = dxH + (dx0 - dxH) * HC.seg(t, 6.6, 7.4); dmv = true; }
        drv.setAttribute('opacity', dvis ? 1 : 0); walk(drv.firstElementChild, dxp, 108, dmv, t < 6.6 ? -1 : 1);
        // khách: đi tới cốp gửi hành lý → tới cửa → lên xe
        PX.forEach((g, i) => {
          const s1 = 3.4 + i * .55, s2 = s1 + .7, s3 = 6.3 + i * .4, s4 = s3 + .55, hx = bx + 66 + i * 4, cx = bx + 130; let x = home[i], mv = false, vis = 1, face = -1;
          if (t >= s1 && t < s2) { x = home[i] + (hx + 14 - home[i]) * HC.seg(t, s1, s2); mv = true; } else if (t >= s2 && t < s3) x = hx + 14; else if (t >= s3 && t < s4) { x = hx + 14 + (cx - hx - 14) * HC.seg(t, s3, s4); mv = true; face = 1; } else if (t >= s4) vis = 0;
          g.setAttribute('opacity', vis); walk(g.firstElementChild, x, 108, mv, face);
          const lg = g.querySelector('.hc-lg'); if (lg) { const inH = t > s2 + .2; lg.setAttribute('transform', inH ? `translate(${hx},104)` : `translate(${x + 7 * -face},108)`); lg.setAttribute('opacity', inH && t > 5.9 ? 0 : 1); }   // hành lý: xách theo khách → bỏ vào cốp → đóng cốp thì khuất
        });
        if (dogEl) dogEl.setAttribute('transform', `translate(${300 - Math.max(0, t - 2) * 6},108)`);
        if (birdEl) birdEl.setAttribute('transform', `translate(${(t * 28) % 380 - 30},${22 + Math.sin(t * 2) * 4})`);
        rainL.forEach((l, k) => { const y = (k * 37 + t * 220) % 140 - 10, x = (k * 53 + t * 30) % 340; l.setAttribute('x1', x); l.setAttribute('y1', y); l.setAttribute('x2', x - 2); l.setAttribute('y2', y + 6); });
        if (t > 2.4 && t < 3.6) talk(sayD, dxp - 30, 62); else if (t > 4.6 && t < 6) talk(sayP, home[0] - 40, 62); else if (t > 8.3 && t < 10) talk(honk ? 'Bíp bíp! ' + go : go, bx + 40, 50); else talk('');
        dust.setAttribute('opacity', t > 8.3 ? .8 : 0); dust.setAttribute('transform', `translate(${bx},108)`);
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });
  },
  /* theo dõi màn Đặt vé: khách vừa được đánh dấu "đã lên xe" trên chuyến đang xem → chạy hoạt cảnh */
  seen: new Map(),
  check() {
    try {
      if (!HC.on() || App.cur !== 'lichchay' || typeof dvCur !== 'function') return; const t = dvCur(); if (!t) return;
      const B = dvBook(t.id), snap = new Map(B.map(b => [b.id, { len: !!b.len, xn: !!b.xn, g: (b.goi || []).length }])), prev = HC.seen.get(t.id); HC.seen.set(t.id, snap);
      if (!prev) return; const nm = b => 'Ghế ' + (b.ghe || '') + (b.ten && b.ten !== 'KHÁCH LẺ' ? ' · ' + b.ten : ''), was = id => prev.get(id) || { len: false, xn: false, g: 0 };
      const up = B.filter(b => b.len && !was(b.id).len);
      if (up.length) return HC.play({ cap: `${t.gio} ${t.tuyen} · ${up.length > 1 ? up.length + ' khách' : nm(up[0])} đã lên xe` });
      const cg = B.filter(b => (b.goi || []).length > was(b.id).g);   // tài xế / nhân viên vừa ghi kết quả gọi khách
      if (cg.length) { const b = cg[0], k = b.goi[b.goi.length - 1], o = typeof callKQ === 'function' ? callKQ(k.kq) : { t: 'Gọi khách' }; return HC.play({ mode: 'call', kq: k.kq, cap: `${t.gio} · ${nm(b)} · ${(k.vai || '')} ${o.t}`.replace(/\s+/g, ' ') }); }
      const xn = B.filter(b => b.xn && !was(b.id).xn);
      if (xn.length) HC.play({ mode: 'call', kq: 'ok', cap: `${t.gio} · ${xn.length > 1 ? xn.length + ' vé' : nm(xn[0])} đã xác nhận` });
    } catch (e) { console.warn('HC.check', e); }
  }
};
addCSS(`.hc-box{position:fixed;right:14px;bottom:86px;z-index:480;width:min(360px,92vw);border-radius:14px;overflow:hidden;box-shadow:0 12px 32px rgba(15,23,42,.28);background:#0f172a;animation:hcIn .3s ease}
.hc-box svg{display:block;width:100%;height:auto;aspect-ratio:340/130}.hc-box.out{opacity:0;transform:translateY(12px);transition:.3s}
.hc-cap{position:absolute;left:8px;top:6px;right:34px;font-size:11.5px;font-weight:700;color:#0f172a;background:#ffffffd9;border-radius:8px;padding:3px 8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;z-index:1}
.hc-x{position:absolute;right:6px;top:5px;z-index:2;width:24px;height:24px;border-radius:50%;border:0;background:#ffffffd9;font-size:16px;line-height:1;cursor:pointer}
@keyframes hcIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
@media(min-width:900px){.hc-box{bottom:20px}}`);
MODL.def('hoatcanh', HC);
