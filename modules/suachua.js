'use strict';
/* Module Sửa chữa phương tiện (form, danh sách, in phiếu); scView/scTong ở index vì module khác dùng chung · tải khi mở màn hình (MODL). */
function scForm(p) {
  const isNew = !p;
  if (isNew && !Auth.guard('suachua', 'add')) return;
  if (!isNew && !Auth.guard('suachua', 'edit')) return;
  const P = p ? { ...p, items: p.items.map(i => ({ ...i })), hoaDon: (p.hoaDon || []).slice() } : { so: scNext(), ngay: D.today(), xe: SC.xe || '', lai: '', ghiChu: '', hoaDon: [], km: '', donVi: '', items: [{ nd: '', dvt: '', sl: 1, gia: 0 }] };
  const xes = DB.vehicles.map(v => v.bks).filter(Boolean); if (P.xe && !xes.includes(P.xe)) xes.push(P.xe);
  const lais = [...new Set(vcDrivers().map(e => String(e.ten || '').toUpperCase()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi')), laiOld = P.lai && !lais.includes(String(P.lai).toUpperCase());
  const known = {}; DB.suachua.forEach(x => (x.items || []).forEach(i => { if (i.nd) known[i.nd.toUpperCase()] = { dvt: i.dvt, gia: i.gia }; }));
  const body = `<div class="form c4"><div class="field"><label>Số phiếu</label><input class="inp" id="scSo" value="${esc(P.so)}" readonly></div><div class="field"><label>Ngày <i class="req">*</i></label><input class="inp" type="date" id="scNgay" value="${esc(P.ngay)}"></div>
    <div class="field"><label>Số xe <i class="req">*</i></label><select class="inp" id="scXe"><option value="">— Chọn xe —</option>${xes.map(x => `<option ${x === P.xe ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select></div><div class="field"><label>Tên lái xe</label><select class="inp" id="scLai"><option value="">— Chọn lái xe —</option>${laiOld ? `<option selected value="${esc(P.lai)}">${esc(P.lai)} (không còn làm)</option>` : ''}${lais.map(x => `<option value="${esc(x)}" ${x === String(P.lai || '').toUpperCase() ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select></div></div>
    <div class="form c2" style="margin-top:8px"><div class="field"><label>Số km hiện tại (Odo)</label><input class="inp" id="scKm" type="number" min="0" inputmode="numeric" value="${esc(P.km || '')}" placeholder="VD: 125000"></div><div class="field"><label>Đơn vị thực hiện (Gara / Xưởng)</label><input class="inp" id="scDv" list="scDvL" value="${esc(P.donVi || '')}"><datalist id="scDvL">${[...new Set(DB.suachua.map(x => x.donVi).filter(Boolean))].map(x => `<option value="${esc(x)}">`).join('')}</datalist></div></div>
    <div class="sc-h"><b>Nội dung sửa chữa</b><span class="row" style="gap:6px"><button type="button" class="btn sm" id="scBulkBtn">${ic('table')} Nhập nhiều dòng</button><button type="button" class="btn sm" id="scAddRow">${ic('plus')} Thêm dòng</button></span></div>
    <div id="scBulk" class="sc-bulk" hidden><textarea class="inp" id="scBulkT" rows="6" placeholder="Mỗi dòng một hạng mục, cách nhau bằng dấu ; hoặc Tab (dán thẳng từ Excel được):&#10;THAY CẶP KÈN SÒ; CẶP; 1; 240000&#10;LỌC NHỚT; CÁI; 2; 60000&#10;CÔNG THỢ; XE; 1; 250000&#10;(Chỉ gõ tên hạng mục cũng được, SL mặc định 1)"></textarea><div class="sc-bh"><span class="muted small" id="scBulkN">Thứ tự: Nội dung ; ĐVT ; Số lượng ; Đơn giá</span><span class="grow"></span><button type="button" class="btn sm" id="scBulkX">Đóng</button><button type="button" class="btn sm pri" id="scBulkOk">${ic('check')} Thêm vào phiếu</button></div></div>
    <datalist id="scNdL">${Object.keys(known).map(x => `<option value="${esc(x)}">`).join('')}</datalist>
    <div class="sc-items" id="scRows"></div>
    <div class="sc-tot"><span>Tổng cộng</span><b id="scTot">0</b></div>
    <div class="field full" style="margin-top:10px"><label>Hóa đơn / phiếu mua đồ sửa chữa</label><div class="sc-att" id="scAtt"></div><div class="row" style="gap:8px;align-items:center"><label class="btn sm">${ic('upload')} Tải ảnh / PDF<input type="file" id="scFile" accept="image/*,application/pdf" multiple hidden></label><span class="muted small">Chụp hoặc chọn nhiều ảnh, PDF · tối đa 8 tệp</span></div></div>
    <div class="field" style="margin-top:8px"><label>Ghi chú</label><input class="inp" id="scGc" value="${esc(P.ghiChu || '')}"></div>`;
  const m = Modal.open({ title: isNew ? 'Thêm phiếu sửa chữa' : 'Phiếu sửa chữa ' + esc(P.so), width: 860, body,
    foot: `${!isNew && Auth.can('suachua', 'del') ? `<button class="btn danger left" data-del>${ic('trash')} Xóa</button>` : ''}${!isNew ? `<button class="btn" data-prn>${ic('printer')} In phiếu</button>` : ''}<button class="btn" data-cancel>Hủy</button><button class="btn pri" data-save>${ic('check')} Lưu phiếu</button>` });
  const q = s => m.el.querySelector(s), rows = q('#scRows');
  const calc = () => { let t = 0; rows.querySelectorAll('.sc-r').forEach(r => { const v = (+r.querySelector('[data-sl]').value || 0) * (+r.querySelector('[data-gia]').value || 0); r.querySelector('.sc-tt').textContent = scMoney(v); t += v; }); q('#scTot').textContent = scMoney(t) + ' đ'; };
  const addRow = (i = { nd: '', dvt: '', sl: 1, gia: 0 }) => {
    const r = document.createElement('div'); r.className = 'sc-r';
    r.innerHTML = `<input class="inp" data-nd list="scNdL" placeholder="Nội dung sửa chữa" value="${esc(i.nd)}"><input class="inp" data-dvt placeholder="ĐVT" value="${esc(i.dvt)}"><input class="inp" data-sl type="number" min="0" step="any" inputmode="decimal" placeholder="SL" value="${i.sl}"><input class="inp" data-gia type="number" min="0" step="1000" inputmode="numeric" placeholder="Đơn giá" value="${i.gia || ''}"><span class="sc-tt">0</span><button type="button" class="ibtn" data-rm aria-label="Xóa dòng">${ic('x')}</button>`;
    r.querySelector('[data-nd]').addEventListener('change', e => { const k = known[e.target.value.trim().toUpperCase()]; if (k) { const d = r.querySelector('[data-dvt]'), g = r.querySelector('[data-gia]'); if (!d.value) d.value = k.dvt || ''; if (!+g.value) g.value = k.gia || ''; calc(); } });
    r.addEventListener('input', calc);
    r.querySelector('[data-rm]').onclick = () => { if (rows.children.length > 1) { r.remove(); calc(); } else { r.querySelectorAll('input').forEach(x => x.value = ''); r.querySelector('[data-sl]').value = 1; calc(); } };
    rows.appendChild(r);
  };
  P.items.forEach(addRow); calc();
  const bt = q('#scBulkT'), bn = q('#scBulkN');
  const numOf = t => { t = String(t).trim().replace(/\s|đ$/gi, ''); if (/^\d{1,3}([.,]\d{3})+$/.test(t)) return +t.replace(/[.,]/g, ''); if (/^\d+([.,]\d+)?$/.test(t)) return +t.replace(',', '.'); return null; };
  const parseBulk = txt => txt.split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(l => {
    const t = l.split(/\t|;|\|/).map(x => x.trim()), nd = (t.shift() || '').toUpperCase(); let dvt = '', nums = [];
    t.forEach(x => { if (x === '') return; const n = numOf(x); if (n !== null) nums.push(n); else if (!dvt) dvt = x.toUpperCase(); });
    let sl = 1, gia = 0; if (nums.length >= 2) { sl = nums[0]; gia = nums[1]; } else if (nums.length === 1) { if (nums[0] >= 1000) gia = nums[0]; else sl = nums[0]; }
    return { nd, dvt, sl: sl || 1, gia };
  }).filter(i => i.nd);
  q('#scBulkBtn').onclick = () => { const b = q('#scBulk'); b.hidden = !b.hidden; if (!b.hidden) bt.focus(); };
  q('#scBulkX').onclick = () => { q('#scBulk').hidden = true; };
  bt.oninput = () => { const n = parseBulk(bt.value).length; bn.textContent = n ? 'Sẽ thêm ' + n + ' dòng' : 'Thứ tự: Nội dung ; ĐVT ; Số lượng ; Đơn giá'; };
  q('#scBulkOk').onclick = () => {
    const L = parseBulk(bt.value); if (!L.length) return toast('Chưa có dòng nào để thêm', 'err');
    const first = rows.children.length === 1 ? rows.firstElementChild : null; if (first && !first.querySelector('[data-nd]').value.trim() && !(+first.querySelector('[data-gia]').value)) first.remove();
    L.forEach(i => { const k = known[i.nd]; if (k) { if (!i.dvt) i.dvt = k.dvt || ''; if (!i.gia) i.gia = k.gia || 0; } addRow(i); });
    calc(); bt.value = ''; bn.textContent = 'Đã thêm ' + L.length + ' dòng. Có thể dán tiếp.'; toast('Đã thêm ' + L.length + ' dòng vào phiếu', 'ok');
  };
  const att = P.hoaDon, attBox = q('#scAtt');
  const drawAtt = () => { attBox.innerHTML = att.map((f, i) => `<div class="sc-a"><button type="button" data-v="${i}" title="Xem">${fileIsPdf(f) ? '<b>PDF</b>' : `<img src="${f}">`}</button><button type="button" class="sc-ax" data-d="${i}" aria-label="Bỏ tệp">${ic('x')}</button></div>`).join(''); };
  attBox.onclick = e => { const v = e.target.closest('[data-v]'), d = e.target.closest('[data-d]'); if (v) scView(att, +v.dataset.v); else if (d) { att.splice(+d.dataset.d, 1); drawAtt(); } };
  q('#scFile').onchange = async e => {
    const fs = [...e.target.files]; e.target.value = '';
    for (const f of fs) {
      if (att.length >= 8) { toast('Mỗi phiếu tối đa 8 tệp hóa đơn', 'err'); break; }
      try {
        if (f.type === 'application/pdf') { if (f.size > 5 * 1048576) toast(`PDF nặng ${(f.size / 1048576).toFixed(1)} MB, sẽ làm file dữ liệu nặng hơn`, '', 6000); att.push(await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(f); })); }
        else att.push(await resizeImage(f, 1600));
      } catch (er) { toast('Không đọc được tệp ' + esc(f.name), 'err'); }
    }
    drawAtt();
  };
  drawAtt();
  q('#scAddRow').onclick = () => { addRow(); calc(); const l = rows.lastElementChild; if (l) l.querySelector('[data-nd]').focus(); };
  q('[data-cancel]').onclick = () => m.close();
  const prn = q('[data-prn]'); if (prn) prn.onclick = () => scPrint(p);
  const del = q('[data-del]'); if (del) del.onclick = async () => { if (await Modal.confirm(`Xóa phiếu <b>${esc(p.so)}</b> (${scMoney(scTong(p))} đ)?`, { ok: 'Xóa', danger: true })) { DB.suachua = DB.suachua.filter(x => x !== p); App.changed(); m.close(); toast('Đã xóa phiếu ' + p.so, 'ok'); } };
  q('[data-save]').onclick = () => {
    const ngay = q('#scNgay').value, xe = q('#scXe').value;
    if (!ngay) return toast('Chọn ngày sửa chữa', 'err'); if (!xe) return toast('Chọn số xe', 'err');
    const items = [...rows.querySelectorAll('.sc-r')].map(r => ({ nd: r.querySelector('[data-nd]').value.trim().toUpperCase(), dvt: r.querySelector('[data-dvt]').value.trim().toUpperCase(), sl: +r.querySelector('[data-sl]').value || 0, gia: +r.querySelector('[data-gia]').value || 0 })).filter(i => i.nd);
    if (!items.length) return toast('Nhập ít nhất một nội dung sửa chữa', 'err');
    if (items.some(i => i.sl <= 0)) return toast('Số lượng phải lớn hơn 0', 'err');
    const d = { so: P.so, ngay, xe, lai: q('#scLai').value.trim().toUpperCase(), ghiChu: q('#scGc').value.trim(), km: +q('#scKm').value || '', donVi: q('#scDv').value.trim(), hoaDon: att.slice(), items };
    if (isNew) DB.suachua.push({ id: uid(), nguoiTao: dvLog.who(), nguoiTaoId: (scMe() || {}).id || '', tg: D.today() + ' ' + new Date().toTimeString().slice(0, 5), ...d });
    else { (p.lichSu = p.lichSu || []).push({ tg: dvLog.now(), nguoi: dvLog.who(), nd: 'Sửa phiếu' }); Object.assign(p, d); }
    App.changed(); m.close(); toast('Đã lưu phiếu ' + d.so, 'ok');
  };
  lpAttach(m, () => { const items = [...rows.querySelectorAll('.sc-r')].map(r => ({ nd: r.querySelector('[data-nd]').value.trim().toUpperCase(), dvt: r.querySelector('[data-dvt]').value.trim().toUpperCase(), sl: +r.querySelector('[data-sl]').value || 0, gia: +r.querySelector('[data-gia]').value || 0 })).filter(i => i.nd);
    return lpCapture(() => scPrint({ ...P, ngay: q('#scNgay').value, xe: q('#scXe').value, lai: q('#scLai').value.trim().toUpperCase(), ghiChu: q('#scGc').value.trim(), km: +q('#scKm').value || '', donVi: q('#scDv').value.trim(), hoaDon: att.slice(), items })); }, { caption: 'Xem trước phiếu sửa chữa' });
}
/* nhân viên đang đăng nhập (khớp SĐT tài khoản) */
function scMe() { const u = Auth.user; if (!u) return null; return DB.employees.find(x => x.sdt && normUser(x.sdt) === normUser(u.user)) || null; }
/* người lập phiếu: theo id lưu lúc tạo, phiếu cũ thì dò theo tên; phiếu chưa lưu là người đang đăng nhập */
function scCreator(p) {
  const nm = x => String(x || '').trim().toLowerCase();
  return (p.nguoiTaoId && empById(p.nguoiTaoId)) || (p.nguoiTao && DB.employees.find(e => nm(e.ten) === nm(p.nguoiTao))) || (!p.id ? scMe() : null);
}
function scSigns(p) {
  let h = Print.signs(['Người lập phiếu', 'Lái xe', 'Giám đốc']); const e = scCreator(p), ten = (e && e.ten) || (p.id ? p.nguoiTao : dvLog.who()) || '';
  const img = e && e.chuKy && /^(data:|https?:)/.test(e.chuKy) ? `<img class="sig-img" src="${esc(e.chuKy)}" alt="" style="display:block;max-height:64px;max-width:160px;object-fit:contain;margin:4px auto 0">` : '';
  if (img || ten) h = h.replace('<div class="sp"></div>', `${img || '<div class="sp" style="height:56px"></div>'}${ten ? `<div${img ? ' class="sig-nm"' : ''} style="margin-top:4px;font-weight:700">${esc(ten)}</div>` : ''}`);
  return h;
}
function scPrint(p) {
  const co = S().company || {}, t = scTong(p);
  Print.run(`<div class="pr">${Print.head()}<h2>PHIẾU SỬA CHỮA PHƯƠNG TIỆN</h2><div class="pr-sub">Số phiếu: <b>${esc(p.so)}</b> · Ngày: <b>${F.date(p.ngay)}</b></div>
    <div style="margin:10px 0;font-size:14px">Số xe: <b>${esc(p.xe)}</b> &nbsp;·&nbsp; Lái xe: <b>${esc(p.lai || '..............')}</b></div>
    <table style="width:100%;border-collapse:collapse;font-size:13.5px"><tr>${['STT', 'Nội dung sửa chữa', 'ĐVT', 'SL', 'Đơn giá', 'Thành tiền'].map((h, i) => `<th style="border:1px solid #333;padding:6px;${i > 2 ? 'text-align:right' : 'text-align:left'}">${h}</th>`).join('')}</tr>${p.items.map((i, k) => `<tr><td style="border:1px solid #333;padding:6px;width:36px">${k + 1}</td><td style="border:1px solid #333;padding:6px">${esc(i.nd)}</td><td style="border:1px solid #333;padding:6px">${esc(i.dvt)}</td><td style="border:1px solid #333;padding:6px;text-align:right">${i.sl}</td><td style="border:1px solid #333;padding:6px;text-align:right">${F.money(i.gia)}</td><td style="border:1px solid #333;padding:6px;text-align:right">${F.money((+i.sl || 0) * (+i.gia || 0))}</td></tr>`).join('')}<tr><td colspan="5" style="border:1px solid #333;padding:6px;text-align:right"><b>Tổng cộng</b></td><td style="border:1px solid #333;padding:6px;text-align:right"><b>${F.money(t)}</b></td></tr></table>
    <div class="pr-note">Bằng chữ: <b>${docSo(t)}</b>.${p.ghiChu ? ' Ghi chú: ' + esc(p.ghiChu) : ''}</div>${scSigns(p)}</div>`, { title: 'Phieu sua chua ' + p.so });
}
const scFlat = L => L.flatMap(p => p.items.map(i => ({ so: p.so, ngay: p.ngay, xe: p.xe, lai: p.lai, nd: i.nd, dvt: i.dvt, sl: i.sl, gia: i.gia, tt: (+i.sl || 0) * (+i.gia || 0), nguoi: p.nguoiTao || '', tg: p.tg || '' })));
const scCols = [{ key: 'so', label: 'Số phiếu' }, { key: 'ngay', label: 'Ngày', fmt: 'date' }, { key: 'xe', label: 'Số xe' }, { key: 'lai', label: 'Tên lái xe' }, { key: 'nd', label: 'Nội dung sửa chữa' }, { key: 'dvt', label: 'ĐVT' }, { key: 'sl', label: 'Số lượng', align: 'r' }, { key: 'gia', label: 'Đơn giá', fmt: 'money' }, { key: 'tt', label: 'Thành tiền', fmt: 'money', sum: true }];
const vSC = {
  title: 'Sửa chữa', icon: 'wrench', desc: 'Phiếu sửa chữa phương tiện: nội dung, số lượng, đơn giá và chi phí theo xe',
  tools: () => Auth.can('suachua', 'add') ? `<button class="btn pri" data-act="scAdd">${ic('plus')} Thêm phiếu</button>` : '',
  render(el) {
    const A = DB.suachua, months = [...new Set(A.map(p => String(p.ngay).slice(0, 7)))].sort().reverse(), xes = [...new Set(A.map(p => p.xe))].sort();
    if (SC.thang && !months.includes(SC.thang)) SC.thang = ''; if (SC.xe && !xes.includes(SC.xe)) SC.xe = '';
    const L = scList(), tot = sum(L, scTong), nItem = sum(L, p => p.items.length);
    const byXe = {}; L.forEach(p => { (byXe[p.xe] = byXe[p.xe] || { n: 0, t: 0, lai: new Set() }); byXe[p.xe].n++; byXe[p.xe].t += scTong(p); if (p.lai) byXe[p.xe].lai.add(p.lai); });
    const xr = Object.entries(byXe).sort((a, b) => b[1].t - a[1].t), top = xr[0];
    const bar = `<div class="row sc-bar"><select class="inp" id="scT"><option value="">Tất cả các tháng</option>${months.map(x => `<option value="${x}" ${SC.thang === x ? 'selected' : ''}>Tháng ${x.slice(5)}/${x.slice(0, 4)}</option>`).join('')}</select><select class="inp" id="scX"><option value="">Tất cả các xe</option>${xes.map(x => `<option ${SC.xe === x ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select><span class="grow"></span>${Auth.can('suachua', 'add') ? `<button class="btn" data-act="scImport">${ic('upload')} Nhập Excel</button><button class="btn pri" data-act="scAdd">${ic('plus')} Thêm phiếu</button>` : ''}</div>`;
    const kpi = `<div class="sc-kpi"><div><small>Tổng chi phí</small><b>${scMoney(tot)} đ</b></div><div><small>Số phiếu</small><b>${L.length}</b></div><div><small>Hạng mục</small><b>${nItem}</b></div><div><small>Xe tốn nhiều nhất</small><b>${top ? esc(top[0]) : '—'}</b>${top ? `<em>${scMoney(top[1].t)} đ</em>` : ''}</div></div>`;
    el.insertAdjacentHTML('beforeend', bar + kpi + '<div id="scT1"></div>' + (xr.length ? `<div class="tbl-card" style="margin-top:14px"><div class="tbl-tools"><b>Chi phí theo xe</b></div><div class="tbl-wrap free"><table class="tbl"><thead><tr><th>Số xe</th><th>Lái xe</th><th class="r">Chi phí</th><th class="r">Tỷ lệ</th></tr></thead><tbody>${xr.map(([x, v]) => `<tr><td><b>${esc(x)}</b></td><td>${v.lai.size ? esc([...v.lai].join(', ')) : '<span class="muted">—</span>'}</td><td class="r">${scMoney(v.t)}</td><td class="r">${tot ? Math.round(v.t / tot * 100) : 0}%</td></tr>`).join('')}</tbody></table></div></div>` : ''));
    $('#scT', el).onchange = e => { SC.thang = e.target.value; App.render(); }; $('#scX', el).onchange = e => { SC.xe = e.target.value; App.render(); };
    table($('#scT1', el), {
      id: 'sc', columns: [{ key: 'so', label: 'Số phiếu', render: p => `<b>${esc(p.so)}</b>` }, { key: 'ngay', label: 'Ngày', fmt: 'date' }, { key: 'xe', label: 'Số xe', render: p => `<b>${esc(p.xe)}</b>` }, { key: 'lai', label: 'Lái xe' },
        { key: 'nd', label: 'Nội dung', sortVal: p => p.items[0] ? p.items[0].nd : '', render: p => `${esc(p.items.slice(0, 2).map(i => i.nd).join('; '))}${p.items.length > 2 ? ` <span class="badge b-blue">+${p.items.length - 2}</span>` : ''}` },
        { key: 'hd', label: 'HĐ', nosort: true, align: 'c', val: p => (p.hoaDon || []).length, render: p => (p.hoaDon || []).length ? `<button class="ibtn" data-act="scDocs" data-id="${p.id}" data-tip="Xem hóa đơn" style="width:auto;padding:0 6px;gap:3px;color:#0369a1">${ic('file')}<b style="font-size:12px">${p.hoaDon.length}</b></button>` : '<span class="muted">—</span>' },
        { key: 'tong', label: 'Tổng tiền', fmt: 'money', align: 'r', sum: true, val: scTong, sortVal: scTong, render: p => `<b>${scMoney(scTong(p))}</b>` }, { key: 'nguoiTao', label: 'Người tạo' }],
      rows: L, ph: 'Tìm số phiếu, xe, lái xe, nội dung...', empty: 'Chưa có phiếu sửa chữa. Bấm "Thêm phiếu" hoặc "Nhập Excel".', sort: 1, dir: -1,
      searchText: p => p.items.map(i => i.nd).join(' '), onRow: p => scForm(p),
      actions: p => `<button class="ibtn" data-act="scPrint" data-id="${p.id}" data-tip="In phiếu">${ic('printer')}</button>` + (Auth.can('suachua', 'edit') ? `<button class="ibtn" data-act="scEdit" data-id="${p.id}" data-tip="Sửa">${ic('edit')}</button>` : '') + (Auth.can('suachua', 'del') ? `<button class="ibtn del" data-act="scDel" data-id="${p.id}" data-tip="Xóa">${ic('trash')}</button>` : '')
    });
  },
  excel() { const L = scFlat(scList()); XLSX.save('Sua chua phuong tien', [xSheet('Sửa chữa', 'CHI TIẾT SỬA CHỮA PHƯƠNG TIỆN', [{ key: 'so', label: 'Số phiếu' }, { key: 'ngay', label: 'Ngày', fmt: 'date' }, { key: 'xe', label: 'Số xe' }, { key: 'lai', label: 'Tên lái xe' }, { key: 'nd', label: 'Nội dung sửa chữa' }, { key: 'dvt', label: 'Đơn vị tính' }, { key: 'sl', label: 'Số lượng' }, { key: 'gia', label: 'Đơn giá', fmt: 'money' }, { key: 'tt', label: 'Thành tiền', fmt: 'money' }, { key: 'nguoi', label: 'Người tạo' }, { key: 'tg', label: 'Ngày tạo' }], L)]); },
  print() { const L = scFlat(scList()); Print.report({ title: 'Chi tiết sửa chữa phương tiện', sub: (SC.thang ? 'Tháng ' + SC.thang.slice(5) + '/' + SC.thang.slice(0, 4) : 'Tất cả các tháng') + (SC.xe ? ' · Xe ' + SC.xe : ''), cols: scCols, rows: L, landscape: true, signs: ['Người lập', 'Kế toán', 'Giám đốc'] }); }
};
function scImport() {
  if (!Auth.guard('suachua', 'add')) return;
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.xlsx,.csv';
  inp.onchange = async () => {
    const f = inp.files[0]; if (!f) return;
    try {
      const rows = (await XLSX.read(f)).filter(r => r && r.some(c => String(c ?? '').trim() !== '')); const nh = x => dvNorm(x).replace(/[^a-z0-9]/g, '');
      const hr = rows.findIndex(r => r.some(c => nh(c) === 'sophieu')); if (hr < 0) throw new Error('Không thấy cột "SỐ PHIẾU". File cần có các cột: SỐ PHIẾU, NGÀY, SỐ XE, TÊN LÁI XE, NỘI DUNG SỬA CHỮA, ĐƠN VỊ TÍNH, SỐ LƯỢNG, ĐƠN GIÁ');
      const ix = {}; rows[hr].forEach((h, i) => { ix[nh(h)] = i; });
      const g = (r, ...ks) => { for (const k of ks) if (ix[k] !== undefined) return r[ix[k]]; return ''; };
      const toDate = v => { if (typeof v === 'number' || /^\d+(\.\d+)?$/.test(String(v))) { const d = new Date(Math.round((+v - 25569) * 86400000)); return isNaN(d) ? '' : d.toISOString().slice(0, 10) + ' ' + d.toISOString().slice(11, 16); } const s = String(v || '').trim(); const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/); return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : s.slice(0, 16).replace('T', ' '); };
      const num = v => { const n = parseFloat(String(v ?? '').replace(/[^\d.\-]/g, '')); return isNaN(n) ? 0 : n; };
      const map = new Map();
      rows.slice(hr + 1).forEach(r => {
        const so = String(g(r, 'sophieu')).trim(), nd = String(g(r, 'noidungsuachua', 'noidung')).trim(); if (!so || !nd) return;
        if (!map.has(so)) { const t = toDate(g(r, 'ngay')); map.set(so, { id: uid(), so, ngay: t.slice(0, 10), gio: t.slice(11, 16), xe: String(g(r, 'soxe')).trim(), lai: String(g(r, 'tenlaixe')).trim(), nguoiTao: String(g(r, 'nguoitao')).trim() || dvLog.who(), tg: toDate(g(r, 'ngaytao')) || t, ghiChu: '', items: [] }); }
        map.get(so).items.push({ nd: nd.toUpperCase(), dvt: String(g(r, 'donvitinh', 'dvt')).trim().toUpperCase(), sl: num(g(r, 'soluong')) || 1, gia: num(g(r, 'dongia')) });
      });
      const all = [...map.values()], dup = all.filter(p => DB.suachua.some(x => x.so === p.so)), add = all.filter(p => !dup.includes(p));
      if (!all.length) throw new Error('File không có dòng sửa chữa nào');
      if (!add.length) return toast('Cả ' + dup.length + ' phiếu trong file đã có sẵn, không nhập thêm', 'err');
      if (await Modal.confirm(`Nhập <b>${add.length} phiếu</b> (${sum(add, p => p.items.length)} hạng mục, ${scMoney(sum(add, scTong))} đ) từ <b>${esc(f.name)}</b>?${dup.length ? `<br><span class="muted small">Bỏ qua ${dup.length} phiếu đã có số phiếu trùng: ${esc(dup.map(p => p.so).join(', '))}</span>` : ''}`, { ok: 'Nhập', title: 'Nhập phiếu sửa chữa' })) { DB.suachua.push(...add); App.changed(); toast('Đã nhập ' + add.length + ' phiếu sửa chữa', 'ok'); }
    } catch (e) { toast(esc(e.message || 'Không đọc được file'), 'err', 6000); }
  };
  inp.click();
}
Object.assign(ACT, {
  scDocs: d => { const p = scById(d.id); if (p && (p.hoaDon || []).length) scView(p.hoaDon); }, scAdd: () => scForm(), scEdit: d => { const p = scById(d.id); if (p) scForm(p); }, scPrint: d => { const p = scById(d.id); if (p) scPrint(p); }, scImport: () => scImport(),
  scDel: async d => { const p = scById(d.id); if (p && Auth.guard('suachua', 'del') && await Modal.confirm(`Xóa phiếu <b>${esc(p.so)}</b> (${scMoney(scTong(p))} đ)?`, { ok: 'Xóa', danger: true })) { DB.suachua = DB.suachua.filter(x => x !== p); App.changed(); toast('Đã xóa phiếu ' + p.so, 'ok'); } }
});

MODL.def('suachua', vSC);
