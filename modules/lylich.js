'use strict';
/* Module Lý lịch hành nghề (màn hình, hồ sơ, in); dữ liệu llRecs/llLatest/llHan ở index vì Điều hành, Thông tin của tôi dùng · tải khi mở màn hình (MODL). */
function llEntry(e, loai, r, pick) {
  const isNew = !r; if (!Auth.guard('lylich', isNew ? 'add' : 'edit')) return;
  const lais = pick ? llDrivers() : [];
  const T = LL[loai], R = r ? { ...r, files: (r.files || []).slice() } : { loai, lai: e ? e.id : '', ngay: D.today(), files: [] };
  const body = (pick ? `<div class="form c2"><div class="field"><label>Tên lái xe <i class="req">*</i></label><select class="inp" id="llWho"><option value="">— Chọn lái xe —</option>${lais.map(x => `<option value="${x.id}" ${e && e.id === x.id ? 'selected' : ''}>${esc(x.ten)}</option>`).join('')}</select></div><div class="field"><label>Loại ghi nhận</label><select class="inp" id="llLoai">${LL.order.map(k => `<option value="${k}" ${k === loai ? 'selected' : ''}>${LL[k].label}</option>`).join('')}</select></div></div>` : '') + `<div class="form c2" style="margin-top:${pick ? 8 : 0}px">${T.f.map(f => `<div class="field ${f[2] === 'area' ? 'full' : ''}"><label>${f[1]}${f[3] ? ' <i class="req">*</i>' : ''}</label>${f[2] === 'area' ? `<textarea class="inp" rows="2" data-k="${f[0]}">${esc(R[f[0]] || '')}</textarea>` : `<input class="inp" ${f[2] === 'date' ? 'type="date"' : ''} data-k="${f[0]}" value="${esc(R[f[0]] || '')}">`}</div>`).join('')}</div>
    <div class="field full" style="margin-top:8px"><label>${loai === 'sk' ? 'Giấy khám sức khỏe' : 'Tệp đính kèm'}</label><div class="sc-att" id="llAtt"></div><div class="row" style="gap:8px;align-items:center"><label class="btn sm">${ic('upload')} Tải ảnh / PDF<input type="file" id="llFile" accept="image/*,application/pdf" multiple hidden></label><span class="muted small">Tối đa 6 tệp</span></div></div>`;
  const m = Modal.open({ title: pick ? 'Thêm lý lịch hành nghề' : `${isNew ? 'Thêm' : 'Sửa'} · ${T.label} · ${esc(e.ten)}`, width: 640, body, foot: `<button class="btn" data-cancel>Hủy</button><button class="btn pri" data-save>${ic('check')} Lưu</button>` });
  const q = s => m.el.querySelector(s), K = k => q(`[data-k="${k}"]`), att = R.files, box = q('#llAtt');
  if (pick) { q('#llLoai').onchange = ev => { const w = q('#llWho').value; m.close(); llEntry(w ? empById(w) : null, ev.target.value, null, true); }; }
  if (loai === 'sk') { const h = K('hetHan'); if (!R.hetHan) h.dataset.auto = '1'; if (isNew) h.value = llAddM(R.ngay, LL_SK_MONTHS), h.dataset.auto = '1'; h.addEventListener('input', () => { h.dataset.auto = ''; }); K('ngay').addEventListener('change', ev => { if (ev.target.value && (h.dataset.auto || !h.value)) { h.value = llAddM(ev.target.value, LL_SK_MONTHS); h.dataset.auto = '1'; } }); }
  const draw = () => { box.innerHTML = att.map((f, i) => `<div class="sc-a"><button type="button" data-v="${i}">${fileIsPdf(f) ? '<b>PDF</b>' : `<img src="${f}">`}</button><button type="button" class="sc-ax" data-d="${i}" aria-label="Bỏ tệp">${ic('x')}</button></div>`).join(''); };
  box.onclick = ev => { const v = ev.target.closest('[data-v]'), d = ev.target.closest('[data-d]'); if (v) scView(att, +v.dataset.v); else if (d) { att.splice(+d.dataset.d, 1); draw(); } };
  q('#llFile').onchange = async ev => {
    const fs = [...ev.target.files]; ev.target.value = '';
    for (const f of fs) {
      if (att.length >= 6) { toast('Tối đa 6 tệp', 'err'); break; }
      try { if (f.type === 'application/pdf') att.push(await new Promise((res, rej) => { const rd = new FileReader(); rd.onload = () => res(rd.result); rd.onerror = rej; rd.readAsDataURL(f); })); else att.push(await resizeImage(f, 1600)); } catch (er) { toast('Không đọc được tệp ' + esc(f.name), 'err'); }
    }
    draw();
  };
  draw();
  q('[data-cancel]').onclick = () => m.close();
  q('[data-save]').onclick = () => {
    if (pick) { const w = q('#llWho').value; if (!w) return toast('Chọn lái xe', 'err'); e = empById(w); }
    const d = {}; T.f.forEach(f => { d[f[0]] = K(f[0]).value.trim(); });
    const miss = T.f.find(f => f[3] && !d[f[0]]); if (miss) return toast('Nhập "' + miss[1] + '"', 'err');
    d.files = att.slice();
    if (isNew) DB.lylich.push({ id: uid(), lai: e.id, loai, ...d, nguoiTao: dvLog.who(), tg: D.today() }); else Object.assign(r, d);
    App.changed(); m.close(); toast('Đã lưu cho ' + e.ten, 'ok'); if (LL.refresh) LL.refresh();
  };
}
function llTable(e, loai) {
  const T = LL[loai], L = llRecs(e.id, loai), canE = Auth.can('lylich', 'edit'), canD = Auth.can('lylich', 'del');
  if (!L.length) return `<div class="muted" style="padding:18px 4px">Chưa có ghi nhận nào.</div>`;
  return `<div class="tbl-wrap free"><table class="tbl"><thead><tr>${T.f.map(f => `<th>${f[1]}</th>`).join('')}<th>Tệp</th><th></th></tr></thead><tbody>${L.map(r => `<tr>${T.f.map(f => `<td>${f[2] === 'date' ? (f[0] === 'hetHan' ? llBadge(llPick(r, f), '—') : F.date(r[f[0]])) : esc(r[f[0]] || '') || '<span class="muted">—</span>'}</td>`).join('')}<td>${(r.files || []).length ? `<button class="ibtn" data-ll="files" data-id="${r.id}" style="width:auto;padding:0 6px;gap:3px;color:#0369a1">${ic('file')}<b style="font-size:12px">${r.files.length}</b></button>` : '<span class="muted">—</span>'}</td><td style="white-space:nowrap">${canE ? `<button class="ibtn" data-ll="edit" data-id="${r.id}" data-tip="Sửa">${ic('edit')}</button>` : ''}${canD ? `<button class="ibtn del" data-ll="del" data-id="${r.id}" data-tip="Xóa">${ic('trash')}</button>` : ''}</td></tr>`).join('')}</tbody></table></div>`;
}
function llProfile(id, tab) {
  const e = empById(id); if (!e) return; LL_TAB.tab = tab || LL_TAB.tab || 'sk';
  const canE = Auth.can('lylich', 'edit');
  const m = Modal.open({ title: 'Lý lịch hành nghề · ' + esc(e.ten), width: 920, body: '<div id="llBody"></div>', foot: `<button class="btn" data-prn>${ic('printer')} In lý lịch</button><button class="btn pri" data-no>Đóng</button>` });
  const q = s => m.el.querySelector(s), body = q('#llBody');
  const draw = () => {
    const xes = [...new Set(DB.vehicles.map(v => v.loai).filter(Boolean))];
    const sk = llLatest(id, 'sk'), th = llLatest(id, 'th'), n = k => llRecs(id, k).length;
    body.innerHTML = `<div class="ll-head"><div class="ll-info"><b style="font-size:16px">${esc(e.ten)}</b> <span class="badge ${e.trangThai === 'Nghỉ việc' ? 'b-red' : 'b-green'}">${esc(e.trangThai || '')}</span>
      <div class="muted small">${e.ngaySinh ? 'Sinh ' + F.date(e.ngaySinh) + ' · ' : ''}CCCD ${esc(e.cccd || '—')} · ${esc(e.sdt || '')}</div>
      <div class="small" style="margin-top:4px">Bằng lái hạng <b>${esc(e.bangHang || '—')}</b> · Số ${esc(e.bangSo || '—')} · Hết hạn ${e.bangHetHan ? F.date(e.bangHetHan) : '—'} ${gplxBadge(e)}</div></div>
      <div class="ll-xe"><div class="field"><label>Loại xe đảm nhận</label><input class="inp" id="llXe" list="llXeL" value="${esc(e.llXe || '')}" ${canE ? '' : 'readonly'}><datalist id="llXeL">${xes.map(x => `<option value="${esc(x)}">`).join('')}</datalist></div><div class="field"><label>Sức chứa</label><input class="inp" id="llCho" value="${esc(e.llCho || '')}" placeholder="VD: 16 CHỖ" ${canE ? '' : 'readonly'}></div></div></div>
      <div class="ll-sum"><span>Khám SK: ${sk ? llBadge(llHan(sk)).replace('<br>', ' ') : '<span class="badge b-red">Chưa khám</span>'}</span><span>Thẻ tập huấn: ${th && th.hetHan ? llBadge(th.hetHan).replace('<br>', ' ') : '<span class="badge b-p">Chưa có</span>'}</span></div>
      <div class="ll-tabs">${LL.order.map(k => `<button class="${k === LL_TAB.tab ? 'on' : ''}" data-tab="${k}">${LL[k].label} <em>${n(k)}</em></button>`).join('')}</div>
      <div class="sc-h"><b>${LL[LL_TAB.tab].label}</b>${Auth.can('lylich', 'add') ? `<button class="btn sm pri" data-ll="add">${ic('plus')} Thêm</button>` : ''}</div>${llTable(e, LL_TAB.tab)}`;
  };
  LL.refresh = draw; draw();
  m.el.addEventListener('click', ev => {
    const t = ev.target.closest('[data-tab]'); if (t) { LL_TAB.tab = t.dataset.tab; return draw(); }
    const b = ev.target.closest('[data-ll]'); if (!b) return; const r = (DB.lylich || []).find(x => x.id === b.dataset.id);
    if (b.dataset.ll === 'add') llEntry(e, LL_TAB.tab);
    else if (b.dataset.ll === 'edit' && r) llEntry(e, r.loai, r);
    else if (b.dataset.ll === 'files' && r) scView(r.files);
    else if (b.dataset.ll === 'del' && r) Modal.confirm(`Xóa ghi nhận <b>${LL[r.loai].label}</b> ngày ${F.date(r.ngay)}?`, { ok: 'Xóa', danger: true }).then(ok => { if (ok && Auth.guard('lylich', 'del')) { DB.lylich = DB.lylich.filter(x => x !== r); App.changed(); draw(); toast('Đã xóa', 'ok'); } });
  });
  const sv = () => { if (!canE) return; e.llXe = q('#llXe').value.trim().toUpperCase(); e.llCho = q('#llCho').value.trim().toUpperCase(); App.changed(); };
  m.el.addEventListener('change', ev => { if (ev.target.id === 'llXe' || ev.target.id === 'llCho') sv(); });
  q('[data-prn]').onclick = () => llPrint(e);
  q('[data-no]').onclick = () => m.close();
  const lp = lpAttach(m, () => lpCapture(() => llPrint(e)), { caption: 'Xem trước lý lịch hành nghề', width: 1320 }), d0 = LL.refresh; LL.refresh = () => { d0(); lp.draw(); };
  const oc = m.close; m.close = () => { LL.refresh = null; oc(); };
}
function llPrint(e) {
  const th = 'border:1px solid #333;padding:5px;text-align:left;font-size:13px', tb = loai => { const T = LL[loai], L = llRecs(e.id, loai); return `<h3 style="margin:14px 0 6px">${LL.order.indexOf(loai) + 1}. ${T.label.toUpperCase()}</h3>` + (L.length ? `<table style="width:100%;border-collapse:collapse"><tr>${T.f.map(f => `<th style="${th}">${f[1]}</th>`).join('')}</tr>${L.map(r => `<tr>${T.f.map(f => `<td style="${th}">${f[2] === 'date' ? F.date(llPick(r, f)) : esc(r[f[0]] || '')}</td>`).join('')}</tr>`).join('')}</table>` : '<div class="muted" style="font-size:13px">Không có.</div>'); };
  Print.run(`<div class="pr">${Print.head()}<h2>LÝ LỊCH HÀNH NGHỀ LÁI XE</h2>
    <table style="width:100%;font-size:13.5px;margin:10px 0;border-collapse:collapse"><tr><td style="padding:3px 0;width:50%">Họ và tên: <b>${esc(e.ten)}</b></td><td>Ngày sinh: <b>${e.ngaySinh ? F.date(e.ngaySinh) : ''}</b></td></tr><tr><td style="padding:3px 0">CCCD: <b>${esc(e.cccd || '')}</b></td><td>Điện thoại: <b>${esc(e.sdt || '')}</b></td></tr><tr><td style="padding:3px 0">Bằng lái hạng: <b>${esc(e.bangHang || '')}</b> · Số: <b>${esc(e.bangSo || '')}</b></td><td>Hết hạn: <b>${e.bangHetHan ? F.date(e.bangHetHan) : ''}</b></td></tr><tr><td style="padding:3px 0">Loại xe đảm nhận: <b>${esc(e.llXe || '')}</b></td><td>Sức chứa: <b>${esc(e.llCho || '')}</b></td></tr><tr><td colspan="2" style="padding:3px 0">Địa chỉ: ${esc(e.diaChiTT || '')}</td></tr></table>
    ${LL.order.map(tb).join('')}${Print.signs(['Người lập', 'Lái xe', 'Giám đốc'])}</div>`, { title: 'Ly lich hanh nghe ' + e.ten });
}
LL.order = ['sk', 'vp', 'tn', 'th'];
function llRows(L) { return L.map(e => { const sk = llLatest(e.id, 'sk'), th = llLatest(e.id, 'th'); return { id: e.id, e, sk, th, vp: llRecs(e.id, 'vp').length, tn: llRecs(e.id, 'tn').length }; }); }
const vLL = {
  title: 'Lý lịch hành nghề', icon: 'idcard', desc: 'Hồ sơ hành nghề của lái xe: khám sức khỏe, vi phạm, tai nạn, tập huấn',
  tools: () => Auth.can('lylich', 'add') ? `<button class="btn pri" data-act="llAdd">${ic('plus')} Thêm lý lịch</button>` : '',
  render(el) {
    const L = llRows(llDrivers(LL_TAB.old)), skW = L.filter(r => llWarn(r.sk ? llHan(r.sk) : '')).length, thW = L.filter(r => r.th && r.th.hetHan && llWarn(r.th.hetHan)).length;
    const bar = `<div class="row sc-bar"><select class="inp" id="llOld"><option value="">Lái xe đang làm việc</option><option value="1" ${LL_TAB.old ? 'selected' : ''}>Cả lái xe đã nghỉ việc</option></select><span class="grow"></span>${Auth.can('lylich', 'add') ? `<button class="btn" data-act="llImport">${ic('upload')} Nhập Excel</button><button class="btn pri" data-act="llAdd">${ic('plus')} Thêm lý lịch</button>` : ''}</div>`;
    const kpi = `<div class="sc-kpi"><div><small>Số lái xe</small><b>${L.length}</b></div><div><small>Giấy khám SK cần chú ý</small><b style="color:${skW ? '#b45309' : '#0c4a6e'}">${skW}</b><em>chưa khám / sắp hoặc đã hết hạn</em></div><div><small>Thẻ tập huấn sắp / đã hết hạn</small><b>${thW}</b></div><div><small>Vi phạm · Tai nạn</small><b>${sum(L, r => r.vp)} · ${sum(L, r => r.tn)}</b></div></div>`;
    el.insertAdjacentHTML('beforeend', bar + kpi + '<div id="llT"></div>');
    $('#llOld', el).onchange = ev => { LL_TAB.old = !!ev.target.value; App.render(); };
    table($('#llT', el), {
      id: 'll', rows: L, ph: 'Tìm tên lái xe, loại xe...', empty: 'Chưa có lái xe. Thêm nhân viên có chức vụ "Lái Xe" trong mục Nhân viên.', sort: 0, dir: 1,
      columns: [{ key: 'ten', label: 'Lái xe', val: r => r.e.ten, sortVal: r => r.e.ten, render: r => `<b>${esc(r.e.ten)}</b>${r.e.trangThai === 'Nghỉ việc' ? ' <span class="badge b-red">Nghỉ việc</span>' : ''}` },
        { key: 'hang', label: 'Hạng bằng', val: r => r.e.bangHang || '', align: 'c', render: r => esc(r.e.bangHang || '—') },
        { key: 'xe', label: 'Loại xe', val: r => r.e.llXe || '', render: r => esc(r.e.llXe || '—') + (r.e.llCho ? `<br><span class="muted small">${esc(r.e.llCho)}</span>` : '') },
        { key: 'sk', label: 'Giấy khám SK', val: r => r.sk ? llHan(r.sk) : '', sortVal: r => r.sk ? llHan(r.sk) : '', render: r => r.sk ? llBadge(llHan(r.sk)) : '<span class="badge b-red">Chưa khám</span>' },
        { key: 'th', label: 'Thẻ tập huấn', val: r => r.th ? r.th.hetHan || '' : '', sortVal: r => r.th ? r.th.hetHan || '' : '', render: r => r.th && r.th.hetHan ? llBadge(r.th.hetHan) : '<span class="muted">—</span>' },
        { key: 'vp', label: 'Vi phạm', align: 'c', val: r => r.vp, render: r => r.vp ? `<span class="badge b-amber">${r.vp}</span>` : '0' },
        { key: 'tn', label: 'Tai nạn', align: 'c', val: r => r.tn, render: r => r.tn ? `<span class="badge b-red">${r.tn}</span>` : '0' }],
      searchText: r => (r.e.llXe || '') + ' ' + (r.e.bangHang || ''), onRow: r => llProfile(r.e.id),
      actions: r => `<button class="ibtn" data-act="llPrint" data-id="${r.e.id}" data-tip="In lý lịch">${ic('printer')}</button>`
    });
  },
  excel() { XLSX.save('Ly lich hanh nghe', [xSheet('Lý lịch', 'LÝ LỊCH HÀNH NGHỀ LÁI XE', LL_COLS, llFlat())]); },
  print() { Print.report({ title: 'Lý lịch hành nghề lái xe', sub: 'Tổng hợp', cols: LL_COLS, rows: llFlat(), landscape: true, signs: ['Người lập', 'Giám đốc'] }); }
};
const LL_COLS = [['key', 'KEY'], ['id', 'ID'], ['xe', 'LOẠI XE'], ['cho', 'SỨC CHỨA'], ['kNgay', 'NGÀY KHÁM'], ['kNoi', 'NƠI KHÁM'], ['kTt', 'TÌNH TRẠNG SK'], ['vNgay', 'NGÀY VI PHẠM'], ['vLoi', 'LỖI VI PHẠM'], ['vXl', 'HÌNH THỨC XỬ LÝ'], ['tNgay', 'NGÀY TAI NẠN'], ['tDd', 'ĐỊA ĐIỂM'], ['tTh', 'THIỆT HẠI'], ['tNn', 'NGUYÊN NHÂN'], ['hNgay', 'THỜI GIAN TẬP HUẤN'], ['hNd', 'NỘI DUNG TẬP HUẤN'], ['hDv', 'ĐƠN VỊ TẬP HUẤN'], ['hHan', 'NGÀY HẾT HẠN THẺ TẬP HUẤN'], ['kHan', 'HẠN GIẤY KHÁM']].map(c => ({ key: c[0], label: c[1], fmt: /Ngay|Han$/.test(c[0]) && c[0] !== 'hNd' ? 'date' : undefined }));
function llFlat() {
  const out = [];
  llDrivers(true).forEach(e => {
    const base = { key: String(e.ten).toUpperCase(), id: e.id, xe: e.llXe || '', cho: e.llCho || '' }, L = (DB.lylich || []).filter(r => r.lai === e.id).sort((a, b) => String(a.ngay).localeCompare(String(b.ngay)));
    if (!L.length) return out.push(base);
    L.forEach(r => out.push({ ...base, ...(r.loai === 'sk' ? { kNgay: r.ngay, kNoi: r.noi, kTt: r.tt, kHan: llHan(r) } : r.loai === 'vp' ? { vNgay: r.ngay, vLoi: r.loi, vXl: r.xuLy } : r.loai === 'tn' ? { tNgay: r.ngay, tDd: r.diaDiem, tTh: r.thietHai, tNn: r.nguyenNhan } : { hNgay: r.ngay, hNd: r.noiDung, hDv: r.donVi, hHan: r.hetHan }) }));
  });
  return out;
}
function llImport() {
  if (!Auth.guard('lylich', 'add')) return;
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.xlsx,.csv';
  inp.onchange = async () => {
    const f = inp.files[0]; if (!f) return;
    try {
      const rows = (await XLSX.read(f)).filter(r => r && r.some(c => String(c ?? '').trim() !== '')), nh = x => dvNorm(x).replace(/[^a-z0-9]/g, '');
      const hr = rows.findIndex(r => r.some(c => nh(c) === 'key')); if (hr < 0) throw new Error('Không thấy cột "KEY" (tên lái xe). File cần có cột KEY, LOẠI XE, SỨC CHỨA, NGÀY KHÁM, ...');
      const ix = {}; rows[hr].forEach((h, i) => { ix[nh(h)] = i; });
      const g = (r, k) => ix[k] === undefined ? '' : String(r[ix[k]] ?? '').trim();
      const dt = v => { v = String(v ?? '').trim(); if (!v) return ''; if (/^\d{4,6}(\.\d+)?$/.test(v)) { const d = new Date(Math.round((+v - 25569) * 86400000)); return isNaN(d) ? '' : d.toISOString().slice(0, 10); } const m = v.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/); if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; return /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : ''; };
      const drv = llDrivers(true), byName = {}; drv.forEach(e => { byName[dvNorm(e.ten)] = e; });
      const add = [], miss = new Set(), xeSet = []; let dup = 0;
      rows.slice(hr + 1).forEach(r => {
        const nm = g(r, 'key'); if (!nm) return; const e = byName[dvNorm(nm)]; if (!e) { miss.add(nm); return; }
        const xe = g(r, 'loaixe'), cho = g(r, 'succhua'); if (xe || cho) xeSet.push([e, xe, cho]);
        const push = (loai, o) => { if (!o.ngay) return; if ((DB.lylich || []).concat(add).some(x => x.lai === e.id && x.loai === loai && x.ngay === o.ngay && (x.loi || x.diaDiem || x.noiDung || x.noi || '') === (o.loi || o.diaDiem || o.noiDung || o.noi || ''))) { dup++; return; } add.push({ id: uid(), lai: e.id, loai, files: [], nguoiTao: dvLog.who(), tg: D.today(), ...o }); };
        push('sk', { ngay: dt(g(r, 'ngaykham')), noi: g(r, 'noikham'), tt: g(r, 'tinhtrangsk'), hetHan: dt(g(r, 'hangiaykham')) });
        push('vp', { ngay: dt(g(r, 'ngayvipham')), loi: g(r, 'loivipham'), xuLy: g(r, 'hinhthucxuly') });
        push('tn', { ngay: dt(g(r, 'ngaytainan')), diaDiem: g(r, 'diadiem'), thietHai: g(r, 'thiethai'), nguyenNhan: g(r, 'nguyennhan') });
        push('th', { ngay: dt(g(r, 'thoigiantaphuan')), noiDung: g(r, 'noidungtaphuan'), donVi: g(r, 'donvitaphuan'), hetHan: dt(g(r, 'ngayhethanthetaphuan')) });
      });
      if (!add.length && !xeSet.length) throw new Error(miss.size ? 'Không khớp được lái xe nào: ' + [...miss].join(', ') : 'File không có dữ liệu mới');
      const cnt = k => add.filter(x => x.loai === k).length;
      if (await Modal.confirm(`Nhập từ <b>${esc(f.name)}</b>:<br>Khám SK <b>${cnt('sk')}</b> · Vi phạm <b>${cnt('vp')}</b> · Tai nạn <b>${cnt('tn')}</b> · Tập huấn <b>${cnt('th')}</b>${dup ? `<br><span class="muted small">Bỏ qua ${dup} dòng trùng</span>` : ''}${miss.size ? `<br><span class="muted small">Không có trong danh sách lái xe: ${esc([...miss].join(', '))}</span>` : ''}<br><span class="muted small">Cột GIẤY KHÁM SK trong file chỉ là đường dẫn, không có tệp thật nên không nhập; hãy tải ảnh/PDF giấy khám trong hồ sơ từng lái xe.</span>`, { ok: 'Nhập', title: 'Nhập lý lịch hành nghề' })) {
        DB.lylich.push(...add); xeSet.forEach(([e, xe, cho]) => { if (xe) e.llXe = xe; if (cho) e.llCho = cho; }); App.changed(); toast('Đã nhập ' + add.length + ' ghi nhận', 'ok');
      }
    } catch (er) { toast(esc(er.message || 'Không đọc được file'), 'err', 6000); }
  };
  inp.click();
}
function llAddMulti(pre) {
  if (!Auth.guard('lylich', 'add')) return;
  const lais = llDrivers(), on = new Set(pre ? [pre] : ['sk']), atts = {}; LL.order.forEach(k => { atts[k] = []; });
  const sec = k => { const T = LL[k]; return `<div class="ll-sec" data-sec="${k}" ${on.has(k) ? '' : 'hidden'}><div class="ll-st">${T.label}</div><div class="form c2">${T.f.map(f => `<div class="field ${f[2] === 'area' ? 'full' : ''}"><label>${f[1]}${f[3] ? ' <i class="req">*</i>' : ''}</label>${f[2] === 'area' ? `<textarea class="inp" rows="2" data-k="${k}.${f[0]}"></textarea>` : `<input class="inp" ${f[2] === 'date' ? 'type="date"' : ''} data-k="${k}.${f[0]}" ${f[0] === 'ngay' ? `value="${D.today()}"` : ''}>`}</div>`).join('')}</div><div class="sc-att" data-att="${k}" style="margin-top:8px"></div><label class="btn sm">${ic('upload')} Tải ảnh / PDF<input type="file" data-file="${k}" accept="image/*,application/pdf" multiple hidden></label></div>`; };
  const body = `<div class="field"><label>Tên lái xe <i class="req">*</i></label><select class="inp" id="llWho"><option value="">— Chọn lái xe —</option>${lais.map(x => `<option value="${x.id}">${esc(x.ten)}</option>`).join('')}</select></div>
    <div class="field" style="margin-top:10px"><label>Chọn các mục cần thêm</label><div class="ll-chk">${LL.order.map(k => `<label class="ll-c ${on.has(k) ? 'on' : ''}"><input type="checkbox" data-pick="${k}" ${on.has(k) ? 'checked' : ''}> ${LL[k].label}</label>`).join('')}</div></div>${LL.order.map(sec).join('')}`;
  const m = Modal.open({ title: 'Thêm lý lịch hành nghề', width: 720, body, foot: `<button class="btn" data-cancel>Hủy</button><button class="btn pri" data-save>${ic('check')} Lưu</button>` });
  const q = s => m.el.querySelector(s), K = (k, f) => q(`[data-k="${k}.${f}"]`);
  const draw = k => { q(`[data-att="${k}"]`).innerHTML = atts[k].map((f, i) => `<div class="sc-a"><button type="button" data-v="${k}:${i}">${fileIsPdf(f) ? '<b>PDF</b>' : `<img src="${f}">`}</button><button type="button" class="sc-ax" data-d="${k}:${i}" aria-label="Bỏ tệp">${ic('x')}</button></div>`).join(''); };
  m.el.addEventListener('change', async ev => {
    const c = ev.target.closest('[data-pick]'); if (c) { const k = c.dataset.pick; c.checked ? on.add(k) : on.delete(k); q(`[data-sec="${k}"]`).hidden = !c.checked; c.closest('.ll-c').classList.toggle('on', c.checked); return; }
    if (ev.target.dataset.file) { const k = ev.target.dataset.file, fs = [...ev.target.files]; ev.target.value = ''; for (const f of fs) { if (atts[k].length >= 6) { toast('Tối đa 6 tệp', 'err'); break; } try { atts[k].push(f.type === 'application/pdf' ? await new Promise((res, rej) => { const rd = new FileReader(); rd.onload = () => res(rd.result); rd.onerror = rej; rd.readAsDataURL(f); }) : await resizeImage(f, 1600)); } catch (er) { toast('Không đọc được tệp', 'err'); } } draw(k); return; }
    if (ev.target.dataset.k === 'sk.ngay') { const h = K('sk', 'hetHan'); if (ev.target.value && (!h.value || h.dataset.auto)) { h.value = llAddM(ev.target.value, LL_SK_MONTHS); h.dataset.auto = '1'; } }
  });
  K('sk', 'hetHan').value = llAddM(D.today(), LL_SK_MONTHS); K('sk', 'hetHan').dataset.auto = '1'; K('sk', 'hetHan').addEventListener('input', ev => { ev.target.dataset.auto = ''; });
  m.el.addEventListener('click', ev => { const v = ev.target.closest('[data-v]'), d = ev.target.closest('[data-d]'); if (v) { const [k, i] = v.dataset.v.split(':'); scView(atts[k], +i); } else if (d) { const [k, i] = d.dataset.d.split(':'); atts[k].splice(+i, 1); draw(k); } });
  q('[data-cancel]').onclick = () => m.close();
  q('[data-save]').onclick = () => {
    const w = q('#llWho').value; if (!w) return toast('Chọn lái xe', 'err'); if (!on.size) return toast('Tích chọn ít nhất một mục cần thêm', 'err');
    const out = [];
    for (const k of LL.order) { if (!on.has(k)) continue; const d = {}; LL[k].f.forEach(f => { d[f[0]] = K(k, f[0]).value.trim(); }); const miss = LL[k].f.find(f => f[3] && !d[f[0]]); if (miss) return toast(LL[k].label + ': nhập "' + miss[1] + '"', 'err'); out.push({ id: uid(), lai: w, loai: k, ...d, files: atts[k].slice(), nguoiTao: dvLog.who(), tg: D.today() }); }
    DB.lylich.push(...out); App.changed(); m.close(); toast('Đã thêm ' + out.length + ' mục cho ' + empById(w).ten, 'ok'); if (LL.refresh) LL.refresh();
  };
}
addCSS(`.ll-chk{display:flex;gap:8px;flex-wrap:wrap}.ll-c{display:flex;align-items:center;gap:6px;border:1px solid #bae6fd;border-radius:10px;padding:8px 12px;cursor:pointer;font-weight:600;color:#475569;background:#fff;min-height:40px}.ll-c.on{background:#e0f2fe;color:#0369a1;border-color:#0284c7}.ll-sec{margin-top:12px;padding:10px 12px;border:1px solid #dbeafe;border-radius:12px;background:#f8fbff}.ll-sec[hidden]{display:none}.ll-st{font-weight:700;color:#0c4a6e;margin-bottom:8px}`);
addCSS(`@media(max-width:900px){.topbar{position:static;flex-wrap:wrap;padding:12px 14px 10px;row-gap:8px}.top-actions{position:static;order:3;flex:0 0 100%;width:100%;bottom:auto;left:auto;right:auto;padding:0;margin:0;gap:8px;flex-wrap:wrap;overflow:visible;background:none;backdrop-filter:none;border-top:0}.top-actions>*{flex:1 1 auto;justify-content:center}.content{padding-bottom:84px}}`);
Object.assign(ACT, { llPrint: d => { const e = empById(d.id); if (e) llPrint(e); }, llImport: () => llImport(), llAdd: () => llAddMulti() });
addCSS(`.ll-head{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:14px;align-items:start}.ll-xe{display:grid;grid-template-columns:1fr 1fr;gap:8px}.ll-sum{display:flex;gap:16px;flex-wrap:wrap;margin:10px 0;padding:8px 12px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;font-size:13px}.ll-tabs{display:flex;gap:6px;flex-wrap:wrap;margin:6px 0 4px;border-bottom:1px solid #dbeafe}.ll-tabs button{border:0;background:none;padding:8px 12px;font:inherit;font-weight:600;color:#64748b;cursor:pointer;border-bottom:2px solid transparent;min-height:40px}.ll-tabs button.on{color:#0369a1;border-color:#0284c7}.ll-tabs em{font-style:normal;background:#e0f2fe;color:#0369a1;border-radius:9px;padding:0 6px;font-size:12px;margin-left:3px}
@media(max-width:700px){.ll-head{grid-template-columns:1fr}.sc-kpi{grid-template-columns:repeat(2,minmax(0,1fr))}}`);
MODL.def('lylich', vLL);
