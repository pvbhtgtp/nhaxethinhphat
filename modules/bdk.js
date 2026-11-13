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
    try { QT.more(W, td, lim); } catch (e) { }
    try { const n = NLD.wait().length; if (n) W.unshift(['warn', `${n} phiếu đổ dầu lái xe gửi qua app chờ duyệt`, '', 'nlcho']); } catch (e) { }   // gom thêm: HĐLĐ, khám sức khỏe, bảo dưỡng, nhiên liệu vượt định mức
    W.sort((a, b) => (a[0] === 'bad' ? 0 : 1) - (b[0] === 'bad' ? 0 : 1)); BDK._W = W;
    const li = ([c, t, g, q]) => `<li class="${c}"${q ? ` data-qt="${q}" style="cursor:pointer"` : g ? ` data-go="${g}"` : ''}>${esc(t)}</li>`;
    return W.length ? `<ul class="bdk-ul">${W.slice(0, 12).map(li).join('')}${W.length > 12 ? `<li class="muted" data-qt="all" style="cursor:pointer">+ ${W.length - 12} cảnh báo khác · bấm để xem tất cả</li>` : ''}</ul>` : '<div class="bdk-ok">Không có cảnh báo</div>';
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
    return `<div class="small muted" style="margin-bottom:6px">${F.month(ym)}</div>${bar('Doanh thu vé', dt, 'var(--p)')}${bar('Nhiên liệu', nl, '#f59e0b')}${bar('Sửa chữa', sc, '#ef4444')}<div style="margin-top:8px"><button class="btn sm" data-qt="pl">Lãi/lỗ theo xe, tuyến</button></div>`;
  },
  doixe() {
    const td = BDK.td(), T = BDK.trips(td), X = (DB.vehicles || []).filter(v => !v.ngung), xc = new Set(T.map(l => l.xeId).filter(Boolean)), lx = new Set(T.map(l => l.laiXe).filter(Boolean)), ym = td.slice(0, 7);
    const km = (DB.kmxe || []).filter(r => String(r.ngay).startsWith(ym)).reduce((a, r) => a + (+r.km || 0), 0);
    return `<div class="bdk-ks">${BDK.kpi('Xe chạy hôm nay', xc.size + '/' + X.length, '', 'phuongtien')}${BDK.kpi('Xe rảnh', X.length - xc.size, '')}${BDK.kpi('Lái xe đang chạy', lx.size, '')}${BDK.kpi('Km tháng (GPS)', BDK.m(km), '', 'kmxe')}</div><div style="margin-top:8px"><button class="btn sm" data-qt="bd">Bảo dưỡng định kỳ</button></div>`;
  },
  hethong() {
    const ok = (b, t, f) => `<li class="${b ? 'ok' : 'bad'}">${b ? t : f}</li>`; let L = '';
    try { L += ok(GS.on, 'Đã kết nối máy chủ dữ liệu', 'Chưa kết nối máy chủ dữ liệu'); } catch (e) { }
    try { L += ok(TK.live, 'Đồng bộ thời gian thực đang chạy', 'Đồng bộ thời gian thực chưa chạy'); } catch (e) { }
    
    try { L += ok(!Store.dirty, 'Mọi thay đổi đã lưu', 'Đang có thay đổi chờ lưu'); } catch (e) { }
    try { L += SYS.L.length ? `<li class="bad" data-sysopen style="cursor:pointer">${SYS.L.length} lỗi trên máy này: ${esc(SYS.L.slice(0, 2).map(x => x.src + ' – ' + x.m).join(' · ').slice(0, 160))} · bấm để xem, xóa</li>` : ok(true, 'Không có lỗi', ''); } catch (e) { }
    try { const on = TK.lcUse(); L += `<li class="${on ? (TK.off.has('c') ? 'bad' : 'ok') : ''}">Lịch chạy gửi tức thì theo từng chuyến: <b>${on ? (TK.off.has('c') ? 'đã bật nhưng Firebase chưa cho phép (cập nhật Rules)' : 'đang bật') : 'đang tắt'}</b> <button class="btn sm" data-lcdoc style="margin-left:6px">${on ? 'Tắt' : 'Bật'}</button></li>`; } catch (e) { }
    try { const n = LCR.dups().length + LCR.merges().length; L += `<li class="${n ? 'bad' : 'ok'}"${n ? ' data-dup style="cursor:pointer"' : ''}>${n ? n + ' chuyến trùng giờ (Điều hành và Đặt vé có thể đang sửa 2 bản khác nhau) · bấm để gộp' : 'Không có chuyến trùng giờ'}</li>`; } catch (e) { }
    try { const R = REFX.scan(), n = R.reduce((a, x) => a + x.n, 0); L += `<li class="${n ? 'bad' : 'ok'}" data-rx style="cursor:pointer">${n ? n + ' liên kết dữ liệu giữa các mod bị lệch · bấm để xem, sửa' : 'Kết dính dữ liệu giữa các mod: khớp'}</li>`; } catch (e) { }
    try { if (typeof SHD !== 'undefined' && Auth.user && Auth.user.role === 'admin' && DB.settings.shdOn !== true) L += `<li>Bản ghi song song (GĐ2): <b>đang tắt</b> <button class="btn sm" data-shdon>Bật</button></li>`; } catch (e) { }
    try { if (typeof SHD !== 'undefined' && Auth.user && Auth.user.role === 'admin' && DB.settings.shdOn === true) { const c = SHD.last(); L += `<li class="${c ? (c.ok ? 'ok' : 'bad') : ''}">Bản ghi song song (Nhân viên, Phương tiện, Lý lịch): ${c ? esc(SHD.txt(c)) + ' (đối chiếu ' + esc(new Date(c.t).toTimeString().slice(0, 5) + ' ' + dvLog.fmt(D.iso(new Date(c.t)))) + ')' : 'chưa đối chiếu'} <button class="btn sm" data-shd>Đối chiếu</button> <button class="btn sm" data-shdoff>Tắt</button></li>`; } } catch (e) { }
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
addCSS(`.qt-pl th{white-space:normal!important;line-height:1.25}.qt-pl td{white-space:nowrap}.bdk{display:flex;flex-direction:column;gap:12px}.bdk-tool{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.bdk-tool .inp.sm{height:32px;padding:0 8px;width:auto}.bdk-th{display:inline-flex;align-items:center;gap:5px;font-size:13px}.bdk-th input[type=color]{width:34px;height:28px;border:0;padding:0;background:none}
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

/* nút Hệ thống (nhật ký, đối chiếu, kiểm tra sao lưu): bắt ở cấp trang để thẻ có vẽ lại vẫn bấm được */
document.addEventListener('click', async e => {
  const b = e.target.closest && e.target.closest('[data-slog],[data-shd],[data-bkv],[data-shdon],[data-shdoff],[data-sysopen],[data-qt]'); if (!b || (typeof BDK !== 'undefined' && BDK.edit)) return;
  e.preventDefault(); e.stopPropagation();
  if (b.hasAttribute('data-qt')) { const k = b.dataset.qt; return k === 'pl' ? QT.plOpen() : k === 'bd' ? QT.bdOpen() : k === 'all' ? QT.allOpen() : k === 'nl' ? App.go('nhienlieu') : k === 'nlcho' ? NLD.cho() : null; }
  if (b.hasAttribute('data-slog')) return SLOG.open();
  if (b.hasAttribute('data-sysopen')) return SYS.open();
  if (b.hasAttribute('data-shdoff')) { DB.settings.shdOn = false; Store.changed(); toast('Đã tắt ghi bản ghi song song', 'ok'); try { App.render(); } catch (x) { } return; }
  if (b.hasAttribute('data-shdon')) { if (!await Modal.confirm('Bật ghi bản ghi song song cho Nhân viên, Phương tiện, Lý lịch?<br><span class="small muted">Chỉ máy Admin ghi, từng phần nhỏ, không chở ảnh. Dữ liệu đang dùng không đổi. Tắt lại bất cứ lúc nào.</span>', { ok: 'Bật' })) return; DB.settings.shdOn = true; Store.changed(); toast('Đã bật. Bấm Đối chiếu để ghi lần đầu', 'ok', 5000); try { App.render(); } catch (x) { } return; }
  if (BDK._run) return toast('Đang chạy, chờ chút…', '', 2000); BDK._run = true;
  try {
    if (b.hasAttribute('data-shd')) {
      if (!SHD.on()) toast('Máy này chưa ghi bản song song (cần tài khoản Admin, đang kết nối Firebase). Vẫn đối chiếu với những gì đã ghi…', '', 5000);
      toast('Đang ghi bản ghi song song…', '', 4000); let tp = 0; const n = await SHD.push(false, (k, all) => { if (Date.now() - tp > 1500) { tp = Date.now(); toast('Đang ghi ' + k + '/' + all + ' bản ghi…', '', 2000); } });
      toast((n ? 'Đã ghi ' + n + ' bản ghi. ' : '') + 'Đang đối chiếu…', '', 4000); const r = await SHD.check();
      toast(SHD.txt(r) || 'Không có dữ liệu để đối chiếu', r.ok ? 'ok' : 'err', 9000);
    } else { toast('Đang kiểm tra bản sao lưu Drive…', '', 4000); const r = await BKV.run(true); toast(r ? r.msg : 'Máy này chưa cài sao lưu Drive (chỉ máy Admin đã cài mới kiểm tra được)', r && r.ok ? 'ok' : 'err', 8000); }
  } catch (x) { toast('Chưa chạy được: ' + esc(x.message || x), 'err', 7000); }
  finally { BDK._run = false; try { App.render(); } catch (x) { } }
}, true);


/* ===== Mục 5: gom cảnh báo · bảo dưỡng định kỳ · nhiên liệu vượt định mức · lãi/lỗ theo xe, tuyến ===== */
const QT = {
  /* ---------- bảo dưỡng định kỳ: mốc theo km hoặc theo tháng, cái nào tới trước ---------- */
  BD: [{ id: 'nhot', ten: 'Thay nhớt máy', km: 10000, thang: 3, kw: 'nhớt' }, { id: 'loc', ten: 'Thay lọc nhớt, lọc nhiên liệu, lọc gió', km: 20000, thang: 6, kw: 'lọc' },
    { id: 'phanh', ten: 'Kiểm tra, thay bố phanh', km: 30000, thang: 6, kw: 'phanh|bố thắng|má phanh' }, { id: 'lop', ten: 'Đảo, thay lốp', km: 40000, thang: 12, kw: 'lốp|vỏ xe' }],
  bdc() { const c = DB.settings.bdx || {}; return { items: Array.isArray(c.items) && c.items.length ? c.items : QT.BD, done: c.done || {} }; },
  key: s => String(s || '').toUpperCase().replace(/[^0-9A-Z]/g, ''),
  /* số km đồng hồ gần nhất của xe (phiếu dầu, phiếu sửa chữa) + km GPS chạy thêm sau ngày đó */
  odo(bks) {
    let best = null; const add = (km, ngay) => { km = +km || 0; if (km > 0 && ngay && (!best || km > best.km)) best = { km, ngay }; };
    (DB.nhienlieu || []).forEach(r => { if (r.xe === bks) add(r.km, r.ngay); }); (DB.suachua || []).forEach(p => { if (p.xe === bks) add(p.km, p.ngay); });
    return best ? { km: best.km + QT.gps(bks, best.ngay), ngay: best.ngay } : null;
  },
  gps(bks, sau) { const k = QT.key(bks); let n = 0; (DB.kmxe || []).forEach(r => { if (QT.key(r.bks) === k && r.ngay > sau) n += +r.km || 0; }); return n; },
  last(bks, it) {
    let rx = null; try { rx = new RegExp(it.kw || '^$', 'i'); } catch (e) { }
    let L = null; (DB.suachua || []).forEach(p => { if (p.xe !== bks || !p.ngay) return; const t = (p.items || []).map(i => i.nd).join(' ') + ' ' + (p.ghiChu || ''); if (rx && rx.test(t) && (!L || p.ngay > L.ngay)) L = { ngay: p.ngay, km: +p.km || 0, src: 'Phiếu ' + (p.so || '') }; });
    const m = QT.bdc().done[bks + '|' + it.id]; if (m && m.ngay && (!L || m.ngay >= L.ngay)) L = { ngay: m.ngay, km: +m.km || 0, src: 'Đánh dấu tay' };
    return L;
  },
  bdOf(v, it, td) {
    const L = QT.last(v.bks, it); if (!L) return { it, st: 'none' };
    const o = QT.odo(v.bks), kmDa = L.km && o && o.km >= L.km ? o.km - L.km : QT.gps(v.bks, L.ngay), han = it.thang ? llAddM(L.ngay, +it.thang) : '', con = han ? D.diff(han, td) : 9999;
    const kmCon = it.km ? +it.km - kmDa : 99999, st = kmCon <= 0 || con < 0 ? 'bad' : kmCon <= Math.max(1000, +it.km * 0.1) || con <= 15 ? 'warn' : 'ok';
    return { it, st, L, kmDa, kmCon, han, con };
  },
  bdAll(td) { const out = [], c = QT.bdc(); (DB.vehicles || []).filter(v => !v.ngung && v.bks).forEach(v => c.items.forEach(it => out.push({ v, ...QT.bdOf(v, it, td) }))); return out; },
  bdTxt: x => x.st === 'none' ? 'chưa có mốc' : (x.kmCon <= 0 ? 'quá ' + F.money(-x.kmCon) + ' km' : x.it.km ? 'còn ' + F.money(x.kmCon) + ' km' : '') + (x.han ? (x.it.km ? ' · ' : '') + (x.con < 0 ? 'quá hạn ' + F.date(x.han) : 'hạn ' + F.date(x.han)) : ''),
  /* ---------- nhiên liệu: xe vượt định mức trên 10% trong tháng ---------- */
  nlOver(ym) {
    const led = nlLedger(), X = (DB.nhienlieu || []).filter(r => nlKind(r) !== 'nhap' && String(r.ngay).startsWith(ym)), out = [];
    [...new Set(X.map(r => r.xe).filter(Boolean))].forEach(bks => {
      const dm = nlDm(bks); if (!dm) return; const L = X.filter(r => r.xe === bks), g = r => led.map[r.id] || {}, kmO = sum(L, r => g(r).kmChay || 0), litT = sum(L.filter(r => g(r).kmChay), r => +r.lit || 0), gps = nlKmGPS(bks, ym);
      const th = kmO ? litT / kmO * 100 : gps ? sum(L, r => +r.lit || 0) / gps * 100 : 0; if (th > dm * 1.1) out.push({ bks, th, dm });
    });
    return out;
  },
  /* ---------- gom thêm vào thẻ Cảnh báo ---------- */
  more(W, td, lim) {
    (DB.employees || []).filter(e => e.trangThai !== 'Nghỉ việc' && e.hdDen && e.hdDen <= lim && e.loaiHD !== 'Không xác định thời hạn').forEach(e => W.push([e.hdDen < td ? 'bad' : 'warn', `${e.ten}: hợp đồng lao động ${e.hdDen < td ? 'đã hết hạn' : 'hết hạn'} ${F.date(e.hdDen)}`, 'nhanvien']));
    try { (DB.employees || []).filter(e => e.trangThai !== 'Nghỉ việc' && isDriver(e)).forEach(e => { const r = llLatest(e.id, 'sk'), h = r && llHan(r); if (h && h <= lim) W.push([h < td ? 'bad' : 'warn', `${e.ten}: giấy khám sức khỏe ${h < td ? 'đã hết hạn' : 'hết hạn'} ${F.date(h)}`, 'lylich']); }); } catch (e) { }
    try { QT.bdAll(td).filter(x => x.st === 'bad' || x.st === 'warn').forEach(x => W.push([x.st, `Xe ${x.v.bks}: ${x.it.ten} ${QT.bdTxt(x)}`, '', 'bd'])); } catch (e) { }
    try { QT.nlOver(td.slice(0, 7)).forEach(x => W.push(['warn', `Xe ${x.bks}: hao dầu ${F.num(x.th, 1)} L/100km, vượt định mức ${F.num(x.dm, 1)}`, 'nhienlieu'])); } catch (e) { }
  },
  allOpen() {
    const W = BDK._W || [];
    const m = Modal.open({ title: 'Tất cả cảnh báo (' + W.length + ')', width: 640, body: `<ul class="bdk-ul">${W.map(([c, t, g, q]) => `<li class="${c}"${q ? ` data-qt="${q}" style="cursor:pointer"` : g ? ` data-g2="${g}" style="cursor:pointer"` : ''}>${esc(t)}</li>`).join('')}</ul>`, foot: '<button class="btn" data-x>Đóng</button>' });
    m.el.querySelector('[data-x]').onclick = () => m.close();
    m.el.querySelectorAll('[data-g2]').forEach(x => x.onclick = () => { m.close(); App.go(x.dataset.g2); });
  },
  /* ---------- màn hình bảo dưỡng ---------- */
  bdOpen() {
    const td = D.today(), ce = PERM.admin() || Auth.can('suachua', 'edit');
    const m = Modal.open({ title: 'Bảo dưỡng định kỳ', width: 980, body: '<div data-b></div>', foot: '<button class="btn" data-cfg>Cài đặt mốc bảo dưỡng</button><button class="btn pri" data-x>Đóng</button>' });
    const draw = () => {
      const A = QT.bdAll(td), V = [...new Set(A.map(x => x.v))], cls = { bad: 'b-red', warn: 'b-amber', ok: 'b-green', none: 'b-gray' };
      m.el.querySelector('[data-b]').innerHTML = `<p class="small muted" style="margin-top:0">Lần làm gần nhất lấy từ <b>phiếu sửa chữa</b> có chữ khớp (VD "nhớt", "lọc", "phanh", "lốp"), hoặc lần anh bấm <b>Đã làm</b>. Km hiện tại lấy từ km đồng hồ trên phiếu dầu, phiếu sửa chữa cộng km GPS chạy thêm. Đỏ là đã quá mốc, vàng là sắp tới.</p>
      <div class="tbl-wrap free qt-pl" style="max-height:62vh;overflow:auto"><table class="tbl compact" style="font-size:12.5px"><thead><tr><th>Xe</th><th class="r">Km hiện tại</th>${QT.bdc().items.map(it => `<th>${esc(it.ten)}<div class="small muted">${it.km ? F.money(it.km) + ' km' : ''}${it.km && it.thang ? ' / ' : ''}${it.thang ? it.thang + ' tháng' : ''}</div></th>`).join('')}</tr></thead><tbody>
      ${V.map(v => { const o = QT.odo(v.bks); return `<tr><td><b>${esc(v.bks)}</b></td><td class="r">${o ? F.money(o.km) : '<span class="muted">—</span>'}</td>${A.filter(x => x.v === v).map(x => `<td><span class="badge ${cls[x.st]}">${esc(QT.bdTxt(x))}</span>${x.L ? `<div class="small muted">Lần trước ${F.date(x.L.ngay)}${x.L.km ? ' · ' + F.money(x.L.km) + ' km' : ''}</div>` : ''}${ce ? `<div><button class="btn sm" data-dn="${esc(v.bks)}|${esc(x.it.id)}" style="margin-top:3px">Đã làm</button></div>` : ''}</td>`).join('')}</tr>`; }).join('') || `<tr><td colspan="9" class="empty">Chưa có xe</td></tr>`}</tbody></table></div>`;
      m.el.querySelectorAll('[data-dn]').forEach(b => b.onclick = () => {
        const [bks, id] = b.dataset.dn.split('|'), o = QT.odo(bks), it = QT.bdc().items.find(x => x.id === id) || {};
        const f = Modal.open({ title: 'Đã làm: ' + esc(it.ten || '') + ' · xe ' + esc(bks), width: 420, body: `<div class="form c2"><div class="field"><label>Ngày làm</label><input class="inp" type="date" data-d value="${td}"></div><div class="field"><label>Km đồng hồ lúc làm</label><input class="inp" type="number" min="0" data-k value="${o ? o.km : ''}"></div></div>`, foot: '<button class="btn" data-n>Hủy</button><button class="btn pri" data-y>Lưu</button>' });
        f.el.querySelector('[data-n]').onclick = () => f.close();
        f.el.querySelector('[data-y]').onclick = () => { const d = f.el.querySelector('[data-d]').value; if (!d) return toast('Chọn ngày làm', 'err'); const st = DB.settings; st.bdx = st.bdx || {}; st.bdx.done = st.bdx.done || {}; st.bdx.done[bks + '|' + id] = { ngay: d, km: +f.el.querySelector('[data-k]').value || 0, by: dvLog.who() }; App.changed(); f.close(); draw(); toast('Đã ghi mốc bảo dưỡng', 'ok'); };
      });
    };
    m.el.querySelector('[data-x]').onclick = () => { m.close(); try { App.render(); } catch (e) { } };
    m.el.querySelector('[data-cfg]').onclick = () => QT.bdCfg(draw);
    draw();
  },
  bdCfg(after) {
    if (!PERM.admin()) return toast('Chỉ Admin đổi mốc bảo dưỡng', 'err');
    let L = QT.bdc().items.map(x => ({ ...x }));
    const m = Modal.open({ title: 'Cài đặt mốc bảo dưỡng (áp dụng mọi xe)', width: 760, body: '<div class="row small muted" style="gap:6px;margin-bottom:4px;font-weight:600"><span style="flex:2">Hạng mục</span><span style="width:90px">Sau bao nhiêu km</span><span style="width:72px">Hoặc số tháng</span><span style="flex:1.4">Chữ để dò</span><span style="width:52px"></span></div><div data-l></div><button class="btn sm" data-a style="margin-top:8px">+ Thêm hạng mục</button><p class="small muted">Chữ để dò: các chữ (cách nhau bằng dấu |) dùng để tìm trong nội dung phiếu sửa chữa. Để trống km hoặc tháng nếu không dùng.</p>', foot: '<button class="btn" data-n>Hủy</button><button class="btn pri" data-y>Lưu</button>' });
    const row = (x, i) => `<div class="row" data-i="${i}" style="gap:6px;margin-bottom:6px;align-items:center"><input class="inp" data-f="ten" value="${esc(x.ten || '')}" placeholder="Hạng mục" style="flex:2"><input class="inp" data-f="km" type="number" min="0" value="${x.km || ''}" placeholder="Km" style="width:90px"><input class="inp" data-f="thang" type="number" min="0" value="${x.thang || ''}" placeholder="Tháng" style="width:72px"><input class="inp" data-f="kw" value="${esc(x.kw || '')}" placeholder="Chữ để dò" style="flex:1.4"><button class="btn sm danger" data-r="${i}">Xóa</button></div>`;
    const read = () => { L = [...m.el.querySelectorAll('[data-i]')].map(d => { const g = k => d.querySelector(`[data-f="${k}"]`).value.trim(), o = L[+d.dataset.i] || {}; return { id: o.id || uid(), ten: g('ten'), km: +g('km') || 0, thang: +g('thang') || 0, kw: g('kw') }; }); };
    const draw = () => { m.el.querySelector('[data-l]').innerHTML = L.map(row).join(''); m.el.querySelectorAll('[data-r]').forEach(b => b.onclick = () => { read(); L.splice(+b.dataset.r, 1); draw(); }); };
    m.el.querySelector('[data-a]').onclick = () => { read(); L.push({ id: uid(), ten: '', km: 0, thang: 0, kw: '' }); draw(); };
    m.el.querySelector('[data-n]').onclick = () => m.close();
    m.el.querySelector('[data-y]').onclick = () => { read(); L = L.filter(x => x.ten && (x.km || x.thang)); if (!L.length) return toast('Cần ít nhất 1 hạng mục có tên và km hoặc tháng', 'err'); const st = DB.settings; st.bdx = st.bdx || {}; st.bdx.items = L; App.changed(); m.close(); toast('Đã lưu mốc bảo dưỡng', 'ok'); if (after) after(); };
    draw();
  },
  /* ---------- lãi / lỗ theo xe, theo tuyến trong tháng ---------- */
  pl(ym) {
    const X = {}, T = {}, bksOf = id => ((DB.vehicles || []).find(v => v.id === id) || {}).bks || '', z = () => ({ ch: 0, ve: 0, gh: 0, hd: 0, nl: 0, sc: 0, lg: 0 });
    const gx = k => X[k] = X[k] || z(), gt = k => T[k] = T[k] || z(), trips = (DB.lichchay || []).filter(l => String(l.ngay).startsWith(ym)), xeTuyen = {}, laiN = {};
    trips.forEach(l => {
      const bks = bksOf(l.xeId) || '(Chưa gán xe)', tu = l.tuyen || '(Không rõ tuyến)', n = +l.soChuyen || 1;
      let ve = 0; try { ve = sum(dvBook(l.id), dvTot); } catch (e) { } let gh = 0; try { gh = sum(GH.list(l.id), GH.tien); } catch (e) { }
      [gx(bks), gt(tu)].forEach(o => { o.ch += n; o.ve += ve; o.gh += gh; });
      const xt = xeTuyen[bks] = xeTuyen[bks] || {}; xt[tu] = (xt[tu] || 0) + n;
      [l.laiXe, l.laiXe2].filter(Boolean).forEach(id => { const a = laiN[id] = laiN[id] || { n: 0, x: {}, t: {} }; a.n += n; a.x[bks] = (a.x[bks] || 0) + n; a.t[tu] = (a.t[tu] || 0) + n; });
    });
    (DB.hdvc || []).filter(c => String(c.ngayDon || c.ngayKy || '').startsWith(ym)).forEach(c => { const v = +c.giaTri || 0; if (!v) return; gx(bksOf(c.xeId) || '(Chưa gán xe)').hd += v; gt('Hợp đồng thuê xe').hd += v; });
    /* chi phí của xe chia cho các tuyến theo số chuyến xe đó chạy trên mỗi tuyến */
    const spread = (bks, k, v) => { gx(bks)[k] += v; const xt = xeTuyen[bks], all = xt ? sum(Object.values(xt), x => x) : 0; if (!all) { gt('(Xe không có chuyến)')[k] += v; return; } Object.entries(xt).forEach(([t, n]) => { gt(t)[k] += v * n / all; }); };
    try { const led = nlLedger(); (DB.nhienlieu || []).filter(r => nlKind(r) !== 'nhap' && r.xe && String(r.ngay).startsWith(ym)).forEach(r => spread(r.xe, 'nl', (led.map[r.id] || {}).tt || 0)); } catch (e) { }
    (DB.suachua || []).filter(p => p.xe && String(p.ngay).startsWith(ym)).forEach(p => spread(p.xe, 'sc', scTong(p)));
    let lgOk = true; try { Object.entries(laiN).forEach(([id, a]) => { const e = (DB.employees || []).find(x => x.id === id); if (!e) return; const r = calcPay(e, ym), c = (+r.gross || 0) + (+r.bhDN || 0); if (!c) return; Object.entries(a.x).forEach(([b, n]) => { gx(b).lg += c * n / a.n; }); Object.entries(a.t).forEach(([t, n]) => { gt(t).lg += c * n / a.n; }); }); } catch (e) { lgOk = false; }
    const fin = o => Object.entries(o).map(([k, r]) => { const thu = r.ve + r.gh + r.hd, chi = r.nl + r.sc + r.lg; return { k, ...r, thu, chi, lai: thu - chi }; }).sort((a, b) => b.lai - a.lai);
    return { xe: fin(X), tuyen: fin(T), lgOk };
  },
  plOpen() {
    if (!PERM.admin()) return toast('Chỉ Admin xem lãi/lỗ', 'err');
    let ym = D.today().slice(0, 7), tab = 'xe';
    const m = Modal.open({ title: 'Lãi/lỗ theo xe, theo tuyến', width: 1100, body: '<div data-b></div>', foot: '<button class="btn pri" data-x>Đóng</button>' });
    const M = v => F.money(Math.round(v)), draw = () => {
      const R = QT.pl(ym), L = R[tab], tot = L.reduce((a, r) => { ['ch', 've', 'gh', 'hd', 'thu', 'nl', 'sc', 'lg', 'chi', 'lai'].forEach(k => a[k] = (a[k] || 0) + r[k]); return a; }, {});
      const tr = (r, b) => `<tr${b ? ' style="font-weight:700;background:#f1f5f9"' : ''}><td>${b ? 'Tổng cộng' : esc(r.k)}</td><td class="r">${F.num(r.ch)}</td><td class="r">${M(r.ve)}</td><td class="r">${M(r.gh)}</td><td class="r">${M(r.hd)}</td><td class="r"><b>${M(r.thu)}</b></td><td class="r">${M(r.nl)}</td><td class="r">${M(r.sc)}</td><td class="r">${M(r.lg)}</td><td class="r"><b>${M(r.chi)}</b></td><td class="r" style="color:${r.lai < 0 ? '#dc2626' : '#15803d'};font-weight:800">${M(r.lai)}</td></tr>`;
      m.el.querySelector('[data-b]').innerHTML = `<div class="row" style="gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:10px"><button class="btn sm" data-p="-1">‹</button><input class="inp sm" type="month" data-m value="${ym}" style="width:150px"><button class="btn sm" data-p="1">›</button><span class="grow"></span><button class="btn sm ${tab === 'xe' ? 'pri' : ''}" data-t="xe">Theo xe</button><button class="btn sm ${tab === 'tuyen' ? 'pri' : ''}" data-t="tuyen">Theo tuyến</button></div>
      <div class="tbl-wrap free qt-pl" style="max-height:60vh;overflow:auto"><table class="tbl compact" style="font-size:12.5px"><thead><tr><th>${tab === 'xe' ? 'Xe' : 'Tuyến'}</th><th class="r">Chuyến</th><th class="r">Tiền vé</th><th class="r">Gửi hàng</th><th class="r">Hợp đồng</th><th class="r">Tổng thu</th><th class="r">Nhiên liệu</th><th class="r">Sửa chữa</th><th class="r">Lương lái/phụ</th><th class="r">Tổng chi</th><th class="r">Lãi/lỗ</th></tr></thead><tbody>${L.map(r => tr(r)).join('') || '<tr><td colspan="11" class="empty">Tháng này chưa có dữ liệu</td></tr>'}${L.length ? tr(tot, 1) : ''}</tbody></table></div>
      <p class="small muted">Thu: tiền vé (không tính vé hủy), cước gửi hàng của các chuyến trong tháng, giá trị hợp đồng thuê xe theo ngày đón. Chi: nhiên liệu cấp, đổ cho xe; phiếu sửa chữa; lương lái, phụ xe (tổng lương + bảo hiểm công ty đóng) chia theo số chuyến mỗi người chạy. Theo tuyến: nhiên liệu, sửa chữa của xe chia theo số chuyến xe đó chạy trên mỗi tuyến. Chưa tính khấu hao xe, phí bến bãi, cầu đường, lương văn phòng.${R.lgOk ? '' : ' <b style="color:#dc2626">Chưa tính được lương tháng này.</b>'}</p>`;
      const q = s => m.el.querySelector(s);
      q('[data-m]').onchange = e => { if (e.target.value) { ym = e.target.value; draw(); } };
      m.el.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { ym = D.ymAdd(ym, +b.dataset.p); draw(); });
      m.el.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { tab = b.dataset.t; draw(); });
    };
    m.el.querySelector('[data-x]').onclick = () => m.close();
    draw();
  }
};
