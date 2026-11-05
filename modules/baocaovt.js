'use strict';
/* Module Báo cáo vận tải · tải khi mở màn hình (MODL). Dùng chung dữ liệu và hàm của app chính. */
/* ===== BÁO CÁO VẬN TẢI TUYẾN CỐ ĐỊNH (đối chiếu NĐ 158/2024/NĐ-CP) =====
   - Tỷ lệ chuyến thực hiện / chuyến đăng ký theo Giờ chạy: dưới 70% trong tháng có thể bị thu hồi thông báo khai thác tuyến.
   - Ngừng khai thác tuyến: 60 ngày liên tục không chạy có thể bị thu hồi phù hiệu (cảnh báo từ 45 ngày).
   - Sản lượng tháng theo tuyến và theo xe (chuyến, hành khách, doanh thu) phục vụ chế độ báo cáo thống kê ngành. */
const BCVT = {
  ym: '',
  data(ym) {
    const today = D.today(), nd = D.daysIn(ym), first = ym + '-01', last = ym + '-' + String(nd).padStart(2, '0'), to = last < today ? last : today, daysTo = to < first ? 0 : +to.slice(8);
    const GC = (DB.giochay || []).filter(g => g.tt !== 'ĐÓNG' && g.tuyen && g.gio), T = (DB.lichchay || []).filter(l => String(l.ngay).startsWith(ym));
    const done = l => l.xeId && l.laiXe && !l.huy && l.ngay <= today;
    const tickets = (DB.datve || []).filter(b => !b.huy), byTrip = {}; tickets.forEach(b => { (byTrip[b.chuyen] = byTrip[b.chuyen] || []).push(b); });
    const routes = [...new Set([...GC.map(g => g.tuyen), ...T.map(l => l.tuyen)])].sort((a, b) => String(a).localeCompare(String(b), 'vi'));
    const lastRun = {}; (DB.lichchay || []).forEach(l => { if (done(l) && (!lastRun[l.tuyen] || l.ngay > lastRun[l.tuyen])) lastRun[l.tuyen] = l.ngay; });
    const R = routes.map(r => {
      const nGio = GC.filter(g => g.tuyen === r).length, dk = nGio * nd, dkTo = nGio * daysTo, X = T.filter(l => l.tuyen === r && done(l)), B = X.flatMap(l => byTrip[l.id] || []);
      const tl = dkTo ? X.length / dkTo * 100 : null, lr = lastRun[r] || '', idle = lr ? D.diff(today, lr) : null;
      return { tuyen: r, nGio, dk, dkTo, th: X.length, tl, hk: B.length, dt: B.reduce((a, b) => a + (+b.gia || 0) + (+b.phuThu || 0), 0), lr, idle };
    });
    const V = {}; T.filter(done).forEach(l => { const v = V[l.xeId] = V[l.xeId] || { id: l.xeId, bks: ((DB.vehicles || []).find(x => x.id === l.xeId) || {}).bks || '?', ch: 0, hk: 0, tuyen: new Set() }; v.ch++; v.hk += (byTrip[l.id] || []).length; v.tuyen.add(l.tuyen); });
    return { ym, nd, daysTo, R, V: Object.values(V).sort((a, b) => b.ch - a.ch) };
  },
  st(r) { if (r.tl == null) return ['—', '']; if (r.tl < 70) return ['Dưới 70%: nguy cơ thu hồi tuyến', 'bad']; if (r.tl < 80) return ['Sát ngưỡng 70%', 'warn']; return ['Đạt', 'ok']; },
  idle(r) { if (r.idle == null) return ['Chưa chạy chuyến nào', 'bad']; if (r.idle >= 60) return [`Ngừng ${r.idle} ngày: nguy cơ thu hồi phù hiệu`, 'bad']; if (r.idle >= 45) return [`Đã ngừng ${r.idle} ngày`, 'warn']; return [r.idle ? `Chạy gần nhất ${F.date(r.lr)}` : 'Đang khai thác', 'ok']; },
  html() {
    const ym = BCVT.ym || D.ymNow(), d = BCVT.data(ym), pct = v => v == null ? '—' : v.toFixed(1) + '%';
    const warn = d.R.filter(r => BCVT.st(r)[1] === 'bad' || BCVT.idle(r)[1] === 'bad').length, tot = k => d.R.reduce((a, r) => a + (r[k] || 0), 0);
    const kpi = (t, v, s, c) => `<div class="bc-k ${c || ''}"><small>${t}</small><b>${v}</b><em>${s || ''}</em></div>`;
    return `<div class="bc-bar"><label class="row small" style="gap:6px;align-items:center">Tháng <input type="month" class="inp" id="bcM" value="${ym}"></label><span class="grow"></span><button class="btn" data-bc="print">${ic('printer')} In báo cáo</button><button class="btn xl" data-bc="xls">${ic('sheet')} Xuất Excel</button></div>
      <div class="bc-kp">${kpi('Chuyến thực hiện', F.num(tot('th')), `/${F.num(tot('dkTo'))} chuyến đăng ký${d.daysTo < d.nd ? ' (tới hôm nay)' : ''}`)}${kpi('Tỷ lệ thực hiện', pct(tot('dkTo') ? tot('th') / tot('dkTo') * 100 : null), 'ngưỡng tối thiểu 70%', tot('dkTo') && tot('th') / tot('dkTo') < .7 ? 'bad' : '')}${kpi('Hành khách', F.num(tot('hk')), 'vé không hủy')}${kpi('Doanh thu vé', F.money(tot('dt')) + 'đ', '')}${kpi('Cảnh báo', warn, 'tuyến cần xử lý', warn ? 'bad' : 'ok')}</div>
      <div class="card"><div class="card-h"><h3>Thực hiện theo tuyến · ${F.month(ym)}</h3><span class="sub">Theo NĐ 158/2024: dưới 70% chuyến đăng ký/tháng hoặc ngừng 60 ngày liên tục có thể bị thu hồi</span></div><div class="card-b p0"><div class="tbl-wrap"><table class="tbl compact"><thead><tr><th>Tuyến</th><th class="r">Giờ chạy/ngày</th><th class="r">Đăng ký tháng</th><th class="r">Đăng ký tới nay</th><th class="r">Thực hiện</th><th class="r">Tỷ lệ</th><th>Đánh giá</th><th>Khai thác liên tục</th><th class="r">Hành khách</th><th class="r">Doanh thu</th></tr></thead><tbody>
        ${d.R.map(r => { const s = BCVT.st(r), i = BCVT.idle(r); return `<tr><td><b>${esc(r.tuyen)}</b></td><td class="r">${r.nGio}</td><td class="r">${F.num(r.dk)}</td><td class="r">${F.num(r.dkTo)}</td><td class="r"><b>${F.num(r.th)}</b></td><td class="r"><b>${pct(r.tl)}</b></td><td><span class="bc-s ${s[1]}">${s[0]}</span></td><td><span class="bc-s ${i[1]}">${esc(i[0])}</span></td><td class="r">${F.num(r.hk)}</td><td class="r">${F.money(r.dt)}</td></tr>`; }).join('') || '<tr><td colspan="10" class="muted">Chưa có tuyến nào.</td></tr>'}
      </tbody></table></div></div></div>
      <div class="card" style="margin-top:14px"><div class="card-h"><h3>Sản lượng theo xe · ${F.month(ym)}</h3></div><div class="card-b p0"><div class="tbl-wrap"><table class="tbl compact"><thead><tr><th>Biển số</th><th>Tuyến khai thác</th><th class="r">Số chuyến</th><th class="r">Hành khách</th><th class="r">Bình quân khách/chuyến</th></tr></thead><tbody>
        ${d.V.map(v => `<tr class="bc-xr" data-bc="xe" data-id="${esc(v.id)}" title="Bấm để xem các chuyến của xe trong tháng"><td><span class="bc-xe"><b>${esc(v.bks)}</b></span></td><td>${esc([...v.tuyen].join(', '))}</td><td class="r">${v.ch}</td><td class="r">${v.hk}</td><td class="r">${v.ch ? (v.hk / v.ch).toFixed(1) : '—'}</td></tr>`).join('') || '<tr><td colspan="5" class="muted">Chưa có chuyến thực hiện.</td></tr>'}
      </tbody></table></div></div></div>
      <div class="small muted" style="margin-top:8px">Chuyến thực hiện = chuyến đã có xe và lái xe, ngày chạy không sau hôm nay. Chuyến đăng ký = số giờ chạy đang mở của tuyến × số ngày. Đối chiếu với biểu đồ chạy xe đã đăng ký với Sở GTVT để có số liệu chính xác.</div>`;
  },
  cols: [{ key: 'tuyen', label: 'Tuyến' }, { key: 'nGio', label: 'Giờ chạy/ngày' }, { key: 'dk', label: 'Đăng ký tháng' }, { key: 'dkTo', label: 'Đăng ký tới nay' }, { key: 'th', label: 'Thực hiện' }, { key: 'tlTxt', label: 'Tỷ lệ' }, { key: 'dg', label: 'Đánh giá' }, { key: 'kt', label: 'Khai thác liên tục' }, { key: 'hk', label: 'Hành khách' }, { key: 'dt', label: 'Doanh thu', fmt: 'money' }],
  rows(ym) { return BCVT.data(ym).R.map(r => ({ ...r, tlTxt: r.tl == null ? '—' : r.tl.toFixed(1) + '%', dg: BCVT.st(r)[0], kt: BCVT.idle(r)[0] })); },
  act(a, b) {
    const ym = BCVT.ym || D.ymNow();
    if (a === 'xe') return BCVT.xe(b.dataset.id, ym);
    if (a === 'go') { const g = dhGrp(b.dataset.t); BCVT._m && BCVT._m.close(); App.go('dieuhanh'); LC.ngay = b.dataset.d; if (g) dhSel = [g]; return App.render(); }
    if (a === 'close') return BCVT._m && BCVT._m.close();
    if (a === 'print') return Print.report({ title: 'BÁO CÁO THỰC HIỆN VẬN TẢI HÀNH KHÁCH TUYẾN CỐ ĐỊNH', sub: F.month(ym), cols: BCVT.cols, rows: BCVT.rows(ym), landscape: true, signs: ['Người lập biểu', 'Người điều hành vận tải', 'Giám đốc'] });
    if (a === 'xls') return XLSX.save('Bao cao van tai ' + ym, [xSheet('Theo tuyến', 'BÁO CÁO THỰC HIỆN VẬN TẢI TUYẾN CỐ ĐỊNH · ' + F.month(ym), BCVT.cols, BCVT.rows(ym)), xSheet('Theo xe', 'SẢN LƯỢNG THEO XE · ' + F.month(ym), [{ key: 'bks', label: 'Biển số' }, { key: 'tuyenTxt', label: 'Tuyến' }, { key: 'ch', label: 'Số chuyến' }, { key: 'hk', label: 'Hành khách' }], BCVT.data(ym).V.map(v => ({ ...v, tuyenTxt: [...v.tuyen].join(', ') })))]);
  }
};
const vBCVT = {
  title: 'Báo cáo vận tải', label: 'Báo cáo vận tải', icon: 'chart', print: false, desc: 'Tỷ lệ thực hiện chuyến theo tuyến, cảnh báo ngừng khai thác, sản lượng hành khách theo NĐ 158/2024',
  render(el) { el.innerHTML = `<div class="bc">${BCVT.html()}</div>`; el.onclick = e => { const b = e.target.closest && e.target.closest('[data-bc]'); if (!b) return; e.preventDefault(); try { BCVT.act(b.dataset.bc, b); } catch (x) { toast('Lỗi: ' + x.message, 'err', 6000); } }; const m = $('#bcM', el); if (m) m.onchange = () => { BCVT.ym = m.value || D.ymNow(); App.render(); }; }
};
BCVT.xe = (id, ym) => {
  const v = (DB.vehicles || []).find(x => String(x.id) === String(id)) || {}, today = D.today(), emp = i => ((DB.employees || []).find(e => e.id === i) || {}).ten || '';
  const L = (DB.lichchay || []).filter(l => String(l.xeId) === String(id) && String(l.ngay).startsWith(ym)).sort((a, b) => (a.ngay + a.gio).localeCompare(b.ngay + b.gio));
  const rows = L.map(l => { const ok = l.laiXe && l.ngay <= today; return `<tr><td>${F.date(l.ngay)}</td><td>${esc(l.gio || '')}</td><td>${esc(l.tuyen || '')}</td><td>${esc([emp(l.laiXe), emp(l.laiXe2)].filter(Boolean).join(', ')) || '<span class="muted">Chưa gán</span>'}</td><td class="r">${(DB.datve || []).filter(x => !x.huy && x.chuyen === l.id).length}</td><td>${ok ? '<span class="bc-s ok">Tính sản lượng</span>' : '<span class="bc-s">Chưa tính</span>'}</td><td><button class="btn sm" data-bc="go" data-d="${esc(l.ngay)}" data-t="${esc(l.tuyen || '')}">Mở Điều hành</button></td></tr>`; }).join('');
  BCVT._m = Modal.open({ title: 'Xe ' + (v.bks || '?') + ' · ' + F.month(ym) + ' · ' + L.length + ' chuyến', width: 820, body: `<div class="tbl-wrap"><table class="tbl compact"><thead><tr><th>Ngày</th><th>Giờ</th><th>Tuyến</th><th>Lái xe</th><th class="r">Vé</th><th>Báo cáo</th><th></th></tr></thead><tbody>${rows || '<tr><td colspan="7" class="muted">Không có chuyến.</td></tr>'}</tbody></table></div><div class="small muted" style="margin-top:8px">Bấm "Mở Điều hành" để tới đúng ngày, tuyến đó và sửa xe nếu gán nhầm.</div>`, foot: '<button class="btn" data-bc="close">Đóng</button>' });
};
addCSS(`.bc-xe{text-decoration:underline dotted}.bc-xr{cursor:pointer}.bc-xr:hover td{background:#eff6ff}.bc-xr:hover .bc-xe{color:var(--pri,#2563eb)}`);
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('.modal-wrap [data-bc]'); if (!b) return; try { BCVT.act(b.dataset.bc, b); } catch (x) { toast('Lỗi: ' + x.message, 'err', 6000); } });
addCSS(`.bc-bar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:12px}.bc-kp{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin-bottom:14px}
.bc-k{background:#fff;border:1px solid var(--line,#e5e7eb);border-radius:12px;padding:12px 14px}.bc-k small{display:block;color:#667085;font-weight:600}.bc-k b{display:block;font-size:22px;margin:2px 0}.bc-k em{font-style:normal;font-size:12px;color:#667085}.bc-k.bad{border-color:#fecaca;background:#fef2f2}.bc-k.bad b{color:#b91c1c}.bc-k.ok b{color:#15803d}
.bc-s{display:inline-block;border-radius:8px;padding:2px 8px;font-size:12px;font-weight:700}.bc-s.ok{background:#dcfce7;color:#166534}.bc-s.warn{background:#fef3c7;color:#92400e}.bc-s.bad{background:#fee2e2;color:#991b1b}`);
MODL.def('baocaovt', vBCVT);
