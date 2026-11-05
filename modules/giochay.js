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
  { key: 'tt', label: 'Mở/Đóng', align: 'c', val: g => g.tt, render: g => { const off = g.tt === 'ĐÓNG', can = Auth.can('giochay', 'edit'); return `<button class="ibtn" ${can ? `data-act="gcToggle" data-id="${g.id}"` : 'disabled'} data-tip="${off ? 'Đang ĐÓNG, bấm để mở' : 'Đang MỞ, bấm để đóng'}" style="width:auto;height:auto;padding:2px;background:none;color:${off ? '#dc2626' : '#16a34a'}"><span style="display:inline-block;width:22px;height:22px">${ic(off ? 'lock' : 'unlock')}</span></button>`; } }
];
const vGC = {
  title: 'Giờ chạy', icon: 'clock', desc: 'Lịch giờ chạy các tuyến, gán số xe và lái xe cho từng chuyến, mở hoặc đóng chuyến',
  tools: () => `<button class="btn pri" data-act="gcAdd">${ic('plus')} Thêm giờ chạy</button><button class="btn" data-act="gcBulk">${ic('clock')} Thêm nhiều giờ</button>${Auth.can('giochay', 'edit') ? `<button class="btn" data-act="ttTuyen" title="Tên tuyến, cự ly, mã số tuyến, bến và hành trình in trên Lệnh vận chuyển">${ic('route')} Thông tin tuyến</button>` : ''}`,
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
