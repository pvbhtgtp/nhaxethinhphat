'use strict';
/* Module Hợp đồng lao động (danh sách, in, xem trước); mẫu hợp đồng hdHTML ở index vì form Nhân viên xem trước · tải khi mở màn hình (MODL). */
function hdStatus(e) {
  const den = hdInfo(e).den; if (!den) return ['Chưa có hạn', 'b-p'];
  const n = D.diff(den, D.today()); return n < 0 ? ['Đã hết hạn', 'b-red'] : n <= 30 ? ['Còn ' + n + ' ngày', 'b-amber'] : ['Còn hạn', 'b-green'];
}
const hdPrint = list => PrintDlg.open({ htmls: list.map(hdHTML), title: list.length === 1 ? 'Hợp đồng lao động - ' + list[0].ten : 'Hợp đồng lao động' });
function hdPreview(e) {
  const m = Modal.open({ title: 'Hợp đồng lao động · ' + esc(e.ten), width: 900, body: `<div class="pr">${hdHTML(e)}</div>`, foot: `<button class="btn left" data-ed>${ic('edit')} Sửa thông tin HĐ</button><button class="btn" data-no>Đóng</button><button class="btn pri" data-pr>${ic('printer')} In hợp đồng</button>` });
  m.el.querySelector('[data-no]').onclick = () => m.close();
  m.el.querySelector('[data-pr]').onclick = () => hdPrint([e]);
  m.el.querySelector('[data-ed]').onclick = () => { m.close(); empForm(e); };
}
const vHD = {
  title: 'Hợp đồng lao động', icon: 'file', desc: 'Soạn HĐLĐ tự động cho từng nhân viên từ hồ sơ nhân sự, bấm vào dòng để xem trước', print: false,
  list() { return DB.employees.filter(e => hdActive(e) && (!UI.pb || e.phongBan === UI.pb)); },
  after: () => onVal('hdYr', v => { const y = parseInt(v); if (y >= 2000 && y <= 2100) { S().hdNam = y; App.changed(); toast(`Đã chuyển toàn bộ hợp đồng sang năm <b>${y}</b>`, 'ok'); } }),
  tools: () => `<label class="row small" style="gap:6px">Năm hợp đồng <input type="number" class="inp" id="hdYr" value="${hdYear()}" min="2000" max="2100" style="width:90px"></label><button class="btn pri" data-act="hdPrintAll">${ic('printer')} In tất cả HĐLĐ</button>`,
  render(el) {
    table(el, {
      id: 'hd', rows: DB.employees.filter(e => hdActive(e) && (!UI.pb || e.phongBan === UI.pb)), ph: 'Tìm số HĐ, tên, phòng ban...', onRow: hdPreview,
      tools: `${selectHTML('pbF', [{ value: '', label: 'Tất cả phòng ban' }, ...S().phongBan], UI.pb)}<span class="grow"></span><span class="muted small">Sửa thông tin hợp đồng trong hồ sơ nhân viên (nút bút chì)</span>`,
      columns: [
        { key: 'soHD', label: 'Số HĐLĐ', val: e => hdInfo(e).soHD }, { key: 'ten', label: 'Họ và tên', render: e => `<div class="who">${avatarHTML(e.ten, e.avatar)}<div><b>${esc(e.ten)}</b><small>${esc(e.chucVu || '')}</small></div></div>` },
        { key: 'phongBan', label: 'Phòng ban' }, { key: 'loaiHD', label: 'Loại HĐ', val: e => e.loaiHD || HD_LOAI[0] },
        { key: 'hdTu', label: 'Từ ngày', fmt: 'date', val: e => hdInfo(e).tu }, { key: 'hdDen', label: 'Đến ngày', fmt: 'date', val: e => hdInfo(e).den },
        { key: 'luongCB', label: 'Lương cơ bản', fmt: 'money' },
        { key: 'tt', label: 'Tình trạng HĐ', val: e => hdStatus(e)[0], render: e => { const [t, c] = hdStatus(e); return `<span class="badge ${c}">${t}</span>`; } }],
      actions: e => `<button class="ibtn" data-act="hdPrint" data-id="${e.id}" data-tip="In hợp đồng">${ic('printer')}</button><button class="ibtn" data-act="hdEdit" data-id="${e.id}" data-tip="Sửa hồ sơ / thông tin HĐ">${ic('edit')}</button>`
    });
    onVal('pbF', v => { UI.pb = v; App.render(); });
  }
};
Object.assign(ACT, {
  hdPrint: d => hdPrint([empById(d.id)]), hdEdit: d => empForm(empById(d.id)),
  hdPrintAll: () => { const L = vHD.list(); if (!L.length) return toast('Không có nhân viên', 'err'); hdPrint(L); }
});
MODL.def('hopdong', vHD);
