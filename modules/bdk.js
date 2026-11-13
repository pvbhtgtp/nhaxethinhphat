'use strict';
/* Module Bảng điều khiển Admin · thẻ (widget) tự sắp xếp, ẩn hiện, đổi cỡ, nhiều bố cục, màu / chữ / độ dày tùy chọn.
   Bố cục và giao diện lưu ở DB.settings.adBoard (máy chủ) → đăng nhập máy nào cũng giống nhau. Điện thoại 1 cột, tablet 2 cột, máy tính 3–4 cột. */
const BDK = {
  edit: false,
  W: {
    homnay: { t: 'Hôm nay', ic: 'kanban' }, canhbao: { t: 'Cảnh báo', ic: 'alert' }, duyet: { t: 'Duyệt nhanh', ic: 'check' },
    dieuhanh: { t: 'Điều hành hôm nay', ic: 'bus' }, taichinh: { t: 'Tài chính tháng', ic: 'wallet' }, doixe: { t: 'Đội xe & lái xe', ic: 'bus' }, hethong: { t: 'Hệ thống', ic: 'shield' }
  },
  DEF: [['homnay', 'm'], ['canhbao', 'm'], ['duyet', 'm'], ['dieuhanh', 'l'], ['taichinh', 'm'], ['doixe', 's'], ['hethong', 's']],
  cfg() {
    const s = DB.settings; if (!s.adBoard) s.adBoard = {};
    const b = s.adBoard; if (!b.layouts || !Object.keys(b.layouts).length) b.layouts = { 'Mặc định': BDK.DEF.map(([id, z]) => ({ id, z })) };
    if (!b.cur || !b.layouts[b.cur]) b.cur = Object.keys(b.layouts)[0];
    b.th = b.th || {}; Object.entries({ ac: '', dark: false, fs: 100, dense: false }).forEach(([k, v]) => { if (b.th[k] === undefined) b.th[k] = v; }); return b;   // điền mặc định tại chỗ, không thay đối tượng
  },
  L() { const b = BDK.cfg(); return b.layouts[b.cur]; },
  save() { App.changed(); App.render(); },
  /* ---------- dữ liệu ---------- */
  td: () => D.today(),
  trips: d => (DB.lichchay || []).filter(l => l.ngay === d),
  emp: id => (DB.employees || []).find(e => e.id === id) || {},
  veh: id => (DB.vehicles || []).find(v => v.id === id) || {},
  m: n => F.money(Math.round(+n || 0)),
  kpi: (lb, v, tone, go) => `<div class="bdk-k ${tone || ''}"${go ? ` data-go="${go}"` : ''}><b>${v}</b><span>${lb}</span></div>`,
  homnay() {
    const T = BDK.trips(BDK.td()); let ve = 0, dt = 0, chua = 0;
    T.forEach(l => dvBook(l.id).forEach(b => { ve++; const t = dvTot(b); dt += t; if (b.tt !== 'tra') chua += Math.max(0, t - (+b.coc || 0)); }));
    const thieu = T.filter(l => !l.laiXe || !l.xeId).length;
    return `<div class="bdk-ks">${BDK.kpi('Chuyến', T.length, '', 'dieuhanh')}${BDK.kpi('Thiếu lái xe / xe', thieu, thieu ? 'bad' : 'ok', 'dieuhanh')}${BDK.kpi('Vé đã bán', ve, '', 'lichchay')}${BDK.kpi('Doanh thu vé', BDK.m(dt), '')}${BDK.kpi('Chưa thu', BDK.m(chua), chua ? 'warn' : 'ok')}</div>`;
  },
  canhbao() {
    const td = BDK.td(), lim = D.add(td, 30), W = [];
    (DB.vehicles || []).filter(v => !v.ngung).forEach(v => [['Đăng kiểm', v.hhDangKiem], ['BHDS', v.hhBHDS], ['BHVC', v.hhBHVC], ['Phù hiệu', v.hhPhuHieu]].forEach(([n, h]) => { if (h && h <= lim) W.push([h < td ? 'bad' : 'warn', `Xe ${v.bks}: ${n} ${h < td ? 'đã hết hạn' : 'hết hạn'} ${F.date(h)}`, 'phuongtien']); }));
    (DB.employees || []).filter(e => e.trangThai !== 'Nghỉ việc' && e.bangHetHan && e.bangHetHan <= lim).forEach(e => W.push([e.bangHetHan < td ? 'bad' : 'warn', `${e.ten}: GPLX ${e.bangHetHan < td ? 'đã hết hạn' : 'hết hạn'} ${F.date(e.bangHetHan)}`, 'nhanvien']));
    try { const n = BDK.trips(td).filter(l => XC.of(l).length).length; if (n) W.push(['warn', `${n} chuyến hôm nay chạy chéo tuyến`, 'dieuhanh']); } catch (e) { }
    const pa = (DB.phanAnh || []).filter(r => r.tt !== 'xong' && r.ngay && D.diff(td, r.ngay) > 3).length; if (pa) W.push(['bad', `${pa} phản ánh quá 3 ngày chưa xử lý xong`, 'phananh']);
    try { if (SYS.L.length) W.push(['warn', `${SYS.L.length} lỗi hệ thống cần xem`, '']); } catch (e) { }
    W.sort((a, b) => (a[0] === 'bad' ? 0 : 1) - (b[0] === 'bad' ? 0 : 1));
    return W.length ? `<ul class="bdk-ul">${W.slice(0, 12).map(([c, t, g]) => `<li class="${c}"${g ? ` data-go="${g}"` : ''}>${esc(t)}</li>`).join('')}${W.length > 12 ? `<li class="muted">+ ${W.length - 12} cảnh báo khác</li>` : ''}</ul>` : '<div class="bdk-ok">Không có cảnh báo</div>';
  },
  duyet() {
    const L = (DB.phanAnh || []).filter(r => r.tt === 'moi').sort((a, b) => String(b.ngay + b.gio).localeCompare(String(a.ngay + a.gio)));
    return L.length ? `<ul class="bdk-ul">${L.slice(0, 6).map(r => `<li class="warn"><div class="grow"><b>${esc(r.loai || '')}</b> · ${F.date(r.ngay)} ${esc(r.gio || '')}<div class="small muted">${esc(String(r.noiDung || '').slice(0, 120))}</div></div><button class="btn sm" data-pa="${esc(r.id)}">Nhận xử lý</button></li>`).join('')}</ul>${L.length > 6 ? `<div class="small muted" data-go="phananh">+ ${L.length - 6} mục khác</div>` : ''}` : '<div class="bdk-ok">Không có mục chờ duyệt</div>';
  },
  dieuhanh() {
    const T = BDK.trips(BDK.td()).sort((a, b) => String(a.gio).localeCompare(String(b.gio)));
    if (!T.length) return '<div class="bdk-ok muted">Chưa có chuyến hôm nay</div>';
    return `<div class="bdk-dh">${T.map(l => { const v = BDK.veh(l.xeId), e = BDK.emp(l.laiXe), n = dvBook(l.id).length; let x = false; try { x = XC.of(l).length > 0; } catch (z) { }
      return `<div class="bdk-tr${!l.laiXe || !l.xeId ? ' miss' : ''}${x ? ' xc' : ''}" data-go="dieuhanh"><b>${esc(l.gio || '')}</b><span>${esc(l.tuyen || '')}</span><span>${esc(v.bks || 'Chưa gán xe')}</span><span>${esc(e.ten || 'Chưa gán lái xe')}</span><span class="n">${n} vé</span></div>`; }).join('')}</div>`;
  },
  taichinh() {
    const ym = BDK.td().slice(0, 7); let dt = 0; (DB.lichchay || []).filter(l => String(l.ngay).startsWith(ym)).forEach(l => dvBook(l.id).forEach(b => { dt += dvTot(b); }));
    const nl = (DB.nhienlieu || []).filter(r => r.loai !== 'nhap' && String(r.ngay).startsWith(ym)).reduce((a, r) => a + (+r.lit || 0) * (+r.gia || 0), 0);
    const sc = (DB.suachua || []).filter(p => String(p.ngay).startsWith(ym)).reduce((a, p) => a + (typeof scTong === 'function' ? scTong(p) : 0), 0);
    const mx = Math.max(dt, nl, sc, 1), bar = (n, v, c) => `<div class="bdk-bar"><span>${n}</span><i style="width:${Math.max(2, v / mx * 100)}%;background:${c}"></i><b>${BDK.m(v)}</b></div>`;
    return `<div class="small muted" style="margin-bottom:6px">${F.month(ym)}</div>${bar('Doanh thu vé', dt, 'var(--p)')}${bar('Nhiên liệu', nl, '#f59e0b')}${bar('Sửa chữa', sc, '#ef4444')}`;
  },
  doixe() {
    const td = BDK.td(), T = BDK.trips(td), X = (DB.vehicles || []).filter(v => !v.ngung), xc = new Set(T.map(l => l.xeId).filter(Boolean)), lx = new Set(T.map(l => l.laiXe).filter(Boolean)), ym = td.slice(0, 7);
    const km = (DB.kmxe || []).filter(r => String(r.ngay).startsWith(ym)).reduce((a, r) => a + (+r.km || 0), 0);
    return `<div class="bdk-ks">${BDK.kpi('Xe chạy hôm nay', xc.size + '/' + X.length, '', 'phuongtien')}${BDK.kpi('Xe rảnh', X.length - xc.size, '')}${BDK.kpi('Lái xe đang chạy', lx.size, '')}${BDK.kpi('Km tháng (GPS)', BDK.m(km), '', 'kmxe')}</div>`;
  },
  hethong() {
    const ok = (b, t, f) => `<li class="${b ? 'ok' : 'bad'}">${b ? t : f}</li>`; let L = '';
    try { L += ok(GS.on, 'Đã kết nối máy chủ dữ liệu', 'Chưa kết nối máy chủ dữ liệu'); } catch (e) { }
    try { L += ok(TK.live, 'Đồng bộ thời gian thực đang chạy', 'Đồng bộ thời gian thực chưa chạy'); } catch (e) { }
    
    try { L += ok(!Store.dirty, 'Mọi thay đổi đã lưu', 'Đang có thay đổi chờ lưu'); } catch (e) { }
    try { L += ok(!SYS.L.length, 'Không có lỗi', SYS.L.length + ' lỗi trong Tình trạng hệ thống'); } catch (e) { }
    try { const on = TK.lcUse(); L += `<li class="${on ? (TK.off.has('c') ? 'bad' : 'ok') : ''}">Lịch chạy gửi tức thì theo từng chuyến: <b>${on ? (TK.off.has('c') ? 'đã bật nhưng Firebase chưa cho phép (cập nhật Rules)' : 'đang bật') : 'đang tắt'}</b> <button class="btn sm" data-lcdoc style="margin-left:6px">${on ? 'Tắt' : 'Bật'}</button></li>`; } catch (e) { }
    try { const n = LCR.dups().length + LCR.merges().length; L += `<li class="${n ? 'bad' : 'ok'}"${n ? ' data-dup style="cursor:pointer"' : ''}>${n ? n + ' chuyến trùng giờ (Điều hành và Đặt vé có thể đang sửa 2 bản khác nhau) · bấm để gộp' : 'Không có chuyến trùng giờ'}</li>`; } catch (e) { }
    try { const R = REFX.scan(), n = R.reduce((a, x) => a + x.n, 0); L += `<li class="${n ? 'bad' : 'ok'}" data-rx style="cursor:pointer">${n ? n + ' liên kết dữ liệu giữa các mod bị lệch · bấm để xem, sửa' : 'Kết dính dữ liệu giữa các mod: khớp'}</li>`; } catch (e) { }
    try { const v = typeof BKV !== 'undefined' && BKV.st(); if (v) L += `<li class="${v.ok ? 'ok' : 'bad'}">Kiểm tra sao lưu Drive (${esc(dvLog.fmt(new Date(v.t).toISOString().slice(0, 10)))}): ${esc(v.msg)}</li>`; } catch (e) { }
    return `<ul class="bdk-ul">${L}</ul><div class="row" style="gap:6px;flex-wrap:wrap;margin-top:8px"><button class="btn sm" data-lcr>Khôi phục chuyến bị thiếu</button><button class="btn sm" data-slog>Nhật ký lưu dữ liệu</button>${typeof BK !== 'undefined' && BK.admin() ? '<button class="btn sm" data-bkv>Kiểm tra sao lưu ngay</button>' : ''}</div>`;
  },
  /* ---------- tùy biến ---------- */
  bar() {
    const b = BDK.cfg(), hid = Object.keys(BDK.W).filter(id => !BDK.L().some(x => x.id === id));
    return `<div class="bdk-tool"><select class="inp sm" data-lay>${Object.keys(b.layouts).map(k => `<option ${k === b.cur ? 'selected' : ''}>${esc(k)}</option>`).join('')}</select>
      <button class="btn sm ${BDK.edit ? 'pri' : ''}" data-ed>${ic('edit')} ${BDK.edit ? 'Xong' : 'Tùy chỉnh'}</button>
      ${BDK.edit ? `<button class="btn sm" data-new>${ic('plus')} Bố cục mới</button>${Object.keys(b.layouts).length > 1 ? '<button class="btn sm danger" data-del>Xóa bố cục này</button>' : ''}
        ${hid.length ? `<select class="inp sm" data-add><option value="">+ Thêm thẻ…</option>${hid.map(id => `<option value="${id}">${BDK.W[id].t}</option>`).join('')}</select>` : ''}
        <label class="bdk-th">Màu <input type="color" data-ac value="${esc(b.th.ac || '#4f46e5')}"></label>
        <label class="bdk-th"><input type="checkbox" data-dark ${b.th.dark ? 'checked' : ''}> Nền tối</label>
        <label class="bdk-th"><input type="checkbox" data-dense ${b.th.dense ? 'checked' : ''}> Gọn</label>
        <label class="bdk-th">Cỡ chữ <select class="inp sm" data-fs>${[90, 100, 110, 125].map(n => `<option value="${n}" ${+b.th.fs === n ? 'selected' : ''}>${n}%</option>`).join('')}</select></label>` : ''}</div>`;
  },
  card(it, i) {
    const w = BDK.W[it.id]; if (!w) return ''; let body = ''; try { body = BDK[it.id](); } catch (e) { body = '<div class="muted small">Chưa đủ dữ liệu</div>'; try { SYS.add('Bảng điều khiển', e); } catch (x) { } }
    return `<section class="bdk-c z-${it.z || 'm'}" data-i="${i}" ${BDK.edit ? 'draggable="true"' : ''}><div class="bdk-h">${ic(w.ic)}<b>${w.t}</b>${BDK.edit ? `<span class="bdk-e"><button data-mv="-1" title="Lên">↑</button><button data-mv="1" title="Xuống">↓</button>${['s', 'm', 'l'].map(z => `<button data-z="${z}" class="${(it.z || 'm') === z ? 'on' : ''}">${z === 's' ? 'Nhỏ' : z === 'm' ? 'Vừa' : 'Rộng'}</button>`).join('')}<button data-hide title="Ẩn thẻ">✕</button></span>` : ''}</div><div class="bdk-b">${body}</div></section>`;
  },
  render(el) {
    const b = BDK.cfg(), th = b.th, L = BDK.L();
    el.innerHTML = `<div class="bdk${th.dark ? ' dark' : ''}${th.dense ? ' dense' : ''}${BDK.edit ? ' editing' : ''}" style="${th.ac ? '--p:' + esc(th.ac) + ';' : ''}font-size:${+th.fs || 100}%">${BDK.bar()}<div class="bdk-g">${L.map(BDK.card).join('') || '<div class="bdk-ok">Chưa có thẻ nào: bấm Tùy chỉnh › Thêm thẻ</div>'}</div></div>`;
    const q = s => el.querySelector(s), L2 = BDK.L();
    q('[data-lay]').onchange = e => { b.cur = e.target.value; BDK.save(); };
    q('[data-ed]').onclick = () => { BDK.edit = !BDK.edit; App.render(); };
    const nw = q('[data-new]'); if (nw) nw.onclick = () => {
      const m = Modal.open({ title: 'Bố cục mới', width: 380, body: '<input class="inp" data-n placeholder="VD: Sáng điều hành" style="width:100%">', foot: '<button class="btn" data-no>Đóng</button><button class="btn pri" data-ok>Tạo</button>' });
      m.el.querySelector('[data-no]').onclick = () => m.close();
      m.el.querySelector('[data-ok]').onclick = () => { const n = m.el.querySelector('[data-n]').value.trim(); if (!n) return toast('Nhập tên bố cục', 'err'); m.close(); b.layouts[n] = L2.map(x => ({ ...x })); b.cur = n; BDK.save(); };
    };
    const dl = q('[data-del]'); if (dl) dl.onclick = async () => { if (!await Modal.confirm('Xóa bố cục "' + esc(b.cur) + '"?', { danger: true, ok: 'Xóa' })) return; delete b.layouts[b.cur]; b.cur = Object.keys(b.layouts)[0]; BDK.save(); };
    const ad = q('[data-add]'); if (ad) ad.onchange = () => { if (ad.value) { L2.push({ id: ad.value, z: 'm' }); BDK.save(); } };
    const set = (k, v) => { th[k] = v; BDK.save(); };
    const ac = q('[data-ac]'); if (ac) ac.onchange = () => set('ac', ac.value);
    const dk = q('[data-dark]'); if (dk) dk.onchange = () => set('dark', dk.checked);
    const dn = q('[data-dense]'); if (dn) dn.onchange = () => set('dense', dn.checked);
    const fs = q('[data-fs]'); if (fs) fs.onchange = () => set('fs', +fs.value);
    el.querySelectorAll('.bdk-c').forEach(c => {
      const i = +c.dataset.i;
      c.querySelectorAll('[data-mv]').forEach(x => x.onclick = () => { const j = i + +x.dataset.mv; if (j < 0 || j >= L2.length) return; [L2[i], L2[j]] = [L2[j], L2[i]]; BDK.save(); });
      c.querySelectorAll('[data-z]').forEach(x => x.onclick = () => { L2[i].z = x.dataset.z; BDK.save(); });
      const h = c.querySelector('[data-hide]'); if (h) h.onclick = () => { L2.splice(i, 1); BDK.save(); };
      if (BDK.edit) {   // kéo thả trên máy tính / tablet
        c.ondragstart = e => { e.dataTransfer.setData('text/plain', String(i)); c.classList.add('drag'); };
        c.ondragend = () => c.classList.remove('drag');
        c.ondragover = e => { e.preventDefault(); c.classList.add('over'); }; c.ondragleave = () => c.classList.remove('over');
        c.ondrop = e => { e.preventDefault(); const f = +e.dataTransfer.getData('text/plain'); if (isNaN(f) || f === i) return; const [m] = L2.splice(f, 1); L2.splice(i, 0, m); BDK.save(); };
      }
    });
    el.querySelectorAll('[data-go]').forEach(x => x.onclick = e => { if (BDK.edit || e.target.closest('button')) return; App.go(x.dataset.go); });
    el.querySelectorAll('[data-lcr]').forEach(x => x.onclick = () => { if (!BDK.edit) LCR.open(); });
    el.querySelectorAll('[data-dup]').forEach(x => x.onclick = async () => { if (BDK.edit) return; if (LCR.dups().length) await LCR.clean(); if (LCR.merges().length) await LCR.merge(); });
    el.querySelectorAll('[data-slog]').forEach(x => x.onclick = () => SLOG.open());
    el.querySelectorAll('[data-bkv]').forEach(x => x.onclick = async () => { x.disabled = true; x.textContent = 'Đang kiểm tra…'; const r = await BKV.run(true); toast(r ? r.msg : 'Chưa cài sao lưu Drive trên máy này', r && r.ok ? 'ok' : 'err', 6000); App.render(); });
    el.querySelectorAll('[data-lcdoc]').forEach(x => x.onclick = async () => {   // bật/tắt kênh gửi tức thì từng chuyến (khối Vận hành luôn giữ đủ chuyến nên tắt lúc nào cũng an toàn)
      if (BDK.edit) return; const st = S();
      if (TK.lcUse()) { st.lcDocs = false; App.changed(); return toast('Đã tắt. Lịch chạy vẫn đồng bộ như cũ qua khối dữ liệu Vận hành', 'ok', 5000); }
      x.disabled = true;
      try { const d = FB.col().doc('c___probe'); await d.set({ t: 'cp', at: new Date().toISOString() }); await d.delete(); }
      catch (e) { x.disabled = false; return toast('Firebase chưa cho phép ghi từng chuyến. Vào Cài đặt › Firebase › Rules, chép luật mới và bấm Publish, rồi bật lại', 'err', 9000); }
      st.lcDocs = true; App.changed(); try { if (TK.off.has('c')) { TK.off.delete('c'); TK.sync.c = new Map(); await TK.listen('c'); } TK.flush(); } catch (e) { }
      toast(ic('check') + ' Đã bật: sửa chuyến nào máy khác nhận ngay chuyến đó. Khối Vận hành vẫn giữ đủ mọi chuyến (tắt lại lúc nào cũng được)', 'ok', 7000);
    });
    el.querySelectorAll('[data-rx]').forEach(x => x.onclick = () => { if (!BDK.edit) REFX.show(); });
    el.querySelectorAll('[data-pa]').forEach(x => x.onclick = () => { const r = (DB.phanAnh || []).find(z => z.id === x.dataset.pa); if (r) { r.tt = 'dang'; r.nguoiNhan = r.nguoiNhan || dvLog.who(); App.changed(); App.render(); toast('Đã nhận xử lý', 'ok', 2000); } });
  }
};
addCSS(`.bdk{display:flex;flex-direction:column;gap:12px}.bdk-tool{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.bdk-tool .inp.sm{height:32px;padding:0 8px;width:auto}.bdk-th{display:inline-flex;align-items:center;gap:5px;font-size:13px}.bdk-th input[type=color]{width:34px;height:28px;border:0;padding:0;background:none}
.bdk-g{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:12px}.bdk-c{grid-column:span 12;background:var(--card,#fff);border:1px solid #e4e7ec;border-radius:16px;overflow:hidden;min-width:0}
@media(min-width:700px){.bdk-c.z-s,.bdk-c.z-m{grid-column:span 6}}@media(min-width:1100px){.bdk-c.z-s{grid-column:span 3}.bdk-c.z-m{grid-column:span 6}.bdk-c.z-l{grid-column:span 12}}
.bdk-h{display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid #f1f5f9;font-size:14.5px}.bdk-h svg{width:17px;height:17px;color:var(--p)}.bdk-e{margin-left:auto;display:flex;gap:3px;flex-wrap:wrap}.bdk-e button{border:1px solid #d0d5dd;background:#fff;border-radius:7px;font:inherit;font-size:11.5px;padding:2px 7px;cursor:pointer}.bdk-e button.on{background:var(--p);color:#fff;border-color:var(--p)}
.bdk-b{padding:12px 14px}.bdk.dense .bdk-b{padding:8px 10px}.bdk.dense .bdk-g{gap:8px}.bdk-ks{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:8px}.bdk-k{background:#f5f7fb;border-radius:12px;padding:10px;cursor:default}.bdk-k[data-go]{cursor:pointer}.bdk-k b{display:block;font-size:1.35em;font-weight:800}.bdk-k span{font-size:.82em;color:#64748b}.bdk-k.bad b{color:#dc2626}.bdk-k.warn b{color:#d97706}.bdk-k.ok b{color:#15803d}
.bdk-ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}.bdk-ul li{display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:10px;background:#f8fafc;font-size:.9em;border-left:4px solid #cbd5e1}.bdk-ul li[data-go]{cursor:pointer}.bdk-ul li.bad{border-color:#dc2626;background:#fef2f2}.bdk-ul li.warn{border-color:#f59e0b;background:#fffbeb}.bdk-ul li.ok{border-color:#16a34a;background:#f0fdf4}
.bdk-ok{color:#15803d;font-weight:700;padding:6px 0}.bdk-dh{display:flex;flex-direction:column;gap:4px;max-height:360px;overflow:auto}.bdk-tr{display:grid;grid-template-columns:52px 1.3fr 1fr 1.3fr 50px;gap:8px;align-items:center;padding:6px 8px;border-radius:8px;background:#f8fafc;font-size:.88em;cursor:pointer}.bdk-tr span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.bdk-tr.miss{background:#fef2f2}.bdk-tr.xc{box-shadow:inset 4px 0 0 #ea580c}.bdk-tr .n{text-align:right;color:#64748b}
@media(max-width:600px){.bdk-tr{grid-template-columns:46px 1fr 1fr}.bdk-tr span:nth-child(2),.bdk-tr .n{display:none}}
.bdk-bar{display:grid;grid-template-columns:96px 1fr auto;gap:8px;align-items:center;margin:6px 0;font-size:.88em}.bdk-bar i{display:block;height:12px;border-radius:6px}
.bdk.editing .bdk-c{outline:2px dashed #cbd5e1;outline-offset:-2px;cursor:grab}.bdk-c.drag{opacity:.4}.bdk-c.over{outline-color:var(--p)}
.bdk.dark{--card:#1e293b;background:#0f172a;color:#e2e8f0;padding:12px;border-radius:16px}.bdk.dark .bdk-c{border-color:#334155}.bdk.dark .bdk-h{border-color:#334155}.bdk.dark .bdk-k,.bdk.dark .bdk-ul li,.bdk.dark .bdk-tr{background:#273449;color:#e2e8f0}.bdk.dark .bdk-e button,.bdk.dark .bdk-tool .inp,.bdk.dark .bdk-tool .btn:not(.pri){background:#1e293b;color:#e2e8f0;border-color:#475569}`);
MODL.def('bdk', { title: 'Bảng điều khiển', icon: 'kanban', desc: 'Bảng điều khiển của Admin: tự sắp xếp thẻ, nhiều bố cục, màu và cỡ chữ tùy chọn', render(el) { if (!PERM.admin()) { el.innerHTML = '<div class="card"><div class="empty">Chỉ Admin dùng màn hình này</div></div>'; return; } BDK.render(el); } });
