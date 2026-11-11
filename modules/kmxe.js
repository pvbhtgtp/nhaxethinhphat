'use strict';
/* Module Km vận hành (nhập báo cáo Skysoft) · tải khi mở màn hình (MODL). */
const KM = { mode: 'month', day: '' };
const kmMode = { day: 'Ngày', week: 'Tuần', month: 'Tháng', year: 'Năm' };
const kmKey = s => String(s || '').toUpperCase().replace(/[^0-9A-Z]/g, '');
const kmFmt = n => F.money(Math.round((+n || 0) * 10) / 10);
function kmRange(mode, day) {
  const d = D.parse(day);
  if (mode === 'day') return [day, day];
  if (mode === 'week') { const k = (d.getDay() + 6) % 7, a = D.add(day, -k); return [a, D.add(a, 6)]; }
  if (mode === 'month') return [day.slice(0, 7) + '-01', day.slice(0, 7) + '-' + String(D.daysIn(day.slice(0, 7))).padStart(2, '0')];
  return [day.slice(0, 4) + '-01-01', day.slice(0, 4) + '-12-31'];
}
function kmLabel(mode, day) { const [a, b] = kmRange(mode, day); return mode === 'day' ? F.date(a) : mode === 'week' ? F.date(a) + ' – ' + F.date(b) : mode === 'month' ? 'Tháng ' + day.slice(5, 7) + '/' + day.slice(0, 4) : 'Năm ' + day.slice(0, 4); }
function kmStep(mode, day, n) { if (mode === 'day') return D.add(day, n); if (mode === 'week') return D.add(day, 7 * n); if (mode === 'month') return D.ymAdd(day.slice(0, 7), n) + '-01'; return (+day.slice(0, 4) + n) + '-01-01'; }
function kmAgg(mode, day) {
  const [a, b] = kmRange(mode, day), by = {};
  (DB.kmxe || []).filter(r => r.ngay >= a && r.ngay <= b).forEach(r => { const o = by[r.bks] = by[r.bks] || { bks: r.bks, km: 0, days: new Set(), sub: {} }; o.km += +r.km || 0; if (+r.km > 0) o.days.add(r.ngay); const sk = mode === 'year' ? r.ngay.slice(0, 7) : r.ngay; o.sub[sk] = (o.sub[sk] || 0) + (+r.km || 0); });
  const rows = Object.values(by).map(o => ({ ...o, nDays: o.days.size })).sort((x, y) => y.km - x.km);
  const veh = DB.vehicles.filter(v => !v.ngung && !by[v.bks]).map(v => ({ bks: v.bks, km: 0, nDays: 0, sub: {} }));
  return { a, b, rows: rows.concat(veh), total: sum(rows, r => r.km) };
}
const kmSubKeys = (mode, a, b) => { const out = []; if (mode === 'year') { for (let m = 1; m <= 12; m++) out.push(a.slice(0, 4) + '-' + String(m).padStart(2, '0')); } else { for (let d = a; d <= b; d = D.add(d, 1)) out.push(d); } return out; };
const kmSubLbl = (mode, k) => mode === 'year' ? 'T' + k.slice(5) : F.date(k).slice(0, 5);
/* Bảng chi tiết: ô tick ẩn / hiện cột và xe không chạy cho gọn (nhớ trên máy này) */
const KMV = {
  C: [['km', 'Km', 2], ['nd', 'Ngày chạy', 3], ['tb', 'TB km/ngày', 4], ['bd', 'Biểu đồ', 5], ['z', 'Xe không chạy', 0]],
  get() { try { return JSON.parse(localStorage.getItem('km.cols') || '{}') || {}; } catch (e) { return {}; } },
  cls() { const g = KMV.get(); return KMV.C.filter(([k]) => g[k] === false).map(([k]) => 'kmh-' + k).join(' '); },
  bar() { const g = KMV.get(); return `<div class="kmv">${KMV.C.map(([k, t]) => `<label><input type="checkbox" data-kv="${k}" ${g[k] === false ? '' : 'checked'}> ${t}</label>`).join('')}</div>`; },
  bind(root) { root.querySelectorAll('[data-kv]').forEach(c => c.onchange = () => { const g = KMV.get(); g[c.dataset.kv] = c.checked; try { localStorage.setItem('km.cols', JSON.stringify(g)); } catch (e) { } root.querySelectorAll('.km-t').forEach(t => { t.className = 'tbl km-t ' + KMV.cls(); }); }); }
};
function kmDetail(r, mode, a, b) {
  const keys = kmSubKeys(mode, a, b), mx = Math.max(1, ...keys.map(k => r.sub[k] || 0));
  const m = Modal.open({ title: 'Km xe ' + esc(r.bks) + ' · ' + kmLabel(mode, KM.day), width: 560, body: `<div class="km-tot">Tổng <b>${kmFmt(r.km)} km</b> · chạy ${r.nDays} ngày · TB ${r.nDays ? kmFmt(r.km / r.nDays) : 0} km/ngày</div><div class="km-bars">${keys.map(k => `<div class="km-b"><span>${kmSubLbl(mode, k)}</span><i style="width:${Math.round((r.sub[k] || 0) / mx * 100)}%"></i><b>${r.sub[k] ? kmFmt(r.sub[k]) : '—'}</b></div>`).join('')}</div>`, foot: '<button class="btn pri" data-no>Đóng</button>' });
  m.el.querySelector('[data-no]').onclick = () => m.close();
}
function kmManual() {
  if (!Auth.guard('kmxe', 'add')) return;
  const m = Modal.open({ title: 'Nhập km thủ công', width: 440, body: `<div class="form"><div class="field"><label>Biển số xe <i class="req">*</i></label><select class="inp" id="kmB"><option value="">— Chọn xe —</option>${DB.vehicles.map(v => `<option>${esc(v.bks)}</option>`).join('')}</select></div><div class="field"><label>Ngày <i class="req">*</i></label><input class="inp" type="date" id="kmD" value="${D.today()}"></div><div class="field"><label>Số km chạy trong ngày <i class="req">*</i></label><input class="inp" type="number" min="0" step="any" inputmode="decimal" id="kmK"></div></div>`, foot: '<button class="btn" data-no>Hủy</button><button class="btn pri" data-ok>Lưu</button>' });
  m.el.querySelector('[data-no]').onclick = () => m.close();
  m.el.querySelector('[data-ok]').onclick = () => { const bks = m.el.querySelector('#kmB').value, ngay = m.el.querySelector('#kmD').value, km = +m.el.querySelector('#kmK').value; if (!bks || !ngay || !(km >= 0) || m.el.querySelector('#kmK').value === '') return toast('Nhập đủ biển số, ngày và số km', 'err'); const o = DB.kmxe.find(r => r.bks === bks && r.ngay === ngay); if (o) o.km = km; else DB.kmxe.push({ id: uid(), bks, ngay, km }); App.changed(); m.close(); toast('Đã lưu km', 'ok'); };
}
const kmNum = v => { let t = String(v ?? '').trim().replace(/\s|km$/gi, ''); if (typeof v === 'number') return v; if (!/\d/.test(t)) return NaN; t = t.replace(/[^\d.,-]/g, ''); const c = (t.match(/,/g) || []).length, d = (t.match(/\./g) || []).length; if (c && d) { return parseFloat(t.lastIndexOf(',') > t.lastIndexOf('.') ? t.replace(/\./g, '').replace(',', '.') : t.replace(/,/g, '')); } if (c) return parseFloat(c > 1 || /^\d{1,3}(,\d{3})+$/.test(t) ? t.replace(/,/g, '') : t.replace(',', '.')); if (d > 1 || /^\d{1,3}\.\d{3}$/.test(t)) return parseFloat(t.replace(/\./g, '')); return parseFloat(t); };
const kmDate = v => { if (v === '' || v == null) return ''; if (typeof v === 'number' || /^\d{4,6}(\.\d+)?$/.test(String(v))) { const d = new Date(Math.round((+v - 25569) * 86400000)); return isNaN(d) ? '' : d.toISOString().slice(0, 10); } const s = String(v).trim(), m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/); if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : ''; };
function kmImport() {
  if (!Auth.guard('kmxe', 'add')) return;
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.xlsx,.xls,.csv';
  inp.onchange = async () => {
    const f = inp.files[0]; if (!f) return;
    let rows; try { rows = (await XLSX.read(f)).filter(r => r && r.some(c => String(c ?? '').trim() !== '')); } catch (e) { return toast('Không đọc được file: ' + esc(e.message || ''), 'err', 8000); }
    if (rows.length < 2) return toast('File không có dữ liệu', 'err');
    const nh = x => dvNorm(x), isH = r => r.filter(c => typeof c === 'string' && c.trim()).length >= 2;
    let hr = rows.slice(0, 15).findIndex(r => isH(r) && r.some(c => /km|quang duong|distance/.test(nh(c)))); if (hr < 0) hr = rows.slice(0, 15).findIndex(isH); if (hr < 0) hr = 0;
    const H = rows[hr].map((c, i) => String(c ?? '').trim() || 'Cột ' + (i + 1)), find = re => { const i = H.findIndex(h => re.test(nh(h))); return i; };
    const iB = find(/bien|bks|bien so|plate|phuong tien|so xe/), iD = find(/ngay|date|thoi gian|time/), iK = (() => { let i = find(/tong.*km|quang duong|km di|so km|^km$|distance/); return i >= 0 ? i : find(/km/); })();
    const opt = (sel, none) => (none ? `<option value="-1">${none}</option>` : '') + H.map((h, i) => `<option value="${i}" ${i === sel ? 'selected' : ''}>${esc(h)}</option>`).join('');
    const m = Modal.open({ title: 'Nhập km từ ' + esc(f.name), width: 560, body: `<div class="muted small" style="margin-bottom:8px">Chọn cột tương ứng trong báo cáo Skysoft (hệ thống đã đoán sẵn). ${rows.length - hr - 1} dòng dữ liệu.</div><div class="form"><div class="field"><label>Cột biển số xe</label><select class="inp" id="kB">${opt(iB)}</select></div><div class="field"><label>Cột số km</label><select class="inp" id="kK">${opt(iK)}</select></div><div class="field"><label>Cột ngày (báo cáo theo từng ngày)</label><select class="inp" id="kD">${opt(iD, '— Không có (báo cáo tổng theo kỳ) —')}</select></div><div class="form c2" id="kR" hidden><div class="field"><label>Từ ngày</label><input class="inp" type="date" id="kT"></div><div class="field"><label>Đến ngày</label><input class="inp" type="date" id="kE"></div><div class="muted small full">Tổng km sẽ được chia đều cho từng ngày trong kỳ.</div></div></div><div id="kP" class="muted small" style="margin-top:8px"></div>`, foot: '<button class="btn" data-no>Hủy</button><button class="btn pri" data-ok>Nhập</button>' });
    const q = s => m.el.querySelector(s), body = rows.slice(hr + 1);
    { // báo cáo tổng hợp thường ghi "Từ ngày ... Đến ngày ..." ở phần đầu hoặc trong tên file: tự điền khoảng ngày
      const ds = []; const grab = t => { String(t ?? '').replace(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/g, (_, d, mo, y) => { ds.push(`${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`); }); };
      rows.slice(0, hr).forEach(r => r.forEach(c => { if (typeof c === 'string') grab(c); })); grab(f.name);
      if (ds.length >= 2) { ds.sort(); q('#kT').value = ds[0]; q('#kE').value = ds[ds.length - 1]; } }
    const build = () => {
      const b = +q('#kB').value, k = +q('#kK').value, d = +q('#kD').value, byV = {}; Object.assign(byV, {}); DB.vehicles.forEach(v => { byV[kmKey(v.bks)] = v.bks; });
      q('#kR').hidden = d >= 0; const out = [], bad = new Set(); let skip = 0;
      let T = q('#kT').value, E = q('#kE').value, nd = 1; if (d < 0) { if (!T || !E || E < T) return { out, bad, skip, need: 1 }; nd = D.diff(E, T) + 1; }
      body.forEach(r => { const bks = byV[kmKey(r[b])], km = kmNum(r[k]); if (!String(r[b] ?? '').trim() || /^(tong|cong|total)/.test(dvNorm(r[b]))) return; if (!bks) { bad.add(String(r[b]).trim()); return; } if (!(km >= 0)) { skip++; return; }
        if (d >= 0) { const ng = kmDate(r[d]); if (!ng) { skip++; return; } out.push({ bks, ngay: ng, km }); } else for (let i = 0; i < nd; i++) out.push({ bks, ngay: D.add(T, i), km: km / nd }); });
      return { out, bad, skip };
    };
    const prev = () => { const r = build(); q('#kP').innerHTML = r.need ? 'Chọn khoảng ngày của báo cáo.' : `Sẽ nhập <b>${r.out.length}</b> dòng km cho <b>${new Set(r.out.map(x => x.bks)).size}</b> xe${r.out.length ? ' (' + F.date(r.out.reduce((a, x) => x.ngay < a ? x.ngay : a, '9999')) + ' → ' + F.date(r.out.reduce((a, x) => x.ngay > a ? x.ngay : a, '')) + ', ' + kmFmt(sum(r.out, x => x.km)) + ' km)' : ''}.${r.bad.size ? `<br><span style="color:#b45309">Bỏ qua biển số chưa có trong Phương tiện: ${esc([...r.bad].slice(0, 8).join(', '))}${r.bad.size > 8 ? '…' : ''}</span>` : ''}${r.skip ? `<br>${r.skip} dòng không có số km (ngày xe không chạy hoặc mất tín hiệu GPS), bỏ qua.` : ''}`; return r; };
    m.el.addEventListener('change', prev); prev();
    q('[data-no]').onclick = () => m.close();
    q('[data-ok]').onclick = () => { const r = prev(); if (!r.out.length) return toast('Không có dòng nào để nhập', 'err'); const map = new Map(DB.kmxe.map(x => [x.bks + '|' + x.ngay, x])); r.out.forEach(x => { const o = map.get(x.bks + '|' + x.ngay); if (o) o.km = x.km; else { const n = { id: uid(), ...x }; DB.kmxe.push(n); map.set(x.bks + '|' + x.ngay, n); } }); App.changed(); m.close(); toast('Đã nhập ' + r.out.length + ' dòng km', 'ok'); };
  };
  inp.click();
}
const vKM = {
  title: 'Km xe', icon: 'trend', desc: 'Thống kê km mỗi xe đã chạy theo ngày, tuần, tháng, năm (nhập báo cáo từ Skysoft)',
  tools: () => '',
  render(el) {
    if (!KM.day) KM.day = (DB.kmxe.length ? DB.kmxe.reduce((a, r) => r.ngay > a ? r.ngay : a, '') : '') || D.today();
    const A = kmAgg(KM.mode, KM.day), run = A.rows.filter(r => r.km > 0), nXe = run.length, top = run[0], mx = Math.max(1, ...A.rows.map(r => r.km));
    const can = Auth.can('kmxe', 'add');
    el.insertAdjacentHTML('beforeend', `<div class="row sc-bar"><div class="km-seg">${Object.keys(kmMode).map(k => `<button class="${k === KM.mode ? 'on' : ''}" data-km="${k}">${kmMode[k]}</button>`).join('')}</div><button class="btn sm" data-kn="-1" aria-label="Kỳ trước">${ic('back')}</button><b class="km-lbl">${kmLabel(KM.mode, KM.day)}</b><button class="btn sm" data-kn="1" aria-label="Kỳ sau"><span style="display:inline-block;transform:scaleX(-1);line-height:0">${ic('back')}</span></button><input type="date" class="inp" id="kmDay" value="${KM.day}" style="width:150px"><button class="btn sm" data-kn="0">Hôm nay</button><span class="grow"></span>${can ? `<button class="btn" data-act="kmManual">${ic('plus')} Nhập tay</button><button class="btn pri" data-act="kmImport">${ic('upload')} Nhập báo cáo Excel</button>` : ''}</div>
      <div class="sc-kpi"><div><small>Tổng km ${kmMode[KM.mode].toLowerCase()}</small><b>${kmFmt(A.total)} km</b></div><div><small>Số xe có chạy</small><b>${nXe} / ${A.rows.length}</b></div><div><small>Trung bình mỗi xe</small><b>${nXe ? kmFmt(A.total / nXe) : 0} km</b></div><div><small>Xe chạy nhiều nhất</small><b>${top ? esc(top.bks) : '—'}</b>${top ? `<em>${kmFmt(top.km)} km</em>` : ''}</div></div>
      <div class="tbl-card">${KMV.bar()}<div class="tbl-wrap free"><table class="tbl km-t ${KMV.cls()}"><thead><tr><th>Biển số</th><th class="r">Km</th><th class="r">Ngày chạy</th><th class="r">TB km/ngày</th><th style="min-width:140px"></th></tr></thead><tbody>${A.rows.map(r => `<tr class="km-row${r.km ? '' : ' km0'}" data-bks="${esc(r.bks)}" style="cursor:pointer"><td><b>${esc(r.bks)}</b></td><td class="r"><b>${r.km ? kmFmt(r.km) : '—'}</b></td><td class="r">${r.nDays || '—'}</td><td class="r">${r.nDays ? kmFmt(r.km / r.nDays) : '—'}</td><td><div class="km-bar"><i style="width:${Math.round(r.km / mx * 100)}%"></i></div></td></tr>`).join('') || '<tr><td colspan="5" class="muted" style="padding:18px">Chưa có xe.</td></tr>'}</tbody></table></div></div>${DB.kmxe.length ? '' : '<div class="muted" style="margin-top:12px">Chưa có dữ liệu km. Tải báo cáo km từ Skysoft (Excel) rồi bấm "Nhập báo cáo Excel", hoặc "Nhập tay".</div>'}`);
    el.querySelectorAll('[data-km]').forEach(b => b.onclick = () => { KM.mode = b.dataset.km; App.render(); });
    el.querySelectorAll('[data-kn]').forEach(b => b.onclick = () => { const n = +b.dataset.kn; KM.day = n === 0 ? D.today() : kmStep(KM.mode, KM.day, n); App.render(); });
    $('#kmDay', el).onchange = e => { if (e.target.value) { KM.day = e.target.value; App.render(); } };
    KMV.bind(el);
    el.querySelectorAll('.km-row').forEach(tr => tr.onclick = () => { const r = A.rows.find(x => x.bks === tr.dataset.bks); if (r) kmDetail(r, KM.mode, A.a, A.b); });
  },
  excel() { const A = kmAgg(KM.mode, KM.day); XLSX.save('Km xe ' + kmLabel(KM.mode, KM.day), [xSheet('Km xe', 'KM XE CHẠY · ' + kmLabel(KM.mode, KM.day).toUpperCase(), [{ key: 'bks', label: 'Biển số' }, { key: 'km', label: 'Số km' }, { key: 'nDays', label: 'Số ngày chạy' }, { key: 'tb', label: 'TB km/ngày' }], A.rows.map(r => ({ ...r, km: Math.round(r.km * 10) / 10, tb: r.nDays ? Math.round(r.km / r.nDays * 10) / 10 : 0 })))]); },
  print() { const A = kmAgg(KM.mode, KM.day); Print.report({ title: 'Thống kê km xe chạy', sub: kmLabel(KM.mode, KM.day), cols: [{ key: 'bks', label: 'Biển số' }, { key: 'km', label: 'Số km', align: 'r' }, { key: 'nDays', label: 'Số ngày chạy', align: 'r' }, { key: 'tb', label: 'TB km/ngày', align: 'r' }], rows: A.rows.map(r => ({ ...r, km: kmFmt(r.km), tb: r.nDays ? kmFmt(r.km / r.nDays) : '' })), signs: ['Người lập', 'Giám đốc'] }); }
};
/* Km xe hiển thị ngay trong Điều hành xe (theo ngày đang xem) */
function kmPanel(el) {
  if (!Auth.can('kmxe', 'view')) return;
  const day = lcDay(); KM.day = day; const A = kmAgg(KM.mode, day), run = A.rows.filter(r => r.km > 0), mx = Math.max(1, ...A.rows.map(r => r.km)), can = Auth.can('kmxe', 'add');
  const box = document.createElement('details'); box.className = 'km-dx'; box.open = true;
  box.innerHTML = `<summary><b>Km xe đã chạy</b> · ${kmLabel(KM.mode, day)} · <b>${kmFmt(A.total)} km</b> · ${run.length}/${A.rows.length} xe</summary>
    <div class="row sc-bar" style="margin-top:10px"><div class="km-seg">${Object.keys(kmMode).map(k => `<button class="${k === KM.mode ? 'on' : ''}" data-km="${k}">${kmMode[k]}</button>`).join('')}</div><span class="grow"></span>${can ? `<button class="btn sm" data-act="kmManual">${ic('plus')} Nhập tay</button><button class="btn sm pri" data-act="kmImport">${ic('upload')} Nhập báo cáo Skysoft</button>` : ''}</div>
    ${KMV.bar()}<div class="tbl-wrap free"><table class="tbl km-t ${KMV.cls()}"><thead><tr><th>Biển số</th><th class="r">Km</th><th class="r">Ngày chạy</th><th class="r">TB km/ngày</th><th style="min-width:110px"></th></tr></thead><tbody>${A.rows.map(r => `<tr class="km-row${r.km ? '' : ' km0'}" data-bks="${esc(r.bks)}" style="cursor:pointer"><td><b>${esc(r.bks)}</b></td><td class="r"><b>${r.km ? kmFmt(r.km) : '—'}</b></td><td class="r">${r.nDays || '—'}</td><td class="r">${r.nDays ? kmFmt(r.km / r.nDays) : '—'}</td><td><div class="km-bar"><i style="width:${Math.round(r.km / mx * 100)}%"></i></div></td></tr>`).join('')}</tbody></table></div>${DB.kmxe.length ? '' : '<div class="muted small" style="margin-top:8px">Chưa có dữ liệu km. Xuất báo cáo km từ Skysoft (Excel) rồi bấm "Nhập báo cáo Skysoft".</div>'}`;
  el.appendChild(box);
  box.querySelectorAll('[data-km]').forEach(b => b.onclick = ev => { ev.preventDefault(); KM.mode = b.dataset.km; App.render(); });
  KMV.bind(box);
  box.querySelectorAll('.km-row').forEach(tr => tr.onclick = () => { const r = A.rows.find(x => x.bks === tr.dataset.bks); if (r) kmDetail(r, KM.mode, A.a, A.b); });
}
/* bảng Km hiện trong màn hình Điều hành: dieuhanh.js tự nạp module này rồi gọi kmPanel */
addCSS(`.km-dx{margin-top:16px;background:#fff;border:1px solid #bae6fd;border-radius:14px;padding:12px 14px}.km-dx>summary{cursor:pointer;list-style:none;font-size:14.5px;color:#0c4a6e}.km-dx>summary::-webkit-details-marker{display:none}.km-dx>summary::before{content:'▸ ';color:#0284c7}.km-dx[open]>summary::before{content:'▾ '}`);
Object.assign(ACT, { kmImport: () => kmImport(), kmManual: () => kmManual() });
addCSS(`.kmv{display:flex;flex-wrap:wrap;gap:4px 12px;padding:8px 12px;font-size:13px;color:#475467;border-bottom:1px solid #eef2f6}.kmv label{display:inline-flex;align-items:center;gap:4px;cursor:pointer}.kmv input{width:15px;height:15px;margin:0}.km-t.kmh-km tr>:nth-child(2),.km-t.kmh-nd tr>:nth-child(3),.km-t.kmh-tb tr>:nth-child(4),.km-t.kmh-bd tr>:nth-child(5),.km-t.kmh-z tr.km0{display:none}.km-seg{display:inline-flex;border:1px solid #bae6fd;border-radius:10px;overflow:hidden}.km-seg button{border:0;background:#fff;padding:0 14px;height:40px;font:inherit;font-weight:600;color:#64748b;cursor:pointer}.km-seg button.on{background:#0284c7;color:#fff}.km-lbl{min-width:120px;text-align:center}.km-bar{height:8px;background:#e0f2fe;border-radius:6px;overflow:hidden}.km-bar i{display:block;height:100%;background:#0ea5e9;border-radius:6px}.km-row:hover td{background:#f0f9ff}
.km-tot{margin-bottom:10px}.km-bars{display:flex;flex-direction:column;gap:4px;max-height:52vh;overflow:auto}.km-b{display:grid;grid-template-columns:44px 1fr 70px;gap:8px;align-items:center;font-size:13px}.km-b i{display:block;height:10px;background:#38bdf8;border-radius:5px;min-width:0}.km-b b{text-align:right;color:#0c4a6e}@media(max-width:760px){.km-seg button{padding:0 10px}.sc-bar .inp{width:auto}}`);
MODL.def('kmxe', vKM);
