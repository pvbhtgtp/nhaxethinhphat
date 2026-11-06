'use strict';
/* ĐẶT VÉ+ (gắn vào màn hình Đặt vé, tải cùng module lichchay):
   1) Khách chờ: hết ghế thì ghi khách chờ theo chuyến/ngày; có ghế trống (vé hủy, đổi chuyến) tự báo, bấm "Đặt vé" là điền sẵn thông tin.
   2) Gửi xác nhận vé: soạn sẵn tin (mã vé, giờ, xe, ghế, điểm đón + giờ xe tới, tiền, chuyển khoản, QR) → sao chép / SMS / Zalo.
   3) Quầy vé nhanh (máy tính): phím tắt; gõ số ghế để chọn, Enter đặt vé. */
const CHO = {
  L: () => (DB.choVe = DB.choVe || []),
  now: () => D.today() + ' ' + new Date().toTimeString().slice(0, 5),
  who: () => (Auth.user && (Auth.user.ten || Auth.user.user)) || '',
  free: t => Math.max(0, dvCap(t) - dvBook(t.id).length),
  forTrip: t => CHO.L().filter(e => !e.xong && (e.chuyen ? e.chuyen === t.id : e.ngay === t.ngay && e.tuyen === t.tuyen)),
  /* chuyến còn đủ ghế cho khách chờ (ưu tiên chuyến khách chọn, sau đó chuyến cùng tuyến trong ngày, chưa xuất bến) */
  match(e) { const T = (DB.lichchay || []).filter(l => !lcGone(l) && (e.chuyen ? l.id === e.chuyen : l.ngay === e.ngay && l.tuyen === e.tuyen)); return T.filter(l => CHO.free(l) >= (+e.sl || 1)).sort((a, b) => String(a.gio).localeCompare(String(b.gio))); },
  seen: new Set(),
  alert() {
    if (App.cur !== 'lichchay' || !Auth.can('lichchay', 'add')) return;
    CHO.L().filter(e => !e.xong && e.ngay >= D.today()).forEach(e => { const m = CHO.match(e)[0]; if (!m) return; const k = e.id + '|' + m.id + '|' + CHO.free(m); if (CHO.seen.has(k)) return; CHO.seen.add(k);
      toast(`${ic('bell')} Chuyến <b>${esc(m.gio)}</b> ${esc(m.tuyen)} còn ${CHO.free(m)} ghế · khách chờ <b>${esc(e.ten || e.sdt)}</b> (${+e.sl || 1} ghế). Bấm "Khách chờ" để đặt.`, 'ok', 9000); });
  },
  btn(t) { const n = CHO.forTrip(t).length, ok = n && CHO.forTrip(t).some(e => CHO.free(t) >= (+e.sl || 1)), full = !CHO.free(t); return `<button type="button" class="btn sm cho-b${ok ? ' hot' : ''}${full ? ' full' : ''}" data-act="choOpen" title="Danh sách khách chờ ghế trống của chuyến này">${ic('users')} ${full && !n ? 'Hết ghế · Thêm khách chờ' : 'Khách chờ'}${n ? ` <b>${n}</b>` : ''}</button>`; },
  open() {
    const t = dvCur(); if (!t) return toast('Chưa chọn chuyến', 'err');
    const can = Auth.can('lichchay', 'add'), A = CHO.forTrip(t), done = CHO.L().filter(e => e.xong && (e.chuyen === t.id || (!e.chuyen && e.ngay === t.ngay && e.tuyen === t.tuyen))).slice(-5);
    const row = e => { const tel = String(e.sdt || '').replace(/[^0-9+]/g, ''), m = CHO.match(e)[0]; return `<div class="cho-i${m ? ' ok' : ''}"><div class="grow"><b>${esc(e.ten || 'Khách')}</b> · ${+e.sl || 1} ghế${e.chuyen ? '' : ' · <span class="muted">giờ nào cũng được</span>'}<div class="small muted">${esc([e.diemDon, e.diemTra].filter(Boolean).join(' → ') || 'Chưa ghi điểm đón, trả')}${e.ghiChu ? ' · ' + esc(e.ghiChu) : ''} · ghi ${esc(e.tg || '')}</div>${m ? `<div class="small" style="color:#047857;font-weight:700">Có ghế: chuyến ${esc(m.gio)} còn ${CHO.free(m)} ghế</div>` : ''}</div>
      <div class="cho-a">${tel ? `<a class="btn sm" href="tel:${esc(tel)}">${ic('phone')}</a>` : ''}${can ? `<button class="btn sm pri" data-cho-dat="${e.id}" ${m ? '' : 'disabled'}>Đặt vé</button><button class="btn sm" data-cho-del="${e.id}" title="Bỏ khỏi danh sách">${ic('x')}</button>` : ''}</div></div>`; };
    const md = Modal.open({ title: `Khách chờ · ${esc(t.gio)} ${esc(t.tuyen)} · ${F.date(t.ngay)}`, width: 560, body: `<div class="muted small" style="margin-bottom:8px">Chuyến còn <b>${CHO.free(t)}</b> ghế trống. Khi có ghế trống (vé hủy, chuyển chuyến), app tự báo cho mọi máy quầy vé.</div>
      ${A.length ? A.map(row).join('') : '<p class="muted">Chưa có khách chờ.</p>'}${done.length ? `<details style="margin-top:10px"><summary class="small muted">Đã xử lý gần đây (${done.length})</summary>${done.map(e => `<div class="small muted" style="padding:4px 0">${esc(e.ten || e.sdt)} · ${esc(e.kq || '')} · ${esc(e.xongTg || '')}</div>`).join('')}</details>` : ''}`,
      foot: can ? `<button class="btn pri" data-cho-add>${ic('plus')} Thêm khách chờ</button>` : '' });
    md.el.addEventListener('click', ev => {
      const a = ev.target.closest('[data-cho-add],[data-cho-dat],[data-cho-del]'); if (!a) return;
      if (a.dataset.choAdd !== undefined) { md.close(); return CHO.form(t); }
      const e = CHO.L().find(x => x.id === (a.dataset.choDat || a.dataset.choDel)); if (!e) return;
      if (a.dataset.choDel) { e.xong = true; e.kq = 'Bỏ khỏi danh sách'; e.xongTg = CHO.now(); App.changed(); md.close(); return CHO.open(); }
      const m = CHO.match(e)[0]; if (!m) return toast('Chưa có chuyến đủ ghế trống', 'err');
      e.xong = true; e.kq = 'Đặt vé chuyến ' + m.gio; e.xongTg = CHO.now(); e.nguoiXuLy = CHO.who();
      DV.trip = m.id; DV.tab = 'ghe'; dvSetB(null); DV.sel = []; DV.clone = { ten: e.ten || '', sdt: e.sdt || '', diemDon: e.diemDon || '', diemTra: e.diemTra || '', gia: e.gia || '', ghiChu: e.ghiChu || '' };
      App.changed(); md.close(); toast(`Chạm ${+e.sl || 1} ghế trống để đặt vé cho ${esc(e.ten || e.sdt)}`, 'ok', 6000);
    });
  },
  form(t) {
    const stops = LT.get(t.tuyen).map(x => x.ten), trips = (DB.lichchay || []).filter(l => l.ngay === t.ngay && l.tuyen === t.tuyen).sort((a, b) => String(a.gio).localeCompare(String(b.gio)));
    Form.open({ title: 'Thêm khách chờ ghế', width: 520, cols: 2, saveText: 'Lưu khách chờ', value: { chuyen: t.id, sl: 1 },
      fields: [{ key: 'sdt', label: 'Số điện thoại', required: true }, { key: 'ten', label: 'Tên khách' },
        { key: 'chuyen', label: 'Chờ chuyến', type: 'select', options: [...trips.map(l => ({ value: l.id, label: l.gio + (CHO.free(l) ? ' · còn ' + CHO.free(l) + ' ghế' : ' · hết ghế') })), { value: '', label: 'Giờ nào trong ngày cũng được' }] },
        { key: 'sl', label: 'Số ghế cần', type: 'number' },
        { key: 'diemDon', label: 'Điểm đón', list: stops }, { key: 'diemTra', label: 'Điểm trả', list: stops },
        { key: 'ghiChu', label: 'Ghi chú', full: true }],
      onSave: d => {
        const p = String(d.sdt || '').replace(/\D/g, ''); if (p.length < 9) { toast('Số điện thoại chưa đúng', 'err'); return false; }
        CHO.L().push({ id: uid(), ngay: t.ngay, tuyen: t.tuyen, chuyen: d.chuyen || '', sdt: d.sdt, ten: d.ten || '', sl: Math.max(1, +d.sl || 1), diemDon: d.diemDon || '', diemTra: d.diemTra || '', ghiChu: d.ghiChu || '', tg: CHO.now(), nguoi: CHO.who() });
        App.changed(); toast('Đã thêm khách chờ. Có ghế trống app sẽ báo', 'ok');
      } });
  }
};

/* ---------- Gửi xác nhận vé ---------- */
const XNV = {
  G() { const b = DB.datve.find(x => x.id === DV.selB); if (!b) return null; return { b, G: DV.one === b.id ? [b] : dvGrp(b), t: dvTripOf(b) }; },
  text(o) {
    const { b, G, t } = o, co = S().company || {}, xe = lcXe(t), eta = LT.eta(t, b.diemDon), tot = sum(G, x => dvTot(x)), paid = G.every(x => x.tt === 'tra'), coc = sum(G, x => +x.coc || 0);
    const acc = String(co.stkDN || '').replace(/\s/g, ''), hot = (S().niemYet || {}).hotline || co.sdt || '';
    const d = D.parse(t.ngay), L = [
      `${String(co.ten || 'Nhà xe').toUpperCase()} xác nhận vé`,
      b.ma ? `Mã vé: ${b.ma}` : '',
      `Chuyến: ${t.gio} ${D.dowName[d.getDay()]}, ${F.date(t.ngay)}`,
      `Tuyến: ${t.tuyen}`,
      xe.bks ? `Xe: ${xe.bks}` : '',
      `Khách: ${b.ten || ''}${b.sdt ? ' · ' + b.sdt : ''}`,
      `Ghế: ${dvSeatsTxt(G)} (${G.length} vé)`,
      b.diemDon ? `Đón: ${b.diemDon}${eta ? ' · xe tới khoảng ' + eta : ''}` : '',
      b.diemTra ? `Trả: ${b.diemTra}` : '',
      `Tổng tiền: ${F.money(tot)}đ · ${paid ? 'ĐÃ THANH TOÁN' : coc ? 'đã cọc ' + F.money(coc) + 'đ, còn ' + F.money(tot - coc) + 'đ' : 'thanh toán khi lên xe hoặc chuyển khoản'}`,
      !paid && acc ? `Chuyển khoản: ${acc} · ${co.nganHangDN || ''} · ${co.ten || ''}\nNội dung: ${b.ma || b.sdt || ''}` : '',
      hot ? `Hotline: ${hot}` : '',
      'Quý khách vui lòng có mặt tại điểm đón trước 10 phút. Cảm ơn quý khách!'
    ];
    return L.filter(Boolean).join('\n');
  },
  open() {
    const o = XNV.G(); if (!o || !o.t.id) return toast('Chưa chọn vé', 'err');
    const tel = String(o.b.sdt || '').replace(/[^0-9+]/g, ''), zl = tel.replace(/^\+?84/, '0');
    const md = Modal.open({ title: 'Gửi xác nhận vé cho khách', width: 520, body: `<textarea class="inp" id="xnvT" rows="13" style="width:100%;font:14px/1.5 system-ui;white-space:pre-wrap">${esc(XNV.text(o))}</textarea><div class="muted small" style="margin-top:6px">Sửa được trước khi gửi. "Zalo" mở khung chat với số khách: bấm Sao chép rồi dán vào.</div>`,
      foot: `<button class="btn" data-x="cp">${ic('copy')} Sao chép</button>${tel ? `<a class="btn" data-x="sms" href="#">${ic('message')} Gửi SMS</a><a class="btn pri" data-x="zl" href="https://zalo.me/${esc(zl)}" target="_blank" rel="noopener">Zalo</a>` : ''}` });
    const txt = () => md.el.querySelector('#xnvT').value, mark = how => { const n = CHO.now(); o.G.forEach(x => { x.xnGui = n; (x.lichSu = x.lichSu || []).push({ tg: dvLog.now(), nguoi: dvLog.who(), nd: 'Gửi xác nhận vé (' + how + ')' }); }); App.changed(false); };
    const cp = () => { try { navigator.clipboard.writeText(txt()); return true; } catch (e) { return false; } };
    md.el.addEventListener('click', ev => {
      const a = ev.target.closest('[data-x]'); if (!a) return;
      if (a.dataset.x === 'cp') { cp() ? toast('Đã sao chép tin xác nhận', 'ok') : toast('Không sao chép được, hãy bôi đen rồi sao chép', 'err'); mark('sao chép'); }
      if (a.dataset.x === 'sms') { ev.preventDefault(); const ios = /iPhone|iPad|Mac/i.test(navigator.userAgent); location.href = `sms:${tel}${ios ? '&' : '?'}body=${encodeURIComponent(txt())}`; mark('SMS'); }
      if (a.dataset.x === 'zl') { cp(); toast('Đã sao chép tin, dán vào khung chat Zalo', 'ok', 5000); mark('Zalo'); }
    });
  }
};

/* ---------- Quầy vé nhanh: phím tắt (máy tính) ---------- */
const QK = {
  buf: '', t: null,
  typing: e => { const a = document.activeElement; return a && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable); },
  seat(no) { const b = [...document.querySelectorAll('.dv-grid [data-g]')].find(x => String(x.dataset.g).toUpperCase() === no.toUpperCase()); if (!b) return toast('Không có ghế ' + esc(no), 'err', 1500); b.click(); b.scrollIntoView({ block: 'nearest' }); },
  key(e) {
    if (App.cur !== 'lichchay' || QK.typing() || document.querySelector('.modal-wrap') || e.ctrlKey || e.metaKey) return;
    const k = e.key, cur = dvCur();
    if (k === '/' || k === 'F2') { e.preventDefault(); return ACT.dvSearch(); }
    if (k === '?') { e.preventDefault(); return QK.help(); }
    if (k === 'Escape') { if (QK.buf) { QK.buf = ''; QK.hint(); return; } return ACT.dvClearSel(); }
    if (e.altKey && (k === 'ArrowLeft' || k === 'ArrowRight')) { e.preventDefault(); const L = dvTrips(), i = cur ? L.findIndex(l => l.id === cur.id) : -1, n = L[i + (k === 'ArrowRight' ? 1 : -1)]; if (n) ACT.dvTrip({ id: n.id }); return; }
    if (!cur || DV.tab !== 'ghe') return;
    if (/^[0-9a-zA-Z]$/.test(k) && !e.altKey) { if (/^[a-zA-Z]$/.test(k) && !QK.buf && !/^[ABab]$/.test(k)) { if (k.toLowerCase() === 'w' && Auth.can('lichchay', 'add')) { e.preventDefault(); return CHO.form(cur); } return; } QK.buf += k; QK.hint(); clearTimeout(QK.t); QK.t = setTimeout(() => { const s = QK.buf; QK.buf = ''; QK.hint(); if (s) QK.seat(s); }, 650); e.preventDefault(); return; }
    if (k === 'Enter') { e.preventDefault(); if (QK.buf) { clearTimeout(QK.t); const s = QK.buf; QK.buf = ''; QK.hint(); return QK.seat(s); } if (DV.sel.length) return ACT.dvBookSel(); if (DV.selB) return dvBAct('sua'); }
  },
  hint() { let h = $('#qkHint'); if (!QK.buf) { if (h) h.remove(); return; } if (!h) { document.body.insertAdjacentHTML('beforeend', '<div id="qkHint" class="qk-hint" data-runtime="1"></div>'); h = $('#qkHint'); } h.textContent = 'Ghế ' + QK.buf; },
  help() { Modal.open({ title: 'Phím tắt quầy vé', width: 460, body: `<table class="dv-tbl qk-t">${[['Gõ số ghế (vd 12)', 'Chọn / bỏ chọn ghế đó'], ['Enter', 'Đặt vé các ghế đang chọn · sửa vé đang chọn'], ['/ hoặc F2', 'Tìm vé theo SĐT, tên, mã vé'], ['Esc', 'Bỏ chọn'], ['Alt + ← / →', 'Chuyến trước / chuyến sau'], ['W', 'Thêm khách chờ'], ['?', 'Xem bảng này']].map(([a, b]) => `<tr><td><kbd>${a}</kbd></td><td>${b}</td></tr>`).join('')}</table>` }); }
};
document.addEventListener('keydown', e => { try { QK.key(e); } catch (x) { console.warn('QK', x); } });

/* ---------- gắn vào màn hình Đặt vé ---------- */
{
  const r0 = vLC.render;
  vLC.render = function (el) {
    r0.apply(this, arguments);
    try {
      const t = dvCur(); if (!t || DV.tab === 'lt') return;
      const hd = el.querySelector('.dm-mh'), ma = el.querySelector('.dm-act');
      if (hd) hd.insertAdjacentHTML('beforeend', CHO.btn(t) + (matchMedia('(hover:hover) and (pointer:fine)').matches ? `<button type="button" class="btn sm qkh-b" data-act="qkHelp" title="Phím tắt: gõ số ghế, Enter đặt vé…">⌨ Phím tắt</button>` : ''));
      if (ma) ma.insertAdjacentHTML('beforeend', CHO.btn(t));
      const cal = el.querySelector('.dm-cal'); if (cal && !el.querySelector('.dmc-t')) cal.insertAdjacentHTML('beforebegin', `<button type="button" class="dmc-t" data-act="dmCal">${ic('calendar')} ${document.documentElement.classList.contains('dmc-on') ? 'Ẩn lịch tháng' : 'Xem lịch tháng (âm lịch)'}</button>`);
      el.querySelectorAll('.ab-row').forEach(r => { if (!r.querySelector('[data-act="dvGX"]')) r.insertAdjacentHTML('beforeend', `<button type="button" class="ab" data-act="dvGX">${ic('message')}<span>Gửi xác nhận</span></button>`); });
      setTimeout(CHO.alert, 300);
    } catch (e) { console.warn('dvplus', e); }
  };
}
Object.assign(ACT, { choOpen: () => CHO.open(), dvGX: () => XNV.open(), qkHelp: () => QK.help(), dmCal: () => { const on = !document.documentElement.classList.contains('dmc-on'); document.documentElement.classList.toggle('dmc-on', on); try { localStorage.setItem('tgtp:dmcal', on ? '1' : '0'); } catch (e) { } App.render(); } });
try { if (localStorage.getItem('tgtp:dmcal') === '1') document.documentElement.classList.add('dmc-on'); } catch (e) { }
Auth.ACT_PERM.dmCal = ['lichchay', 'view'];
Object.assign(Auth.ACT_PERM, { choOpen: ['lichchay', 'view'], dvGX: ['lichchay', 'view'], qkHelp: ['lichchay', 'view'] });
ICONS.users = ICONS.users || '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>';
ICONS.message = ICONS.message || '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>';
addCSS(`.cho-b b{background:#e0e7ff;color:#3730a3;border-radius:9px;padding:0 6px;margin-left:2px}.cho-b.full{border-color:#fca5a5;color:#b91c1c}.cho-b.hot{border-color:#16a34a;color:#15803d;animation:choP 1.4s ease-in-out infinite}.cho-b.hot b{background:#16a34a;color:#fff}
@keyframes choP{0%,100%{box-shadow:0 0 0 0 rgba(22,163,74,.45)}50%{box-shadow:0 0 0 6px rgba(22,163,74,0)}}
.cho-i{display:flex;gap:10px;align-items:center;padding:10px;border:1px solid #e5e7eb;border-radius:12px;margin:6px 0}.cho-i.ok{border-color:#86efac;background:#f0fdf4}.cho-a{display:flex;gap:6px;flex:none}
.qk-hint{position:fixed;left:50%;bottom:90px;transform:translateX(-50%);background:#111827;color:#fff;font:700 22px system-ui;padding:10px 20px;border-radius:14px;z-index:9999;box-shadow:0 10px 30px rgba(0,0,0,.3)}
.qk-t kbd{background:#f3f4f6;border:1px solid #d1d5db;border-bottom-width:2px;border-radius:6px;padding:1px 7px;font:600 12.5px system-ui;white-space:nowrap}
@media(hover:none){.qkh-b{display:none}}
/* máy tính bảng, điện thoại: lịch tháng thu gọn (chọn ngày bằng mũi tên hoặc chạm vào ngày), sơ đồ ghế lên gần đầu màn hình */
.dmc-t{display:none}@media(max-width:1100px){.dmc-t{display:flex;align-items:center;gap:6px;margin:6px 0;border:1px dashed #cbd5e1;background:#fff;border-radius:10px;padding:7px 12px;font:600 13px system-ui;color:#475569;width:100%;justify-content:center;cursor:pointer}.dmc-t svg{width:16px;height:16px}html:not(.dmc-on) .dm-cal{display:none}}
@media(max-width:700px){.pg-line{font-size:12.5px;padding:5px 10px;gap:4px 10px;margin:4px 0}}`);

/* ---------- Thanh toán vé đoàn: cọc trước bao nhiêu, còn lại tài xế thu bao nhiêu · màu riêng từng loại vé ---------- */
const PAYG = {
  hue: s => { let h = 0; for (const c of String(s)) h = (h * 37 + c.charCodeAt(0)) % 360; return h; },
  st(b) { const tot = dvTot(b), coc = Math.min(+b.coc || 0, tot); return b.tt === 'tra' ? { k: 'tra', con: 0 } : coc > 0 ? { k: 'coc', coc, con: tot - coc } : { k: 'giu', con: tot }; },
  open() {
    const b = DB.datve.find(x => x.id === DV.selB); if (!b) return toast('Chưa chọn vé', 'err'); const t = dvTripOf(b); if (!t.id) return;
    if (!Auth.guard('lichchay', 'edit')) return; if (!lcCan(t)) return lcLockMsg();
    const G = (DV.one === b.id ? [b] : dvGrp(b)).slice().sort((a, c) => String(a.ghe).localeCompare(String(c.ghe), 'vi', { numeric: true }));
    const tot = sum(G, x => dvTot(x)), coc0 = sum(G, x => Math.min(+x.coc || 0, dvTot(x))), paid = G.every(x => x.tt === 'tra');
    const md = Modal.open({ title: `Thanh toán ${G.length > 1 ? 'đoàn ' + G.length + ' vé' : 'vé'} · ${esc(b.ten || '')}`, width: 500, body: `
      <div class="pg-sum"><div><span>Tổng tiền</span><b>${F.money(tot)}đ</b></div><div><span>Ghế</span><b>${esc(dvSeatsTxt(G))}</b></div></div>
      <div class="pg-opt"><label><input type="radio" name="pgk" value="coc" ${paid ? '' : 'checked'}> <b>Cọc trước</b>, còn lại tài xế thu</label><label><input type="radio" name="pgk" value="tra" ${paid ? 'checked' : ''}> <b>Thanh toán đủ</b> tại quầy</label></div>
      <div class="pg-row" data-pg-coc><label>Số tiền cọc<input class="inp" id="pgCoc" inputmode="numeric" value="${coc0 ? F.money(coc0) : ''}" placeholder="vd 500.000"></label><div class="pg-q">${[0.3, 0.5, 1].map(r => `<button type="button" class="btn sm" data-pgq="${Math.round(tot * r / 1000) * 1000}">${r === 1 ? 'Đủ' : r * 100 + '%'}</button>`).join('')}</div></div>
      <label class="pg-row">Hình thức nhận tiền<select class="inp" id="pgHt">${DV_HTTT.filter(x => x.value).map(x => `<option value="${x.value}" ${x.value === (G[0].cocHt || G[0].httt || 'tm') ? 'selected' : ''}>${x.label}</option>`).join('')}</select></label>
      <div class="pg-res" id="pgRes"></div>` , foot: `<button class="btn" data-pg-x>Hủy</button><button class="btn pri" data-pg-ok>${ic('check')} Lưu</button>` });
    const q = s => md.el.querySelector(s), num = () => Math.max(0, Math.min(tot, +String(q('#pgCoc').value || '').replace(/\D/g, '') || 0)), kind = () => (md.el.querySelector('[name=pgk]:checked') || {}).value;
    const draw = () => { const k = kind(), c = k === 'tra' ? tot : num(); q('[data-pg-coc]').style.display = k === 'tra' ? 'none' : ''; q('#pgRes').innerHTML = k === 'tra' ? `<div class="pg-ok">Đã thu đủ <b>${F.money(tot)}đ</b> · tài xế không phải thu</div>` : `<div class="pg-split"><div class="pg-c"><span>Đã cọc</span><b>${F.money(c)}đ</b></div><div class="pg-l"><span>Tài xế thu khi lên xe</span><b>${F.money(tot - c)}đ</b></div></div>${G.length > 1 ? `<div class="small muted" style="margin-top:6px">Chia cọc lần lượt theo ghế: ${(() => { let r = c; return G.map(x => { const v = Math.min(dvTot(x), r); r -= v; return esc(x.ghe) + ' cọc ' + F.money(v) + ', còn ' + F.money(dvTot(x) - v); }).join(' · '); })()}</div>` : ''}`; };
    md.el.addEventListener('input', draw); md.el.addEventListener('change', draw);
    md.el.addEventListener('click', ev => {
      const a = ev.target.closest('[data-pgq],[data-pg-x],[data-pg-ok]'); if (!a) return;
      if (a.dataset.pgq) { q('#pgCoc').value = F.money(+a.dataset.pgq); return draw(); }
      if (a.dataset.pgX !== undefined) return md.close();
      const k = kind(), ht = q('#pgHt').value, now = dvLog.now(), who = dvLog.who();
      if (k === 'tra') G.forEach(x => { x.tt = 'tra'; x.httt = ht; (x.lichSu = x.lichSu || []).push({ tg: now, nguoi: who, nd: 'Thanh toán đủ ' + F.money(dvTot(x)) + ' (' + (DV_HTTT.find(h => h.value === ht) || {}).label + ')' }); });
      else { let r = num(); if (!r) { toast('Nhập số tiền cọc', 'err'); return; } G.forEach(x => { const v = Math.min(dvTot(x), r); r -= v; x.coc = v; x.cocHt = ht; x.tt = v >= dvTot(x) && v > 0 ? 'tra' : 'giu'; if (x.tt === 'tra') x.httt = ht; (x.lichSu = x.lichSu || []).push({ tg: now, nguoi: who, nd: 'Cọc ' + F.money(v) + ', tài xế thu ' + F.money(dvTot(x) - v) }); }); }
      md.close(); App.changed(); toast(k === 'tra' ? 'Đã thanh toán đủ' : 'Đã lưu tiền cọc · tài xế thu phần còn lại', 'ok');
    });
    draw();
  },
  /* tô màu ghế: đã cọc (cam), vé đoàn (viền cùng màu theo đoàn) + nhãn tiền còn thu */
  paint(el) {
    el.querySelectorAll('.dv-grid .dv-seat[data-b]').forEach(btn => {
      const b = DB.datve.find(x => x.id === btn.dataset.b); if (!b) return; const s = PAYG.st(b);
      if (s.k === 'coc') { btn.classList.add('cc'); btn.insertAdjacentHTML('beforeend', `<span class="pg-tag">còn ${F.money(Math.round(s.con / 1000))}k</span>`); }
      if (b.nhom && dvGrp(b).length > 1) { btn.classList.add('gp'); btn.style.setProperty('--gh', PAYG.hue(b.nhom)); }
    });
    const lg = el.querySelector('.dv-lg'); if (lg && !lg.querySelector('.lg-cc')) lg.insertAdjacentHTML('afterbegin', `<span><i class="lg-cc"></i>Đã cọc · tài xế thu phần còn lại</span><span><i class="lg-gp"></i>Vé đoàn (cùng màu viền)</span>`);
  }
};
{
  const r1 = vLC.render;
  vLC.render = function (el) {
    r1.apply(this, arguments);
    try {
      PAYG.paint(el);
      el.querySelectorAll('.ab-row').forEach(r => { if (!r.querySelector('[data-act="dvPayG"]') && Auth.can('lichchay', 'edit')) r.insertAdjacentHTML('afterbegin', `<button type="button" class="ab pg-ab" data-act="dvPayG">${ic('wallet')}<span>Cọc / thanh toán</span></button>`); });
      const b = DV.selB && DB.datve.find(x => x.id === DV.selB);
      if (b) { const G = DV.one === b.id ? [b] : dvGrp(b), tot = sum(G, x => dvTot(x)), coc = sum(G, x => x.tt === 'tra' ? dvTot(x) : Math.min(+x.coc || 0, dvTot(x))), h = el.querySelector('.ab-h');
        if (h && !el.querySelector('.pg-line')) h.insertAdjacentHTML('afterend', `<div class="pg-line"><span>Tổng <b>${F.money(tot)}</b></span><span class="c">Đã thu/cọc <b>${F.money(coc)}</b></span><span class="l">Tài xế thu <b>${F.money(tot - coc)}</b></span></div>`); }
    } catch (e) { console.warn('PAYG', e); }
  };
}
Object.assign(ACT, { dvPayG: () => PAYG.open() }); Auth.ACT_PERM.dvPayG = ['lichchay', 'edit'];
ICONS.wallet = ICONS.wallet || '<path d="M20 7H5a2 2 0 0 1 0-4h13v4"/><path d="M3 5v14a2 2 0 0 0 2 2h15V7"/><circle cx="16" cy="14" r="1.5"/>';
addCSS(`.dv-grid .dv-seat.cc{background:#fed7aa!important;border-color:#fb923c!important;--sc:194,65,12}.dv-grid .dv-seat.gp{outline:3px solid hsl(var(--gh) 70% 45%);outline-offset:-3px}
.pg-tag{position:absolute;left:3px;right:3px;bottom:3px;font:800 10.5px/1.3 system-ui;color:#9a3412;background:rgba(255,255,255,.75);border-radius:6px;text-align:center;pointer-events:none}.dv-seat{position:relative}
.lg-cc{background:#fed7aa!important;border:1px solid #fb923c!important}.lg-gp{background:#fff!important;outline:3px solid hsl(200 70% 45%);outline-offset:-3px}
.pg-line{display:flex;flex-wrap:wrap;gap:6px 14px;padding:6px 12px;font-size:13px;background:#fff7ed;border-radius:10px;margin:6px 0}.pg-line .c b{color:#15803d}.pg-line .l b{color:#c2410c}
.pg-sum{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px}.pg-sum div{background:#f8fafc;border-radius:12px;padding:10px}.pg-sum span{display:block;font-size:12px;color:#64748b}.pg-sum b{font-size:18px}
.pg-opt{display:grid;gap:8px;margin-bottom:12px}.pg-opt label{display:flex;gap:8px;align-items:center;padding:10px 12px;border:1px solid #e5e7eb;border-radius:12px;cursor:pointer}.pg-opt label:has(input:checked){border-color:#6366f1;background:#eef2ff}
.pg-row{display:block;margin-bottom:10px;font-size:13px;font-weight:600}.pg-row .inp{margin-top:4px;width:100%;font-size:18px;font-weight:700}.pg-q{display:flex;gap:6px;margin-top:6px}
.pg-split{display:grid;grid-template-columns:1fr 1fr;gap:10px}.pg-split div{border-radius:12px;padding:10px}.pg-split span{display:block;font-size:12px}.pg-split b{font-size:20px}.pg-c{background:#dcfce7;color:#166534}.pg-l{background:#ffedd5;color:#9a3412}.pg-ok{background:#dcfce7;color:#166534;border-radius:12px;padding:12px}`);

/* màn hình đã chép render cũ của module (MODL.stub) → trỏ lại về bản đã gắn thêm */
[CFG.views.lichchay, App.views && App.views.lichchay].forEach(v => { if (v && v !== vLC) v.render = vLC.render; });
MODL.def('dvplus', { CHO, XNV, QK, PAYG });
if (App.cur === 'lichchay') try { App.render(); } catch (e) { }
