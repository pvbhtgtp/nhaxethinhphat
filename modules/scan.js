'use strict';
/* Module Scan tài liệu · tải khi mở màn hình Scan hoặc khi cần nắn ảnh thẻ (Nhân viên). */
/* ===================== SCAN TÀI LIỆU (kiểu CamScanner) =====================
   Chụp / chọn nhiều ảnh → tự nhận khung giấy (kéo 4 góc để chỉnh) → nắn phẳng phối cảnh → làm rõ chữ (Tăng nét, Xám, Đen trắng)
   → xuất PDF nhiều trang, JPG, PNG, WEBP hoặc lưu thẳng vào Lưu trữ hồ sơ (Google Drive). Xử lý ảnh trên máy; nếu có khóa AI thì AI dò 4 góc giấy và đọc nội dung.
   Ảnh chỉ nằm trong bộ nhớ trình duyệt khi đang scan, không ghi vào Firebase. */
const SCN = {
  P: [], cur: -1, busy: false, MAX: 2400, FILTERS: [['magic', 'Tăng nét (khuyên dùng)'], ['color', 'Màu gốc'], ['gray', 'Xám'], ['bw', 'Đen trắng']],
  /* ---------- tiện ích ảnh ---------- */
  cv(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; },
  fit(img, max) { const k = Math.min(1, max / Math.max(img.width, img.height)), c = SCN.cv(img.width * k, img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); return c; },
  async load(file) { let img; try { img = await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (e) { img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = URL.createObjectURL(file); }); } return SCN.fit(img, SCN.MAX); },
  /* ---------- tự nhận khung giấy: vùng sáng lớn nhất (ngưỡng Otsu) → 4 góc cực trị ---------- */
  detect(src) {
    const s = SCN.fit(src, 360), w = s.width, h = s.height, d = s.getContext('2d').getImageData(0, 0, w, h).data, g = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) g[i] = d[i * 4] * 0.299 + d[i * 4 + 1] * 0.587 + d[i * 4 + 2] * 0.114;
    const b = new Float32Array(w * h), R = 2;   // làm mờ nhẹ
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let t = 0, n = 0; for (let j = -R; j <= R; j++) for (let i = -R; i <= R; i++) { const xx = x + i, yy = y + j; if (xx >= 0 && yy >= 0 && xx < w && yy < h) { t += g[yy * w + xx]; n++; } } b[y * w + x] = t / n; }
    const hist = new Array(256).fill(0); b.forEach(v => hist[v | 0]++);
    let sum = 0; for (let i = 0; i < 256; i++) sum += i * hist[i]; let sB = 0, wB = 0, best = 0, th = 128;
    for (let i = 0; i < 256; i++) { wB += hist[i]; if (!wB) continue; const wF = w * h - wB; if (!wF) break; sB += i * hist[i]; const mB = sB / wB, mF = (sum - sB) / wF, v = wB * wF * (mB - mF) * (mB - mF); if (v > best) { best = v; th = i; } }
    const lab = new Int32Array(w * h).fill(-1), q = new Int32Array(w * h); let bestN = 0, bestL = -1, L = 0;
    for (let p0 = 0; p0 < w * h; p0++) { if (lab[p0] >= 0 || b[p0] <= th) continue; let qh = 0, qt = 0, n = 0; q[qt++] = p0; lab[p0] = L;
      while (qh < qt) { const p = q[qh++]; n++; const x = p % w, y = (p / w) | 0; [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]].forEach(([xx, yy]) => { if (xx < 0 || yy < 0 || xx >= w || yy >= h) return; const pp = yy * w + xx; if (lab[pp] < 0 && b[pp] > th) { lab[pp] = L; q[qt++] = pp; } }); }
      if (n > bestN) { bestN = n; bestL = L; } L++; }
    const k = src.width / w, inset = (x, y) => [x * k, y * k];
    if (bestL < 0 || bestN < w * h * 0.12 || bestN > w * h * 0.97) { const m = 0.03; return [inset(w * m, h * m), inset(w * (1 - m), h * m), inset(w * (1 - m), h * (1 - m)), inset(w * m, h * (1 - m))]; }
    let tl = [0, 0, 1e9], tr = [0, 0, -1e9], br = [0, 0, -1e9], bl = [0, 0, 1e9];
    for (let p = 0; p < w * h; p++) { if (lab[p] !== bestL) continue; const x = p % w, y = (p / w) | 0, s1 = x + y, s2 = x - y;
      if (s1 < tl[2]) tl = [x, y, s1]; if (s1 > br[2]) br = [x, y, s1]; if (s2 > tr[2]) tr = [x, y, s2]; if (s2 < bl[2]) bl = [x, y, s2]; }
    const Q = [inset(tl[0], tl[1]), inset(tr[0], tr[1]), inset(br[0], br[1]), inset(bl[0], bl[1])], cx = Q.reduce((a, p) => a + p[0], 0) / 4, cy = Q.reduce((a, p) => a + p[1], 0) / 4;
    return Q.map(([x, y]) => [x + (cx - x) * 0.012, y + (cy - y) * 0.012]);   // thu vào chút xíu để không dính mép bàn
  },
  full: src => [[0, 0], [src.width, 0], [src.width, src.height], [0, src.height]],
  /* ---------- nắn phẳng phối cảnh (homography) ---------- */
  homo(W, H, Q) {
    const S = [[0, 0], [W, 0], [W, H], [0, H]], A = [], B = [];
    for (let i = 0; i < 4; i++) { const [u, v] = S[i], [x, y] = Q[i]; A.push([u, v, 1, 0, 0, 0, -u * x, -v * x]); B.push(x); A.push([0, 0, 0, u, v, 1, -u * y, -v * y]); B.push(y); }
    for (let c = 0; c < 8; c++) { let p = c; for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r; [A[c], A[p]] = [A[p], A[c]]; [B[c], B[p]] = [B[p], B[c]];
      for (let r = 0; r < 8; r++) { if (r === c) continue; const f = A[r][c] / A[c][c]; for (let k = c; k < 8; k++) A[r][k] -= f * A[c][k]; B[r] -= f * B[c]; } }
    return B.map((v, i) => v / A[i][i]);
  },
  warp(src, Q, max) {
    const dd = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
    let W = Math.max(dd(Q[0], Q[1]), dd(Q[3], Q[2])), H = Math.max(dd(Q[0], Q[3]), dd(Q[1], Q[2])); const k = Math.min(1, max / Math.max(W, H)); W = Math.round(W * k); H = Math.round(H * k);
    const [a, b, c, d, e, f, g, h] = SCN.homo(W, H, Q), sw = src.width, sh = src.height, sd = src.getContext('2d').getImageData(0, 0, sw, sh).data, out = SCN.cv(W, H), oc = out.getContext('2d'), od = oc.createImageData(W, H), o = od.data;
    for (let v = 0; v < H; v++) for (let u = 0; u < W; u++) {
      const z = g * u + h * v + 1, x = (a * u + b * v + c) / z, y = (d * u + e * v + f) / z, x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0, oi = (v * W + u) * 4;
      if (x0 < 0 || y0 < 0 || x0 >= sw - 1 || y0 >= sh - 1) { o[oi] = o[oi + 1] = o[oi + 2] = 255; o[oi + 3] = 255; continue; }
      const i1 = (y0 * sw + x0) * 4, i2 = i1 + 4, i3 = i1 + sw * 4, i4 = i3 + 4;
      for (let ch = 0; ch < 3; ch++) o[oi + ch] = (sd[i1 + ch] * (1 - fx) + sd[i2 + ch] * fx) * (1 - fy) + (sd[i3 + ch] * (1 - fx) + sd[i4 + ch] * fx) * fy;
      o[oi + 3] = 255;
    }
    oc.putImageData(od, 0, 0); return out;
  },
  /* ---------- làm rõ: chia cho nền (khử bóng, giấy trắng ra) ---------- */
  bg(c) {   // ảnh nền mờ nhỏ (1/8) bằng tích phân
    const s = SCN.fit(c, Math.max(48, Math.max(c.width, c.height) / 8)), w = s.width, h = s.height, d = s.getContext('2d').getImageData(0, 0, w, h).data, R = Math.max(2, Math.round(Math.max(w, h) / 14)), out = new Float32Array(w * h * 3);
    for (let ch = 0; ch < 3; ch++) { const I = new Float64Array((w + 1) * (h + 1));
      for (let y = 0; y < h; y++) { let row = 0; for (let x = 0; x < w; x++) { row += d[(y * w + x) * 4 + ch]; I[(y + 1) * (w + 1) + x + 1] = I[y * (w + 1) + x + 1] + row; } }
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const x1 = Math.max(0, x - R), y1 = Math.max(0, y - R), x2 = Math.min(w, x + R + 1), y2 = Math.min(h, y + R + 1); out[(y * w + x) * 3 + ch] = (I[y2 * (w + 1) + x2] - I[y1 * (w + 1) + x2] - I[y2 * (w + 1) + x1] + I[y1 * (w + 1) + x1]) / ((x2 - x1) * (y2 - y1)); } }
    return { w, h, v: out };
  },
  /* làm rõ kiểu CamScanner: chia cho nền (khử bóng) → đẩy giấy về trắng, mực đậm lên (levels + gamma) → giữ màu mực xanh / dấu đỏ → làm nét */
  filter(c, mode) {
    if (mode === 'color') return c;
    const W = c.width, H = c.height, ctx = c.getContext('2d'), id = ctx.getImageData(0, 0, W, H), p = id.data, B = SCN.bg(c), sx = B.w / W, sy = B.h / H;
    const LO = 55, HI = 228, lv = v => { let t = (v - LO) / (HI - LO); t = t <= 0 ? 0 : t >= 1 ? 1 : t; return 255 * Math.pow(t, 1.35); };
    for (let y = 0; y < H; y++) { const by = Math.min(B.h - 1, (y * sy) | 0); for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4, bi = (by * B.w + Math.min(B.w - 1, (x * sx) | 0)) * 3, r = p[i], g = p[i + 1], bb = p[i + 2];
      const nr = Math.min(255, r / (B.v[bi] || 1) * 250), ng = Math.min(255, g / (B.v[bi + 1] || 1) * 250), nb = Math.min(255, bb / (B.v[bi + 2] || 1) * 250), l = nr * 0.299 + ng * 0.587 + nb * 0.114;
      if (mode === 'gray') { p[i] = p[i + 1] = p[i + 2] = lv(l); continue; }
      if (mode === 'bw') { p[i] = p[i + 1] = p[i + 2] = l < 175 ? 0 : 255; continue; }
      const L2 = lv(l), k = l > 1 ? L2 / l : 0, sat = 1.45;   // giữ sắc mực: tỷ lệ độ sáng mới, tăng bão hòa
      let R = l + (nr - l) * sat, G = l + (ng - l) * sat, Bl = l + (nb - l) * sat; R *= k; G *= k; Bl *= k;
      if (L2 > 246) R = G = Bl = 255;
      p[i] = R < 0 ? 0 : R > 255 ? 255 : R; p[i + 1] = G < 0 ? 0 : G > 255 ? 255 : G; p[i + 2] = Bl < 0 ? 0 : Bl > 255 ? 255 : Bl;
    } }
    if (mode !== 'bw') SCN.sharp(p, W, H, mode === 'gray' ? 0.55 : 0.7);
    ctx.putImageData(id, 0, 0); return c;
  },
  sharp(p, W, H, a) {   // làm nét (unsharp 3x3), bỏ qua vùng giấy trắng
    const src = new Uint8ClampedArray(p);
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const i = (y * W + x) * 4; if (src[i] > 250 && src[i + 1] > 250 && src[i + 2] > 250) continue;
      for (let ch = 0; ch < 3; ch++) { const c0 = src[i + ch], m = (src[i - 4 + ch] + src[i + 4 + ch] + src[i - W * 4 + ch] + src[i + W * 4 + ch]) / 4; p[i + ch] = c0 + (c0 - m) * a * 2; } }
  },
  out(pg, max) { return SCN.filter(SCN.warp(pg.src, pg.q, max), pg.f); },
  rot(pg) { const s = pg.src, c = SCN.cv(s.height, s.width), x = c.getContext('2d'); x.translate(c.width, 0); x.rotate(Math.PI / 2); x.drawImage(s, 0, 0); pg.src = c; pg.q = pg.q.map(([a, b]) => [s.height - b, a]); pg.q = [pg.q[3], pg.q[0], pg.q[1], pg.q[2]]; pg.thumb = null; },
  /* ---------- thêm ảnh ---------- */
  async add(files) {
    files = [...(files || [])].filter(f => /^image\//.test(f.type) || /\.(jpe?g|png|webp|heic|heif)$/i.test(f.name || '')); if (!files.length) return;
    SCN.busy = true; SCN.paint();
    for (const f of files) { try { const src = await SCN.load(f); SCN.P.push({ src, q: SCN.detect(src), f: 'magic' }); } catch (e) { toast('Không đọc được ảnh ' + esc(f.name || ''), 'err'); } }
    SCN.busy = false; SCN.cur = SCN.P.length - 1; SCN.paint();
  },
  /* ---------- giao diện ---------- */
  thumb(pg) { if (!pg.thumb) { const c = SCN.out({ src: SCN.fit(pg.src, 500), q: pg.q.map(([x, y]) => { const k = Math.min(1, 500 / Math.max(pg.src.width, pg.src.height)); return [x * k, y * k]; }), f: pg.f }, 220); pg.thumb = c.toDataURL('image/jpeg', .8); } return pg.thumb; },
  paint() { const el = $('#scnRoot'); if (el) el.innerHTML = SCN.html(); SCN.bindEd(); },
  html() {
    const n = SCN.P.length, pg = SCN.P[SCN.cur], canHS = Auth.can('hoso', 'add');
    const pages = n ? `<div class="scn-pages">${SCN.P.map((p, i) => `<div class="scn-pg ${i === SCN.cur ? 'on' : ''}" data-sc="sel" data-i="${i}"><img src="${SCN.thumb(p)}" alt=""><b>${i + 1}</b><span class="scn-x" data-sc="del" data-i="${i}" title="Bỏ trang">×</span>${i ? `<span class="scn-mv" data-sc="left" data-i="${i}" title="Đưa lên trước">‹</span>` : ''}</div>`).join('')}</div>` : '';
    const ed = pg ? `<div class="scn-ed"><div class="scn-col"><div class="scn-h">1. Chỉnh khung giấy <small>kéo 4 góc tròn cho khớp mép giấy</small></div><div class="scn-stage" id="scnStage"><canvas id="scnSrc"></canvas><svg id="scnSvg"></svg></div>
        <div class="scn-tools"><button class="btn sm" data-sc="auto">${ic('sparkle')} Tự nhận khung</button><button class="btn sm" data-sc="full">Toàn ảnh</button><button class="btn sm" data-sc="rot">${ic('refresh')} Xoay 90°</button></div></div>
      <div class="scn-col"><div class="scn-h">2. Kết quả <small>đã nắn phẳng và làm rõ chữ</small></div><div class="scn-res"><img id="scnRes" alt=""></div>
        <div class="scn-tools">${SCN.FILTERS.map(f => `<button class="btn sm ${pg.f === f[0] ? 'pri' : ''}" data-sc="flt" data-f="${f[0]}">${f[1]}</button>`).join('')}</div></div></div>` : '';
    const exp = n ? `<div class="card scn-ex"><div class="scn-h">3. Lưu tài liệu (${n} trang)</div><div class="row" style="gap:10px;flex-wrap:wrap;align-items:flex-end">
        <label class="field grow" style="min-width:200px"><span>Tên tài liệu</span><input class="inp" id="scnName" value="${esc(SCN.name || 'Scan ' + F.date(D.today()).replace(/\//g, '-') + ' ' + new Date().toTimeString().slice(0, 5).replace(':', 'h'))}"></label>
        <label class="field" style="min-width:170px"><span>Định dạng</span><select class="inp" id="scnFmt">${[['pdf', 'PDF (gộp ' + n + ' trang)'], ['jpg', 'JPG (mỗi trang 1 ảnh)'], ['png', 'PNG (nét nhất, nặng hơn)'], ['webp', 'WEBP (nhẹ nhất)']].map(x => `<option value="${x[0]}" ${SCN.fmt === x[0] ? 'selected' : ''}>${x[1]}</option>`).join('')}</select></label>
        <label class="field" style="min-width:150px"><span>Chất lượng</span><select class="inp" id="scnQ">${[[1600, 'Vừa (nhẹ)'], [2200, 'Cao'], [2400, 'Rất cao']].map(x => `<option value="${x[0]}" ${+SCN.q === x[0] || (!SCN.q && x[0] === 2200) ? 'selected' : ''}>${x[1]}</option>`).join('')}</select></label>
        <button class="btn pri" data-sc="dl">${ic('download')} Tải về máy</button></div>
        ${canHS ? `<div class="row" style="gap:10px;flex-wrap:wrap;align-items:flex-end;margin-top:10px"><label class="field grow" style="min-width:240px"><span>Lưu vào thư mục hồ sơ</span><select class="inp" id="scnFd">${HS.folderOpts().map(o => `<option value="${esc(o.value)}" ${(SCN.fd || '') === o.value ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select></label><button class="btn" data-sc="hs">${ic('folder')} Lưu vào Lưu trữ hồ sơ</button></div>` : ''}
        <div class="row" style="margin-top:10px"><button class="btn danger sm" data-sc="clear">${ic('trash')} Xóa hết, scan tài liệu mới</button></div></div>` : '';
    return `<div class="card scn-top"><div class="row" style="gap:10px;flex-wrap:wrap;align-items:center"><label class="btn pri scn-in">${ic('camera')} Chụp tài liệu<input type="file" accept="image/*" capture="environment" multiple data-sc-in></label><label class="btn scn-in">${ic('upload')} Chọn ảnh có sẵn<input type="file" accept="image/*" multiple data-sc-in></label>${SCN.busy ? '<span class="muted">Đang xử lý ảnh…</span>' : `<span class="muted small">${n ? n + ' trang · bấm ảnh nhỏ để chỉnh từng trang' : 'Chụp hoặc chọn một hay nhiều ảnh. Mỗi ảnh là 1 trang.'}</span>`}</div>${pages}</div>${ed}${exp}`;
  },
  bindEd() {
    const pg = SCN.P[SCN.cur], cv = $('#scnSrc'), svg = $('#scnSvg'), st = $('#scnStage'); if (!pg || !cv) return;
    const W = Math.min(st.clientWidth || 600, 900), k = W / pg.src.width; cv.width = Math.round(pg.src.width * k); cv.height = Math.round(pg.src.height * k); cv.getContext('2d').drawImage(pg.src, 0, 0, cv.width, cv.height);
    svg.setAttribute('viewBox', `0 0 ${cv.width} ${cv.height}`); svg.style.width = cv.width + 'px'; svg.style.height = cv.height + 'px';
    const draw = () => { const P = pg.q.map(([x, y]) => [x * k, y * k]); svg.innerHTML = `<polygon points="${P.map(p => p.join(',')).join(' ')}" fill="rgba(37,99,235,.15)" stroke="#2563eb" stroke-width="2"/>` + P.map((p, i) => `<circle data-h="${i}" cx="${p[0]}" cy="${p[1]}" r="13" fill="#fff" stroke="#2563eb" stroke-width="3"/>`).join(''); };
    draw(); SCN.res();
    let drag = -1;
    svg.onpointerdown = e => { const c = e.target.closest('[data-h]'); if (!c) return; drag = +c.dataset.h; svg.setPointerCapture(e.pointerId); e.preventDefault(); };
    svg.onpointermove = e => { if (drag < 0) return; const r = svg.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * cv.width / k, y = (e.clientY - r.top) / r.height * cv.height / k; pg.q[drag] = [Math.max(0, Math.min(pg.src.width, x)), Math.max(0, Math.min(pg.src.height, y))]; draw(); };
    svg.onpointerup = svg.onpointercancel = () => { if (drag < 0) return; drag = -1; pg.thumb = null; SCN.res(true); };
  },
  res(thumbs) { clearTimeout(SCN._rt); SCN._rt = setTimeout(() => { const pg = SCN.P[SCN.cur], im = $('#scnRes'); if (!pg || !im) return; im.src = SCN.out(pg, 1100).toDataURL('image/jpeg', .85); if (thumbs) { const t = document.querySelector(`.scn-pg[data-i="${SCN.cur}"] img`); if (t) t.src = SCN.thumb(pg); } }, 60); },
  keep() { const n = $('#scnName'), f = $('#scnFmt'), q = $('#scnQ'), d = $('#scnFd'); if (n) SCN.name = n.value; if (f) SCN.fmt = f.value; if (q) SCN.q = q.value; if (d) SCN.fd = d.value; },
  /* ---------- xuất ---------- */
  blob: (c, type, q) => new Promise(ok => c.toBlob(ok, type, q)),
  async pdf(max) {     // mỗi trang 1 ảnh JPEG, khổ theo tỷ lệ ảnh (chiều ngang A4)
    const enc = new TextEncoder(), parts = [], off = []; let len = 0; const put = x => { const b = typeof x === 'string' ? enc.encode(x) : x; parts.push(b); len += b.length; }, obj = (n, body) => { off[n] = len; put(`${n} 0 obj\n`); put(body); put('\nendobj\n'); };
    const imgs = []; for (const pg of SCN.P) { const c = SCN.out(pg, max), b = new Uint8Array(await (await SCN.blob(c, 'image/jpeg', .85)).arrayBuffer()); imgs.push({ w: c.width, h: c.height, d: b }); }
    const N = imgs.length; put('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'); obj(1, '<< /Type /Catalog /Pages 2 0 R >>'); obj(2, `<< /Type /Pages /Count ${N} /Kids [${imgs.map((_, i) => (3 + i * 3) + ' 0 R').join(' ')}] >>`);
    imgs.forEach((p, i) => { const pw = 595.28, ph = +(pw * p.h / p.w).toFixed(2), pg = 3 + i * 3, ct = pg + 1, im = pg + 2, c = `q ${pw} 0 0 ${ph} 0 0 cm /Im0 Do Q`;
      obj(pg, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pw} ${ph}] /Resources << /XObject << /Im0 ${im} 0 R >> >> /Contents ${ct} 0 R >>`); obj(ct, `<< /Length ${c.length} >>\nstream\n${c}\nendstream`);
      off[im] = len; put(`${im} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${p.w} /Height ${p.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.d.length} >>\nstream\n`); put(p.d); put('\nendstream\nendobj\n'); });
    const total = 3 + N * 3, xr = len; let t = `xref\n0 ${total}\n0000000000 65535 f \n`; for (let i = 1; i < total; i++) t += String(off[i]).padStart(10, '0') + ' 00000 n \n'; put(t + `trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${xr}\n%%EOF`);
    const out = new Uint8Array(len); let o = 0; parts.forEach(b => { out.set(b, o); o += b.length; }); return new Blob([out], { type: 'application/pdf' });
  },
  async files() {      // [{ blob, name, mime }]
    SCN.keep(); const base = (SCN.name || 'Scan').replace(/[\\/:*?"<>|]+/g, '-').trim() || 'Scan', fmt = SCN.fmt || 'pdf', max = +SCN.q || 2200;
    if (fmt === 'pdf') return [{ blob: await SCN.pdf(max), name: base + '.pdf', mime: 'application/pdf' }];
    const type = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }[fmt], out = [];
    for (let i = 0; i < SCN.P.length; i++) out.push({ blob: await SCN.blob(SCN.out(SCN.P[i], max), type, .88), name: base + (SCN.P.length > 1 ? ' - trang ' + (i + 1) : '') + '.' + fmt, mime: type });
    return out;
  },
  async act(a, b) {
    const i = +b.dataset.i;
    if (a === 'sel') { SCN.cur = i; return SCN.paint(); }
    if (a === 'del') { SCN.P.splice(i, 1); SCN.cur = Math.min(SCN.cur, SCN.P.length - 1); return SCN.paint(); }
    if (a === 'left') { [SCN.P[i - 1], SCN.P[i]] = [SCN.P[i], SCN.P[i - 1]]; SCN.cur = i - 1; return SCN.paint(); }
    const pg = SCN.P[SCN.cur];
    if (a === 'auto' && pg) { pg.q = SCN.detect(pg.src); pg.thumb = null; return SCN.paint(); }
    if (a === 'full' && pg) { pg.q = SCN.full(pg.src); pg.thumb = null; return SCN.paint(); }
    if (a === 'rot' && pg) { SCN.rot(pg); return SCN.paint(); }
    if (a === 'flt' && pg) { pg.f = b.dataset.f; pg.thumb = null; SCN.keep(); return SCN.paint(); }
    if (a === 'clear') { if (!await Modal.confirm('Xóa tất cả các trang đang scan?', { ok: 'Xóa', danger: true })) return; SCN.P = []; SCN.cur = -1; SCN.name = ''; return SCN.paint(); }
    if (a === 'dl' || a === 'hs') {
      if (!SCN.P.length || SCN.busy) return; SCN.busy = true; b.disabled = true; toast('Đang tạo tệp…', '', 2000);
      try {
        const F2 = await SCN.files();
        if (a === 'dl') { for (const f of F2) { download(f.blob, f.name); await new Promise(r => setTimeout(r, 350)); } toast(`Đã tải ${F2.length} tệp`, 'ok'); }
        else {
          if (!HS.google()) throw new Error('Chưa kết nối Google Drive (Management → Kho hồ sơ)');
          for (const f of F2) { const by = new Uint8Array(await f.blob.arrayBuffer()); await HS.store(HS.b64bytes(by), { folder: SCN.fd || '', ten: f.name.replace(/\.[^.]+$/, ''), tenFile: f.name, mime: f.mime, size: by.length, ghiChu: 'Scan tài liệu · ' + SCN.P.length + ' trang · ' + dvLog.fmt(dvLog.now()) + ' · ' + HS.who() }); }
          Store.changed(); toast(`Đã lưu ${F2.length} tệp vào “${esc(SCN.fd ? HS.ptxt(SCN.fd) : 'Gốc')}”`, 'ok', 5000);
        }
      } catch (e) { toast('Chưa lưu được: ' + esc(e.message || e), 'err', 6000); }
      SCN.busy = false; b.disabled = false;
    }
  }
};
document.addEventListener('click', e => { if (App.cur !== 'scan') return; const b = e.target.closest && e.target.closest('[data-sc]'); if (!b) return; e.preventDefault(); e.stopPropagation(); SCN.act(b.dataset.sc, b); });
document.addEventListener('change', e => { if (App.cur !== 'scan') return; if (e.target.matches && e.target.matches('[data-sc-in]')) { SCN.add(e.target.files); e.target.value = ''; } else if (e.target.closest && e.target.closest('.scn-ex')) SCN.keep(); });
window.addEventListener('resize', () => { if (App.cur === 'scan') { clearTimeout(SCN._rz); SCN._rz = setTimeout(() => SCN.bindEd(), 200); } });
const vSCN = {
  title: 'Scan tài liệu', label: 'Scan tài liệu', icon: 'camera', print: false, desc: 'Chụp giấy tờ bằng điện thoại: tự nhận khung, nắn phẳng, làm rõ chữ, lưu PDF / JPG / PNG / WEBP hoặc vào Lưu trữ hồ sơ',
  render(el) { el.innerHTML = '<div id="scnRoot" class="scn"></div>'; SCN.paint(); }
};
addCSS(`.scn-top{padding:14px;margin-bottom:14px}.scn-in{position:relative;overflow:hidden;cursor:pointer}.scn-in input{position:absolute;inset:0;opacity:0;cursor:pointer}.scn-in svg{width:16px;height:16px}
.scn-pages{display:flex;gap:10px;overflow-x:auto;margin-top:12px;padding-bottom:4px}.scn-pg{position:relative;flex:none;width:86px;height:112px;border:2px solid #e4e7ec;border-radius:10px;overflow:hidden;background:#f8fafc;cursor:pointer}.scn-pg.on{border-color:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,.2)}
.scn-pg img{width:100%;height:100%;object-fit:contain;display:block}.scn-pg b{position:absolute;left:4px;bottom:4px;background:#111827;color:#fff;font-size:11px;border-radius:6px;padding:0 6px}.scn-x,.scn-mv{position:absolute;top:3px;width:22px;height:22px;border-radius:50%;background:rgba(17,24,39,.75);color:#fff;display:grid;place-items:center;font-size:15px;line-height:1}.scn-x{right:3px}.scn-mv{left:3px}
.scn-ed{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px}@media(max-width:900px){.scn-ed{grid-template-columns:1fr}}.scn-col{background:#fff;border:1px solid var(--line,#e5e7eb);border-radius:12px;padding:12px;min-width:0}
.scn-h{font-weight:700;margin-bottom:8px}.scn-h small{font-weight:400;color:#667085;margin-left:6px}.scn-stage{position:relative;display:inline-block;max-width:100%;touch-action:none;background:#0f172a;border-radius:8px;overflow:hidden;width:100%}.scn-stage canvas{display:block;max-width:100%}.scn-stage svg{position:absolute;left:0;top:0;max-width:100%}.scn-stage circle{cursor:grab}
.scn-res{background:#e5e7eb;border-radius:8px;padding:8px;text-align:center}.scn-res img{max-width:100%;max-height:70vh;box-shadow:0 4px 14px rgba(0,0,0,.2);background:#fff}.scn-tools{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}.scn-ex{padding:14px}`);

/* ===== Scan tài liệu · Máy quét trong app (giống CamScanner): Đơn / Hàng loạt, tự động / thủ công, bộ nhớ đệm =====
   - Camera toàn màn hình, khung xanh tự bám mép giấy theo thời gian thực, đèn flash (nếu máy hỗ trợ).
   - Đơn: chụp 1 tấm rồi vào chỉnh ngay. Hàng loạt: chụp liên tục, ảnh vào hàng đợi, bấm "Xong" để xử lý.
   - Tự động: AI tự nhận khung + làm rõ chữ cho mọi trang. Thủ công: lần lượt duyệt từng trang, kéo góc rồi bấm "Xong trang này".
   - Bộ nhớ đệm: các trang đang scan lưu tạm trong máy (IndexedDB), tải lại trang không mất; xóa khi bấm "Xóa hết". */
Object.assign(SCN, {
  mode: (() => { try { return localStorage.getItem('scn.mode') || 'don'; } catch (e) { return 'don'; } })(),
  ai: (() => { try { return localStorage.getItem('scn.ai') || 'auto'; } catch (e) { return 'auto'; } })(),
  review: -1, Q: [], qBusy: false,
  setPref(k, v) { SCN[k] = v; try { localStorage.setItem('scn.' + k, v); } catch (e) { } },
  /* ---------- bộ nhớ đệm (IndexedDB) ---------- */
  db: null,
  idb() { if (SCN.db) return SCN.db; SCN.db = new Promise(ok => { try { const r = indexedDB.open('nhaxe-scan', 1); r.onupgradeneeded = () => r.result.createObjectStore('p'); r.onsuccess = () => ok(r.result); r.onerror = () => ok(null); } catch (e) { ok(null); } }); return SCN.db; },
  async persist() {
    const db = await SCN.idb(); if (!db) return;
    const rows = await Promise.all(SCN.P.map(async p => ({ q: p.q, f: p.f, img: p.blob || (p.blob = await SCN.blob(p.src, 'image/jpeg', .92)) })));
    try { const t = db.transaction('p', 'readwrite'); t.objectStore('p').put(rows, 'pages'); } catch (e) { }
  },
  async restore() {
    if (SCN._restored) return; SCN._restored = true; const db = await SCN.idb(); if (!db || SCN.P.length) return;
    const rows = await new Promise(ok => { try { const r = db.transaction('p').objectStore('p').get('pages'); r.onsuccess = () => ok(r.result || []); r.onerror = () => ok([]); } catch (e) { ok([]); } });
    for (const r of rows) { try { const src = await SCN.load(r.img); SCN.P.push({ src, q: r.q, f: r.f, blob: r.img }); } catch (e) { } }
    if (SCN.P.length) { SCN.cur = 0; SCN.paint(); toast(`Đã khôi phục ${SCN.P.length} trang đang scan dở`, 'ok', 3000); }
  },
  /* ---------- hàng đợi xử lý (AI nhận khung) ---------- */
  enqueue(src) { const pg = { src, q: SCN.full(src), f: SCN.ai === 'auto' ? 'magic' : 'magic', pending: true }; SCN.P.push(pg); SCN.Q.push(pg); SCN.runQ(); return pg; },
  runQ() {
    if (SCN.qBusy) return; const pg = SCN.Q.shift(); if (!pg) { SCN.persist(); return; } SCN.qBusy = true;
    setTimeout(() => { try { pg.q = SCN.detect(pg.src); } catch (e) { } pg.pending = false; pg.thumb = null; SCN.qBusy = false; SCN.camCount(); if (App.cur === 'scan' && !SCN.cam) SCN.paint(); SCN.runQ(); }, 30);
  },
  /* ---------- camera ---------- */
  cam: null,
  async camOpen() {
    if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) { const i = document.querySelector('[data-sc-in][capture]'); if (i) i.click(); return; }
    let st; try { st = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 3840 }, height: { ideal: 2160 } }, audio: false }); }
    catch (e) { toast('Không mở được camera: ' + (e && e.name === 'NotAllowedError' ? 'bạn chưa cho phép dùng camera' : esc(e.message || e)) + '. Dùng nút Chọn ảnh có sẵn thay thế.', 'err', 7000); return; }
    const w = document.createElement('div'); w.className = 'scc'; w.dataset.runtime = '1';
    w.innerHTML = `<div class="scc-top"><button type="button" data-cc="close" title="Đóng">✕</button><span class="grow"></span><button type="button" data-cc="ai" class="scc-pill"></button><button type="button" data-cc="torch" title="Đèn flash">⚡</button></div>
      <div class="scc-view"><video playsinline muted autoplay></video><canvas class="scc-ov"></canvas><div class="scc-flash"></div></div>
      <div class="scc-modes"><button type="button" data-cc="m" data-m="don">Đơn</button><button type="button" data-cc="m" data-m="loat">Hàng loạt</button></div>
      <div class="scc-bot"><label class="scc-side"><input type="file" accept="image/*" multiple data-cc-in hidden>${ic('upload')}<small>Nhập ảnh</small></label><button type="button" class="scc-shut" data-cc="shot" aria-label="Chụp"></button><button type="button" class="scc-side scc-done" data-cc="done"><span class="scc-th"></span><small>Xong</small></button></div>`;
    document.body.appendChild(w); document.body.style.overflow = 'hidden';
    const v = w.querySelector('video'); v.srcObject = st; try { await v.play(); } catch (e) { }
    SCN.cam = { w, st, v, track: st.getVideoTracks()[0], torch: false, n0: SCN.P.length, timer: null };
    SCN.camUI(); SCN.camLoop();
    w.onclick = e => { const b = e.target.closest('[data-cc]'); if (b) SCN.camAct(b.dataset.cc, b); };
    w.querySelector('[data-cc-in]').onchange = async e => { const fs = [...e.target.files]; e.target.value = ''; for (const f of fs) { try { SCN.enqueue(await SCN.load(f)); } catch (x) { } } SCN.camCount(); if (SCN.mode === 'don' && fs.length) SCN.camClose(true); };
  },
  camUI() { const c = SCN.cam; if (!c) return; c.w.querySelectorAll('[data-m]').forEach(b => b.classList.toggle('on', b.dataset.m === SCN.mode)); c.w.querySelector('[data-cc="ai"]').textContent = SCN.ai === 'auto' ? '🤖 Tự động' : '✋ Thủ công'; c.w.querySelector('[data-cc="torch"]').classList.toggle('on', c.torch); SCN.camCount(); },
  camCount() { const c = SCN.cam; if (!c) return; const n = SCN.P.length - c.n0, th = c.w.querySelector('.scc-th'), last = SCN.P[SCN.P.length - 1]; c.w.querySelector('.scc-done').style.visibility = n ? 'visible' : 'hidden'; if (th) th.innerHTML = n && last ? `<img src="${SCN.fit(last.src, 120).toDataURL('image/jpeg', .7)}"><b>${n}</b>` : ''; },
  camLoop() {   // khung xanh bám mép giấy khi đang ngắm
    const c = SCN.cam; if (!c) return; const v = c.v, ov = c.w.querySelector('.scc-ov');
    if (v.videoWidth) { const r = v.getBoundingClientRect(); ov.width = r.width; ov.height = r.height; const g = ov.getContext('2d'); g.clearRect(0, 0, ov.width, ov.height);
      try { const f = SCN.cv(v.videoWidth, v.videoHeight); f.getContext('2d').drawImage(v, 0, 0); const q = SCN.detect(SCN.fit(f, 480)), k0 = 480 / Math.max(v.videoWidth, v.videoHeight), sc = Math.min(r.width / v.videoWidth, r.height / v.videoHeight), ox = (r.width - v.videoWidth * sc) / 2, oy = (r.height - v.videoHeight * sc) / 2;
        const P = q.map(([x, y]) => [ox + x / k0 * sc, oy + y / k0 * sc]); g.beginPath(); P.forEach((p, i) => i ? g.lineTo(...p) : g.moveTo(...p)); g.closePath(); g.fillStyle = 'rgba(20,184,166,.18)'; g.fill(); g.lineWidth = 3; g.strokeStyle = '#14b8a6'; g.stroke(); } catch (e) { } }
    c.timer = setTimeout(SCN.camLoop, 450);
  },
  camShot() {
    const c = SCN.cam; if (!c || !c.v.videoWidth) return; const v = c.v, f = SCN.cv(v.videoWidth, v.videoHeight); f.getContext('2d').drawImage(v, 0, 0);
    const fl = c.w.querySelector('.scc-flash'); fl.classList.remove('go'); void fl.offsetWidth; fl.classList.add('go'); try { navigator.vibrate && navigator.vibrate(30); } catch (e) { }
    SCN.enqueue(SCN.fit(f, SCN.MAX)); SCN.camCount(); if (SCN.mode === 'don') SCN.camClose(true);
  },
  async camAct(a, b) {
    const c = SCN.cam; if (!c) return;
    if (a === 'close') return SCN.camClose(SCN.P.length > c.n0);
    if (a === 'shot') return SCN.camShot();
    if (a === 'done') return SCN.camClose(true);
    if (a === 'm') { SCN.setPref('mode', b.dataset.m); return SCN.camUI(); }
    if (a === 'ai') { SCN.setPref('ai', SCN.ai === 'auto' ? 'tay' : 'auto'); toast(SCN.ai === 'auto' ? 'Tự động: AI tự nhận khung và làm rõ chữ' : 'Thủ công: xong sẽ duyệt và chỉnh từng trang', 'ok', 2500); return SCN.camUI(); }
    if (a === 'torch') { try { c.torch = !c.torch; await c.track.applyConstraints({ advanced: [{ torch: c.torch }] }); } catch (e) { c.torch = false; toast('Máy này không bật được đèn flash từ trình duyệt', 'err', 3000); } return SCN.camUI(); }
  },
  camClose(go) {
    const c = SCN.cam; if (!c) return; clearTimeout(c.timer); try { c.st.getTracks().forEach(t => t.stop()); } catch (e) { } c.w.remove(); document.body.style.overflow = ''; SCN.cam = null;
    if (go && SCN.P.length > c.n0) { SCN.cur = c.n0; SCN.review = SCN.ai === 'tay' ? c.n0 : -1; }
    SCN.paint(); SCN.persist();
  }
});
/* giao diện: thêm nút máy quét, công tắc Đơn/Hàng loạt + Tự động/Thủ công, thanh duyệt thủ công */
{
  const h0 = SCN.html;
  SCN.html = function () {
    let s = h0.apply(this, arguments);
    const sw = `<div class="scn-sw"><span>Chế độ:</span><button type="button" class="btn sm ${SCN.mode === 'don' ? 'pri' : ''}" data-sc="mode" data-v="don">Đơn</button><button type="button" class="btn sm ${SCN.mode === 'loat' ? 'pri' : ''}" data-sc="mode" data-v="loat">Hàng loạt</button><span style="margin-left:8px">Xử lý:</span><button type="button" class="btn sm ${SCN.ai === 'auto' ? 'pri' : ''}" data-sc="ai" data-v="auto">🤖 Tự động</button><button type="button" class="btn sm ${SCN.ai === 'tay' ? 'pri' : ''}" data-sc="ai" data-v="tay">✋ Thủ công</button></div>`;
    s = s.replace('<label class="btn pri scn-in">', `<button type="button" class="btn pri" data-sc="cam">${ic('camera')} Mở máy quét</button><label class="btn scn-in">`).replace('</div>', '</div>' + sw);
    const n = SCN.P.length, pend = SCN.P.filter(p => p.pending).length;
    if (pend) s = s.replace('<div class="scn-pages">', `<div class="small" style="margin-top:8px;color:#0f766e">⏳ AI đang xử lý ${pend} trang trong hàng đợi…</div><div class="scn-pages">`);
    if (SCN.review >= 0 && SCN.review < n) s = s.replace('<div class="scn-ed">', `<div class="scn-rv"><span>✋ Duyệt thủ công: trang <b>${SCN.cur + 1}/${n}</b>. Kéo 4 góc cho khớp, chọn kiểu làm rõ rồi bấm</span><button type="button" class="btn pri sm" data-sc="next">${SCN.cur + 1 < n ? 'Xong trang này → trang ' + (SCN.cur + 2) : '✓ Xong tất cả'}</button></div><div class="scn-ed">`);
    return s;
  };
  const a0 = SCN.act;
  SCN.act = async function (a, b) {
    if (a === 'cam') return SCN.camOpen();
    if (a === 'mode') { SCN.setPref('mode', b.dataset.v); return SCN.paint(); }
    if (a === 'ai') { SCN.setPref('ai', b.dataset.v); return SCN.paint(); }
    if (a === 'next') { if (SCN.cur + 1 < SCN.P.length) { SCN.cur++; SCN.review = SCN.cur; } else { SCN.review = -1; toast('Đã duyệt xong, chọn định dạng rồi lưu', 'ok'); } SCN.persist(); return SCN.paint(); }
    const r = await a0.apply(this, arguments);
    if (['del', 'left', 'auto', 'full', 'rot', 'flt'].includes(a)) { const pg = SCN.P[SCN.cur]; if (pg && a !== 'del' && a !== 'left') pg.blob = a === 'rot' ? null : pg.blob; SCN.persist(); }
    if (a === 'clear' && !SCN.P.length) { SCN.review = -1; SCN.persist(); }
    return r;
  };
  const ad0 = SCN.add;   // chọn ảnh có sẵn cũng đi qua hàng đợi AI
  SCN.add = async function (files) { files = [...(files || [])]; const n0 = SCN.P.length; for (const f of files) { try { SCN.enqueue(await SCN.load(f)); } catch (e) { toast('Không đọc được ảnh ' + esc(f.name || ''), 'err'); } } if (SCN.P.length > n0) { SCN.cur = n0; SCN.review = SCN.ai === 'tay' ? n0 : -1; } SCN.paint(); };
  const bd0 = SCN.bindEd; SCN.bindEd = function () { const r = bd0.apply(this, arguments); const pg = SCN.P[SCN.cur]; const svg = $('#scnSvg'); if (svg && pg) { const up = svg.onpointerup; svg.onpointerup = svg.onpointercancel = e => { up && up(e); SCN.persist(); }; } return r; };
  const r0 = vSCN.render; vSCN.render = function (el) { r0.apply(this, arguments); SCN.restore(); };
}
addCSS(`.scn-sw{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-top:10px;font-size:13px;color:#475467}.scn-rv{background:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;padding:10px 14px;margin-bottom:12px;color:#065f46;display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.scc{position:fixed;inset:0;z-index:600;background:#000;display:flex;flex-direction:column;color:#fff;user-select:none}.scc button{font:inherit;color:#fff;background:none;border:0;cursor:pointer}
.scc-top{display:flex;align-items:center;gap:14px;padding:12px 16px}.scc-top>button{font-size:22px;width:40px;height:40px;border-radius:50%}.scc-top>button.on{background:#facc15;color:#000}.scc-top .scc-pill{font-size:13px;width:auto;padding:0 12px;height:32px;border-radius:16px;background:rgba(255,255,255,.15)}
.scc-view{position:relative;flex:1;min-height:0;overflow:hidden}.scc-view video{width:100%;height:100%;object-fit:contain;display:block;background:#000}.scc-ov{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.scc-flash{position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none}.scc-flash.go{animation:sccf .35s ease-out}@keyframes sccf{0%{opacity:.85}100%{opacity:0}}
.scc-modes{display:flex;justify-content:center;gap:6px;padding:10px 0 4px}.scc-modes button{padding:6px 16px;border-radius:18px;font-size:15px;color:#cbd5e1}.scc-modes button.on{color:#2dd4bf;background:rgba(45,212,191,.12);font-weight:700}
.scc-bot{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:12px 24px 22px}.scc-side{display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;justify-self:center;color:#fff}.scc-side svg{width:26px;height:26px;stroke:#fff}.scc-side small{font-size:12px}
.scc-shut{width:76px;height:76px;border-radius:50%;border:5px solid #14b8a6!important;background:#fff!important;box-shadow:0 0 0 4px #000 inset}.scc-shut:active{transform:scale(.94)}
.scc-th{position:relative;width:46px;height:46px;border-radius:8px;overflow:hidden;border:2px solid #fff;display:block}.scc-th img{width:100%;height:100%;object-fit:cover}.scc-th b{position:absolute;right:2px;bottom:2px;background:#14b8a6;color:#fff;border-radius:9px;font-size:11px;padding:0 5px}`);

/* ===== AI cho máy quét: dò 4 góc tờ giấy (khi có khóa AI) + đọc nội dung tài liệu ===== */
Object.assign(SCN, {
  AIQ: 'Ảnh chụp một tờ giấy/tài liệu đặt trên mặt bàn hoặc nền khác. Hãy tìm 4 GÓC MÉP NGOÀI của tờ giấy (mép giấy thật, không lấy khung kẻ bên trong, không lấy mép bàn). Tọa độ theo thang 0-1000: x tính theo chiều ngang ảnh (0 = trái, 1000 = phải), y theo chiều dọc (0 = trên, 1000 = dưới). Góc nằm ngoài ảnh thì lấy điểm trên mép ảnh gần nhất. Chỉ trả về JSON: {"tl":{"x":0,"y":0},"tr":{"x":0,"y":0},"br":{"x":0,"y":0},"bl":{"x":0,"y":0}}',
  quadOk(Q, w, h) {
    if (!Q || Q.length !== 4 || Q.some(p => !p || !isFinite(p[0]) || !isFinite(p[1]))) return false;
    let a = 0, sg = 0; for (let i = 0; i < 4; i++) { const [x1, y1] = Q[i], [x2, y2] = Q[(i + 1) % 4], [x3, y3] = Q[(i + 2) % 4], cr = (x2 - x1) * (y3 - y2) - (y2 - y1) * (x3 - x2); if (!sg) sg = Math.sign(cr); else if (Math.sign(cr) !== sg) return false; a += x1 * y2 - x2 * y1; }
    return Math.abs(a) / 2 > w * h * 0.12;
  },
  async aiQuad(pg, force) {
    if (!(typeof AIX !== 'undefined' && AIX.ok())) { if (force) toast('Chưa có khóa AI (Cài đặt → AI) nên dùng cách tự nhận khung trên máy', 'err', 5000); return false; }
    try {
      const sm = SCN.fit(pg.src, 1024), blob = await SCN.blob(sm, 'image/jpeg', .85), W = pg.src.width, H = pg.src.height;
      const toQ = v => ['tl', 'tr', 'br', 'bl'].map(k => { const o = v && v[k]; return o ? [Math.max(0, Math.min(W, +o.x / 1000 * W)), Math.max(0, Math.min(H, +o.y / 1000 * H))] : null; });
      const v = await AIX.race(SCN.AIQ, { images: [blob] }, x => SCN.quadOk(toQ(x), W, H), force ? 20000 : 15000);
      if (pg.touched && !force) return false; pg.q = SCN.refine(pg.src, toQ(v)); pg.ai = AIX.lastBy || 'AI'; pg.thumb = null; return true;
    } catch (e) { if (force) toast('AI chưa dò được khung: ' + esc(e.message || e), 'err', 5000); return false; }
  },
  AIR: `Đọc tài liệu trong ảnh (tiếng Việt, có chữ viết tay). Trả về JSON:
{"loai":"Lệnh vận chuyển | Hợp đồng vận chuyển | Hóa đơn | Phiếu thu/chi | Giấy tờ xe | Giấy tờ cá nhân | Khác","tieuDe":"","soVanBan":"","ngay":"YYYY-MM-DD","tomTat":"1-2 câu",
"truong":[{"ten":"tên mục","giaTri":"giá trị đọc được"}],
"lenh":{"so":"","tuNgay":"YYYY-MM-DD","denNgay":"YYYY-MM-DD","laiXe1":"","hangGPLX1":"","laiXe2":"","bienSo":"","soGhe":"","tuyen":"","maTuyen":"","cuLy":"","di":{"ben":"","gioXuat":"HH:MM","ngayXuat":"YYYY-MM-DD","gioDen":"HH:MM","ngayDen":"YYYY-MM-DD","soKhach":""},"ve":{"ben":"","gioXuat":"HH:MM","ngayXuat":"YYYY-MM-DD","gioDen":"HH:MM","ngayDen":"YYYY-MM-DD","soKhach":""}}}
"lenh" chỉ điền khi là Lệnh vận chuyển. Năm viết tắt (vd 26) là 2026. Không đoán: chỗ không đọc được để trống. "truong" liệt kê đủ các thông tin quan trọng đọc được.`,
  async aiRead() {
    const pg = SCN.P[SCN.cur]; if (!pg) return;
    if (!(typeof AIX !== 'undefined' && AIX.ok())) return toast('Chưa có khóa AI (Cài đặt → AI) nên chưa đọc được nội dung', 'err', 5000);
    const m = Modal.open({ title: '🤖 AI đọc nội dung tài liệu', width: 720, body: '<div class="muted" style="padding:20px;text-align:center">⏳ AI đang đọc trang ' + (SCN.cur + 1) + '…</div>', foot: '<button class="btn" data-cancel>Đóng</button>' });
    m.el.querySelector('[data-cancel]').onclick = () => m.close();
    let v; try { const c = SCN.out(pg, 1800), blob = await SCN.blob(c, 'image/jpeg', .9); v = await AIX.race(SCN.AIR, { images: [blob] }, x => x && typeof x === 'object' && (x.loai || (x.truong || []).length), 30000); }
    catch (e) { m.body.innerHTML = `<div style="padding:16px;color:#b91c1c">AI chưa đọc được: ${esc(e.message || e)}</div>`; return; }
    pg.doc = v; SCN.showDoc(m, v);
  },
  docName(v) { const L = v.lenh || {}, d = (L.tuNgay || v.ngay || '').split('-').reverse().join('-'); return [v.loai || 'Tài liệu', L.so || v.soVanBan, L.bienSo, d].filter(Boolean).join(' ').replace(/[\\/:*?"<>|]+/g, '-'); },
  docPath(v) { const d = (v.lenh && v.lenh.tuNgay) || v.ngay || D.today(), y = d.slice(0, 4), mm = d.slice(5, 7), loai = /lệnh/i.test(v.loai || '') ? 'Lệnh vận chuyển' : /hợp đồng/i.test(v.loai || '') ? 'Hợp đồng vận chuyển' : ''; return loai ? [y, '08. Điều hành xe', loai, 'Tháng ' + mm + '-' + y] : null; },
  tripOf(v) {
    const L = v.lenh || {}, nb = x => String(x || '').toUpperCase().replace(/[^A-Z0-9]/g, ''), b = nb(L.bienSo); if (!b) return { xe: null, T: [] };
    const xe = (DB.vehicles || []).find(x => nb(x.bks) && (nb(x.bks) === b || nb(x.bks).endsWith(b.slice(-5)))) || null; if (!xe) return { xe: null, T: [] };
    const days = [L.di && L.di.ngayXuat, L.ve && L.ve.ngayXuat, L.tuNgay].filter(x => /^\d{4}-\d{2}-\d{2}$/.test(x || ''));
    return { xe, T: (DB.lichchay || []).filter(l => l.xeId === xe.id && days.includes(l.ngay)).sort((a, c) => (a.ngay + a.gio).localeCompare(c.ngay + c.gio)) };
  },
  showDoc(m, v) {
    const L = v.lenh || null, r = (k, x) => x ? `<tr><td>${esc(k)}</td><td><b>${esc(x)}</b></td></tr>` : '', dt = x => /^\d{4}-\d{2}-\d{2}$/.test(x || '') ? F.date(x) : (x || '');
    const leg = (t, o) => o && (o.gioXuat || o.gioDen) ? r(t, `${o.ben || ''}${o.gioXuat ? ' · xuất ' + o.gioXuat + ' ' + dt(o.ngayXuat) : ''}${o.gioDen ? ' · đến ' + o.gioDen + ' ' + dt(o.ngayDen) : ''}${o.soKhach ? ' · ' + o.soKhach + ' khách' : ''}`) : '';
    const M = L ? SCN.tripOf(v) : { xe: null, T: [] }, path = SCN.docPath(v);
    m.body.innerHTML = `<div class="scr"><div class="scr-h"><span class="badge b-blue">${esc(v.loai || 'Tài liệu')}</span><b>${esc(v.tieuDe || '')}</b><span class="muted small">đọc bởi ${esc(AIX.lastBy || 'AI')}</span></div>${v.tomTat ? `<div class="scr-s">${esc(v.tomTat)}</div>` : ''}
      <table class="scr-t">${L ? r('Số lệnh', L.so) + r('Hiệu lực', [dt(L.tuNgay), dt(L.denNgay)].filter(Boolean).join(' → ')) + r('Lái xe 1', [L.laiXe1, L.hangGPLX1 && 'GPLX hạng ' + L.hangGPLX1].filter(Boolean).join(' · ')) + r('Lái xe 2', L.laiXe2) + r('Biển số', L.bienSo) + r('Số ghế', L.soGhe) + r('Tuyến', [L.tuyen, L.maTuyen && 'mã ' + L.maTuyen, L.cuLy && L.cuLy].filter(Boolean).join(' · ')) + leg('Lượt đi', L.di) + leg('Lượt về', L.ve) : r('Số', v.soVanBan) + r('Ngày', dt(v.ngay))}
      ${(v.truong || []).filter(x => x && x.ten && x.giaTri).map(x => r(x.ten, x.giaTri)).join('')}</table>
      ${L ? `<div class="scr-m">${M.xe ? `Xe <b>${esc(M.xe.bks)}</b>: ${M.T.length ? M.T.map(t => `<span class="badge b-gray">${esc(t.gio)} ${F.date(t.ngay)} · ${esc(t.tuyen)}</span>`).join(' ') : 'chưa có chuyến trong Lịch chạy những ngày này'}` : 'Không tìm thấy xe có biển số này trong Phương tiện'}</div>` : ''}
      <div class="scr-b"><button type="button" class="btn sm pri" data-r="name">Đặt tên tài liệu: “${esc(SCN.docName(v))}”</button>${path && Auth.can('hoso', 'add') ? `<button type="button" class="btn sm" data-r="fd">Chọn thư mục: ${esc(path.slice(1).join(' / '))}</button>` : ''}<button type="button" class="btn sm" data-r="copy">Sao chép nội dung</button></div></div>`;
    m.body.onclick = async e => { const b = e.target.closest('[data-r]'); if (!b) return;
      if (b.dataset.r === 'name') { SCN.name = SCN.docName(v); const n = $('#scnName'); if (n) n.value = SCN.name; toast('Đã đặt tên tài liệu', 'ok'); }
      if (b.dataset.r === 'fd') { SCN.fd = HS.ensure(path); Store.changed(); SCN.paint(); toast('Đã chọn thư mục ' + esc(HS.ptxt(SCN.fd)), 'ok'); }
      if (b.dataset.r === 'copy') { const t = [...m.body.querySelectorAll('.scr-t tr')].map(tr => [...tr.cells].map(c => c.textContent).join(': ')).join('\n'); try { await navigator.clipboard.writeText((v.loai || '') + '\n' + t); toast('Đã sao chép', 'ok'); } catch (x) { toast('Không sao chép được', 'err'); } } };
  }
});

/* ===== Tinh chỉnh khung theo mép giấy thật: từ khung thô (AI hoặc tự nhận), dò dọc từng cạnh chỗ đổi từ giấy sáng sang nền tối,
   khớp đường thẳng (bỏ điểm nhiễu) rồi lấy giao điểm làm 4 góc. Cạnh nằm ngoài ảnh (giấy bị cắt) thì giữ nguyên. */
SCN.refine = function (src, Q) {
  try {
    const s = SCN.fit(src, 900), w = s.width, h = s.height, k = src.width / w, d = s.getContext('2d').getImageData(0, 0, w, h).data, g = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) g[i] = d[i * 4] * 0.299 + d[i * 4 + 1] * 0.587 + d[i * 4 + 2] * 0.114;
    const at = (x, y) => { x = Math.round(x); y = Math.round(y); return x < 0 || y < 0 || x >= w || y >= h ? NaN : g[y * w + x]; };
    const P = Q.map(([x, y]) => [x / k, y / k]), cx = P.reduce((a, p) => a + p[0], 0) / 4, cy = P.reduce((a, p) => a + p[1], 0) / 4, R = Math.round(Math.min(w, h) * 0.09), WIN = Math.max(4, Math.round(Math.min(w, h) * 0.012));
    const lines = [];
    for (let e = 0; e < 4; e++) {
      const A = P[e], B = P[(e + 1) % 4], dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1; let nx = -dy / L, ny = dx / L;
      const mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2; if ((mx - cx) * nx + (my - cy) * ny < 0) { nx = -nx; ny = -ny; }   // pháp tuyến hướng ra ngoài
      const pts = [];
      for (let t = 0.06; t <= 0.94; t += 0.02) {
        const px = A[0] + dx * t, py = A[1] + dy * t; let best = 0, bd = null;
        for (let o = -R; o <= R; o++) {
          let si = 0, so = 0, ni = 0, no = 0;
          for (let j = 1; j <= WIN; j++) { const vi = at(px + nx * (o - j - 1), py + ny * (o - j - 1)), vo = at(px + nx * (o + j + 1), py + ny * (o + j + 1)); if (!isNaN(vi)) { si += vi; ni++; } if (!isNaN(vo)) { so += vo; no++; } }
          if (ni < WIN * 0.8 || no < WIN * 0.8) continue;
          const sc = si / ni - so / no; if (sc > best) { best = sc; bd = o; }
        }
        if (bd !== null && best > 14) pts.push([px + nx * bd, py + ny * bd]);
      }
      if (pts.length < 10) { lines.push(null); continue; }
      let use = pts, ln = null;
      for (let it = 0; it < 3; it++) {   // khớp đường thẳng (tổng bình phương nhỏ nhất theo hướng chính), bỏ điểm lệch
        const n = use.length, ax = use.reduce((a, p) => a + p[0], 0) / n, ay = use.reduce((a, p) => a + p[1], 0) / n; let sxx = 0, sxy = 0, syy = 0;
        use.forEach(([x, y]) => { sxx += (x - ax) ** 2; sxy += (x - ax) * (y - ay); syy += (y - ay) ** 2; });
        const th = 0.5 * Math.atan2(2 * sxy, sxx - syy), ux = Math.cos(th), uy = Math.sin(th); ln = { ax, ay, ux, uy };
        const res = use.map(([x, y]) => Math.abs(-(x - ax) * uy + (y - ay) * ux)), med = res.slice().sort((a, b) => a - b)[res.length >> 1] || 0;
        const nu = use.filter((p, i) => res[i] <= Math.max(1.5, med * 2.5)); if (nu.length < 8 || nu.length === use.length) break; use = nu;
      }
      lines.push(use.length >= pts.length * 0.45 ? ln : null);
    }
    const lineOf = e => lines[e] || (() => { const A = P[e], B = P[(e + 1) % 4], L = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1; return { ax: A[0], ay: A[1], ux: (B[0] - A[0]) / L, uy: (B[1] - A[1]) / L }; })();
    const X = (a, b) => { const den = a.ux * b.uy - a.uy * b.ux; if (Math.abs(den) < 1e-6) return null; const t = ((b.ax - a.ax) * b.uy - (b.ay - a.ay) * b.ux) / den; return [a.ax + a.ux * t, a.ay + a.uy * t]; };
    // góc i là giao của cạnh (i-1) và cạnh i
    const N = [0, 1, 2, 3].map(i => X(lineOf((i + 3) % 4), lineOf(i)));
    if (N.some(p => !p)) return Q;
    const out = N.map(([x, y]) => [Math.max(-w * 0.02, Math.min(w * 1.02, x)) * k, Math.max(-h * 0.02, Math.min(h * 1.02, y)) * k]).map(([x, y]) => [Math.max(0, Math.min(src.width, x)), Math.max(0, Math.min(src.height, y))]);
    const moved = Math.max(...out.map((p, i) => Math.hypot(p[0] - Q[i][0], p[1] - Q[i][1])));
    return SCN.quadOk(out, src.width, src.height) && moved < Math.max(src.width, src.height) * 0.2 ? out : Q;
  } catch (e) { return Q; }
};
{ const dt0 = SCN.detect; SCN.detect = function (src) { const q = dt0.apply(this, arguments); return src && src.width > 500 ? SCN.refine(src, q) : q; }; }
{
  const rq0 = SCN.runQ;   // sau khi tự nhận khung trên máy, AI dò lại 4 góc cho chuẩn (chạy nền, người dùng đã kéo góc thì giữ nguyên)
  SCN.runQ = function () { const pg = SCN.qBusy ? null : SCN.Q[0]; const r = rq0.apply(this, arguments); if (pg && typeof AIX !== 'undefined' && AIX.ok()) SCN.aiQuad(pg).then(ok => { if (ok) { SCN.persist(); if (App.cur === 'scan' && !SCN.cam) { if (SCN.P[SCN.cur] === pg) SCN.paint(); else { const i = SCN.P.indexOf(pg), t = document.querySelector(`.scn-pg[data-i="${i}"] img`); if (t) t.src = SCN.thumb(pg); } } } }); return r; };
  const h1 = SCN.html;
  SCN.html = function () { let s = h1.apply(this, arguments); const pg = SCN.P[SCN.cur]; if (!pg) return s;
    s = s.replace(`<button class="btn sm" data-sc="auto">`, `<button class="btn sm pri" data-sc="aiq" title="Dùng AI tìm đúng 4 góc tờ giấy">🤖 AI dò khung</button><button class="btn sm" data-sc="auto">`);
    s = s.replace('<small>kéo 4 góc tròn cho khớp mép giấy</small>', `<small>kéo 4 góc tròn cho khớp mép giấy${pg.ai ? ' · <b style="color:#0f766e">AI đã dò khung</b>' : ''}</small>`);
    s = s.replace('<div class="scn-res">', `<div class="scn-res">`).replace(/(data-sc="flt" data-f="bw">[^<]*<\/button>)/, `$1<button class="btn sm scn-air" data-sc="air">🤖 AI đọc nội dung</button>`);
    return s; };
  const a1 = SCN.act;
  SCN.act = async function (a, b) {
    if (a === 'aiq') { const pg = SCN.P[SCN.cur]; if (!pg) return; b.disabled = true; b.textContent = '⏳ AI đang dò…'; const ok = await SCN.aiQuad(pg, true); if (ok) { pg.touched = false; SCN.persist(); toast('AI đã dò khung giấy', 'ok', 2000); } SCN.paint(); return; }
    if (a === 'air') return SCN.aiRead();
    if (a === 'auto' || a === 'full') { const pg = SCN.P[SCN.cur]; if (pg) pg.ai = ''; }
    return a1.apply(this, arguments);
  };
  const bd1 = SCN.bindEd; SCN.bindEd = function () { const r = bd1.apply(this, arguments); const pg = SCN.P[SCN.cur], svg = $('#scnSvg'); if (svg && pg) { const d0 = svg.onpointerdown; svg.onpointerdown = e => { if (e.target.closest('[data-h]')) { pg.touched = true; pg.ai = ''; } d0 && d0(e); }; } return r; };
}
addCSS(`.scn-air{background:#0f766e!important;border-color:#0f766e!important;color:#fff!important}.scr{display:flex;flex-direction:column;gap:10px}.scr-h{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.scr-h .muted{margin-left:auto}.scr-s{color:#344054;font-size:13.5px}
.scr-t{width:100%;border-collapse:collapse;font-size:13px}.scr-t td{border-top:1px solid #eef0f5;padding:6px 8px;vertical-align:top}.scr-t td:first-child{color:#667085;width:34%;white-space:nowrap}.scr-m{background:#f8fafc;border:1px solid #e4e7ec;border-radius:8px;padding:8px 10px;font-size:13px;line-height:1.8}.scr-b{display:flex;gap:6px;flex-wrap:wrap}`);
MODL.def('scan', vSCN);
