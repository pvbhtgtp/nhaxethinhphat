'use strict';
/* Module Nhiên liệu (màn hình, phiếu 80mm, form nhập/cấp/đổ ngoài, cài đặt bồn). Dữ liệu và sổ cái dầu (nlLedger…), giá Petrolimex (NLMK) nằm ở index vì Dashboard dùng chung. */
/* ---------- Phiếu 80mm ---------- */
function nl80HTML(r, led) {
  const c = S().company || {}, s = nlS(), k = nlKind(r), K = NL_KIND[k], x = (led || nlLedger(r)).map[r.id] || { gia: +r.gia || 0, tt: 0, ton: 0 };
  const lit = +r.lit || 0, gia = x.gia, tt = Math.round(lit * gia);
  const kv = (l, v) => v === '' || v == null ? '' : `<div class="kv"><span>${l}</span><b>${v}</b></div>`;
  const now = new Date(), dsp = r.ngay ? F.date(r.ngay) : '';
  return `<div class="r80">
    <div class="c"><b class="co">${esc(c.ten || '')}</b>${c.diaChi ? `<div class="sm">${esc(c.diaChi)}</div>` : ''}${c.sdt ? `<div class="sm">ĐT: ${esc(c.sdt)}${c.mst ? ' · MST: ' + esc(c.mst) : ''}</div>` : ''}</div>
    <div class="hr"></div>
    <div class="c tt">${k === 'nhap' ? 'PHIẾU NHẬP DẦU' : k === 'bon' ? 'PHIẾU XUẤT DẦU' : 'PHIẾU ĐỔ DẦU NGOÀI'}</div>
    <div class="c">Số: <b>${esc(r.so || '')}</b></div><div class="c sm">${dsp}${r.gio ? ' · ' + esc(r.gio) : ''}</div>
    <div class="hr"></div>
    <div class="grd">${k === 'nhap' ? kv('Nhà cung cấp', esc(r.nhaCC || '')) + kv('Số hóa đơn', esc(r.soHD || '')) + kv('Nhập vào', esc(s.tenBon)) + kv('Người giao', esc(r.nguoiGiao || ''))
      : kv('Biển số xe', `<span class="big">${esc(r.xe || '')}</span>`) + kv('Lái xe', esc(r.lai || '')) + (k === 'ngoai' ? kv('Cây xăng', esc(r.cayXang || '')) : kv('Xuất từ', esc(s.tenBon))) + kv('Km đồng hồ', +r.km ? F.money(r.km) + ' km' : '') + (x.kmChay ? kv('Km từ lần đổ trước', F.money(x.kmChay) + ' km') : '') + (x.tieuHao ? kv('Tiêu hao', F.num(x.tieuHao, 1) + ' L/100km' + (nlDm(r.xe) ? ' (ĐM ' + F.num(nlDm(r.xe), 1) + ')' : '')) : '')}
    ${kv('Nhiên liệu', esc(r.loaiNL || s.loaiNL))}
    <div class="box"><span>SỐ LƯỢNG</span><b>${nlL(lit)} lít</b></div>
    ${kv('Đơn giá', F.money(gia) + ' đ/lít' + (k === 'bon' && r.giaAuto !== false && !(+r.gia) ? '<br><i class="sm">(giá bình quân bồn)</i>' : r.giaTT ? '<br><i class="sm">(giá niêm yết Petrolimex)</i>' : ''))}
    <div class="kv tot"><span>THÀNH TIỀN</span><b>${F.money(tt)} đ</b></div></div>
    ${tt ? `<div class="sm it">Bằng chữ: ${esc(docSo(tt))}</div>` : ''}
    ${r.ghiChu ? `<div class="sm" style="margin-top:4px">Ghi chú: ${esc(r.ghiChu)}</div>` : ''}
    ${k !== 'ngoai' ? `<div class="hr"></div>${kv('Tồn bồn sau phiếu', nlL(x.ton) + ' lít')}` : ''}
    <div class="hr"></div>
    <table class="sg"><tr><td><b>${k === 'nhap' ? 'Người giao' : k === 'bon' ? 'Người cấp' : 'Người duyệt'}</b><i>(Ký, họ tên)</i></td><td><b>${k === 'nhap' ? 'Thủ kho' : 'Lái xe nhận'}</b><i>(Ký, họ tên)</i><div class="nm">${k === 'nhap' ? '' : esc(r.lai || '')}</div></td></tr></table>
    <div class="c sm ft">${r.nguoiTao ? 'Lập: ' + esc(r.nguoiTao) + ' · ' : ''}In: ${pad(now.getDate())}/${pad(now.getMonth() + 1)} ${pad(now.getHours())}:${pad(now.getMinutes())}</div>
  </div>`;
}
function nlPrint80(rs) {
  const led = nlLedger(); const L = [].concat(rs);
  Print.preview(L.map(r => nl80HTML(r, led)).join('<div class="r80cut"></div>'), { title: L.length === 1 ? 'Phieu ' + L[0].so : 'Phieu dau', paper: '80' });
}

/* ---------- Form nhập / cấp / đổ ngoài ---------- */
function nlForm(r, kind0) {
  const isNew = !r; kind0 = r ? nlKind(r) : kind0 || 'bon';
  if (isNew && !Auth.guard('nhienlieu', 'add')) return; if (!isNew && !Auth.guard('nhienlieu', 'edit')) return;
  const s = nlS(), now = new Date(), hist = DB.nhienlieu || [];
  const v = r ? { ...r, nguon: r.nguon || 'bon' } : { ngay: D.today(), gio: pad(now.getHours()) + ':' + pad(now.getMinutes()), loaiNL: s.loaiNL, nguon: kind0 === 'ngoai' ? 'ngoai' : 'bon', lit: '', gia: '' };
  if (isNew && kind0 === 'nhap') { const ln = hist.filter(x => x.loai === 'nhap').sort(nlSort).pop(); if (ln) { v.nhaCC = ln.nhaCC; v.gia = ln.gia; } }
  if (isNew && kind0 === 'ngoai') { const ln = hist.filter(x => x.nguon === 'ngoai').sort(nlSort).pop(); if (ln) { v.cayXang = ln.cayXang; v.gia = ln.gia; } const mp = NLMK.price(v.loaiNL); if (mp) v.gia = mp; }
  let giaTouched = !isNew;
  const uniq = k => [...new Set(hist.map(x => x[k]).filter(Boolean))];
  const isIn = kind0 === 'nhap';
  const F1 = isIn ? [
    { key: 'ngay', label: 'Ngày nhập', type: 'date', required: true }, { key: 'gio', label: 'Giờ', type: 'time' },
    { key: 'nhaCC', label: 'Nhà cung cấp', list: uniq('nhaCC'), full: true, ph: 'Gõ hoặc chọn' },
    { key: 'soHD', label: 'Số hóa đơn' }, { key: 'nguoiGiao', label: 'Người giao (tài xế xe bồn)' },
    { key: 'lit', label: 'Số lít nhập', type: 'number', required: true }, { key: 'gia', label: 'Đơn giá (đ/lít)', type: 'money', required: true },
    { key: 'loaiNL', label: 'Loại nhiên liệu', list: [...new Set([s.loaiNL, 'Dầu DO 0,05S', 'Dầu DO 0,001S', 'Xăng RON 95', 'Xăng E5 RON 92', ...uniq('loaiNL')])] },
    { key: 'ghiChu', label: 'Ghi chú', full: true }
  ] : [
    { key: 'nguon', label: 'Hình thức', type: 'select', options: [{ value: 'bon', label: 'Cấp từ ' + s.tenBon }, { value: 'ngoai', label: 'Đổ ngoài cây xăng' }], full: true },
    { key: 'ngay', label: 'Ngày', type: 'date', required: true }, { key: 'gio', label: 'Giờ', type: 'time' },
    { key: 'xe', label: 'Biển số xe', type: 'select', blank: '— Chọn xe —', options: () => [...new Set([...nlXes(), ...(r && r.xe ? [r.xe] : [])])], required: true }, { key: 'lai', label: 'Lái xe nhận', type: 'select', blank: '— Chọn lái xe —', options: () => [...new Set([...nlDrivers(), ...(DB.nhienlieu || []).map(x => x.lai).filter(Boolean), ...(r && r.lai ? [r.lai] : [])])].sort((a, b) => a.localeCompare(b, 'vi')) },
    { key: 'km', label: 'Km đồng hồ (Odo)', type: 'number', ph: 'Để tính tiêu hao' }, { key: 'lit', label: 'Số lít', type: 'number', required: true },
    { key: 'gia', label: 'Đơn giá (đ/lít)', type: 'money', hint: s.giaCap === 'tt' ? 'Tự điền giá niêm yết Petrolimex. Xóa trống để tính theo giá bình quân bồn' : 'Để trống để lấy giá bình quân của bồn' }, { key: 'cayXang', label: 'Cây xăng', list: uniq('cayXang'), ph: 'Tên cây xăng' },
    { key: 'loaiNL', label: 'Loại nhiên liệu', list: [...new Set([s.loaiNL, 'Dầu DO 0,05S', 'Dầu DO 0,001S', ...uniq('loaiNL')])] }, { key: 'ghiChu', label: 'Ghi chú', ph: 'Ví dụ: chạy hợp đồng, đi tỉnh' }
  ];
  if (!isIn && v.nguon === 'bon' && r && r.giaAuto !== false) v.gia = '';
  if (isNew && kind0 === 'bon' && s.giaCap === 'tt') { const mp = NLMK.price(v.loaiNL); if (mp) v.gia = mp; }
  const m = Modal.open({
    title: isNew ? NL_KIND[kind0].t : 'Phiếu ' + esc(r.so), width: 1060,
    body: `<div class="nl-info" data-info></div>${formHTML(F1, v, 2)}`,
    foot: `${!isNew && Auth.can('nhienlieu', 'del') ? `<button class="btn danger left" data-del>${ic('trash')} Xóa</button>` : ''}<button class="btn" data-no>Hủy</button><button class="btn" data-sv>${ic('check')} Lưu</button><button class="btn pri" data-svp>${ic('printer')} Lưu & in phiếu 80mm</button>`
  });
  const el = m.el, f = n => el.querySelector(`[name="${n}"]`), fld = n => f(n) && f(n).closest('.field');
  const read = () => {
    const d = readForm(el, F1); d.lit = Math.round((+d.lit || 0) * 100) / 100;
    if (isIn) d.loai = 'nhap'; else { d.loai = 'xuat'; d.giaAuto = d.nguon === 'bon' && !d.gia; d.giaTT = !!d.gia && d.gia === NLMK.price(d.loaiNL); }
    const kind = isIn ? 'nhap' : d.nguon === 'ngoai' ? 'ngoai' : 'bon';
    d.so = r && nlKind(r) === kind ? r.so : nlNext(kind);
    return { ...(r || {}), id: r ? r.id : '__new', ...d };
  };
  const sync = ev => {
    const n = ev && ev.target && ev.target.name;
    if (n === 'gia') giaTouched = true;
    if ((n === 'loaiNL' || n === 'nguon') && !giaTouched && f('nguon')) { const ng = f('nguon').value === 'ngoai', mp = NLMK.price(f('loaiNL').value); if (ng || s.giaCap === 'tt') { if (mp) f('gia').value = F.money(mp); } else f('gia').value = ''; }
    if (!isIn) {
      const ng = f('nguon').value === 'ngoai'; fld('cayXang').style.display = ng ? '' : 'none';
      f('gia').placeholder = ng ? 'Giá tại cây xăng' : 'Tự lấy giá bình quân: ' + F.money(nlLedger().bq);
      if (n === 'xe' && f('xe').value) { const last = nlLastXe(f('xe').value); if (last && last.lai && !f('lai').value) f('lai').value = last.lai; if (last && +last.km) f('km').placeholder = 'Lần trước: ' + F.money(last.km) + ' km'; }
    }
    const d = read(), led = nlLedger(d), x = led.map[d.id] || {}, k = nlKind(d), lit = +d.lit || 0, tt = Math.round(lit * (x.gia || 0)), ton0 = nlLedger({ ...d, lit: 0 }).map[d.id];
    const lines = [];
    if (k !== 'ngoai') { const sau = x.ton, cc = +s.sucChua || 0;
      lines.push(`${esc(s.tenBon)}: tồn trước phiếu <b>${nlL(ton0 ? ton0.ton : 0)} lít</b> → sau phiếu <b>${nlL(sau)} lít</b>${cc ? ` (${Math.round(sau / cc * 100)}% sức chứa)` : ''}`);
      if (k === 'bon') lines.push(`Giá tính cho xe: <b>${F.money(x.gia || 0)} đ/lít</b> <span class="muted">· giá vốn bình quân bồn ${F.money(x.bq || 0)} đ/lít</span>`); }
    if (k !== 'nhap' && d.xe) {
      const last = (DB.nhienlieu || []).filter(y => y.loai !== 'nhap' && y.xe === d.xe && y.id !== d.id && nlSort(y, d) < 0).sort(nlSort).pop();
      if (last) lines.push(`Lần đổ trước: ${F.date(last.ngay)}${+last.km ? ' · ' + F.money(last.km) + ' km' : ''} · ${nlL(last.lit)} lít`);
      if (+d.km && last && +last.km && +d.km <= +last.km) lines.push(`<span class="badge b-red">Km đồng hồ phải lớn hơn lần trước (${F.money(last.km)} km)</span>`);
      if (x.kmChay) lines.push(`Đã chạy <b>${F.money(x.kmChay)} km</b> từ lần đổ trước · tiêu hao ${nlThBadge(x.tieuHao, nlDm(d.xe)) || '—'}`);
    }
    const mp = NLMK.price(d.loaiNL);
    if (mp) { const g = k === 'bon' ? x.gia : +d.gia || 0, df = g ? g - mp : 0;
      lines.push(`Giá Petrolimex vùng 1 (${esc(nlMkKey(d.loaiNL))}): <b>${F.money(mp)} đ/lít</b> <span class="muted">· hiệu lực ${esc(NLMK.when())}</span>${g && Math.abs(df) >= 1 ? ` · ${k === 'nhap' ? 'nhà cung cấp' : k === 'bon' ? 'giá bồn' : 'cây xăng'} ${df < 0 ? 'thấp hơn' : 'cao hơn'} <b class="${df < 0 ? 'pos' : 'neg'}">${F.money(Math.abs(df))} đ/lít</b>${k === 'nhap' ? ` (${F.num(Math.abs(df) / mp * 100, 1)}%)` : ''}` : ''}`); }
    if (tt) lines.push(`Thành tiền: <b>${F.money(tt)} đ</b> <span class="muted">(${esc(docSo(tt))})</span>`);
    const box = el.querySelector('[data-info]'); box.innerHTML = lines.map(l => `<div>${l}</div>`).join(''); box.style.display = lines.length ? '' : 'none';
  };
  el.addEventListener('input', sync); el.addEventListener('change', sync); sync();
  const lp = lpAttach(m, () => { const d = read(); return nl80HTML(d, nlLedger(d)); }, { caption: 'Xem trước phiếu in 80mm', width: 1060 });
  const pp = el.querySelector('[data-lppaper]'); if (pp) { pp.dataset.w = '310'; pp.classList.add('nl-paper'); }
  const gr = el.querySelector('.lp-grid'); if (gr) gr.classList.add('nl-lpg');
  lp.draw();
  el.querySelector('[data-no]').onclick = () => m.close();
  const save = prn => {
    if (!checkForm(el, F1)) return; const d = read();
    if (!(+d.lit > 0)) { toast('Số lít phải lớn hơn 0', 'err'); return f('lit').focus(); }
    const k = nlKind(d), x = nlLedger(d).map[d.id];
    if (k === 'nhap' && !(+d.gia > 0)) { toast('Nhập đơn giá dầu', 'err'); return f('gia').focus(); }
    if (k === 'ngoai' && !(+d.gia > 0)) { toast('Nhập đơn giá tại cây xăng', 'err'); return f('gia').focus(); }
    DB.nhienlieu = DB.nhienlieu || [];
    if (isNew) { d.id = uid(); d.nguoiTao = dvLog.who(); d.tg = D.today() + ' ' + new Date().toTimeString().slice(0, 5); DB.nhienlieu.push(d); }
    else Object.assign(r, d);
    const rec = isNew ? d : r; App.changed(); m.close(); toast(`Đã lưu ${rec.so}: ${nlL(rec.lit)} lít`, 'ok');
    if (prn) nlPrint80(rec);
  };
  el.querySelector('[data-sv]').onclick = () => save(false);
  el.querySelector('[data-svp]').onclick = () => save(true);
  const del = el.querySelector('[data-del]'); if (del) del.onclick = () => { m.close(); ACT.nlDel({ id: r.id }); };
  el.addEventListener('keydown', ev => { if (ev.key === 'Enter' && ev.target.tagName === 'INPUT') { ev.preventDefault(); save(false); } });
}

/* ---------- Cài đặt bồn ---------- */
function nlSetForm() {
  if (!Auth.guard('nhienlieu', 'edit')) return; const s = nlS();
  Form.open({ title: 'Cài đặt bồn dầu', width: 620, value: s, fields: [
    { key: 'tenBon', label: 'Tên bồn / kho dầu', required: true }, { key: 'loaiNL', label: 'Loại nhiên liệu mặc định' },
    { key: 'sucChua', label: 'Sức chứa bồn (lít)', type: 'number' }, { key: 'nguong', label: 'Cảnh báo khi tồn dưới (lít)', type: 'number' },
    { key: 'tonDau', label: 'Tồn đầu kỳ (lít)', type: 'number', hint: 'Số dầu có trong bồn trước phiếu đầu tiên' }, { key: 'giaDau', label: 'Đơn giá tồn đầu kỳ (đ/lít)', type: 'money' },
    { key: 'giaCap', label: 'Giá tính khi cấp dầu từ bồn cho xe', type: 'select', full: true, options: [{ value: 'tt', label: 'Giá niêm yết Petrolimex vùng 1 (tự cập nhật hằng tuần)' }, { value: 'bq', label: 'Giá bình quân bồn (giá vốn thực tế đã mua)' }], hint: 'Chỉ áp dụng cho phiếu tạo mới. Phiếu cũ giữ nguyên giá đã ghi' }
  ], onSave: d => { Object.assign(s, d); App.changed(); toast('Đã lưu cài đặt bồn', 'ok'); } });
}

/* ---------- Màn hình ---------- */
function nlMonthRows() { const ym = NL.thang; const led = nlLedger(); return { led, rows: led.list.filter(r => String(r.ngay).startsWith(ym)) }; }
const vNL = {
  title: 'Nhiên liệu', icon: 'fuel', desc: 'Nhập dầu vào bồn, cấp dầu cho xe, đổ ngoài cây xăng · tồn bồn, giá bình quân, tiêu hao theo xe',
  tools: () => Auth.can('nhienlieu', 'add') ? `<button class="btn" data-act="nlAdd" data-k="nhap">${ic('download')} Nhập dầu</button><button class="btn" data-act="nlAdd" data-k="ngoai">${ic('drop')} Đổ ngoài</button><button class="btn pri" data-act="nlAdd" data-k="bon">${ic('fuel')} Cấp dầu cho xe</button>` : '',
  render(el) {
    if (!NL.thang) NL.thang = D.ymNow(); NLMK.init();
    const s = nlS(), { led, rows } = nlMonthRows(), ton = led.ton, cc = +s.sucChua || 0, pct = cc ? Math.max(0, Math.min(100, ton / cc * 100)) : 0, low = ton <= (+s.nguong || 0);
    const by = k => rows.filter(r => led.map[r.id].k === k), lit = L => sum(L, r => r.lit), money = L => sum(L, r => led.map[r.id].tt);
    const N = by('nhap'), B = by('bon'), O = by('ngoai'), X = B.concat(O);
    const th = X.map(r => led.map[r.id]).filter(x => x.tieuHao), avgTh = sum(th, x => x.kmChay) ? sum(X.filter(r => led.map[r.id].tieuHao), r => r.lit) / sum(th, x => x.kmChay) * 100 : 0;
    const months = [...new Set([D.ymNow(), NL.thang, ...(DB.nhienlieu || []).map(r => String(r.ngay).slice(0, 7))])].filter(Boolean).sort().reverse();
    const xes = [...new Set([...nlXes(), ...X.map(r => r.xe)])].filter(Boolean).sort();
    el.insertAdjacentHTML('beforeend', `
      <div class="nl-kpis">
        <div class="nl-tank ${low ? 'low' : ''}"><div class="nl-gauge"><i style="height:${pct}%"></i><span>${Math.round(pct)}%</span></div>
          <div><small>${esc(s.tenBon)}</small><b>${nlL(ton)} <em>lít</em></b><div class="sm">${cc ? 'Sức chứa ' + F.money(cc) + ' lít · ' : ''}giá BQ ${F.money(led.bq)} đ/lít</div>${low ? `<span class="badge b-red">Sắp hết dầu</span>` : ''}${Auth.can('nhienlieu', 'edit') ? `<button class="btn sm" data-act="nlSet" style="margin-top:6px">${ic('settings')} Cài đặt bồn</button>` : ''}</div></div>
        <div class="nl-k nl-in"><small>Nhập bồn ${F.month(NL.thang).toLowerCase()}</small><b>${nlL(lit(N))} lít</b><em>${F.money(money(N))} đ · ${N.length} phiếu</em></div>
        <div class="nl-k nl-out"><small>Cấp từ bồn</small><b>${nlL(lit(B))} lít</b><em>${F.money(money(B))} đ · ${B.length} lượt</em></div>
        <div class="nl-k nl-ext"><small>Đổ ngoài cây xăng</small><b>${nlL(lit(O))} lít</b><em>${F.money(money(O))} đ · ${O.length} lượt</em></div>
        <div class="nl-k"><small>Tiêu hao trung bình</small><b>${avgTh ? F.num(avgTh, 1) : '—'} <em>L/100km</em></b><em>Tổng chi dầu cho xe: ${F.money(money(X))} đ</em></div>
      </div>
      ${nlMkHTML(led, B)}
      <div class="row nl-bar"><div class="seg"><button data-nltab="phieu" class="${NL.tab === 'phieu' ? 'on' : ''}">Phiếu</button><button data-nltab="xe" class="${NL.tab === 'xe' ? 'on' : ''}">Theo xe</button></div>
        <select class="inp" id="nlM">${months.map(x => `<option value="${x}" ${x === NL.thang ? 'selected' : ''}>${F.month(x)}</option>`).join('')}</select>
        ${NL.tab === 'phieu' ? `<select class="inp" id="nlK"><option value="">Tất cả loại phiếu</option>${Object.entries(NL_KIND).map(([k, v]) => `<option value="${k}" ${NL.loai === k ? 'selected' : ''}>${v.s}</option>`).join('')}</select>
        <select class="inp" id="nlX"><option value="">Tất cả các xe</option>${xes.map(x => `<option ${NL.xe === x ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select>
        <span class="search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${ICONS.search}</svg><input class="inp" id="nlQ" placeholder="Tìm số phiếu, xe, lái xe, cây xăng..." value="${esc(NL.q)}"></span>` : ''}</div>
      <div id="nlBody"></div>`);
    $('#nlM', el).onchange = e => { NL.thang = e.target.value; App.render(); };
    el.querySelectorAll('[data-nltab]').forEach(b => b.onclick = () => { NL.tab = b.dataset.nltab; App.render(); });
    const body = $('#nlBody', el);
    if (NL.tab === 'xe') return vNL.renderXe(body, led, X);
    $('#nlK', el).onchange = e => { NL.loai = e.target.value; App.render(); }; $('#nlX', el).onchange = e => { NL.xe = e.target.value; App.render(); };
    const L = rows.filter(r => (!NL.loai || led.map[r.id].k === NL.loai) && (!NL.xe || r.xe === NL.xe)).slice().reverse();
    if (!L.length) { body.innerHTML = `<div class="card"><div class="empty">${ic('fuel')}<div style="margin-top:8px">Chưa có phiếu nào trong ${F.month(NL.thang).toLowerCase()}.</div>${Auth.can('nhienlieu', 'add') ? `<div class="row" style="justify-content:center;margin-top:12px"><button class="btn" data-act="nlAdd" data-k="nhap">${ic('download')} Nhập dầu</button><button class="btn pri" data-act="nlAdd" data-k="bon">${ic('fuel')} Cấp dầu cho xe</button></div>` : ''}</div></div>`; return; }
    const days = {}; L.forEach(r => (days[r.ngay] = days[r.ngay] || []).push(r));
    const ce = Auth.can('nhienlieu', 'edit'), cd = Auth.can('nhienlieu', 'del');
    body.innerHTML = '<div class="nl-grid">' + Object.entries(days).map(([d, list]) => `<div class="nl-dh" data-day="${d}"><b>${D.dowName[D.parse(d).getDay()]} · ${F.date(d)}</b><span>${list.length} phiếu · ${nlL(sum(list.filter(r => led.map[r.id].k !== 'nhap'), r => r.lit))} lít cấp xe</span></div>${list.map(r => {
      const x = led.map[r.id], K = NL_KIND[x.k], q = [r.so, r.xe, r.lai, r.nhaCC, r.cayXang, r.soHD, r.ghiChu].join(' ').toLowerCase();
      return `<div class="nl-card ${K.cls}" data-q="${esc(q)}" data-id="${r.id}" data-d="${r.ngay}">
        <div class="nl-top"><span class="nl-ic">${ic(K.ic)}</span><div class="nl-tt"><b>${x.k === 'nhap' ? esc(r.nhaCC || 'Nhập bồn') : esc(r.xe || '')}</b><small>${esc(r.so)} · ${esc(r.gio || '')} · ${K.s}</small></div><div class="nl-lit">${nlL(r.lit)}<small>lít</small></div></div>
        <div class="nl-mid">${x.k === 'nhap' ? `${r.soHD ? `<span>${ic('receipt')} HĐ ${esc(r.soHD)}</span>` : ''}<span>${ic('fuel')} Tồn sau: <b>${nlL(x.ton)} lít</b></span>`
          : `${r.lai ? `<span>${ic('user')} ${esc(r.lai)}</span>` : ''}${+r.km ? `<span>${ic('trend')} ${F.money(r.km)} km${x.kmChay ? ' (+' + F.money(x.kmChay) + ')' : ''}</span>` : ''}${x.k === 'ngoai' && r.cayXang ? `<span>${ic('drop')} ${esc(r.cayXang)}</span>` : ''}${nlThBadge(x.tieuHao, nlDm(r.xe))}`}</div>
        <div class="nl-foot"><b>${F.money(x.tt)} đ</b><span class="muted small">${F.money(x.gia)} đ/lít</span><span class="grow"></span><button class="ibtn" data-act="nlPrint" data-id="${r.id}" data-tip="In phiếu 80mm">${ic('printer')}</button>${ce ? `<button class="ibtn" data-act="nlEdit" data-id="${r.id}" data-tip="Sửa">${ic('edit')}</button>` : ''}${cd ? `<button class="ibtn del" data-act="nlDel" data-id="${r.id}" data-tip="Xóa">${ic('trash')}</button>` : ''}</div></div>`; }).join('')}`).join('') + '</div>';
    body.addEventListener('click', e => { if (e.target.closest('button')) return; const c = e.target.closest('.nl-card'); if (c && ce) ACT.nlEdit({ id: c.dataset.id }); });
    const qi = $('#nlQ', el), flt = () => { NL.q = qi.value; const t = qi.value.trim().toLowerCase(); body.querySelectorAll('.nl-card').forEach(c => c.style.display = !t || c.dataset.q.includes(t) ? '' : 'none'); body.querySelectorAll('[data-day]').forEach(h => h.style.display = [...body.querySelectorAll(`.nl-card[data-d="${h.dataset.day}"]`)].some(c => c.style.display !== 'none') ? '' : 'none'); };
    qi.addEventListener('input', flt); flt();
  },
  renderXe(body, led, X) {
    const ce = Auth.can('nhienlieu', 'edit'), xs = [...new Set([...nlXes(), ...X.map(r => r.xe)])].filter(Boolean);
    const data = xs.map(bks => { const L = X.filter(r => r.xe === bks), kmOdo = sum(L, r => led.map[r.id].kmChay), litTH = sum(L.filter(r => led.map[r.id].kmChay), r => r.lit), gps = nlKmGPS(bks, NL.thang);
      const th = kmOdo ? litTH / kmOdo * 100 : gps && L.length ? sum(L, r => r.lit) / gps * 100 : 0;
      return { bks, L, lit: sum(L, r => r.lit), tien: sum(L, r => led.map[r.id].tt), km: kmOdo || gps, src: kmOdo ? 'đồng hồ' : gps ? 'GPS' : '', th, dm: nlDm(bks), lai: [...new Set(L.map(r => r.lai).filter(Boolean))] }; })
      .sort((a, b) => b.lit - a.lit || a.bks.localeCompare(b.bks));
    const mx = Math.max(1, ...data.map(d => d.lit));
    body.innerHTML = `<p class="small muted" style="margin:0 0 10px">Tiêu hao tính theo km đồng hồ giữa hai lần đổ. Nếu không nhập km đồng hồ, app dùng km GPS (Skysoft) của tháng. Đặt định mức để app cảnh báo xe hao dầu bất thường (đỏ là vượt hơn 10%).</p>
      <div class="nl-grid xe">${data.map(d => `<div class="nl-card nl-xe ${d.dm && d.th > d.dm * 1.1 ? 'over' : ''}">
        <div class="nl-top"><span class="nl-ic">${ic('bus')}</span><div class="nl-tt"><b>${esc(d.bks)}</b><small>${d.lai.length ? esc(d.lai.join(', ')) : 'Chưa có lượt đổ trong tháng'}</small></div><div class="nl-lit">${nlL(d.lit)}<small>lít</small></div></div>
        <div class="hb-bar" style="margin:4px 0 10px"><i style="width:${d.lit / mx * 100}%"></i></div>
        <div class="nl-stats"><div><small>Chi phí</small><b>${F.money(d.tien)} đ</b></div><div><small>Km${d.src ? ' (' + d.src + ')' : ''}</small><b>${d.km ? F.money(d.km) : '—'}</b></div><div><small>Tiêu hao</small><b>${d.th ? F.num(d.th, 1) : '—'}</b></div><div><small>Lượt đổ</small><b>${d.L.length}</b></div></div>
        <div class="nl-foot">${nlThBadge(d.th, d.dm) || '<span class="muted small">Chưa đủ dữ liệu tính tiêu hao</span>'}<span class="grow"></span><label class="small muted" style="display:flex;align-items:center;gap:6px">Định mức <input class="inp sm num" data-dm="${esc(d.bks)}" type="number" step="0.1" min="0" value="${d.dm || ''}" placeholder="L/100km" style="width:84px" ${ce ? '' : 'disabled'}></label></div></div>`).join('') || '<div class="empty">Chưa có xe</div>'}</div>`;
    body.querySelectorAll('[data-dm]').forEach(i => i.onchange = () => { const s = nlS(); const v = +i.value; if (v > 0) s.dm[i.dataset.dm] = v; else delete s.dm[i.dataset.dm]; App.changed(); toast('Đã lưu định mức ' + i.dataset.dm, 'ok'); });
  },
  xRows() { const { led, rows } = nlMonthRows(); return rows.map(r => { const x = led.map[r.id]; return { ...r, kieu: NL_KIND[x.k].s, doiTuong: x.k === 'nhap' ? r.nhaCC : r.xe, giaTT: x.gia, tt: x.tt, ton: x.k === 'ngoai' ? '' : x.ton, kmChay: x.kmChay || '', tieuHao: x.tieuHao ? Math.round(x.tieuHao * 10) / 10 : '' }; }); },
  cols: [{ key: 'so', label: 'Số phiếu' }, { key: 'ngay', label: 'Ngày', fmt: 'date' }, { key: 'gio', label: 'Giờ' }, { key: 'kieu', label: 'Loại' }, { key: 'doiTuong', label: 'Xe / Nhà cung cấp' }, { key: 'lai', label: 'Lái xe' },
    { key: 'cayXang', label: 'Cây xăng' }, { key: 'km', label: 'Km đồng hồ', fmt: 'num' }, { key: 'lit', label: 'Số lít', fmt: 'num', sum: true }, { key: 'giaTT', label: 'Đơn giá', fmt: 'money' }, { key: 'tt', label: 'Thành tiền', fmt: 'money', sum: true },
    { key: 'kmChay', label: 'Km chạy', fmt: 'num' }, { key: 'tieuHao', label: 'L/100km', fmt: 'num' }, { key: 'ton', label: 'Tồn bồn sau', fmt: 'num' }],
  excel() { XLSX.save('Nhien lieu ' + NL.thang, [xSheet('Nhiên liệu', 'SỔ NHẬP XUẤT NHIÊN LIỆU ' + F.month(NL.thang).toUpperCase(), vNL.cols, vNL.xRows())]); },
  print() { Print.report({ title: 'Sổ nhập xuất nhiên liệu', sub: F.month(NL.thang) + ' · Tồn bồn hiện tại: ' + nlL(nlTon()) + ' lít', cols: vNL.cols.filter(c => !['gio', 'cayXang'].includes(c.key)), rows: vNL.xRows(), landscape: true, signs: ['Người lập', 'Thủ kho', 'Kế toán', 'Giám đốc'] }); }
};
Object.assign(ACT, {
  nlAdd: d => nlForm(null, d.k), nlSet: () => nlSetForm(),
  nlEdit: d => { const r = (DB.nhienlieu || []).find(x => x.id === d.id); if (r) nlForm(r); },
  nlPrint: d => { const r = (DB.nhienlieu || []).find(x => x.id === d.id); if (r) nlPrint80(r); },
  nlDel: async d => { const r = (DB.nhienlieu || []).find(x => x.id === d.id); if (!r || !Auth.guard('nhienlieu', 'del')) return;
    const after = nlLedger({ ...r, lit: 0 }), neg = r.loai === 'nhap' && after.list.some(y => after.map[y.id].ton < -0.001);
    if (await Modal.confirm(`Xóa phiếu <b>${esc(r.so)}</b> (${nlL(r.lit)} lít)?`, { ok: 'Xóa', danger: true })) { DB.nhienlieu = DB.nhienlieu.filter(x => x !== r); App.changed(); toast('Đã xóa phiếu ' + r.so, 'ok'); } }
});
addCSS(`
.nl-kpis{display:grid;grid-template-columns:minmax(260px,1.4fr) repeat(4,minmax(150px,1fr));gap:14px;margin-bottom:16px}
.nl-k,.nl-tank{background:#fff;border:1px solid #e6e9f0;border-radius:14px;padding:14px 16px;box-shadow:0 1px 2px rgba(16,24,40,.04);position:relative;overflow:hidden}
.nl-k small,.nl-tank small{color:#667085;font-size:12.5px;font-weight:500;display:block}
.nl-k b,.nl-tank b{display:block;font-size:22px;font-weight:700;margin-top:4px;font-variant-numeric:tabular-nums;white-space:nowrap}
.nl-k b em,.nl-tank b em{font-style:normal;font-size:13px;color:#667085;font-weight:600}
.nl-k>em{font-style:normal;font-size:12px;color:#667085}
.nl-k:before{content:'';position:absolute;left:0;top:0;bottom:0;width:4px;background:#cbd5e1}
.nl-k.nl-in:before{background:#16a34a}.nl-k.nl-out:before{background:#ea580c}.nl-k.nl-ext:before{background:#2563eb}
.nl-tank{display:flex;gap:14px;align-items:center}.nl-tank .sm{font-size:12px;color:#667085;margin:2px 0 4px}
.nl-gauge{width:46px;height:86px;border:2px solid #cbd5e1;border-radius:10px;position:relative;overflow:hidden;flex:none;background:#f8fafc}
.nl-gauge i{position:absolute;left:0;right:0;bottom:0;background:linear-gradient(180deg,#fbbf24,#d97706);transition:height .4s}
.nl-tank.low .nl-gauge i{background:linear-gradient(180deg,#f87171,#dc2626)}
.nl-gauge span{position:absolute;inset:0;display:grid;place-items:center;font-size:12px;font-weight:700;color:#0f172a;text-shadow:0 1px 0 #fff}
.nl-bar{margin-bottom:14px;gap:10px}.nl-bar .search input{width:280px}
.nl-dh{grid-column:1/-1;display:flex;align-items:baseline;gap:10px;margin:8px 2px -4px}.nl-dh:first-child{margin-top:0}.nl-dh span{color:#667085;font-size:12.5px}
.nl-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px}
.nl-card{background:#fff;border:1px solid #e6e9f0;border-radius:14px;padding:14px 14px 10px;box-shadow:0 1px 2px rgba(16,24,40,.04);border-top:4px solid #cbd5e1;cursor:pointer;transition:box-shadow .15s,transform .15s;display:flex;flex-direction:column}
.nl-card:hover{box-shadow:0 8px 24px rgba(16,24,40,.08);transform:translateY(-1px)}
.nl-card.nl-in{border-top-color:#16a34a}.nl-card.nl-out{border-top-color:#ea580c}.nl-card.nl-ext{border-top-color:#2563eb}.nl-card.nl-xe{border-top-color:var(--p);cursor:default}.nl-card.over{border-top-color:#dc2626;background:#fffafa}
.nl-top{display:flex;gap:10px;align-items:center}
.nl-ic{width:38px;height:38px;border-radius:10px;display:grid;place-items:center;flex:none;background:#f1f5f9;color:#475467}.nl-ic svg{width:19px;height:19px}
.nl-in .nl-ic{background:#dcfce7;color:#16a34a}.nl-out .nl-ic{background:#ffedd5;color:#ea580c}.nl-ext .nl-ic{background:#dbeafe;color:#2563eb}.nl-xe .nl-ic{background:var(--p-50);color:var(--p)}
.nl-tt{min-width:0;flex:1}.nl-tt b{display:block;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.nl-tt small{color:#667085;font-size:12px}
.nl-lit{font-size:24px;font-weight:800;line-height:1;text-align:right;font-variant-numeric:tabular-nums;color:#0f172a}.nl-lit small{display:block;font-size:11px;font-weight:600;color:#667085;margin-top:2px}
.nl-mid{display:flex;flex-wrap:wrap;gap:6px 12px;margin:10px 0 8px;font-size:12.5px;color:#475467;align-items:center;min-height:22px}
.nl-mid span{display:inline-flex;align-items:center;gap:4px}.nl-mid svg{width:14px;height:14px;color:#98a2b3}
.nl-foot{display:flex;align-items:center;gap:6px;border-top:1px dashed #e6e9f0;padding-top:8px;margin-top:auto}.nl-foot .muted{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}.nl-foot b{white-space:nowrap}.nl-xe .nl-foot{flex-wrap:wrap}
.nl-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:10px}.nl-stats small{display:block;color:#98a2b3;font-size:11px}.nl-stats b{font-size:13.5px;font-variant-numeric:tabular-nums}
.nl-info{background:var(--p-50);border:1px solid var(--p-100);border-radius:10px;padding:10px 12px;font-size:12.5px;margin-bottom:12px;line-height:1.7}
.nl-lpg{grid-template-columns:minmax(0,1fr) 360px!important}
.doc-paper.nl-paper{width:310px!important;padding:14px 12px!important}
@media(max-width:1200px){.nl-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.nl-tank{grid-column:1/-1}}
@media(max-width:980px){.nl-lpg{grid-template-columns:minmax(0,1fr)!important}}
@media(max-width:700px){.nl-bar .search,.nl-bar .search input{width:100%}.nl-grid{grid-template-columns:minmax(0,1fr)}}
/* phiếu 80mm */
.r80{font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.4;color:#000;width:100%}
.r80 .c{text-align:center}.r80 .co{font-size:13px;text-transform:uppercase}.r80 .sm{font-size:10.5px}.r80 .it{font-style:italic}
.r80 .tt{font-size:15px;font-weight:800;margin:2px 0;letter-spacing:.02em}
.r80 .hr{border-top:1px dashed #000;margin:6px 0}
.r80 .kv{display:flex;justify-content:space-between;gap:8px;margin:2px 0}.r80 .kv span{white-space:nowrap}.r80 .kv b{text-align:right}
.r80 .big{font-size:15px}
.r80 .box{border:1.5px solid #000;border-radius:4px;padding:5px 8px;margin:6px 0;display:flex;justify-content:space-between;align-items:center}.r80 .box span{font-size:11px;font-weight:700}.r80 .box b{font-size:19px}
.r80 .tot{font-size:13.5px;border-top:1px solid #000;padding-top:4px;margin-top:4px}
.r80 .grd{border:1px solid #9ca3af;margin:6px 0}
.r80 .grd>.kv,.r80 .grd>.box{margin:0;padding:3px 6px;border:0;border-radius:0;border-bottom:1px solid #9ca3af;align-items:center}
.r80 .grd>.box{padding:5px 6px}
.r80 .grd>:last-child{border-bottom:0}
.r80 .grd>.tot{margin:0;padding:4px 6px}
.r80 .sg{width:100%;border-collapse:collapse;margin-top:2px}.r80 .sg td{width:50%;text-align:center;vertical-align:top;border:0!important;padding:0!important;font-size:11px;height:78px;color:#000}.r80 .sg i{display:block;font-size:9.5px}.r80 .sg .nm{margin-top:42px;font-weight:700}
.r80 .ft{margin-top:6px;color:#000}
.r80cut{border-top:1px dashed #999;margin:10px 0;page-break-after:always}
@media print{#print-root .r80{width:72mm;margin:0 auto;padding:2mm 0}#print-root .r80cut{border:0;margin:0}}
`);
/* ---------- Lái xe: chỉ xem xe được gán tên mình (Phương tiện → Lái xe 1/2) + bảng giá nhiên liệu ---------- */
vNL.myXes = () => { const e = PQ.emp(Auth.user), id = e && String(e.id); if (!id) return []; return (DB.vehicles || []).filter(v => !v.ngung && [v.laiXe1, v.laiXe2].map(String).includes(id)).map(v => v.bks).filter(Boolean).sort(); };
vNL.renderDrv = function (el) {
  if (!NL.thang) NL.thang = D.ymNow(); NLMK.init();
  const xes = vNL.myXes(), { led, rows } = nlMonthRows(), X = rows.filter(r => led.map[r.id].k !== 'nhap' && xes.includes(r.xe)).slice().reverse();
  const months = [...new Set([D.ymNow(), NL.thang, ...(DB.nhienlieu || []).filter(r => xes.includes(r.xe)).map(r => String(r.ngay).slice(0, 7))])].filter(Boolean).sort().reverse();
  const card = bks => { const L = X.filter(r => r.xe === bks), km = sum(L, r => led.map[r.id].kmChay || 0), litTH = sum(L.filter(r => led.map[r.id].kmChay), r => r.lit), th = km ? litTH / km * 100 : 0;
    return `<div class="nl-card nl-xe"><div class="nl-top"><span class="nl-ic">${ic('bus')}</span><div class="nl-tt"><b>${esc(bks)}</b><small>${L.length} lượt đổ · ${F.month(NL.thang).toLowerCase()}</small></div><div class="nl-lit">${nlL(sum(L, r => r.lit))}<small>lít</small></div></div>
      <div class="nl-stats"><div><small>Km chạy</small><b>${km ? F.money(km) : '—'}</b></div><div><small>Tiêu hao</small><b>${th ? F.num(th, 1) : '—'}</b><small>L/100km</small></div><div><small>Định mức</small><b>${nlDm(bks) || '—'}</b></div></div>
      ${L.length ? `<div class="nl-dl">${L.map(r => { const x = led.map[r.id]; return `<div><span>${F.date(r.ngay)}${r.gio ? ' ' + esc(r.gio) : ''}</span><span>${x.k === 'ngoai' ? esc(r.cayXang || 'Cây xăng') : 'Bồn công ty'}</span><b>${nlL(r.lit)} lít</b><span class="muted">${+r.km ? F.money(r.km) + ' km' : ''}</span></div>`; }).join('')}</div>` : '<div class="muted small" style="padding:6px 0">Chưa có lượt đổ trong tháng</div>'}</div>`; };
  el.insertAdjacentHTML('beforeend', `${nlMkHTML({ bq: 0, map: {} }, [])}
    <div class="row nl-bar"><b style="font-size:14px">${ic('bus')} Xe của tôi</b><span class="grow"></span><select class="inp" id="nlM">${months.map(x => `<option value="${x}" ${x === NL.thang ? 'selected' : ''}>${F.month(x)}</option>`).join('')}</select></div>
    ${xes.length ? `<div class="nl-grid xe">${xes.map(card).join('')}</div>` : `<div class="card"><div class="empty">${ic('bus')}<div style="margin-top:8px">Chưa có xe nào gán tên bạn. Liên hệ điều hành để gán xe (Phương tiện → Lái xe 1 / Lái xe 2).</div></div></div>`}`);
  $('#nlM', el).onchange = e => { NL.thang = e.target.value; App.render(); };
};
{ const r0 = vNL.render, t0 = vNL.tools; vNL.render = function (el) { return DRV.on() ? vNL.renderDrv(el) : r0.call(this, el); }; vNL.tools = function () { return DRV.on() ? '' : t0.apply(this, arguments); };
  const x0 = vNL.excel; Object.defineProperty(vNL, 'excel', { configurable: true, get: () => DRV.on() ? undefined : x0 }); }
addCSS(`.nl-bar>b{display:inline-flex;align-items:center;gap:8px}.nl-bar>b svg{width:18px;height:18px;color:var(--p)}.nl-dl{display:flex;flex-direction:column;gap:2px;margin-top:8px;border-top:1px dashed #e6e9f0;padding-top:6px}.nl-dl>div{display:grid;grid-template-columns:auto 1fr auto auto;gap:10px;font-size:12.5px;padding:3px 0;align-items:center}.nl-dl>div>span:nth-child(2){color:#475467;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}`);
MODL.def('nhienlieu', vNL);
