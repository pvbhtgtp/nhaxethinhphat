'use strict';
/* ===== BÁO CÁO BÁN VÉ · tải khi mở màn hình (MODL). Dùng chung dữ liệu Đặt vé (DB.datve, DB.lichchay).
   - Kỳ báo cáo: hôm nay, hôm qua, 7 ngày, tháng này, tháng trước, tùy chọn; lọc tuyến, người bán. So sánh với kỳ trước cùng độ dài.
   - Chỉ số: vé bán, doanh thu, đã thu / còn phải thu, lấp đầy ghế, giá TB/vé, vé hủy.
   - Phân tích: doanh thu theo ngày, theo tuyến, theo giờ chạy (giờ đông/vắng để thêm, bớt chuyến), theo người bán, theo hình thức thanh toán,
     điểm đón đông khách, khách quen; chi tiết từng chuyến (bấm để mở chuyến ở Đặt vé). In báo cáo, xuất Excel. ===== */
const BV = {
  k: 'thang', tu: '', den: '', tuyen: '', nb: '',
  range(k) {
    const t = D.today(), ym = D.ymNow(), pm = D.iso(new Date(+ym.slice(0, 4), +ym.slice(5) - 2, 1)).slice(0, 7);
    if (k === 'homnay') return [t, t]; if (k === 'homqua') { const y = D.add(t, -1); return [y, y]; }
    if (k === '7ngay') return [D.add(t, -6), t]; if (k === 'thangtruoc') return [pm + '-01', pm + '-' + String(D.daysIn(pm)).padStart(2, '0')];
    if (k === 'tuychon') return [BV.tu || D.add(t, -6), BV.den || t];
    return [ym + '-01', ym + '-' + String(D.daysIn(ym)).padStart(2, '0')];
  },
  coc: b => b.tt === 'tra' ? dvTot(b) : Math.min(+b.coc || 0, dvTot(b)),
  seller: b => b.nguoiBan || ((b.lichSu || [])[0] || {}).nguoi || 'Không rõ',
  calc(a, z) {
    const T = (DB.lichchay || []).filter(l => l.ngay >= a && l.ngay <= z && (!BV.tuyen || l.tuyen === BV.tuyen)), tid = new Set(T.map(l => l.id));
    const all = (DB.datve || []).filter(b => tid.has(b.chuyen) && (!BV.nb || BV.seller(b) === BV.nb)), B = all.filter(b => !b.huy), H = all.filter(b => b.huy);
    const run = T.filter(l => dvBook(l.id).length), cap = run.reduce((s, l) => s + (dvCap(l) || 0), 0);
    const dt = sum(B, dvTot), thu = sum(B, BV.coc);
    return { a, z, T, B, H, run, cap, dt, thu, con: dt - thu, ld: cap ? B.length / cap * 100 : null, tb: B.length ? dt / B.length : 0, tlh: all.length ? H.length / all.length * 100 : 0 };
  },
  prev(a, z) { const n = D.diff(z, a) + 1; return [D.add(a, -n), D.add(a, -1)]; },
  grp(L, f) { const m = new Map(); L.forEach(x => { const k = f(x); if (!m.has(k)) m.set(k, []); m.get(k).push(x); }); return m; },
  data() {
    const [a, z] = BV.range(BV.k), c = BV.calc(a, z), p = BV.calc(...BV.prev(a, z)), trip = id => c.T.find(l => l.id === id) || {};
    const days = []; for (let d = a; d <= z; d = D.add(d, 1)) days.push(d);
    const byDay = days.map(d => { const L = c.B.filter(b => trip(b.chuyen).ngay === d); return { d, n: L.length, dt: sum(L, dvTot) }; });
    const byRoute = [...BV.grp(c.T, l => l.tuyen || '—')].map(([r, T]) => { const ids = new Set(T.map(l => l.id)), L = c.B.filter(b => ids.has(b.chuyen)), run = T.filter(l => dvBook(l.id).length), cap = run.reduce((s, l) => s + (dvCap(l) || 0), 0), dt = sum(L, dvTot), thu = sum(L, BV.coc); return { tuyen: r, ch: T.length, chk: run.length, ve: L.length, ld: cap ? L.length / cap * 100 : null, dt, thu, con: dt - thu }; }).sort((x, y) => y.dt - x.dt);
    const byHour = [...BV.grp(c.T, l => (l.tuyen || '—') + '|' + (l.gio || ''))].map(([k, T]) => { const [tuyen, gio] = k.split('|'), ve = sum(T, l => dvBook(l.id).length), cap = sum(T, l => dvCap(l) || 0); return { tuyen, gio, ch: T.length, ve, tbc: T.length ? ve / T.length : 0, ld: cap ? ve / cap * 100 : null }; }).sort((x, y) => (x.tuyen + x.gio).localeCompare(y.tuyen + y.gio, 'vi'));
    const bySeller = [...BV.grp(c.B.concat(c.H), BV.seller)].map(([n, L]) => { const A = L.filter(b => !b.huy); return { n, ve: A.length, dt: sum(A, dvTot), huy: L.length - A.length }; }).sort((x, y) => y.dt - x.dt);
    const HT = Object.fromEntries(DV_HTTT.map(h => [h.value, h.label])), pay = { tra: {}, coc: 0, chua: 0 };
    c.B.forEach(b => { if (b.tt === 'tra') { const k = HT[b.httt] ? b.httt : ''; pay.tra[k] = (pay.tra[k] || 0) + dvTot(b); } else { pay.coc += Math.min(+b.coc || 0, dvTot(b)); pay.chua += dvTot(b) - Math.min(+b.coc || 0, dvTot(b)); } });
    const payRows = [...Object.entries(pay.tra).map(([k, v]) => ({ t: 'Đã thu · ' + (k ? HT[k] : 'chưa ghi hình thức'), v, c: 'ok' })), { t: 'Tiền cọc', v: pay.coc, c: 'coc' }, { t: 'Chưa thu (tài xế / quầy thu sau)', v: pay.chua, c: 'chua' }].filter(x => x.v);
    const top = (f, n) => [...BV.grp(c.B.filter(b => f(b)), f)].map(([k, L]) => ({ k, n: L.length, dt: sum(L, dvTot) })).sort((x, y) => y.n - x.n).slice(0, n);
    const kh = [...BV.grp(c.B.filter(b => String(b.sdt || '').replace(/\D/g, '').length >= 9), b => String(b.sdt).replace(/\D/g, ''))].map(([s, L]) => ({ sdt: s, ten: L[L.length - 1].ten || '', n: L.length, dt: sum(L, dvTot), ch: new Set(L.map(b => b.chuyen)).size })).filter(x => x.ch > 1 || x.n > 2).sort((x, y) => y.n - x.n).slice(0, 10);
    const trips = c.T.map(l => { const L = dvBook(l.id).filter(b => !BV.nb || BV.seller(b) === BV.nb), dt = sum(L, dvTot), thu = sum(L, BV.coc), cap = dvCap(l) || 0; return { id: l.id, ngay: l.ngay, gio: l.gio, tuyen: l.tuyen, xe: lcXe(l).bks || '', ve: L.length, cap, ldTxt: cap ? Math.round(L.length / cap * 100) + '%' : '—', dt, thu, con: dt - thu }; }).sort((x, y) => (x.ngay + x.gio).localeCompare(y.ngay + y.gio));
    return { a, z, c, p, byDay, byRoute, byHour, bySeller, payRows, don: top(b => b.diemDon, 10), tra: top(b => b.diemTra, 10), kh, trips };
  },
  html() {
    const d = BV.data(), c = d.c, p = d.p, m = v => F.money(Math.round(v)), pct = v => v == null ? '—' : v.toFixed(0) + '%';
    const dlt = (v, o) => { if (!o) return v ? '<em class="up">mới</em>' : ''; const r = (v - o) / o * 100; return `<em class="${r >= 0 ? 'up' : 'dn'}">${r >= 0 ? '▲' : '▼'} ${Math.abs(r).toFixed(0)}%</em>`; };
    const kpi = (t, v, s, x) => `<div class="bv-k ${x || ''}"><small>${t}</small><b>${v}</b><span>${s || ''}</span></div>`;
    const routes = [...new Set((DB.lichchay || []).map(l => l.tuyen).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi'));
    const sellers = [...new Set((DB.datve || []).map(BV.seller))].sort((a, b) => a.localeCompare(b, 'vi'));
    const mx = Math.max(1, ...d.byDay.map(x => x.dt)), bar = (v, max, cls) => `<i class="bv-pb ${cls || ''}" style="width:${Math.max(2, Math.round(v / max * 100))}%"></i>`;
    const card = (t, sub, body) => `<div class="card bv-c"><div class="card-h"><h3>${t}</h3>${sub ? `<span class="sub">${sub}</span>` : ''}</div><div class="card-b">${body}</div></div>`;
    const tbl = (head, rows, empty) => rows.length ? `<div class="tbl-wrap"><table class="tbl compact"><thead><tr>${head}</tr></thead><tbody>${rows.join('')}</tbody></table></div>` : `<p class="muted small">${empty || 'Chưa có dữ liệu.'}</p>`;
    const ldCls = v => v == null ? '' : v >= 80 ? 'hi' : v < 40 ? 'lo' : '';
    const K = [['homnay', 'Hôm nay'], ['homqua', 'Hôm qua'], ['7ngay', '7 ngày'], ['thang', 'Tháng này'], ['thangtruoc', 'Tháng trước'], ['tuychon', 'Tùy chọn']];
    return `<div class="bv-bar"><div class="bv-seg">${K.map(([k, t]) => `<button type="button" class="${BV.k === k ? 'on' : ''}" data-bv="k" data-v="${k}">${t}</button>`).join('')}</div>
      ${BV.k === 'tuychon' ? `<label class="bv-f">Từ <input type="date" class="inp" data-bvf="tu" value="${d.a}"></label><label class="bv-f">đến <input type="date" class="inp" data-bvf="den" value="${d.z}"></label>` : ''}
      <select class="inp bv-s" data-bvf="tuyen"><option value="">Tất cả tuyến</option>${routes.map(r => `<option ${r === BV.tuyen ? 'selected' : ''}>${esc(r)}</option>`).join('')}</select>
      <select class="inp bv-s" data-bvf="nb"><option value="">Tất cả người bán</option>${sellers.map(r => `<option ${r === BV.nb ? 'selected' : ''}>${esc(r)}</option>`).join('')}</select>
      <span class="grow"></span><button class="btn" data-bv="print">${ic('printer')} In</button><button class="btn" data-bv="xls">${ic('file')} Excel</button></div>
      <div class="bv-per">Kỳ báo cáo: <b>${F.date(d.a)}${d.a !== d.z ? ' – ' + F.date(d.z) : ''}</b> · so với kỳ trước ${F.date(p.a)}${p.a !== p.z ? ' – ' + F.date(p.z) : ''}</div>
      <div class="bv-kp">
        ${kpi('Vé bán', F.num(c.B.length) + dlt(c.B.length, p.B.length), `${c.run.length}/${c.T.length} chuyến có khách`)}
        ${kpi('Doanh thu', m(c.dt) + dlt(c.dt, p.dt), 'giá vé + phụ thu, không tính vé hủy', 'pri')}
        ${kpi('Đã thu / cọc', m(c.thu), c.dt ? Math.round(c.thu / c.dt * 100) + '% doanh thu' : '', 'ok')}
        ${kpi('Còn phải thu', m(c.con), 'tài xế hoặc quầy thu sau', c.con ? 'warn' : '')}
        ${kpi('Lấp đầy ghế', pct(c.ld), 'trên các chuyến có khách', ldCls(c.ld))}
        ${kpi('Giá TB / vé', m(c.tb), '')}
        ${kpi('Vé hủy', F.num(c.H.length), pct(c.tlh) + ' số vé đặt', c.tlh > 15 ? 'bad' : '')}
      </div>
      ${d.byDay.length > 1 ? card('Doanh thu theo ngày', 'Cột dài nhất = ' + m(mx) + 'đ', `<div class="bv-days">${d.byDay.map(x => `<div class="bv-d${x.d === D.today() ? ' td' : ''}" title="${F.date(x.d)}: ${x.n} vé · ${m(x.dt)}đ"><i style="height:${Math.max(2, Math.round(x.dt / mx * 100))}%"></i><span>${d.byDay.length <= 14 || +x.d.slice(8) === 1 || +x.d.slice(8) % 5 === 0 ? +x.d.slice(8) : ''}</span></div>`).join('')}</div>`) : ''}
      <div class="bv-g2">
        ${card('Theo tuyến', '', tbl('<th>Tuyến</th><th class="r">Chuyến</th><th class="r">Vé</th><th>Lấp đầy</th><th class="r">Doanh thu</th><th class="r">Còn thu</th>', d.byRoute.map(r => `<tr><td><b>${esc(r.tuyen)}</b></td><td class="r">${r.chk}/${r.ch}</td><td class="r">${r.ve}</td><td class="bv-pc ${ldCls(r.ld)}">${r.ld == null ? '—' : bar(r.ld, 100) + '<b>' + pct(r.ld) + '</b>'}</td><td class="r"><b>${m(r.dt)}</b></td><td class="r">${r.con ? m(r.con) : '—'}</td></tr>`)))}
        ${card('Thanh toán', 'Tiền theo hình thức', d.payRows.length ? d.payRows.map(x => `<div class="bv-pay ${x.c}"><span>${esc(x.t)}</span><b>${m(x.v)}</b>${bar(x.v, Math.max(...d.payRows.map(y => y.v)), x.c)}</div>`).join('') : '<p class="muted small">Chưa có dữ liệu.</p>')}
      </div>
      ${card('Theo giờ chạy', 'Xanh: đông khách (≥80%), đỏ: vắng (<40%) · cân nhắc thêm, bớt chuyến', tbl('<th>Tuyến</th><th>Giờ</th><th class="r">Chuyến</th><th class="r">Vé</th><th class="r">TB vé/chuyến</th><th>Lấp đầy</th>', d.byHour.map(r => `<tr><td>${esc(r.tuyen)}</td><td><b>${esc(r.gio)}</b></td><td class="r">${r.ch}</td><td class="r">${r.ve}</td><td class="r">${r.tbc.toFixed(1)}</td><td class="bv-pc ${ldCls(r.ld)}">${r.ld == null ? '—' : bar(r.ld, 100) + '<b>' + pct(r.ld) + '</b>'}</td></tr>`)))}
      <div class="bv-g2">
        ${card('Theo người bán', '', tbl('<th>Người bán</th><th class="r">Vé</th><th class="r">Doanh thu</th><th class="r">Vé hủy</th>', d.bySeller.map(r => `<tr><td>${esc(r.n)}</td><td class="r">${r.ve}</td><td class="r"><b>${m(r.dt)}</b></td><td class="r">${r.huy || '—'}</td></tr>`)))}
        ${card('Khách quen', 'Đi nhiều chuyến trong kỳ', tbl('<th>Khách</th><th class="r">Vé</th><th class="r">Chuyến</th><th class="r">Tiền</th>', d.kh.map(r => `<tr><td><b>${esc(r.ten || '')}</b> <a href="tel:${esc(r.sdt)}" class="small">${esc(r.sdt)}</a></td><td class="r">${r.n}</td><td class="r">${r.ch}</td><td class="r">${m(r.dt)}</td></tr>`), 'Chưa có khách đi từ 2 chuyến trở lên.'))}
      </div>
      <div class="bv-g2">
        ${card('Điểm đón đông khách', '', tbl('<th>Điểm đón</th><th class="r">Khách</th><th class="r">Tiền</th>', d.don.map(r => `<tr><td>${esc(r.k)}</td><td class="r">${r.n}</td><td class="r">${m(r.dt)}</td></tr>`), 'Vé chưa ghi điểm đón.'))}
        ${card('Điểm trả đông khách', '', tbl('<th>Điểm trả</th><th class="r">Khách</th><th class="r">Tiền</th>', d.tra.map(r => `<tr><td>${esc(r.k)}</td><td class="r">${r.n}</td><td class="r">${m(r.dt)}</td></tr>`), 'Vé chưa ghi điểm trả.'))}
      </div>
      <details class="card bv-c bv-det"${d.trips.length <= 40 ? ' open' : ''}><summary class="card-h"><h3>Chi tiết từng chuyến (${d.trips.length})</h3><span class="sub">Bấm một chuyến để mở ở Đặt vé</span></summary><div class="card-b p0">${tbl('<th>Ngày</th><th>Giờ</th><th>Tuyến</th><th>Xe</th><th class="r">Vé/ghế</th><th class="r">Doanh thu</th><th class="r">Đã thu</th><th class="r">Còn thu</th>', d.trips.map(r => `<tr class="bv-tr" data-bv="go" data-id="${esc(r.id)}" data-d="${r.ngay}"><td>${F.date(r.ngay)}</td><td><b>${esc(r.gio)}</b></td><td>${esc(r.tuyen)}</td><td>${esc(r.xe || '—')}</td><td class="r">${r.ve}/${r.cap || '?'}</td><td class="r"><b>${r.dt ? m(r.dt) : '—'}</b></td><td class="r">${r.thu ? m(r.thu) : '—'}</td><td class="r">${r.con ? m(r.con) : '—'}</td></tr>`), 'Không có chuyến trong kỳ.')}</div></details>
      <div class="small muted" style="margin:8px 2px 20px">Tính theo ngày chạy của chuyến. Doanh thu = giá vé + phụ thu của vé chưa hủy. Đã thu = vé đã thu tiền + tiền cọc. Lấp đầy = số vé / số ghế của các chuyến có khách.</div>`;
  },
  cols: [{ key: 'ngay', label: 'Ngày', fmt: 'date' }, { key: 'gio', label: 'Giờ' }, { key: 'tuyen', label: 'Tuyến' }, { key: 'xe', label: 'Xe' }, { key: 've', label: 'Vé', fmt: 'num', sum: true }, { key: 'cap', label: 'Ghế', fmt: 'num' }, { key: 'ldTxt', label: 'Lấp đầy' }, { key: 'dt', label: 'Doanh thu', fmt: 'money', sum: true }, { key: 'thu', label: 'Đã thu', fmt: 'money', sum: true }, { key: 'con', label: 'Còn thu', fmt: 'money', sum: true }],
  act(a, b) {
    if (a === 'k') { BV.k = b.dataset.v; return App.render(); }
    if (a === 'go') { LC._tgt = 'lichchay'; LC.ngay = b.dataset.d; LC._tgt = null; DV.trip = b.dataset.id; DV.tab = 'ghe'; return App.go('lichchay'); }
    const d = BV.data(), sub = F.date(d.a) + (d.a !== d.z ? ' – ' + F.date(d.z) : '') + (BV.tuyen ? ' · ' + BV.tuyen : '') + (BV.nb ? ' · người bán ' + BV.nb : ''), c = d.c;
    const sumHTML = `<table class="pr-t" style="margin:6px 0 10px"><tr><td>Vé bán: <b>${F.num(c.B.length)}</b></td><td>Doanh thu: <b>${F.money(c.dt)}</b></td><td>Đã thu/cọc: <b>${F.money(c.thu)}</b></td><td>Còn phải thu: <b>${F.money(c.con)}</b></td><td>Lấp đầy: <b>${c.ld == null ? '—' : c.ld.toFixed(0) + '%'}</b></td><td>Vé hủy: <b>${c.H.length}</b></td></tr></table>`;
    if (a === 'print') return Print.report({ title: 'BÁO CÁO TÌNH HÌNH BÁN VÉ', sub, cols: BV.cols, rows: d.trips, landscape: true, before: sumHTML, signs: ['Người lập biểu', 'Kế toán', 'Giám đốc'] });
    if (a === 'xls') return XLSX.save('Bao cao ban ve ' + d.a + (d.a !== d.z ? '_' + d.z : ''), [
      xSheet('Theo chuyến', 'BÁO CÁO BÁN VÉ THEO CHUYẾN · ' + sub, BV.cols, d.trips),
      xSheet('Theo tuyến', 'BÁN VÉ THEO TUYẾN · ' + sub, [{ key: 'tuyen', label: 'Tuyến' }, { key: 'ch', label: 'Chuyến', fmt: 'num', sum: true }, { key: 'chk', label: 'Chuyến có khách', fmt: 'num', sum: true }, { key: 've', label: 'Vé', fmt: 'num', sum: true }, { key: 'ldTxt', label: 'Lấp đầy' }, { key: 'dt', label: 'Doanh thu', fmt: 'money', sum: true }, { key: 'thu', label: 'Đã thu', fmt: 'money', sum: true }, { key: 'con', label: 'Còn thu', fmt: 'money', sum: true }], d.byRoute.map(r => ({ ...r, ldTxt: r.ld == null ? '—' : r.ld.toFixed(0) + '%' }))),
      xSheet('Theo giờ chạy', 'BÁN VÉ THEO GIỜ CHẠY · ' + sub, [{ key: 'tuyen', label: 'Tuyến' }, { key: 'gio', label: 'Giờ' }, { key: 'ch', label: 'Chuyến', fmt: 'num' }, { key: 've', label: 'Vé', fmt: 'num' }, { key: 'tb', label: 'TB vé/chuyến' }, { key: 'ldTxt', label: 'Lấp đầy' }], d.byHour.map(r => ({ ...r, tb: r.tbc.toFixed(1), ldTxt: r.ld == null ? '—' : r.ld.toFixed(0) + '%' }))),
      xSheet('Theo người bán', 'BÁN VÉ THEO NGƯỜI BÁN · ' + sub, [{ key: 'n', label: 'Người bán' }, { key: 've', label: 'Vé', fmt: 'num', sum: true }, { key: 'dt', label: 'Doanh thu', fmt: 'money', sum: true }, { key: 'huy', label: 'Vé hủy', fmt: 'num', sum: true }], d.bySeller)]);
  }
};
const vBV = {
  title: 'Báo cáo bán vé', label: 'Báo cáo bán vé', icon: 'chart', print: false, desc: 'Doanh thu, số vé, lấp đầy ghế, đã thu/còn thu theo ngày, tuyến, giờ chạy, người bán; so với kỳ trước',
  render(el) {
    if (DRV.on()) { el.innerHTML = '<div class="empty">Báo cáo bán vé dành cho quầy vé, điều hành và quản lý.</div>'; return; }
    el.innerHTML = `<div class="bv">${BV.html()}</div>`;
    el.onclick = e => { const b = e.target.closest && e.target.closest('[data-bv]'); if (!b) return; e.preventDefault(); try { BV.act(b.dataset.bv, b); } catch (x) { toast('Lỗi: ' + x.message, 'err', 6000); } };
    el.onchange = e => { const f = e.target.closest && e.target.closest('[data-bvf]'); if (!f) return; BV[f.dataset.bvf] = f.value; App.render(); };
  }
};
addCSS(`.bv-bar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:8px}.bv-seg{display:flex;background:#f1f5f9;border-radius:12px;padding:3px;gap:2px;flex-wrap:wrap}.bv-seg button{border:0;background:none;padding:7px 12px;border-radius:9px;font:600 13px system-ui;color:#475569;cursor:pointer}.bv-seg button.on{background:#fff;color:#1e293b;box-shadow:0 1px 3px rgba(0,0,0,.12)}
.bv-f{display:flex;align-items:center;gap:6px;font-size:13px}.bv-s{max-width:220px}.bv-per{font-size:13px;color:#64748b;margin:2px 2px 10px}
.bv-kp{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:14px}.bv-k{background:#fff;border:1px solid var(--line,#e5e7eb);border-radius:14px;padding:12px 14px}.bv-k small{display:block;color:#667085;font-weight:600}.bv-k b{display:block;font-size:21px;margin:3px 0;white-space:nowrap}.bv-k b em{font-style:normal;font-size:12px;margin-left:6px;vertical-align:middle}.bv-k span{font-size:12px;color:#667085}
.bv-k.pri{background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;border:0}.bv-k.pri small,.bv-k.pri span{color:rgba(255,255,255,.85)}.bv-k.ok b{color:#15803d}.bv-k.warn b{color:#c2410c}.bv-k.bad b{color:#b91c1c}.bv-k.hi b{color:#15803d}.bv-k.lo b{color:#b91c1c}
em.up{color:#16a34a}em.dn{color:#dc2626}.bv-k.pri em.up,.bv-k.pri em.dn{color:#fff;background:rgba(255,255,255,.2);border-radius:6px;padding:0 5px}
.bv-c{margin-bottom:14px}.bv-g2{display:grid;grid-template-columns:1fr 1fr;gap:14px}.bv-g2>.bv-c{min-width:0}@media(max-width:900px){.bv-g2{grid-template-columns:1fr}}
.bv-days{display:flex;align-items:flex-end;gap:3px;height:150px;padding-top:6px}.bv-d{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;min-width:0}.bv-d i{display:block;width:100%;max-width:26px;background:linear-gradient(180deg,#818cf8,#4f46e5);border-radius:5px 5px 2px 2px}.bv-d.td i{background:linear-gradient(180deg,#34d399,#059669)}.bv-d span{font-size:10.5px;color:#64748b;margin-top:3px}
.bv-pc{min-width:110px;white-space:nowrap}.bv-pc .bv-pb{display:inline-block;height:8px;width:60px;vertical-align:middle;margin-right:6px}.bv-pb{display:block;height:8px;border-radius:5px;background:#6366f1}.bv-pc.hi .bv-pb{background:#16a34a}.bv-pc.lo .bv-pb{background:#dc2626}.bv-pc.hi b{color:#15803d}.bv-pc.lo b{color:#b91c1c}
.bv-pay{display:grid;grid-template-columns:1fr auto;gap:2px 10px;margin:0 0 12px;font-size:13.5px}.bv-pay .bv-pb{grid-column:1/-1}.bv-pay.ok .bv-pb{background:#16a34a}.bv-pay.coc .bv-pb{background:#f97316}.bv-pay.chua .bv-pb{background:#dc2626}
.bv-det summary{cursor:pointer;list-style:none}.bv-tr{cursor:pointer}.bv-tr:hover td{background:#eef2ff}
@media(max-width:600px){.bv-kp{grid-template-columns:1fr 1fr;gap:8px}.bv-k{padding:10px 12px}.bv-days{height:110px;gap:1px}.bv-k b{font-size:18px}.bv-s{max-width:none;flex:1}}`);
MODL.def('baocaove', vBV);
