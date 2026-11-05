'use strict';
/* Module Bảng giá vé (form, danh sách); tra giá bgPrice/bgBind ở index vì Đặt vé dùng · tải khi mở màn hình (MODL). */
function bgForm(b, preset) {
  const isNew = !b, src = b || preset || { tuyen: BG.tuyen || '', tuNgay: D.today(), denNgay: '', ghiChu: '', chang: [{ don: '', tra: '', gia: 0 }] };
  if (isNew && !Auth.guard('banggia', 'add')) return;
  if (!isNew && !Auth.guard('banggia', 'edit')) return;
  const R = bgRoutes(), rowH = c => `<div class="bg-r"><input class="inp" data-k="don" list="bgPts" placeholder="Điểm đi" value="${esc(c.don || '')}"><span class="bg-ar">→</span><input class="inp" data-k="tra" list="bgPts" placeholder="Điểm đến" value="${esc(c.tra || '')}"><input class="inp num" data-k="gia" data-money inputmode="numeric" placeholder="Giá" value="${c.gia ? F.money(c.gia) : ''}"><button type="button" class="ibtn" data-rm title="Xóa chặng">${ic('x')}</button></div>`;
  const body = `<div class="form"><label class="field"><span>Tuyến <i class="req">*</i></span><select class="inp" id="bgT"><option value="">(Chọn tuyến)</option>${(R.includes(src.tuyen) || !src.tuyen ? R : [src.tuyen, ...R]).map(r => `<option value="${esc(r)}" ${r === src.tuyen ? 'selected' : ''}>${esc(r)}</option>`).join('')}</select><small>Danh sách tuyến lấy từ bảng Giờ chạy</small></label>
    <label class="field"><span>Ghi chú</span><input class="inp" id="bgN" value="${esc(src.ghiChu || '')}" placeholder="VD: Giá dịp Tết"></label>
    <label class="field"><span>Áp dụng từ ngày <i class="req">*</i></span><input type="date" class="inp" id="bgF" value="${src.tuNgay || ''}"></label>
    <label class="field"><span>Đến ngày</span><input type="date" class="inp" id="bgE" value="${src.denNgay || ''}"><small>Để trống nếu không giới hạn</small></label></div>
    <div class="bg-eh"><b>Giá từng chặng</b><span class="grow"></span><button type="button" class="btn sm" data-gen>${ic('menu')} Tạo chặng từ danh sách điểm</button><button type="button" class="btn sm pri" data-add>${ic('plus')} Thêm chặng</button></div>
    <div class="bg-gen" hidden><textarea class="inp" id="bgG" rows="4" placeholder="Nhập các điểm theo thứ tự đi, mỗi điểm một dòng&#10;VD:&#10;Bến xe Vũng Tàu&#10;Bà Rịa&#10;Bến xe Biên Hòa"></textarea><div class="row" style="gap:8px;margin-top:6px"><button type="button" class="btn sm pri" data-gok>Tạo mọi chặng</button><span class="muted small">Tạo từng cặp điểm đi → điểm đến theo thứ tự, rồi nhập giá cho từng chặng. Để trống cả điểm đi và điểm đến = giá toàn tuyến.</span></div></div>
    <div class="bg-rows" id="bgRows">${(src.chang && src.chang.length ? src.chang : [{ don: '', tra: '', gia: 0 }]).map(rowH).join('')}</div><datalist id="bgPts">${bgPoints(src.tuyen).map(x => `<option value="${esc(x)}">`).join('')}</datalist>`;
  const m = Modal.open({ title: isNew ? (preset ? 'Sao chép bảng giá' : 'Thêm bảng giá') : 'Sửa bảng giá', width: 760, body, foot: `${!isNew && Auth.can('banggia', 'del') ? `<button class="btn danger left" data-del>${ic('trash')} Xóa</button>` : ''}<button class="btn" data-cancel>Hủy</button><button class="btn pri" data-save>${ic('check')} Lưu</button>` });
  const rows = m.el.querySelector('#bgRows'), q = sl => m.el.querySelector(sl);
  rows.addEventListener('click', e => { const x = e.target.closest('[data-rm]'); if (x) { x.closest('.bg-r').remove(); if (!rows.children.length) rows.insertAdjacentHTML('beforeend', rowH({})); } });
  q('[data-add]').onclick = () => { rows.insertAdjacentHTML('beforeend', rowH({})); const l = rows.lastElementChild.querySelector('input'); if (l) l.focus(); };
  q('[data-gen]').onclick = () => { const g = q('.bg-gen'); g.hidden = !g.hidden; if (!g.hidden) q('#bgG').focus(); };
  q('[data-gok]').onclick = () => {
    const pts = q('#bgG').value.split('\n').map(x => x.trim()).filter(Boolean); if (pts.length < 2) return toast('Nhập ít nhất 2 điểm', 'err');
    [...rows.querySelectorAll('.bg-r')].filter(r => !r.querySelector('[data-k=don]').value && !r.querySelector('[data-k=tra]').value && !r.querySelector('[data-k=gia]').value).forEach(r => r.remove());
    const have = new Set([...rows.querySelectorAll('.bg-r')].map(r => bgNorm(r.querySelector('[data-k=don]').value) + '|' + bgNorm(r.querySelector('[data-k=tra]').value)));
    let n = 0; for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) { const k = bgNorm(pts[i]) + '|' + bgNorm(pts[j]); if (have.has(k)) continue; have.add(k); rows.insertAdjacentHTML('beforeend', rowH({ don: pts[i], tra: pts[j] })); n++; }
    q('.bg-gen').hidden = true; toast('Đã tạo ' + n + ' chặng. Nhập giá cho từng chặng.', 'ok');
  };
  q('#bgT').onchange = () => { q('#bgPts').innerHTML = bgPoints(q('#bgT').value.trim()).map(x => `<option value="${esc(x)}">`).join(''); };
  q('[data-cancel]').onclick = () => m.close();
  const del = q('[data-del]'); if (del) del.onclick = async () => { if (await Modal.confirm('Xóa bảng giá này?', { ok: 'Xóa', danger: true })) { DB.banggia = DB.banggia.filter(x => x !== b); App.changed(); m.close(); toast('Đã xóa bảng giá', 'ok'); } };
  q('[data-save]').onclick = () => {
    const tuyen = q('#bgT').value.trim(), tu = q('#bgF').value, den = q('#bgE').value;
    if (!tuyen) return toast('Vui lòng chọn tuyến', 'err');
    if (!tu) return toast('Vui lòng nhập ngày bắt đầu áp dụng', 'err');
    if (den && den < tu) return toast('Ngày kết thúc phải sau ngày bắt đầu', 'err');
    const chang = [], seen = new Set();
    for (const r of rows.querySelectorAll('.bg-r')) {
      const don = r.querySelector('[data-k=don]').value.trim(), tra = r.querySelector('[data-k=tra]').value.trim(), gia = F.parse(r.querySelector('[data-k=gia]').value);
      if (!don && !tra && !gia) continue;
      if (!!don !== !!tra) return toast('Mỗi chặng cần đủ điểm đi và điểm đến (hoặc để trống cả hai = giá toàn tuyến)', 'err');
      const k = bgNorm(don) + '|' + bgNorm(tra); if (seen.has(k)) return toast('Chặng ' + (don ? don + ' → ' + tra : 'toàn tuyến') + ' bị nhập trùng', 'err'); seen.add(k);
      chang.push({ don, tra, gia });
    }
    if (!chang.length) return toast('Cần ít nhất một chặng có giá', 'err');
    const clash = DB.banggia.find(x => x !== b && x.tuyen === tuyen && x.tuNgay <= (den || '9999-12-31') && (!x.denNgay || x.denNgay >= tu));
    if (clash) return toast('Khoảng ngày bị trùng với bảng giá ' + bgRange(clash).toLowerCase() + ' của cùng tuyến', 'err');
    const d = { tuyen, tuNgay: tu, denNgay: den, ghiChu: q('#bgN').value.trim(), chang };
    if (isNew) DB.banggia.push({ id: uid(), ...d }); else Object.assign(b, d);
    App.changed(); m.close(); toast('Đã lưu bảng giá', 'ok');
  };
  return m;
}
addCSS(`.bg-eh{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:14px 0 8px}.bg-gen{margin-bottom:8px}.bg-gen[hidden]{display:none}
.bg-rows{display:flex;flex-direction:column;gap:6px}.bg-r{display:grid;grid-template-columns:minmax(0,1fr) 18px minmax(0,1fr) 120px 34px;gap:6px;align-items:center}.bg-ar{text-align:center;color:#64748b}
.bg-hint{display:block;color:var(--vt-a2,#0369a1);font-weight:600;margin-top:2px}
.bgc{background:#fff;border:1px solid var(--vt-b,#d4ebfa);border-radius:14px;margin-bottom:12px;overflow:hidden;box-shadow:0 1px 2px rgba(12,74,110,.05)}
.bgc-h{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:10px 14px;background:var(--vt-s,#eaf6fe);border-bottom:1px solid var(--vt-b,#d4ebfa)}.bgc-h b{font-size:15px}.bgc-h .rg{color:#475569;font-size:13px}
.bgc table{width:100%;border-collapse:collapse;font-size:13.5px}.bgc td,.bgc th{padding:8px 14px;border-bottom:1px solid #eef2f6;text-align:left}.bgc th{font-size:11.5px;color:#64748b;text-transform:uppercase;letter-spacing:.04em;background:#fafcfe}.bgc td.r,.bgc th.r{text-align:right;font-variant-numeric:tabular-nums}.bgc tr:last-child td{border-bottom:0}
.bgc .all td{color:#0369a1;font-weight:600}
@media(max-width:900px){.bg-r{grid-template-columns:minmax(0,1fr) 110px 30px;padding:8px 0;border-bottom:1px dashed #cfe3f1}.bg-r>[data-k=don]{grid-column:1/-1}.bg-ar{display:none}.bgc-h{padding:8px 10px}.bgc td,.bgc th{padding:7px 10px}}`);
const vBG = {
  title: 'Bảng giá vé', icon: 'tag', desc: 'Giá vé theo tuyến, theo khoảng ngày áp dụng và theo từng chặng đi',
  tools: () => `<button class="btn pri" data-act="bgAdd">${ic('plus')} Thêm bảng giá</button>`,
  render(el) {
    const R = bgRoutes(), L = DB.banggia.filter(b => !BG.tuyen || b.tuyen === BG.tuyen).slice().sort((a, b) => String(a.tuyen).localeCompare(String(b.tuyen), 'vi') || String(b.tuNgay).localeCompare(String(a.tuNgay)));
    const sel = `<div class="row" style="gap:8px;margin-bottom:12px;align-items:center"><select class="inp" id="bgSel" style="width:330px;max-width:100%;font-weight:600"><option value="">Tất cả các tuyến</option>${R.map(r => `<option value="${esc(r)}" ${BG.tuyen === r ? 'selected' : ''}>${esc(r)}</option>`).join('')}</select><span class="muted small">${L.length} bảng giá</span><span class="grow"></span><button class="btn pri" data-act="bgAdd">${ic('plus')} Thêm bảng giá</button></div>`;
    const card = b => { const [cl, tx] = bgStatus(b);
      return `<div class="bgc"><div class="bgc-h"><b>${esc(b.tuyen)}</b><span class="badge ${cl}">${tx}</span><span class="rg">${bgRange(b)}${b.ghiChu ? ' · ' + esc(b.ghiChu) : ''}</span><span class="grow"></span>${Auth.can('banggia', 'add') ? `<button class="ibtn" data-act="bgDup" data-id="${b.id}" title="Sao chép bảng giá">${ic('copy')}</button>` : ''}${Auth.can('banggia', 'edit') ? `<button class="ibtn" data-act="bgEdit" data-id="${b.id}" title="Sửa">${ic('edit')}</button>` : ''}${Auth.can('banggia', 'del') ? `<button class="ibtn" data-act="bgDel" data-id="${b.id}" title="Xóa">${ic('trash')}</button>` : ''}</div>
      <table><tr><th>Điểm đi</th><th>Điểm đến</th><th class="r">Giá vé</th></tr>${b.chang.map(c => (c.don || c.tra) ? `<tr><td>${esc(c.don)}</td><td>${esc(c.tra)}</td><td class="r"><b>${F.money(c.gia)}</b></td></tr>` : `<tr class="all"><td colspan="2">Giá toàn tuyến</td><td class="r"><b>${F.money(c.gia)}</b></td></tr>`).join('')}</table></div>`; };
    el.insertAdjacentHTML('beforeend', sel + (L.length ? L.map(card).join('') : '<div class="muted" style="padding:24px;text-align:center">Chưa có bảng giá. Bấm <b>Thêm bảng giá</b> để nhập giá theo tuyến, khoảng ngày và từng chặng. Khi đặt vé, giá sẽ tự điền theo điểm đón, điểm trả.</div>'));
    const sl = $('#bgSel', el); if (sl) sl.onchange = () => { BG.tuyen = sl.value; App.render(); };
  },
  excel() { const rows = DB.banggia.flatMap(b => b.chang.map(c => ({ tuyen: b.tuyen, tu: b.tuNgay, den: b.denNgay || '', don: c.don || '(Toàn tuyến)', tra: c.tra || '', gia: c.gia }))); XLSX.save('Bang gia ve', [xSheet('Bảng giá', 'BẢNG GIÁ VÉ THEO TUYẾN VÀ CHẶNG', [{ key: 'tuyen', label: 'Tuyến' }, { key: 'tu', label: 'Từ ngày', fmt: 'date' }, { key: 'den', label: 'Đến ngày', fmt: 'date' }, { key: 'don', label: 'Điểm đi' }, { key: 'tra', label: 'Điểm đến' }, { key: 'gia', label: 'Giá vé', fmt: 'money' }], rows)]); },
  print: false
};
Object.assign(ACT, {
  bgAdd: () => bgForm(), bgEdit: d => bgForm(bgById(d.id)),
  bgDup: d => { const b = bgById(d.id); if (b) bgForm(null, { tuyen: b.tuyen, tuNgay: D.today(), denNgay: '', ghiChu: b.ghiChu, chang: b.chang.map(c => ({ ...c })) }); },
  bgDel: async d => { const b = bgById(d.id); if (b && Auth.guard('banggia', 'del') && await Modal.confirm(`Xóa bảng giá tuyến <b>${esc(b.tuyen)}</b> (${bgRange(b).toLowerCase()})?`, { ok: 'Xóa', danger: true })) { DB.banggia = DB.banggia.filter(x => x !== b); App.changed(); } }
});
MODL.def('banggia', vBG);
