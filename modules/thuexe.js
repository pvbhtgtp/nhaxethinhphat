'use strict';
/* Module Thuê xe hợp đồng (kinh doanh) · tải khi mở màn hình (MODL). Dùng chung dữ liệu với Hợp đồng vận chuyển (DB.hdvc):
   - Bảng giá thuê xe (Cài đặt chung: settings.giaThue) → báo giá tự tính, gửi khách qua Zalo / SMS.
   - Báo giá (DB.baoGia): mới → đã gửi → khách đồng ý (tạo hợp đồng) / không thuê.
   - Thu tiền & công nợ trên từng hợp đồng (hdvc.thu), QR chuyển khoản đúng số còn nợ; khách xác nhận hợp đồng (hdvc.xn: kênh, lúc, người ghi).
   - Lãi lỗ từng hợp đồng: doanh thu − dầu (tự lấy từ Nhiên liệu theo xe + ngày chạy) − chi phí thực tế (hdvc.chi).
   - Khách thuê: tự gom từ hợp đồng + báo giá theo số điện thoại (nhập 1 lần, không lưu riêng). */
const TXE = {
  tab: 'bg', ym: '', q: '', no: false,
  can: a => Auth.can('hdvc', a || 'edit'),
  gia: () => (S().giaThue = S().giaThue || [{ id: 'g16', loai: 'Xe 16 chỗ', soCho: 16, giaKm: 12000, toiThieu: 1500000, giaNgay: 2500000, kmNgay: 250, phuDem: 300000, phuLe: 30 }, { id: 'g29', loai: 'Xe 29 chỗ', soCho: 29, giaKm: 16000, toiThieu: 2200000, giaNgay: 3500000, kmNgay: 250, phuDem: 400000, phuLe: 30 }]),
  bgs: () => (DB.baoGia = DB.baoGia || []),
  TT: { moi: ['Mới', 'b-gray'], gui: ['Đã gửi khách', 'b-blue'], dongy: ['Khách đồng ý', 'b-green'], huy: ['Không thuê', 'b-red'] },
  m: n => F.money(Math.round(+n || 0)),
  nm: s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/\s+/g, ' ').trim(),
  ph: s => String(s || '').replace(/\D/g, '').replace(/^84/, '0'),
  days: (a, b) => a ? Math.max(1, Math.round((D.parse(b || a) - D.parse(a)) / 864e5) + 1) : 1,
  /* tính giá: 1 ngày = max(giá tối thiểu, km × đơn giá); nhiều ngày = max(trên, số ngày × giá ngày + km vượt × đơn giá); + phụ phí đêm; + % ngày lễ; làm tròn 10.000 */
  calc(b) {
    const g = TXE.gia().find(x => x.id === b.loai); if (!g) return 0;
    const km = +b.km || 0, nd = TXE.days(b.ngayDon, b.ngayTra); let p = Math.max(+g.toiThieu || 0, km * (+g.giaKm || 0));
    if (nd > 1) p = Math.max(p, nd * (+g.giaNgay || 0) + Math.max(0, km - nd * (+g.kmNgay || 0)) * (+g.giaKm || 0));
    if (b.dem) p += +g.phuDem || 0; if (b.le) p *= 1 + (+g.phuLe || 0) / 100;
    return Math.round(p / 10000) * 10000;
  },
  bgNext() { const y = D.today().slice(2, 4), n = TXE.bgs().filter(x => String(x.so || '').startsWith('BG' + y)).length + 1; return 'BG' + y + '-' + String(n).padStart(3, '0'); },
  msg(b) {
    const c = S().company || {}, g = TXE.gia().find(x => x.id === b.loai) || {}, gia = +b.giaChot || +b.giaTinh || 0;
    return [`BÁO GIÁ THUÊ XE · ${coApp()}`, `Kính gửi: ${b.ten || 'Quý khách'}`, `Hành trình: ${b.hanhTrinh || ''}`, b.diemDon ? `Đón: ${b.diemDon}${b.gioDon ? ' lúc ' + b.gioDon : ''} ${b.ngayDon ? F.date(b.ngayDon) : ''}` : '', b.diemTra ? `Trả: ${b.diemTra}${b.ngayTra && b.ngayTra !== b.ngayDon ? ' ' + F.date(b.ngayTra) : ''}` : '',
      `Xe: ${g.loai || ''}${b.soKhach ? ' · ' + b.soKhach + ' khách' : ''}${b.km ? ' · khoảng ' + b.km + ' km' : ''}`, `Giá trọn gói: ${TXE.m(gia)} đồng${b.cauDuong ? ' (đã gồm cầu đường, bến bãi)' : ' (chưa gồm cầu đường, bến bãi)'}`, b.ghiChu || '',
      'Xe chạy theo hợp đồng thuê nguyên chuyến; quý khách gửi danh sách hành khách trước ngày đi.', 'Báo giá có hiệu lực 3 ngày.', `Liên hệ: ${c.sdt || ''} ${c.ten || ''}`.trim()].filter(Boolean).join('\n');
  },
  send(b) {
    const t = TXE.msg(b), sdt = TXE.ph(b.sdt);
    const m = Modal.open({ title: 'Gửi báo giá ' + esc(b.so), width: 520, body: `<textarea class="inp" data-t rows="14" style="width:100%;font:14px/1.5 system-ui">${esc(t)}</textarea><div class="small muted" style="margin-top:6px">Sửa được trước khi gửi. "Zalo" mở khung chat với số khách: bấm Sao chép rồi dán vào.</div>`,
      foot: `<button class="btn" data-cp>${ic('copy')} Sao chép</button>${sdt ? `<a class="btn" data-sms href="sms:${esc(sdt)}?body=">${ic('message')} SMS</a><a class="btn pri" data-zl href="https://zalo.me/${esc(sdt)}" target="_blank" rel="noopener">Zalo</a>` : ''}` });
    const val = () => m.el.querySelector('[data-t]').value, mark = () => { if (b.tt === 'moi') { b.tt = 'gui'; b.guiAt = dvLog.now(); App.changed(); } };
    const cp = () => navigator.clipboard.writeText(val()).then(() => toast('Đã sao chép báo giá', 'ok'), () => toast('Máy không cho sao chép tự động', 'err'));
    m.el.querySelector('[data-cp]').onclick = () => { cp(); mark(); };
    const zl = m.el.querySelector('[data-zl]'); if (zl) zl.onclick = () => { cp(); mark(); };
    const sm = m.el.querySelector('[data-sms]'); if (sm) sm.onclick = () => { sm.href = 'sms:' + sdt + '?body=' + encodeURIComponent(val()); mark(); };
  },
  /* form báo giá: giá tự tính theo bảng giá, sửa được ở ô Giá chốt */
  bgForm(b0) {
    if (!TXE.can(b0 ? 'edit' : 'add')) return toast('Bạn chưa có quyền tạo / sửa báo giá', 'err');
    const isNew = !b0, G = TXE.gia();
    const m = Form.open({ title: isNew ? 'Báo giá thuê xe' : 'Báo giá ' + esc(b0.so), width: 760, cols: 2, value: b0 || { so: TXE.bgNext(), ngay: D.today(), loai: (G[0] || {}).id, tt: 'moi' },
      fields: [{ type: 'section', label: 'Khách hàng' }, { key: 'ten', label: 'Tên khách / đơn vị', required: true }, { key: 'sdt', label: 'Điện thoại' },
        { type: 'section', label: 'Chuyến đi' }, { key: 'hanhTrinh', label: 'Hành trình', full: true, required: true }, { key: 'diemDon', label: 'Điểm đón' }, { key: 'diemTra', label: 'Điểm trả' },
        { key: 'ngayDon', label: 'Ngày đi', type: 'date' }, { key: 'gioDon', label: 'Giờ đón', type: 'time' }, { key: 'ngayTra', label: 'Ngày về', type: 'date' }, { key: 'soKhach', label: 'Số khách', type: 'number' },
        { type: 'section', label: 'Giá' }, { key: 'loai', label: 'Loại xe (theo bảng giá)', type: 'select', options: G.map(g => ({ value: g.id, label: g.loai })) }, { key: 'km', label: 'Tổng km (cả đi và về)', type: 'number' },
        { key: 'dem', label: 'Chạy đêm (cộng phụ phí đêm)', type: 'checkbox' }, { key: 'le', label: 'Ngày lễ, Tết (cộng % ngày lễ)', type: 'checkbox' }, { key: 'cauDuong', label: 'Giá đã gồm cầu đường, bến bãi', type: 'checkbox' },
        { key: 'giaTinh', label: 'Giá tính theo bảng (đ)', type: 'money', hint: 'Tự tính' }, { key: 'giaChot', label: 'Giá chốt với khách (đ)', type: 'money', hint: 'Để trống = lấy giá tính' }, { key: 'ghiChu', label: 'Ghi chú gửi khách', full: true },
        { key: 'tt', label: 'Trạng thái', type: 'select', options: Object.entries(TXE.TT).map(([k, v]) => ({ value: k, label: v[0] })) }],
      saveText: 'Lưu báo giá',
      onSave: d => { d.so = b0 ? b0.so : TXE.bgNext(); d.ngay = b0 ? b0.ngay || D.today() : D.today(); d.giaTinh = TXE.calc(d); if (isNew) TXE.bgs().push({ id: uid(), ...d, nguoi: dvLog.who(), tg: dvLog.now() }); else Object.assign(b0, d); App.changed(); toast('Đã lưu báo giá ' + esc(d.so), 'ok'); } });
    const f = n => m.el.querySelector(`[name=${n}]`), gt = f('giaTinh'); if (gt) gt.readOnly = true;
    const upd = () => { const d = readForm(m.el, [{ key: 'loai' }, { key: 'km', type: 'number' }, { key: 'ngayDon' }, { key: 'ngayTra' }, { key: 'dem', type: 'checkbox' }, { key: 'le', type: 'checkbox' }]); if (gt) gt.value = F.money(TXE.calc(d)); };
    ['loai', 'km', 'ngayDon', 'ngayTra', 'dem', 'le'].forEach(k => { const i = f(k); if (i) { i.addEventListener('input', upd); i.addEventListener('change', upd); } }); upd();
  },
  /* khách đồng ý → tạo hợp đồng vận chuyển từ báo giá rồi mở để bổ sung (xe, lái xe, danh sách khách) */
  toHD(b) {
    if (!Auth.can('hdvc', 'add')) return toast('Bạn chưa có quyền tạo hợp đồng', 'err');
    if (b.hdId && vcById(b.hdId)) return vcForm(vcById(b.hdId));
    const gia = +b.giaChot || +b.giaTinh || 0, c = { id: uid(), so: vcNext(), ngayKy: D.today(), bBTen: b.ten || '', bBSdt: b.sdt || '', hanhTrinh: b.hanhTrinh || '', diemDon: b.diemDon || '', diemTra: b.diemTra || '',
      ngayDon: b.ngayDon || '', gioDon: b.gioDon || '', ngayTra: b.ngayTra || '', soKhach: b.soKhach || '', cuLy: b.km ? Math.round(+b.km / 2) : '', giaTri: gia, giaTriChu: gia ? docSo(gia).toUpperCase() : '',
      hinhThucTT: 'Chuyển khoản qua ngân hàng hoặc tiền mặt', cpCauDuong: b.cauDuong ? 'A' : 'B', khuHoi: true, bgId: b.id };
    DB.hdvc.push(c); b.tt = 'dongy'; b.hdId = c.id; App.changed(); toast('Đã tạo hợp đồng ' + esc(vcSo(c)) + ' từ báo giá. Bổ sung xe, lái xe, danh sách khách rồi lưu.', 'ok', 6000); vcForm(c);
  },
  /* tiền: đã thu, còn nợ */
  daThu: c => (c.thu || []).reduce((s, x) => s + (+x.tien || 0), 0),
  conNo: c => Math.max(0, (+c.giaTri || 0) - TXE.daThu(c)),
  qrUrl(c, amt) { const co = S().company || {}, acc = String(co.stkDN || '').replace(/\s/g, ''), bk = typeof DVP !== 'undefined' ? DVP.bank(co) : ''; if (!acc || !bk) return '';
    return `https://img.vietqr.io/image/${bk}-${encodeURIComponent(acc)}-compact2.png?amount=${Math.round(amt)}&addInfo=${encodeURIComponent(('HD ' + vcSo(c)).replace(/[^\w\s-]/g, ' ').slice(0, 25))}&accountName=${encodeURIComponent(TTT.nm(co.ten || ''))}`; },
  thu(c) {
    if (!TXE.can()) return toast('Bạn chưa có quyền ghi thu tiền', 'err');
    const no = TXE.conNo(c), qr = TXE.qrUrl(c, no);
    const m = Modal.open({ title: 'Thu tiền hợp đồng ' + esc(vcSo(c)), width: 560, body: `<div class="small" style="margin-bottom:8px"><b>${esc(c.bBTen || '')}</b> · Giá trị ${TXE.m(c.giaTri)} đ · Đã thu ${TXE.m(TXE.daThu(c))} đ · <b style="color:#b45309">Còn ${TXE.m(no)} đ</b></div>
      ${(c.thu || []).length ? `<table class="tbl compact" style="margin-bottom:10px"><thead><tr><th>Ngày</th><th>Số tiền</th><th>Hình thức</th><th>Ghi chú</th><th>Người ghi</th></tr></thead><tbody>${c.thu.map(x => `<tr><td>${esc(F.date(x.ngay))}</td><td class="r">${TXE.m(x.tien)}</td><td>${x.ht === 'ck' ? 'Chuyển khoản' : 'Tiền mặt'}</td><td>${esc(x.gc || '')}</td><td class="small">${esc(x.nguoi || '')}</td></tr>`).join('')}</tbody></table>` : ''}
      <div class="form"><label class="field"><span>Số tiền thu (đ)</span><input class="inp" data-t inputmode="numeric" value="${no ? F.money(no) : ''}"></label><label class="field"><span>Ngày</span><input class="inp" type="date" data-d value="${D.today()}"></label>
      <label class="field"><span>Hình thức</span><select class="inp" data-h><option value="ck">Chuyển khoản</option><option value="tm">Tiền mặt</option></select></label><label class="field"><span>Ghi chú</span><input class="inp" data-g placeholder="Cọc, thanh toán đợt 2..."></label></div>
      ${qr && no ? `<div style="text-align:center;margin-top:8px"><img src="${qr}" alt="QR" style="width:220px;border:1px solid #e4e7ec;border-radius:10px"><div class="small muted">Khách quét để chuyển đúng ${TXE.m(no)} đ</div></div>` : (no ? '<div class="small muted">Nhập Số tài khoản, Ngân hàng công ty (Cài đặt › Công ty) để hiện mã QR.</div>' : '')}`,
      foot: `<button class="btn" data-x>Đóng</button><button class="btn pri" data-ok>${ic('check')} Ghi thu</button>` });
    const q = s => m.el.querySelector(s); q('[data-x]').onclick = () => m.close();
    q('[data-ok]').onclick = () => { const t = F.parse(q('[data-t]').value); if (!(t > 0)) return toast('Nhập số tiền', 'err');
      (c.thu = c.thu || []).push({ id: uid(), ngay: q('[data-d]').value || D.today(), tien: t, ht: q('[data-h]').value, gc: q('[data-g]').value.trim(), nguoi: dvLog.who(), tg: dvLog.now() }); App.changed(); m.close(); toast('Đã ghi thu ' + TXE.m(t) + ' đ', 'ok'); };
  },
  /* khách xác nhận hợp đồng: ghi lại kênh, thời điểm, người ghi (xác nhận qua Zalo / SMS / ký giấy) */
  xn(c) {
    if (!TXE.can()) return toast('Bạn chưa có quyền sửa hợp đồng', 'err');
    const m = Modal.open({ title: 'Khách xác nhận hợp đồng ' + esc(vcSo(c)), width: 460, body: `<div class="form"><label class="field full"><span>Khách xác nhận qua</span><select class="inp" data-k><option>Zalo</option><option>Tin nhắn SMS</option><option>Email</option><option>Ký hợp đồng giấy</option><option>Điện thoại (ghi âm)</option></select></label>
      <label class="field full"><span>Người xác nhận bên khách</span><input class="inp" data-n value="${esc(c.bBTen || '')}"></label><label class="field full"><span>Ghi chú (vd: nội dung tin nhắn đồng ý)</span><input class="inp" data-g></label></div>
      <p class="small muted" style="margin:0">Nên lưu ảnh chụp tin nhắn đồng ý của khách vào Lưu trữ hồ sơ để làm bằng chứng.</p>`, foot: '<button class="btn" data-x>Đóng</button><button class="btn pri" data-ok>Ghi nhận</button>' });
    const q = s => m.el.querySelector(s); q('[data-x]').onclick = () => m.close();
    q('[data-ok]').onclick = () => { c.xn = { kenh: q('[data-k]').value, ai: q('[data-n]').value.trim(), gc: q('[data-g]').value.trim(), tg: dvLog.now(), nguoi: dvLog.who() }; App.changed(); m.close(); toast('Đã ghi nhận khách xác nhận hợp đồng', 'ok'); };
  },
  /* chi phí: dầu tự lấy từ Nhiên liệu (xe của hợp đồng, trong các ngày chạy); còn lại nhập thực tế */
  dau(c) { const v = (DB.vehicles || []).find(x => x.id === c.xeId); if (!v || !c.ngayDon) return 0; const a = c.ngayDon, b = c.ngayTra || c.ngayDon;
    return (DB.nhienlieu || []).filter(r => r.loai !== 'nhap' && r.ngay >= a && r.ngay <= b && (r.xe === v.bks || r.xe === v.id || TXE.nm(r.xe) === TXE.nm(v.bks))).reduce((s, r) => s + Math.round((+r.lit || 0) * (+r.gia || 0)), 0); },
  chi: c => { const x = c.chi || {}; return { dau: x.dau != null && x.dau !== '' ? +x.dau : TXE.dau(c), cau: +x.cau || 0, an: +x.an || 0, cong: +x.cong || 0, khac: +x.khac || 0 }; },
  lai: c => { const x = TXE.chi(c); return (+c.giaTri || 0) - x.dau - x.cau - x.an - x.cong - x.khac; },
  chiForm(c) {
    if (!TXE.can()) return toast('Bạn chưa có quyền sửa hợp đồng', 'err');
    const x = c.chi || {}, auto = TXE.dau(c);
    Form.open({ title: 'Chi phí thực tế · ' + esc(vcSo(c)), width: 520, cols: 2, value: { dau: x.dau != null ? x.dau : '', cau: x.cau || '', an: x.an || '', cong: x.cong || '', khac: x.khac || '', gc: x.gc || '' },
      fields: [{ key: 'dau', label: 'Dầu (đ)', type: 'money', hint: 'Để trống = tự lấy từ Nhiên liệu: ' + TXE.m(auto) + ' đ' }, { key: 'cau', label: 'Cầu đường, bến bãi (đ)', type: 'money' }, { key: 'an', label: 'Ăn nghỉ lái xe (đ)', type: 'money' },
        { key: 'cong', label: 'Công lái xe, phụ xe (đ)', type: 'money' }, { key: 'khac', label: 'Chi phí khác (đ)', type: 'money' }, { key: 'gc', label: 'Ghi chú', full: true }],
      saveText: 'Lưu chi phí', onSave: d => { c.chi = { ...d, dau: +d.dau > 0 ? +d.dau : null }; App.changed(); toast('Đã lưu chi phí', 'ok'); } });
  },
  /* khách thuê: gom theo số điện thoại (không có thì theo tên) từ hợp đồng + báo giá */
  khach() {
    const K = new Map(), key = (sdt, ten) => TXE.ph(sdt) || 'n:' + TXE.nm(ten);
    (DB.hdvc || []).forEach(c => { if (!c.bBTen && !c.bBSdt) return; const k = key(c.bBSdt, c.bBTen); const o = K.get(k) || { ten: c.bBTen, sdt: c.bBSdt, hd: [], bg: [] }; o.hd.push(c); if (!o.ten) o.ten = c.bBTen; if (!o.sdt) o.sdt = c.bBSdt; K.set(k, o); });
    TXE.bgs().forEach(b => { if (!b.ten && !b.sdt) return; const k = key(b.sdt, b.ten); const o = K.get(k) || { ten: b.ten, sdt: b.sdt, hd: [], bg: [] }; o.bg.push(b); K.set(k, o); });
    return [...K.values()].map(o => ({ ...o, tong: o.hd.reduce((s, c) => s + (+c.giaTri || 0), 0), no: o.hd.reduce((s, c) => s + TXE.conNo(c), 0), last: [...o.hd.map(c => c.ngayDon || c.ngayKy || ''), ...o.bg.map(b => b.ngay || '')].sort().pop() || '' })).sort((a, b) => b.last.localeCompare(a.last));
  },
  khachView(o) {
    const w = Modal.open({ title: 'Khách thuê · ' + esc(o.ten || o.sdt), width: 720, body: `<div class="small" style="margin-bottom:8px">${o.sdt ? `<a href="tel:${esc(o.sdt)}">${esc(o.sdt)}</a> · ` : ''}${o.hd.length} hợp đồng · tổng ${TXE.m(o.tong)} đ${o.no ? ` · <b style="color:#b45309">còn nợ ${TXE.m(o.no)} đ</b>` : ''} · ${o.bg.length} báo giá</div>
      <table class="tbl compact"><thead><tr><th>Ngày đi</th><th>Loại</th><th>Hành trình</th><th class="r">Giá trị</th><th class="r">Còn nợ</th></tr></thead><tbody>${[...o.hd.map(c => ({ d: c.ngayDon || c.ngayKy, t: 'HĐ ' + vcSo(c), h: c.hanhTrinh, g: c.giaTri, n: TXE.conNo(c) })), ...o.bg.map(b => ({ d: b.ngayDon || b.ngay, t: 'Báo giá ' + b.so + ' · ' + (TXE.TT[b.tt] || TXE.TT.moi)[0], h: b.hanhTrinh, g: +b.giaChot || +b.giaTinh, n: '' }))].sort((a, b) => String(b.d).localeCompare(String(a.d))).map(r => `<tr><td>${esc(F.date(r.d || ''))}</td><td>${esc(r.t)}</td><td>${esc(r.h || '')}</td><td class="r">${TXE.m(r.g)}</td><td class="r">${r.n ? TXE.m(r.n) : ''}</td></tr>`).join('')}</tbody></table>`, foot: '<button class="btn" data-x>Đóng</button>' }); w.el.querySelector('[data-x]').onclick = () => w.close();
  },
  giaForm() {
    if (!TXE.can()) return toast('Bạn chưa có quyền sửa bảng giá', 'err');
    let G = JSON.parse(JSON.stringify(TXE.gia())); const K = [['loai', 'Loại xe', 'text'], ['soCho', 'Số chỗ', 'number'], ['giaKm', 'Đơn giá / km', 'number'], ['toiThieu', 'Giá tối thiểu / chuyến', 'number'], ['giaNgay', 'Giá theo ngày', 'number'], ['kmNgay', 'Km gồm trong 1 ngày', 'number'], ['phuDem', 'Phụ phí chạy đêm', 'number'], ['phuLe', '% ngày lễ', 'number']];
    const m = Modal.open({ title: 'Bảng giá thuê xe', width: 900, body: '<div data-b></div><p class="small muted">Giá 1 ngày = cao hơn giữa giá tối thiểu và km × đơn giá. Nhiều ngày = số ngày × giá ngày + km vượt × đơn giá. Cộng phụ phí đêm, % ngày lễ; làm tròn 10.000 đ.</p>', foot: `<button class="btn left" data-add>${ic('plus')} Thêm loại xe</button><button class="btn" data-x>Đóng</button><button class="btn pri" data-ok>${ic('save')} Lưu bảng giá</button>` });
    const B = m.el.querySelector('[data-b]'), read = () => B.querySelectorAll('tr[data-i]').forEach(tr => { const g = G[+tr.dataset.i]; K.forEach(([k, , t]) => { const v = tr.querySelector(`[data-k=${k}]`).value; g[k] = t === 'number' ? F.parse(v) : v.trim(); }); });
    const draw = () => { B.innerHTML = `<div class="tbl-wrap free"><table class="tbl compact"><thead><tr>${K.map(k => `<th>${k[1]}</th>`).join('')}<th></th></tr></thead><tbody>${G.map((g, i) => `<tr data-i="${i}">${K.map(([k, , t]) => `<td><input class="inp" data-k="${k}" ${t === 'number' ? 'inputmode="numeric"' : ''} value="${esc(t === 'number' && g[k] ? (k === 'phuLe' || k === 'soCho' || k === 'kmNgay' ? g[k] : F.money(g[k])) : (g[k] || ''))}" style="min-width:${k === 'loai' ? 120 : 80}px"></td>`).join('')}<td><button class="ibtn" data-del="${i}">${ic('trash')}</button></td></tr>`).join('')}</tbody></table></div>`;
      B.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { read(); G.splice(+b.dataset.del, 1); draw(); }); };
    m.el.querySelector('[data-add]').onclick = () => { read(); G.push({ id: 'g' + Date.now().toString(36), loai: '', soCho: '', giaKm: '', toiThieu: '', giaNgay: '', kmNgay: 250, phuDem: '', phuLe: 30 }); draw(); };
    m.el.querySelector('[data-x]').onclick = () => m.close();
    m.el.querySelector('[data-ok]').onclick = () => { read(); if (G.some(g => !g.loai)) return toast('Nhập tên loại xe cho mọi dòng', 'err'); S().giaThue = G; App.changed(); m.close(); toast('Đã lưu bảng giá', 'ok'); };
    draw();
  },
  tabs: [['bg', 'Báo giá'], ['tien', 'Thu tiền & công nợ'], ['lai', 'Lãi lỗ'], ['khach', 'Khách thuê'], ['gia', 'Bảng giá']],
  stHD: c => { try { return VCK.stTxt(c); } catch (e) { return ''; } }
};
const vTXE = {
  title: 'Thuê xe hợp đồng', icon: 'receipt', desc: 'Bảng giá, báo giá gửi khách, thu tiền và công nợ, lãi lỗ từng hợp đồng, danh bạ khách thuê xe',
  tools: () => TXE.tab === 'bg' && TXE.can('add') ? `<button class="btn pri" data-act="txeBg">${ic('plus')} Báo giá mới</button>` : TXE.tab === 'gia' && TXE.can() ? `<button class="btn pri" data-act="txeGia">${ic('edit')} Sửa bảng giá</button>` : '',
  render(el) {
    if (!TXE.ym) TXE.ym = D.today().slice(0, 7);
    const tabs = `<div class="seg" style="margin-bottom:12px">${TXE.tabs.map(([k, l]) => `<button type="button" class="${TXE.tab === k ? 'on' : ''}" data-act="txeTab" data-k="${k}">${l}</button>`).join('')}</div>`, m = TXE.m;
    const T = TXE.tab; let body = '';
    if (T === 'bg') {
      const L = TXE.bgs().slice().sort((a, b) => String(b.ngay || '').localeCompare(String(a.ngay || '')) || String(b.so).localeCompare(String(a.so)));
      body = L.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Số</th><th>Ngày</th><th>Khách</th><th>Hành trình</th><th>Ngày đi</th><th class="r">Giá</th><th>Trạng thái</th><th></th></tr></thead><tbody>${L.map(b => { const t = TXE.TT[b.tt] || TXE.TT.moi; return `<tr>
        <td><a href="#" data-act="txeBgE" data-id="${esc(b.id)}"><b>${esc(b.so)}</b></a></td><td>${esc(F.date(b.ngay || ''))}</td><td>${esc(b.ten || '')}<div class="small muted">${esc(b.sdt || '')}</div></td><td>${esc(b.hanhTrinh || '')}</td><td>${esc(F.date(b.ngayDon || ''))}</td><td class="r"><b>${m(+b.giaChot || +b.giaTinh)}</b></td>
        <td><span class="badge ${t[1]}">${t[0]}</span></td><td style="white-space:nowrap"><button class="btn sm" data-act="txeSend" data-id="${esc(b.id)}">${ic('send')} Gửi</button> <button class="btn sm${b.tt === 'dongy' ? '' : ' pri'}" data-act="txeHD" data-id="${esc(b.id)}">${b.hdId ? 'Mở hợp đồng' : 'Khách đồng ý → tạo HĐ'}</button></td></tr>`; }).join('')}</tbody></table></div>` : '<div class="card card-b muted">Chưa có báo giá. Bấm <b>Báo giá mới</b>: chọn loại xe, nhập km, app tự tính giá theo bảng giá.</div>';
    } else if (T === 'tien' || T === 'lai') {
      const ym = TXE.ym, L = (DB.hdvc || []).filter(c => T === 'tien' ? (TXE.no ? TXE.conNo(c) > 0 : String(c.ngayDon || c.ngayKy || '').startsWith(ym) || TXE.conNo(c) > 0) : String(c.ngayDon || c.ngayKy || '').startsWith(ym)).sort((a, b) => String(b.ngayDon || b.ngayKy || '').localeCompare(String(a.ngayDon || a.ngayKy || '')));
      const bar = `<div class="row" style="gap:8px;align-items:center;margin-bottom:10px;flex-wrap:wrap"><input type="month" class="inp" data-act-ym value="${esc(ym)}" style="width:auto">${T === 'tien' ? `<label class="small"><input type="checkbox" data-act-no ${TXE.no ? 'checked' : ''}> Chỉ hợp đồng còn nợ (mọi tháng)</label>` : ''}</div>`;
      if (T === 'tien') { const tg = L.reduce((s, c) => s + (+c.giaTri || 0), 0), tt = L.reduce((s, c) => s + TXE.daThu(c), 0);
        body = bar + `<div class="small" style="margin-bottom:8px">${L.length} hợp đồng · giá trị ${m(tg)} đ · đã thu ${m(tt)} đ · <b style="color:#b45309">còn nợ ${m(tg - tt)} đ</b></div>` + (L.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Hợp đồng</th><th>Khách</th><th>Ngày đi</th><th>Chuyến</th><th>Xác nhận</th><th class="r">Giá trị</th><th class="r">Đã thu</th><th class="r">Còn nợ</th><th></th></tr></thead><tbody>${L.map(c => { const no = TXE.conNo(c); return `<tr>
          <td><a href="#" data-act="txeHDo" data-id="${esc(c.id)}"><b>${esc(vcSo(c))}</b></a></td><td>${esc(c.bBTen || '')}<div class="small muted">${esc(c.bBSdt || '')}</div></td><td>${esc(F.date(c.ngayDon || ''))}</td><td class="small">${esc(TXE.stHD(c))}</td>
          <td class="small">${c.xn ? `<span class="badge b-green" title="${esc((c.xn.ai || '') + ' · ' + c.xn.tg + ' · ghi: ' + c.xn.nguoi)}">${esc(c.xn.kenh)}</span>` : `<button class="btn sm" data-act="txeXn" data-id="${esc(c.id)}">Ghi xác nhận</button>`}</td>
          <td class="r">${m(c.giaTri)}</td><td class="r">${m(TXE.daThu(c))}</td><td class="r"><b${no ? ' style="color:#b45309"' : ''}>${m(no)}</b></td><td><button class="btn sm${no ? ' pri' : ''}" data-act="txeThu" data-id="${esc(c.id)}">${ic('receipt')} Thu tiền</button></td></tr>`; }).join('')}</tbody></table></div>` : '<div class="card card-b muted">Không có hợp đồng.</div>'); }
      else { const R = L.map(c => ({ c, x: TXE.chi(c), l: TXE.lai(c) })), sum = k => R.reduce((s, r) => s + (k === 'g' ? +r.c.giaTri || 0 : k === 'l' ? r.l : r.x[k]), 0);
        body = bar + (R.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Hợp đồng</th><th>Xe</th><th class="r">Doanh thu</th><th class="r">Dầu</th><th class="r">Cầu đường</th><th class="r">Ăn nghỉ</th><th class="r">Công LX</th><th class="r">Khác</th><th class="r">Lãi / lỗ</th><th></th></tr></thead><tbody>${R.map(({ c, x, l }) => `<tr>
          <td><b>${esc(vcSo(c))}</b><div class="small muted">${esc(c.bBTen || '')} · ${esc(F.date(c.ngayDon || ''))}</div></td><td>${esc(((DB.vehicles || []).find(v => v.id === c.xeId) || {}).bks || '')}</td><td class="r">${m(c.giaTri)}</td>
          <td class="r" title="${(c.chi || {}).dau != null ? 'Nhập tay' : 'Tự lấy từ Nhiên liệu'}">${m(x.dau)}${(c.chi || {}).dau != null ? '' : '<sup>*</sup>'}</td><td class="r">${m(x.cau)}</td><td class="r">${m(x.an)}</td><td class="r">${m(x.cong)}</td><td class="r">${m(x.khac)}</td>
          <td class="r"><b style="color:${l < 0 ? '#dc2626' : '#15803d'}">${m(l)}</b></td><td><button class="btn sm" data-act="txeChi" data-id="${esc(c.id)}">${ic('edit')} Chi phí</button></td></tr>`).join('')}
          <tr style="font-weight:700"><td>Tổng ${R.length} hợp đồng</td><td></td><td class="r">${m(sum('g'))}</td><td class="r">${m(sum('dau'))}</td><td class="r">${m(sum('cau'))}</td><td class="r">${m(sum('an'))}</td><td class="r">${m(sum('cong'))}</td><td class="r">${m(sum('khac'))}</td><td class="r">${m(sum('l'))}</td><td></td></tr></tbody></table></div>
          <p class="small muted">* Dầu tự lấy từ Nhiên liệu: các phiếu của xe hợp đồng trong ngày đi → ngày về. Bấm Chi phí để nhập số thực tế.</p>` : '<div class="card card-b muted">Không có hợp đồng trong tháng.</div>'); }
    } else if (T === 'khach') {
      const L = TXE.khach().filter(o => !TXE.q || TXE.nm(o.ten + ' ' + o.sdt).includes(TXE.nm(TXE.q)));
      body = `<input class="inp" data-act-q placeholder="Tìm tên, số điện thoại..." value="${esc(TXE.q)}" style="max-width:320px;margin-bottom:10px">` + (L.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Khách</th><th>Điện thoại</th><th class="r">Hợp đồng</th><th class="r">Báo giá</th><th class="r">Tổng giá trị</th><th class="r">Còn nợ</th><th>Gần nhất</th></tr></thead><tbody>${L.map((o, i) => `<tr class="click" data-act="txeKh" data-i="${i}">
        <td><b>${esc(o.ten || '')}</b></td><td>${o.sdt ? `<a href="tel:${esc(o.sdt)}">${esc(o.sdt)}</a>` : ''}</td><td class="r">${o.hd.length}</td><td class="r">${o.bg.length}</td><td class="r">${m(o.tong)}</td><td class="r">${o.no ? `<b style="color:#b45309">${m(o.no)}</b>` : ''}</td><td>${esc(F.date(o.last))}</td></tr>`).join('')}</tbody></table></div>` : '<div class="card card-b muted">Chưa có khách thuê.</div>');
      TXE._kh = L;
    } else {
      const G = TXE.gia();
      body = `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Loại xe</th><th class="r">Số chỗ</th><th class="r">Đơn giá / km</th><th class="r">Tối thiểu / chuyến</th><th class="r">Giá ngày</th><th class="r">Km / ngày</th><th class="r">Phụ phí đêm</th><th class="r">% lễ</th></tr></thead><tbody>${G.map(g => `<tr><td><b>${esc(g.loai)}</b></td><td class="r">${g.soCho || ''}</td><td class="r">${m(g.giaKm)}</td><td class="r">${m(g.toiThieu)}</td><td class="r">${m(g.giaNgay)}</td><td class="r">${g.kmNgay || ''}</td><td class="r">${m(g.phuDem)}</td><td class="r">${g.phuLe || 0}%</td></tr>`).join('')}</tbody></table></div><p class="small muted">Giá mẫu: anh sửa lại theo giá của nhà xe (nút Sửa bảng giá).</p>`;
    }
    el.innerHTML = tabs + body;
    const ym = el.querySelector('[data-act-ym]'); if (ym) ym.onchange = () => { TXE.ym = ym.value || TXE.ym; App.render(); };
    const no = el.querySelector('[data-act-no]'); if (no) no.onchange = () => { TXE.no = no.checked; App.render(); };
    const q = el.querySelector('[data-act-q]'); if (q) q.oninput = () => { TXE.q = q.value; clearTimeout(TXE._qt); TXE._qt = setTimeout(() => { App.render(); const n = document.querySelector('[data-act-q]'); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }, 300); };
  }
};
const txeBy = id => TXE.bgs().find(x => x.id === id);
Object.assign(ACT, {
  txeTab: d => { TXE.tab = d.k; App.render(); }, txeBg: () => TXE.bgForm(), txeBgE: d => { const b = txeBy(d.id); if (b) TXE.bgForm(b); }, txeSend: d => { const b = txeBy(d.id); if (b) TXE.send(b); },
  txeHD: d => { const b = txeBy(d.id); if (b) TXE.toHD(b); }, txeHDo: d => { const c = vcById(d.id); if (c) vcForm(c); }, txeThu: d => { const c = vcById(d.id); if (c) TXE.thu(c); },
  txeXn: d => { const c = vcById(d.id); if (c) TXE.xn(c); }, txeChi: d => { const c = vcById(d.id); if (c) TXE.chiForm(c); }, txeGia: () => TXE.giaForm(), txeKh: d => { const o = (TXE._kh || [])[+d.i]; if (o) TXE.khachView(o); }
});
MODL.def('thuexe', vTXE);
