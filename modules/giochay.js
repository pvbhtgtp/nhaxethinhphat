'use strict';
/* Module Giờ chạy (danh sách, form, thêm nhiều giờ); thứ tự tuyến routeCmp ở index · tải khi mở màn hình (MODL). */
const gcRoutes = () => [...new Set(DB.giochay.map(g => g.tuyen).filter(Boolean))].sort(routeCmp);
let gcTuyen = '';
const gcRoutesNow = () => [...new Set(DB.giochay.map(g => g.tuyen).filter(Boolean))].sort(routeCmp);
const gcCur = () => { const r = gcRoutesNow(); return r.includes(gcTuyen) ? gcTuyen : (r[0] || ''); };
function gcForm(g) {
  const isNew = !g;
  if (isNew && !Auth.guard('giochay', 'add')) return;
  const canEdit = isNew || Auth.can('giochay', 'edit'), canDel = Auth.can('giochay', 'del');
  const m = Form.open({
    title: isNew ? 'Thêm giờ chạy' : (canEdit ? 'Sửa giờ chạy ' : 'Xem giờ chạy ') + g.gio + ' · ' + g.tuyen, width: 640,
    value: g || { gio: '', tuyen: gcCur() || '', tt: 'MỞ' },
    fields: [
      { key: 'tuyen', label: 'Tuyến', required: true, full: true, list: gcRoutes(), ph: 'VD: BIÊN HÒA ⇄ VŨNG TÀU' },
      { key: 'gio', label: 'Giờ xuất bến', type: 'time', required: true },
      { key: 'tt', label: 'Trạng thái', type: 'select', options: [{ value: 'MỞ', label: 'MỞ (nhận khách)' }, { value: 'ĐÓNG', label: 'ĐÓNG (không nhận khách)' }] },
      { key: 'xeId', label: 'Số xe', type: 'select', blank: '(Chưa gán xe)', options: () => DB.vehicles.filter(v => !v.ngung || v.id === (g && g.xeId)).map(v => ({ value: v.id, label: v.bks })) },
      { key: 'laiXe', label: 'Tên lái xe', type: 'select', blank: '(Chưa gán lái xe)', options: () => vcDrivers().map(e => ({ value: e.id, label: e.ten })) }
    ],
    saveText: 'Lưu giờ chạy',
    onSave: d => {
      if (!d.tuyen || !d.gio) { toast('Vui lòng nhập tuyến và giờ xuất bến', 'err'); return false; }
      d.tuyen = String(d.tuyen).trim().toUpperCase();
      if (DB.giochay.some(x => x !== g && x.tuyen === d.tuyen && x.gio === d.gio)) { toast('Tuyến này đã có chuyến giờ ' + d.gio, 'err'); return false; }
      if (d.xeId) { const t = DB.giochay.find(x => x !== g && x.gio === d.gio && x.xeId === d.xeId); if (t) { toast('Xe này đã được gán chuyến ' + t.gio + ' tuyến ' + t.tuyen, 'err'); return false; } }
      if (d.laiXe) { const t = DB.giochay.find(x => x !== g && x.gio === d.gio && x.laiXe === d.laiXe); if (t) { toast('Lái xe này đã chạy chuyến ' + t.gio + ' tuyến ' + t.tuyen, 'err'); return false; } }
      if (isNew) DB.giochay.push({ id: uid(), ...d }); else Object.assign(g, d);
      App.changed(); toast('Đã lưu giờ chạy', 'ok');
    },
    onDelete: isNew || !canDel ? null : () => { DB.giochay = DB.giochay.filter(x => x !== g); App.changed(); }
  });
  if (!canEdit) {
    m.el.querySelectorAll('.modal-b input,.modal-b select,.modal-b textarea').forEach(i => i.disabled = true);
    const s = m.el.querySelector('[data-save]'); if (s) s.remove();
    const x = m.el.querySelector('[data-cancel]'); if (x) x.textContent = 'Đóng';
  }
}
const gcCols = [
  { key: 'tuyen', label: 'Tuyến', render: g => `<b>${esc(g.tuyen)}</b>` },
  { key: 'gio', label: 'Giờ', align: 'c', render: g => `<b>${esc(g.gio)}</b>` },
  { key: 'bks', label: 'Số xe', val: g => gcXe(g).bks || '', render: g => gcXe(g).bks ? `<b>${esc(gcXe(g).bks)}</b>` : '<span class="muted">Chưa gán</span>' },
  { key: 'laiXe', label: 'Tên lái xe', val: g => gcLai(g), render: g => gcLai(g) ? esc(gcLai(g)) : '<span class="muted">Chưa gán</span>' },
  { key: 'gioDK', label: 'Giờ đăng ký', align: 'c', val: g => g.gioDK || '' },
  { key: 'ngayChay', label: 'Ngày chạy', val: g => gcNgayTxt(g.ngayChay) },
  { key: 'tt', label: 'Mở/Đóng', align: 'c', val: g => g.tt, render: g => { const off = g.tt === 'ĐÓNG', can = Auth.can('giochay', 'edit'); return `<button class="ibtn" ${can ? `data-act="gcToggle" data-id="${g.id}"` : 'disabled'} data-tip="${off ? 'Đang ĐÓNG, bấm để mở' : 'Đang MỞ, bấm để đóng'}" style="width:auto;height:auto;padding:2px;background:none;color:${off ? '#dc2626' : '#16a34a'}"><span style="display:inline-block;width:22px;height:22px">${ic(off ? 'lock' : 'unlock')}</span></button>`; } }
];
const vGC = {
  title: 'Giờ chạy', icon: 'clock', desc: 'Lịch giờ chạy các tuyến, gán số xe và lái xe cho từng chuyến, mở hoặc đóng chuyến',
  tools: () => `<button class="btn pri" data-act="gcQL">${ic('calendar')} Quản lý lịch chạy</button><button class="btn" data-act="gcAdd">${ic('plus')} Thêm giờ chạy</button><button class="btn" data-act="gcBulk">${ic('clock')} Thêm nhiều giờ</button>${Auth.can('lichchay', 'add') ? `<button class="btn" data-act="lcGen" title="Tạo chuyến cho các ngày bạn chọn từ các giờ chạy đang MỞ (chuyến đã có giữ nguyên)">${ic('calendar')} Tạo lịch chạy</button>` : ''}${Auth.can('giochay', 'edit') ? `<button class="btn" data-act="ttTuyen" title="Tên tuyến, cự ly, mã số tuyến, bến và hành trình in trên Lệnh vận chuyển">${ic('route')} Thông tin tuyến</button>` : ''}`,
  render(el) {
    const L = gcSorted(), R = gcRoutes(), nOpen = L.filter(g => g.tt !== 'ĐÓNG').length, nUn = L.filter(g => g.tt !== 'ĐÓNG' && (!g.xeId || !g.laiXe)).length;
    const rows = gcCur() ? L.filter(g => g.tuyen === gcCur()) : L;
    el.insertAdjacentHTML('beforeend', (R.length ? `<div class="row" style="gap:8px;margin-bottom:12px;align-items:center"><select class="inp" id="gcRouteSel" data-csq="1" style="width:330px;max-width:100%;font-weight:600">${R.map(r => `<option value="${esc(r)}" ${gcCur() === r ? 'selected' : ''}>${esc(r)}</option>`).join('')}</select></div>` : '') + '<div id="gcT"></div>');
    const rs = $('#gcRouteSel', el); if (rs) rs.onchange = () => { gcTuyen = rs.value; App.render(); };
    table($('#gcT', el), {
      id: 'gc', columns: gcCols, rows, ph: 'Tìm tuyến, giờ, số xe, lái xe...', empty: 'Chưa có giờ chạy. Bấm "Thêm giờ chạy".', onRow: gcForm,
      searchText: g => [g.tuyen, g.gio, gcXe(g).bks, gcLai(g)].join(' '),
      rowClass: g => g.tt === 'ĐÓNG' ? 'veh-off' : '',
      tools: `<span class="badge b-green">${nOpen} chuyến mở</span>${nUn ? `<span class="badge b-amber">${nUn} chuyến chưa gán đủ xe và lái xe</span>` : ''}<span class="grow"></span><span class="muted small">Bấm vào dòng để sửa</span>`,
      actions: g => rowBtns(g.id, 'gcEdit', 'gcDel')
    });
  },
  excel() { XLSX.save('Gio chay', [xSheet('Giờ chạy', 'LỊCH GIỜ CHẠY', gcCols, gcSorted())]); },
  print() { Print.report({ title: 'Lịch giờ chạy' + (gcCur() ? ' · ' + gcCur() : ''), cols: gcCols.map(c => c.key === 'tt' ? { ...c, render: null } : c), rows: gcCur() ? gcSorted().filter(g => g.tuyen === gcCur()) : gcSorted(), signs: ['Người lập', 'Giám đốc'] }); }
};
Object.assign(ACT, {
  gcBulk: () => {
    const R = gcRoutes();
    Form.open({ title: 'Thêm nhiều giờ chạy', width: 600, saveText: 'Thêm giờ', cols: 1,
      value: { tuyen: gcCur() || (R.length === 1 ? R[0] : ''), tt: 'MỞ' },
      fields: [
        { key: 'tuyen', label: 'Tuyến', type: 'select', blank: '(Chọn tuyến)', options: [{ value: '*', label: 'Tất cả các tuyến' }, ...R.map(r => ({ value: r, label: r }))], hint: 'Chọn "Tất cả các tuyến" để thêm giờ cho mọi tuyến cùng lúc' },
        { key: 'newTuyen', label: 'Hoặc nhập tuyến mới', hint: 'VD: BIÊN HÒA ⇄ LONG HẢI' },
        { key: 'gios', label: 'Các giờ xuất bến', type: 'textarea', rows: 3, required: true, ph: '05:00, 05:30, 06:00', hint: 'Nhập nhiều giờ, cách nhau bằng dấu phẩy hoặc xuống dòng. Định dạng 24 giờ, VD 5:30 hoặc 17:00' },
        { key: 'tt', label: 'Trạng thái', type: 'select', options: [{ value: 'MỞ', label: 'MỞ (nhận khách)' }, { value: 'ĐÓNG', label: 'ĐÓNG (không nhận khách)' }] }
      ],
      onSave: d => {
        const nt = String(d.newTuyen || '').trim().toUpperCase();
        const routes = nt ? [nt] : d.tuyen === '*' ? R : d.tuyen ? [d.tuyen] : [];
        if (!routes.length) { toast('Vui lòng chọn hoặc nhập tuyến', 'err'); return false; }
        const times = [], bad = [];
        String(d.gios || '').split(/[\s,;]+/).filter(Boolean).forEach(s => {
          const m = s.match(/^(\d{1,2})[:hH.](\d{2})$/) || s.match(/^(\d{1,2})[hH]$/);
          const hh = m ? +m[1] : -1, mm = m && m[2] ? +m[2] : 0;
          if (hh < 0 || hh > 23 || mm > 59) bad.push(s); else times.push(String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0'));
        });
        if (bad.length) { toast('Giờ không hợp lệ: ' + bad.join(', '), 'err'); return false; }
        if (!times.length) { toast('Vui lòng nhập ít nhất một giờ', 'err'); return false; }
        let n = 0, skip = 0;
        routes.forEach(r => [...new Set(times)].forEach(t => { if (DB.giochay.some(x => x.tuyen === r && x.gio === t)) skip++; else { DB.giochay.push({ id: uid(), gio: t, tuyen: r, xeId: '', laiXe: '', tt: d.tt || 'MỞ' }); n++; } }));
        App.changed(); toast(`Đã thêm ${n} chuyến${skip ? ', bỏ qua ' + skip + ' chuyến đã có' : ''}`, 'ok');
      } });
  },
  gcAdd: () => gcForm(), gcEdit: d => gcForm(gcById(d.id)),
  gcRoute: d => { gcTuyen = d.r || ''; App.render(); },
  gcToggle: d => { const g = gcById(d.id); if (!g) return; g.tt = g.tt === 'ĐÓNG' ? 'MỞ' : 'ĐÓNG'; App.changed(); },
  gcDel: async d => { const g = gcById(d.id); if (g && await Modal.confirm(`Xóa chuyến <b>${esc(g.gio)}</b> tuyến <b>${esc(g.tuyen)}</b>?`, { ok: 'Xóa', danger: true })) { DB.giochay = DB.giochay.filter(x => x !== g); App.changed(); } }
});
MODL.def('giochay', vGC);
/* ===== Quản lý lịch chạy theo tuyến (giống Vexere) + lộ trình chuẩn NĐ 158/2024 =====
   Mỗi tuyến: mã lịch, hiệu lực từ ngày–đến ngày, trạng thái, ghi chú (settings.gcLich[tuyến]).
   Mỗi giờ chạy: giờ xuất bến đăng ký (biểu đồ chạy xe), số tài, lái xe, phụ xe, số xe, loại ghế, ngày chạy, loại hình KD, mở/đóng. */
const GCQ = {
  GHE: ['Ghế ngồi', 'Giường nằm', 'Limousine'],
  LH: [['codinh', 'Tuyến cố định'], ['hopdong', 'Xe hợp đồng'], ['dulich', 'Xe du lịch']],
  hm: s => { const m = String(s || '').trim().match(/^(\d{1,2})[:hH.]?(\d{2})?$/); if (!m) return ''; const h = +m[1], mi = +(m[2] || 0); return h > 23 || mi > 59 ? '' : String(h).padStart(2, '0') + ':' + String(mi).padStart(2, '0'); },
  open(tuyen) {
    if (!Auth.guard('giochay', 'view')) return;
    const can = Auth.can('giochay', 'edit') || Auth.can('giochay', 'add');
    const routes = [...new Set([...gcRoutes(), ...(typeof bgRoutes === 'function' ? bgRoutes() : [])])].sort(routeCmp);
    let tu = tuyen || gcCur() || routes[0] || '', R = [], dirty = false;
    const drv = vcDrivers(), veh = DB.vehicles.filter(v => !v.ngung);
    const opt = (L, v, blank) => (blank ? `<option value="">${blank}</option>` : '') + L.map(([a, b]) => `<option value="${esc(a)}"${a === v ? ' selected' : ''}>${esc(b)}</option>`).join('');
    const m = Modal.open({ title: 'Quản lý lịch chạy', width: 1500, body: `
      <div class="gq-hd"><label>Mã lịch<input class="inp" data-h="ma"></label><label>Tuyến<input class="inp" data-h="tuyen" list="gqR" value="${esc(tu)}"><datalist id="gqR">${routes.map(r => `<option value="${esc(r)}">`).join('')}</datalist></label>
        <label>Hiệu lực từ ngày<input class="inp" type="date" data-h="tu"></label><label>Đến ngày<input class="inp" type="date" data-h="den"></label>
        <label>Trạng thái<select class="inp" data-h="tt"><option value="">Hoạt động</option><option value="ngung">Tạm ngưng</option></select></label>
        <label class="full">Ghi chú<textarea class="inp" rows="2" data-h="ghiChu"></textarea></label></div>
      <div class="gq-lt"></div>
      <div class="gq-sec"><b>LỊCH CHẠY</b></div>
      ${can ? `<div class="gq-mk"><span>Tạo lịch chạy</span><input class="inp" data-g="a" placeholder="Bắt đầu hh:mm"><input class="inp" data-g="b" placeholder="Kết thúc hh:mm"><input class="inp" data-g="f" placeholder="Tần suất (phút/chuyến)" inputmode="numeric"><button type="button" class="btn sm pri" data-mk>Tạo giờ</button>
        <span></span><input class="inp" data-g="one" placeholder="hh:mm"><button type="button" class="btn sm pri" data-one>Thêm giờ chạy</button></div>` : ''}
      <div class="gq-tw"><table class="gq-t"><thead><tr><th>Giờ chạy</th><th title="Giờ xuất bến đã đăng ký trong biểu đồ chạy xe (NĐ 158)">Giờ đăng ký</th><th>Số tài</th><th>Lái xe</th><th>Phụ xe</th><th>Số xe</th><th>Loại ghế</th><th>Ngày chạy</th><th>Loại hình kinh doanh</th><th>Trạng thái</th><th></th></tr></thead><tbody></tbody></table></div>`,
      foot: `<button class="btn" data-cancel>Đóng</button>${can ? `<button class="btn pri" data-ok>${ic('check')} Lưu lịch chạy</button>` : ''}` });
    const el = m.el, $ = s => el.querySelector(s), tb = $('.gq-t tbody');
    const hd = k => $(`[data-h="${k}"]`);
    const loadHead = () => { const L = gcLich(tu); hd('ma').value = L.ma || ''; hd('tu').value = L.tu || ''; hd('den').value = L.den || ''; hd('tt').value = L.tt || ''; hd('ghiChu').value = L.ghiChu || ''; };
    const lt = () => {
      const v = typeof TTT !== 'undefined' ? TTT.get(tu) : {}, S2 = typeof LT !== 'undefined' ? LT.get(tu) : [], miss = [];
      if (!v.maTuyen) miss.push('mã số tuyến'); if (!v.cuLy) miss.push('cự ly'); if (!v.benA || !v.benB) miss.push('bến đi/bến đến'); if (!v.hanhTrinh) miss.push('hành trình chạy xe');
      $('.gq-lt').innerHTML = !tu ? '' : `<div class="gq-ltb${miss.length ? ' w' : ''}"><div class="gq-lth"><b>${ic('route')} Lộ trình chuẩn theo NĐ 158/2024</b>${Auth.can('giochay', 'edit') ? '<button type="button" class="btn sm" data-ttt>Sửa thông tin tuyến</button>' : ''}</div>
        <div class="gq-ltg"><span>Mã số tuyến: <b>${esc(v.maTuyen || '—')}</b></span><span>Cự ly: <b>${v.cuLy ? esc(v.cuLy) + ' km' : '—'}</b></span><span>Bến đi: <b>${esc(v.benA || '—')}</b></span><span>Bến đến: <b>${esc(v.benB || '—')}</b></span></div>
        <div class="gq-ltr">Hành trình: <b>${esc(v.hanhTrinh || '—')}</b>${v.hanhTrinh ? ' và ngược lại' : ''}</div>
        ${S2.length ? `<div class="gq-ltr">Điểm dừng đón trả: ${S2.map(p => `<span class="gq-st">${esc(p.ten)}${+p.phut ? ` <em>+${+p.phut}'</em>` : ''}</span>`).join(' › ')}</div>` : ''}
        ${miss.length ? `<div class="gq-ltm">⚠ Thiếu ${miss.join(', ')} theo phù hiệu tuyến cố định. Bấm "Sửa thông tin tuyến" để bổ sung.</div>` : ''}</div>`;
      const b = $('[data-ttt]'); if (b) b.onclick = () => ACT.ttTuyen();
    };
    const loadRows = () => { R = DB.giochay.filter(g => g.tuyen === tu).map(g => ({ ...g })); draw(); };
    const row = (g, i) => `<tr data-i="${i}"${g.tt === 'ĐÓNG' ? ' class="off"' : ''}><td><span class="gq-g">${esc(g.gio)}${can ? `<button type="button" data-rm title="Xóa giờ này">${ic('x')}</button>` : ''}</span></td>
      <td><input class="inp" type="time" data-k="gioDK" value="${esc(g.gioDK || '')}"></td><td><input class="inp" data-k="soTai" value="${esc(g.soTai || '')}" style="width:70px"></td>
      <td><select class="inp" data-k="laiXe">${opt(drv.map(e => [e.id, e.ten]), g.laiXe || '', 'Chọn lái xe')}</select></td><td><select class="inp" data-k="phuXe">${opt(drv.map(e => [e.id, e.ten]), g.phuXe || '', 'Chọn phụ xe')}</select></td>
      <td><select class="inp" data-k="xeId">${opt(veh.map(v => [v.id, v.bks]), g.xeId || '', 'Chọn số xe')}</select></td><td><select class="inp" data-k="loaiGhe">${opt(GCQ.GHE.map(x => [x, x]), g.loaiGhe || 'Ghế ngồi')}</select></td>
      <td><select class="inp" data-k="ngayChay">${opt(GC_NGAY, g.ngayChay || '')}</select></td><td><select class="inp" data-k="loaiHinh">${opt(GCQ.LH, g.loaiHinh || 'codinh')}</select></td>
      <td><select class="inp" data-k="tt">${opt([['MỞ', 'Mở'], ['ĐÓNG', 'Đóng']], g.tt === 'ĐÓNG' ? 'ĐÓNG' : 'MỞ')}</select></td>
      <td>${can ? '<button type="button" class="btn sm gq-all" data-all title="Chép Loại ghế, Ngày chạy, Loại hình kinh doanh của dòng này cho mọi giờ">Áp dụng tất cả</button>' : ''}</td></tr>`;
    const draw = () => { R.sort((a, b) => String(a.gio).localeCompare(String(b.gio))); tb.innerHTML = R.map(row).join('') || `<tr><td colspan="11" class="muted" style="text-align:center;padding:16px">${tu ? 'Tuyến này chưa có giờ chạy. Tạo giờ ở trên.' : 'Chọn hoặc nhập tuyến.'}</td></tr>`; if (!can) tb.querySelectorAll('input,select').forEach(x => x.disabled = true); };
    const sync = () => tb.querySelectorAll('tr[data-i]').forEach(tr => { const g = R[+tr.dataset.i]; tr.querySelectorAll('[data-k]').forEach(i => g[i.dataset.k] = i.value); });
    const addT = list => { sync(); let n = 0, sk = 0; list.forEach(t => { if (R.some(g => g.gio === t)) sk++; else { R.push({ gio: t, tuyen: tu, xeId: '', laiXe: '', tt: 'MỞ', loaiGhe: 'Ghế ngồi', loaiHinh: 'codinh', ngayChay: '' }); n++; } }); dirty = dirty || !!n; draw(); toast(`Đã thêm ${n} giờ${sk ? ', bỏ qua ' + sk + ' giờ đã có' : ''}`, n ? 'ok' : ''); };
    loadHead(); lt(); loadRows();
    hd('tuyen').addEventListener('change', async () => {
      const nt = String(hd('tuyen').value || '').trim().toUpperCase(); if (nt === tu) return;
      if (dirty && !(await Modal.confirm('Đổi tuyến sẽ bỏ các thay đổi chưa lưu của tuyến <b>' + esc(tu) + '</b>?', { ok: 'Đổi tuyến' }))) { hd('tuyen').value = tu; return; }
      tu = nt; hd('tuyen').value = tu; dirty = false; loadHead(); lt(); loadRows();
    });
    el.querySelectorAll('[data-h]').forEach(i => i.addEventListener('input', () => dirty = true));
    tb.addEventListener('change', e => { dirty = true; const s = e.target.closest('[data-k="tt"]'); if (s) s.closest('tr').classList.toggle('off', s.value === 'ĐÓNG'); });
    tb.addEventListener('click', e => {
      const rm = e.target.closest('[data-rm]'); if (rm) { sync(); R.splice(+rm.closest('tr').dataset.i, 1); dirty = true; return draw(); }
      const al = e.target.closest('[data-all]'); if (al) { sync(); const s = R[+al.closest('tr').dataset.i]; R.forEach(g => { g.loaiGhe = s.loaiGhe; g.ngayChay = s.ngayChay; g.loaiHinh = s.loaiHinh; }); dirty = true; draw(); toast('Đã áp dụng cho ' + R.length + ' giờ', 'ok'); }
    });
    const mk = $('[data-mk]'); if (mk) mk.onclick = () => {
      if (!tu) return toast('Chọn tuyến trước', 'err');
      const a = GCQ.hm($('[data-g="a"]').value), b = GCQ.hm($('[data-g="b"]').value), f = +$('[data-g="f"]').value;
      if (!a || !b || !(f >= 5)) return toast('Nhập giờ bắt đầu, kết thúc (hh:mm) và tần suất từ 5 phút trở lên', 'err');
      const mi = s => +s.slice(0, 2) * 60 + +s.slice(3), L = []; for (let x = mi(a); x <= mi(b) && L.length < 200; x += f) L.push(String(Math.floor(x / 60)).padStart(2, '0') + ':' + String(x % 60).padStart(2, '0'));
      addT(L);
    };
    const one = $('[data-one]'); if (one) one.onclick = () => { if (!tu) return toast('Chọn tuyến trước', 'err'); const t = GCQ.hm($('[data-g="one"]').value); if (!t) return toast('Giờ không hợp lệ (VD 05:30)', 'err'); addT([t]); $('[data-g="one"]').value = ''; };
    $('[data-cancel]').onclick = () => m.close();
    const ok = $('[data-ok]'); if (ok) ok.onclick = () => {
      if (!tu) return toast('Chọn hoặc nhập tuyến', 'err'); sync();
      const tuD = hd('tu').value, denD = hd('den').value; if (tuD && denD && denD < tuD) return toast('Ngày kết thúc phải sau ngày bắt đầu', 'err');
      for (const g of R) {
        if (g.xeId) { const t = DB.giochay.find(x => x.tuyen !== tu && x.gio === g.gio && x.xeId === g.xeId); if (t) return toast(`Giờ ${g.gio}: xe đã được gán chuyến ${t.gio} tuyến ${t.tuyen}`, 'err'); }
        if (g.laiXe) { const t = DB.giochay.find(x => x.tuyen !== tu && x.gio === g.gio && x.laiXe === g.laiXe); if (t) return toast(`Giờ ${g.gio}: lái xe đã chạy chuyến ${t.gio} tuyến ${t.tuyen}`, 'err'); }
        if (g.laiXe && g.laiXe === g.phuXe) return toast(`Giờ ${g.gio}: lái xe và phụ xe trùng người`, 'err');
      }
      const keep = new Set(R.filter(g => g.id).map(g => g.id));
      DB.giochay = DB.giochay.filter(x => x.tuyen !== tu || keep.has(x.id));
      R.forEach(g => { const o = { ...g, tuyen: tu }; Object.keys(o).forEach(k => { if (o[k] === undefined) delete o[k]; }); const x = o.id && DB.giochay.find(y => y.id === o.id); if (x) Object.assign(x, o); else DB.giochay.push({ ...o, id: uid() }); });
      const all = (DB.settings.gcLich = DB.settings.gcLich || {}), h = {}; ['ma', 'tu', 'den', 'tt', 'ghiChu'].forEach(k => { const v = String(hd(k).value || '').trim(); if (v) h[k] = v; });
      if (Object.keys(h).length) all[tu] = h; else delete all[tu];
      gcTuyen = tu; dirty = false; App.changed(); m.close(); toast(`Đã lưu lịch chạy tuyến ${tu}: ${R.length} giờ`, 'ok');
    };
    return m;
  }
};
Object.assign(ACT, { gcQL: d => GCQ.open(d && d.r) });
addCSS(`.gq-hd{display:grid;grid-template-columns:1.1fr 2fr 1fr 1fr 1fr;gap:8px 12px}.gq-hd label{display:flex;flex-direction:column;gap:3px;font-size:12px;font-weight:600;color:#475467}.gq-hd .full{grid-column:1/-1}
.gq-ltb{margin-top:12px;border:1px solid #bfdbfe;background:#eff6ff;border-radius:10px;padding:10px 12px;font-size:13px;display:flex;flex-direction:column;gap:5px}.gq-ltb.w{border-color:#fde68a;background:#fffbeb}.gq-lth{display:flex;justify-content:space-between;align-items:center;gap:8px}.gq-lth b{display:inline-flex;gap:6px;align-items:center}.gq-lth svg{width:16px;height:16px}
.gq-ltg{display:flex;flex-wrap:wrap;gap:6px 22px}.gq-ltr{line-height:1.5}.gq-st em{font-style:normal;color:#667085;font-size:11.5px}.gq-ltm{color:#b45309;font-weight:600}
.gq-sec{margin:14px 0 6px;font-size:15px}.gq-mk .btn{justify-self:start}.gq-mk{display:grid;grid-template-columns:110px repeat(3,minmax(120px,1fr)) auto;gap:8px;align-items:center;margin-bottom:10px;font-size:13px;font-weight:600}
.gq-tw{overflow-x:auto;border:1px solid #e3e7ef;border-radius:10px}.gq-t{width:100%;border-collapse:collapse;font-size:13px}.gq-t th{background:#f7f9fc;text-align:left;padding:8px 6px;font-size:12px;color:#344054;white-space:nowrap;position:sticky;top:0}.gq-t td{padding:6px;border-top:1px solid #eef0f5;vertical-align:middle}.gq-t .inp{min-width:0;height:34px;padding:4px 8px;font-size:13px}.gq-t select.inp{min-width:120px}
.gq-g{display:inline-flex;align-items:center;gap:6px;background:#1d4ed8;color:#fff;border-radius:6px;padding:6px 8px;font-weight:700;white-space:nowrap}.gq-g button{border:0;background:none;color:#fff;cursor:pointer;padding:0;display:grid}.gq-g svg{width:14px;height:14px}
.gq-t tr.off .gq-g{background:#98a2b3}.gq-t tr.off td{background:#f9fafb}.gq-all{background:#16a34a!important;border-color:#16a34a!important;color:#fff!important;white-space:nowrap}
@media(max-width:900px){.gq-hd{grid-template-columns:1fr 1fr}.gq-mk{grid-template-columns:1fr 1fr}.gq-mk>span:first-child,.gq-mk>span:empty{grid-column:1/-1}}`);
