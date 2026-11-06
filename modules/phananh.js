'use strict';
/* Module Phản ánh & sự cố (NĐ 158/2024 Đ11: theo dõi vi phạm, sự cố an toàn; tiếp nhận, xử lý phản ánh của hành khách) · tải khi mở màn hình (MODL).
   Dữ liệu: DB.phanAnh (phần Vận hành). Vi phạm / tai nạn lấy từ Lý lịch hành nghề (DB.lylich, loại vp / tn) — không nhập trùng. */
const PA = { tab: 'pa', thang: '', nam: '', tt: '', q: '' };
const PA_KENH = ['Điện thoại / Hotline', 'Zalo', 'Trực tiếp', 'Facebook', 'Email', 'Khác'];
const PA_LOAI = ['Thái độ phục vụ', 'Giờ giấc / bỏ chuyến', 'An toàn / lái xe ẩu', 'Hành lý / hàng hóa', 'Giá vé / thu tiền', 'Vệ sinh xe', 'Khác'];
const PA_TT = { moi: { t: 'Mới tiếp nhận', c: 'b-red' }, dang: { t: 'Đang xử lý', c: 'b-amber' }, xong: { t: 'Đã xử lý', c: 'b-green' } };
const paAll = () => (DB.phanAnh = DB.phanAnh || []);
const paEmp = id => (id && (DB.employees || []).find(e => e.id === id)) || null;
const paLate = r => r.tt !== 'xong' && r.ngay && D.diff(D.today(), r.ngay) > 3;
const paSo = () => { const y = D.today().slice(2, 4), n = paAll().filter(r => String(r.so || '').startsWith('PA' + y)).length + 1; return 'PA' + y + '-' + String(n).padStart(3, '0'); };
const paCan = a => Auth.can('dieuhanh', a);

function paForm(r) {
  const isNew = !r; if (isNew && !Auth.guard('dieuhanh', 'add')) return; if (!isNew && !Auth.guard('dieuhanh', 'edit')) return;
  const now = new Date(), drivers = (DB.employees || []).filter(e => e.trangThai !== 'Nghỉ việc').map(e => ({ value: e.id, label: e.ten }));
  const v = r ? { ...r } : { ngay: D.today(), gio: pad(now.getHours()) + ':' + pad(now.getMinutes()), kenh: PA_KENH[0], loai: PA_LOAI[0], tt: 'moi', nguoiNhan: dvLog.who() };
  Form.open({
    title: isNew ? 'Tiếp nhận phản ánh của hành khách' : 'Phản ánh ' + esc(r.so || ''), width: 760, value: v,
    fields: [
      { key: 'ngay', label: 'Ngày tiếp nhận', type: 'date', required: true }, { key: 'gio', label: 'Giờ', type: 'time' },
      { key: 'kenh', label: 'Kênh tiếp nhận', type: 'select', options: PA_KENH }, { key: 'loai', label: 'Nội dung phản ánh về', type: 'select', options: PA_LOAI },
      { key: 'ten', label: 'Người phản ánh' }, { key: 'sdt', label: 'Số điện thoại' },
      { key: 'ngayDi', label: 'Ngày đi của chuyến', type: 'date' }, { key: 'xe', label: 'Biển số xe', type: 'select', blank: '— Không rõ —', options: () => (DB.vehicles || []).filter(x => !x.ngung).map(x => x.bks).filter(Boolean).sort() },
      { key: 'lai', label: 'Lái xe / nhân viên liên quan', type: 'select', blank: '— Không rõ —', options: drivers }, { key: 'nguoiNhan', label: 'Người tiếp nhận' },
      { key: 'noiDung', label: 'Nội dung phản ánh', type: 'textarea', full: true, required: true },
      { key: 'xuLy', label: 'Biện pháp xử lý / trả lời khách', type: 'textarea', full: true },
      { key: 'tt', label: 'Trạng thái', type: 'select', options: Object.entries(PA_TT).map(([k, x]) => ({ value: k, label: x.t })) }, { key: 'ngayXong', label: 'Ngày xử lý xong', type: 'date' }
    ],
    onDelete: !isNew && paCan('del') ? () => { const L = paAll(), i = L.indexOf(r); if (i >= 0) L.splice(i, 1); App.changed(); toast('Đã xóa phản ánh ' + esc(r.so || ''), 'ok'); } : null,
    onSave: d => {
      if (d.tt === 'xong' && !d.ngayXong) d.ngayXong = D.today();
      if (d.tt === 'xong' && !String(d.xuLy || '').trim()) { toast('Ghi biện pháp xử lý trước khi chuyển sang Đã xử lý', 'err'); return false; }
      if (isNew) paAll().push({ id: uid(), so: paSo(), tg: dvLog.now(), ...d }); else Object.assign(r, d);
      App.changed(); toast(isNew ? 'Đã ghi nhận phản ánh' : 'Đã lưu', 'ok');
    }
  });
}

const vPA = {
  title: 'Phản ánh & sự cố', icon: 'message', desc: 'Sổ tiếp nhận, xử lý phản ánh của hành khách · sổ theo dõi vi phạm, tai nạn của lái xe (NĐ 158/2024)',
  tools: () => PA.tab === 'pa' && paCan('add') ? `<button class="btn pri" data-act="paAdd">${ic('plus')} Tiếp nhận phản ánh</button>` : '',
  render(el) {
    if (!PA.thang) PA.thang = D.ymNow(); if (!PA.nam) PA.nam = D.today().slice(0, 4);
    el.insertAdjacentHTML('beforeend', `<div class="row pa-bar"><div class="seg"><button data-patab="pa" class="${PA.tab === 'pa' ? 'on' : ''}">Phản ánh hành khách</button><button data-patab="vp" class="${PA.tab === 'vp' ? 'on' : ''}">Vi phạm & tai nạn</button></div><span class="grow"></span><div id="paF" class="row" style="gap:8px"></div></div><div id="paB"></div>`);
    el.querySelectorAll('[data-patab]').forEach(b => b.onclick = () => { PA.tab = b.dataset.patab; App.render(); });
    return PA.tab === 'vp' ? vPA.renderVP(el) : vPA.renderPA(el);
  },
  rowsPA() { return paAll().filter(r => String(r.ngay || '').startsWith(PA.thang)).sort((a, b) => (b.ngay + (b.gio || '')).localeCompare(a.ngay + (a.gio || ''))); },
  renderPA(el) {
    const months = [...new Set([D.ymNow(), PA.thang, ...paAll().map(r => String(r.ngay || '').slice(0, 7))])].filter(Boolean).sort().reverse();
    const all = paAll(), open = all.filter(r => r.tt !== 'xong'), late = all.filter(paLate), M = vPA.rowsPA();
    $('#paF', el).innerHTML = `<select class="inp" id="paM">${months.map(m => `<option value="${m}" ${m === PA.thang ? 'selected' : ''}>${F.month(m)}</option>`).join('')}</select><select class="inp" id="paT"><option value="">Mọi trạng thái</option>${Object.entries(PA_TT).map(([k, x]) => `<option value="${k}" ${PA.tt === k ? 'selected' : ''}>${x.t}</option>`).join('')}</select>`;
    const L = M.filter(r => !PA.tt || r.tt === PA.tt), ce = paCan('edit');
    const by = {}; M.forEach(r => by[r.loai || 'Khác'] = (by[r.loai || 'Khác'] || 0) + 1);
    $('#paB', el).innerHTML = `<div class="kpis">
        <div class="kpi"><div class="k-lb">Phản ánh ${F.month(PA.thang).toLowerCase()}</div><div class="k-v">${M.length}</div></div>
        <div class="kpi ${open.length ? 't-red' : ''}"><div class="k-lb">Chưa xử lý xong (tất cả)</div><div class="k-v">${open.length}</div></div>
        <div class="kpi ${late.length ? 't-red' : ''}"><div class="k-lb">Quá 3 ngày chưa xử lý</div><div class="k-v">${late.length}</div></div>
        <div class="kpi"><div class="k-lb">Đã xử lý trong tháng</div><div class="k-v">${M.filter(r => r.tt === 'xong').length}</div></div></div>
      ${Object.keys(by).length ? `<div class="pa-chips">${Object.entries(by).sort((a, b) => b[1] - a[1]).map(([k, n]) => `<span>${esc(k)} <b>${n}</b></span>`).join('')}</div>` : ''}
      <div class="card"><div class="card-b p0">${L.length ? `<div class="tbl-wrap"><table class="tbl compact pa-t"><thead><tr><th>Số</th><th>Ngày</th><th>Kênh · người phản ánh</th><th>Nội dung</th><th>Xe · lái xe</th><th>Xử lý</th><th>Trạng thái</th></tr></thead><tbody>${L.map(r => {
          const e = paEmp(r.lai), st = PA_TT[r.tt] || PA_TT.moi;
          return `<tr data-id="${r.id}" class="${ce ? 'pa-row' : ''}"><td><b>${esc(r.so || '')}</b></td><td>${F.date(r.ngay)}${r.gio ? `<br><small class="muted">${esc(r.gio)}</small>` : ''}</td><td>${esc(r.kenh || '')}<br><small class="muted">${esc([r.ten, r.sdt].filter(Boolean).join(' · '))}</small></td><td><b>${esc(r.loai || '')}</b><br><span class="pa-nd">${esc(r.noiDung || '')}</span></td><td>${esc(r.xe || '')}${e ? `<br><small class="muted">${esc(e.ten)}</small>` : ''}</td><td><span class="pa-nd">${esc(r.xuLy || '')}</span>${r.ngayXong ? `<br><small class="muted">Xong ${F.date(r.ngayXong)}</small>` : ''}</td><td><span class="badge ${st.c}">${st.t}</span>${paLate(r) ? '<br><span class="badge b-red" style="margin-top:4px">Quá hạn</span>' : ''}</td></tr>`; }).join('')}</tbody></table></div>`
        : `<div class="empty">${ic('message')}<div style="margin-top:8px">Chưa có phản ánh nào trong ${F.month(PA.thang).toLowerCase()}.</div></div>`}</div></div>
      <p class="small muted" style="margin-top:10px">Mỗi phản ánh cần ghi biện pháp xử lý và trả lời hành khách. Phản ánh để quá 3 ngày chưa xử lý được báo đỏ.</p>`;
    $('#paM', el).onchange = e => { PA.thang = e.target.value; App.render(); }; $('#paT', el).onchange = e => { PA.tt = e.target.value; App.render(); };
    el.querySelectorAll('.pa-row').forEach(tr => tr.onclick = () => { const r = paAll().find(x => x.id === tr.dataset.id); if (r) paForm(r); });
  },
  rowsVP() { return (DB.lylich || []).filter(r => (r.loai === 'vp' || r.loai === 'tn') && String(r.ngay || '').startsWith(PA.nam)).sort((a, b) => String(b.ngay || '').localeCompare(String(a.ngay || ''))); },
  renderVP(el) {
    const yrs = [...new Set([D.today().slice(0, 4), PA.nam, ...(DB.lylich || []).filter(r => r.loai === 'vp' || r.loai === 'tn').map(r => String(r.ngay || '').slice(0, 4))])].filter(Boolean).sort().reverse();
    $('#paF', el).innerHTML = `<select class="inp" id="paY">${yrs.map(y => `<option ${y === PA.nam ? 'selected' : ''}>${y}</option>`).join('')}</select>`;
    const L = vPA.rowsVP(), per = {}; L.forEach(r => { const o = per[r.lai] = per[r.lai] || { vp: 0, tn: 0 }; o[r.loai]++; });
    const top = Object.entries(per).sort((a, b) => (b[1].vp + b[1].tn) - (a[1].vp + a[1].tn));
    $('#paB', el).innerHTML = `<div class="kpis"><div class="kpi ${L.some(r => r.loai === 'vp') ? 't-red' : ''}"><div class="k-lb">Vi phạm năm ${esc(PA.nam)}</div><div class="k-v">${L.filter(r => r.loai === 'vp').length}</div></div><div class="kpi ${L.some(r => r.loai === 'tn') ? 't-red' : ''}"><div class="k-lb">Tai nạn năm ${esc(PA.nam)}</div><div class="k-v">${L.filter(r => r.loai === 'tn').length}</div></div><div class="kpi"><div class="k-lb">Lái xe có vi phạm / tai nạn</div><div class="k-v">${top.length}</div></div></div>
      ${top.length ? `<div class="pa-chips">${top.map(([id, o]) => `<span>${esc((paEmp(id) || {}).ten || '?')} <b>${o.vp ? o.vp + ' VP' : ''}${o.vp && o.tn ? ' · ' : ''}${o.tn ? o.tn + ' TN' : ''}</b></span>`).join('')}</div>` : ''}
      <div class="card"><div class="card-b p0">${L.length ? `<div class="tbl-wrap"><table class="tbl compact"><thead><tr><th>Ngày</th><th>Lái xe</th><th>Loại</th><th>Nội dung</th><th>Xử lý / thiệt hại</th></tr></thead><tbody>${L.map(r => `<tr><td>${F.date(r.ngay)}</td><td><b>${esc((paEmp(r.lai) || {}).ten || '')}</b></td><td><span class="badge ${r.loai === 'tn' ? 'b-red' : 'b-amber'}">${r.loai === 'tn' ? 'Tai nạn' : 'Vi phạm'}</span></td><td class="pa-nd">${esc(r.loai === 'tn' ? [r.diaDiem, r.nguyenNhan].filter(Boolean).join(' · ') : r.loi || '')}</td><td class="pa-nd">${esc(r.loai === 'tn' ? r.thietHai || '' : r.xuLy || '')}</td></tr>`).join('')}</tbody></table></div>`
        : `<div class="empty">${ic('shield')}<div style="margin-top:8px">Năm ${esc(PA.nam)} chưa ghi nhận vi phạm hay tai nạn nào.</div></div>`}</div></div>
      <p class="small muted" style="margin-top:10px">Số liệu lấy từ Lý lịch hành nghề lái xe (mục Vi phạm, Tai nạn). Thêm hoặc sửa tại màn hình Lý lịch hành nghề.</p>`;
    $('#paY', el).onchange = e => { PA.nam = e.target.value; App.render(); };
  },
  cols: [{ key: 'so', label: 'Số' }, { key: 'ngay', label: 'Ngày', fmt: 'date' }, { key: 'gio', label: 'Giờ' }, { key: 'kenh', label: 'Kênh' }, { key: 'ten', label: 'Người phản ánh' }, { key: 'sdt', label: 'Điện thoại' }, { key: 'loai', label: 'Phản ánh về' }, { key: 'noiDung', label: 'Nội dung' }, { key: 'xe', label: 'Xe' }, { key: 'laiTen', label: 'Lái xe' }, { key: 'nguoiNhan', label: 'Người tiếp nhận' }, { key: 'xuLy', label: 'Biện pháp xử lý' }, { key: 'ttTen', label: 'Trạng thái' }, { key: 'ngayXong', label: 'Ngày xong', fmt: 'date' }],
  colsVP: [{ key: 'ngay', label: 'Ngày', fmt: 'date' }, { key: 'laiTen', label: 'Lái xe' }, { key: 'loaiTen', label: 'Loại' }, { key: 'nd', label: 'Nội dung' }, { key: 'xl', label: 'Xử lý / thiệt hại' }],
  excel() {
    if (PA.tab === 'vp') return XLSX.save('So vi pham tai nan ' + PA.nam, [xSheet('Vi phạm - tai nạn', 'SỔ THEO DÕI VI PHẠM, TAI NẠN CỦA LÁI XE NĂM ' + PA.nam, vPA.colsVP, vPA.rowsVP().map(r => ({ ngay: r.ngay, laiTen: (paEmp(r.lai) || {}).ten || '', loaiTen: r.loai === 'tn' ? 'Tai nạn' : 'Vi phạm', nd: r.loai === 'tn' ? [r.diaDiem, r.nguyenNhan].filter(Boolean).join(' · ') : r.loi || '', xl: r.loai === 'tn' ? r.thietHai || '' : r.xuLy || '' })))]);
    XLSX.save('So phan anh ' + PA.thang, [xSheet('Phản ánh', 'SỔ TIẾP NHẬN VÀ XỬ LÝ PHẢN ÁNH CỦA HÀNH KHÁCH ' + F.month(PA.thang).toUpperCase(), vPA.cols, vPA.rowsPA().map(r => ({ ...r, laiTen: (paEmp(r.lai) || {}).ten || '', ttTen: (PA_TT[r.tt] || PA_TT.moi).t })))]);
  }
};
Object.assign(ACT, { paAdd: () => paForm() });
Object.assign(Auth.ACT_PERM, { paAdd: ['dieuhanh', 'add'] });
addCSS(`.pa-bar{margin-bottom:12px;gap:10px;flex-wrap:wrap}.pa-red{color:#dc2626}
.pa-chips{display:flex;flex-wrap:wrap;gap:6px;margin:-4px 0 12px}.pa-chips span{border:1px solid #e6e9f0;background:#fff;border-radius:999px;padding:4px 11px;font-size:12.5px;color:#475467}.pa-chips b{color:#0f172a;margin-left:4px}
.pa-t td{vertical-align:top}.pa-row{cursor:pointer}.pa-row:hover td{background:#f8fafc}.pa-nd{display:inline-block;max-width:340px;white-space:pre-wrap;font-size:12.5px;color:#334155}`);
MODL.def('phananh', vPA);
