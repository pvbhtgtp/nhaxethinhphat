'use strict';
/* Module Đặt vé (màn hình đặt vé, sơ đồ ghế, danh sách khách, gọi khách); dữ liệu chuyến/vé, đồng bộ vé, lệnh vận chuyển ở index · tải khi mở màn hình (MODL). */
const lcRows = () => DB.lichchay.filter(l => l.ngay === lcDay() && (!dvRoute() || l.tuyen === dvRoute())).sort((a, b) => String(a.tuyen).localeCompare(String(b.tuyen), 'vi') || String(a.gio).localeCompare(String(b.gio)));
const lcCols = [
  { key: 'tuyen', label: 'Tuyến', render: l => `<b>${esc(l.tuyen)}</b>` },
  { key: 'gio', label: 'Giờ', align: 'c', val: l => l.gio + (lcGone(l) ? ' · Đã xuất bến' : ''), render: l => `<b>${esc(l.gio)}</b>${lcGone(l) ? '<br><span class="badge b-gray">Đã xuất bến</span>' : ''}` },
  { key: 'bks', label: 'Số xe', val: l => lcXe(l).bks || '', render: l => lcXe(l).bks ? `<b>${esc(lcXe(l).bks)}</b>` : '<span class="muted">Chưa gán</span>' },
  { key: 'lai', label: 'Tên lái xe', val: l => lcEmp(l).ten || '', render: l => lcEmp(l).ten ? esc(lcEmp(l).ten) : '<span class="muted">Chưa gán</span>' },
  { key: 'sdt', label: 'Số điện thoại', val: l => lcEmp(l).sdt || '' },
  { key: 'hang', label: 'Hạng bằng', align: 'c', val: l => lcEmp(l).bangHang || '' },
  { key: 'soBang', label: 'Số bằng', val: l => lcEmp(l).bangSo || '' },
  { key: 'hetHan', label: 'Hết hạn bằng', align: 'c', val: l => lcEmp(l).bangHetHan ? F.date(lcEmp(l).bangHetHan) : '', render: l => { const e = lcEmp(l); return e.bangHetHan ? F.date(e.bangHetHan) + ' ' + gplxBadge(e) : ''; } },
  { key: 'soChuyen', label: 'Số chuyến', align: 'c', fmt: 'num', sum: true },
  { key: 'tienCong', label: 'Tiền công', fmt: 'money', sum: true },
  { key: 'nguoiCham', label: 'Người chấm công' }
];
const vLC = {
  printLabel: () => DV.tab === 'lt' ? 'In' : PM.label(dvCur()),
  title: 'Đặt vé', icon: 'calendar', desc: 'Chọn ngày và chuyến, đặt vé theo sơ đồ ghế; quản lý lịch chạy từng ngày: tuyến, giờ, xe, lái xe',
  tools: () => `${VT.pick()}${Auth.can('lichchay', 'edit') ? `<button class="btn" data-act="gcSet" title="Nhắc và tự nhả vé giữ chỗ chưa thu tiền">${ic('clock')} Giữ chỗ</button>` : ''}<button class="btn pri" data-act="lcAdd">${ic('plus')} Thêm chuyến</button>`,
  render(el) { vDV.render(el); },
  renderTable(el, embed) {
    const day = lcDay(), L = lcRows(), dw = D.dowName[D.parse(day).getDay()];
    const tot = sum(L, l => l.tienCong), nUn = L.filter(l => !l.xeId || !l.laiXe).length;
    const days = DB.lichchay.filter(l => l.ngay.slice(0, 7) === day.slice(0, 7));
    el.insertAdjacentHTML('beforeend', `<div class="row wrap" style="gap:8px;margin-bottom:12px;align-items:center"><button class="btn sm" data-act="lcNav" data-n="-1">${ic('back')}</button><input type="date" class="inp" id="lcDate" value="${day}" style="width:auto"><button class="btn sm" data-act="lcNav" data-n="1" style="transform:none"><span style="display:inline-block;transform:scaleX(-1);line-height:0">${ic('back')}</span></button><button class="btn sm" data-act="lcNav" data-n="0">Hôm nay</button><b>${dw}, ${F.date(day)}</b><span class="grow"></span><span class="muted small">Tháng ${day.slice(5, 7)}: ${days.length} chuyến · ${F.money(sum(days, l => l.tienCong))}</span></div><div id="lcT"></div>`);
    if (embed) { const b = el.querySelector('.row.wrap'); if (b) b.remove(); }
    const di = $('#lcDate', el); if (di) di.onchange = () => { if (di.value) { LC.ngay = di.value; App.render(); } };
    table($('#lcT', el), {
      id: 'lc', columns: lcCols, rows: L, ph: 'Tìm tuyến, giờ, số xe, lái xe...', empty: 'Ngày này chưa có lịch chạy. Bấm "Tạo lịch từ Giờ chạy" hoặc "Thêm chuyến".', onRow: lcForm,
      searchText: l => [l.tuyen, l.gio, lcXe(l).bks, lcEmp(l).ten, lcEmp(l).sdt].join(' '),
      tools: `<span class="badge b-green">${L.length} chuyến</span>${nUn ? `<span class="badge b-amber">${nUn} chuyến chưa gán đủ xe và lái xe</span>` : ''}<span class="badge b-blue">Tổng tiền công ${F.money(tot)}</span><span class="grow"></span><span class="muted small">Bấm vào dòng để sửa</span>`,
      rowClass: l => lcGone(l) ? 'veh-off' : '',
      actions: l => lcCan(l) ? `<button class="ibtn" data-act="lcQuick" data-id="${l.id}" data-tip="Sửa nhanh xe, lái xe">${ic('edit')}</button>` + rowBtns(l.id, 'lcEdit', 'lcDel') : ''
    });
  },
  excel() { if (DV.tab !== 'lt') return vDV.excel(); XLSX.save('Lich chay ' + lcDay(), [xSheet('Lịch chạy', 'LỊCH CHẠY NGÀY ' + F.date(lcDay()), lcCols, lcRows())]); },
  print() { if (DV.tab !== 'lt') return vDV.print(); Print.report({ title: 'Lịch chạy ngày ' + F.date(lcDay()), cols: lcCols.map(c => c.key === 'hetHan' ? { ...c, render: null } : c), rows: lcRows(), landscape: true, signs: ['Người chấm công', 'Điều hành', 'Giám đốc'] }); }
};
const dvHuy = id => DB.datve.filter(b => b.chuyen === id && b.huy).sort((a, b) => String(b.huy.tg).localeCompare(String(a.huy.tg)));
function dvHuyHTML(cur) {
  const H = dvHuy(cur.id); if (!H.length) return '';
  const free = g => !dvBook(cur.id).some(x => x.ghe === g), can = Auth.can('lichchay', 'edit') && lcCan(cur);
  return `<div class="dv-huy"><div class="dv-huy-h">Vé hủy <b>${H.length}</b></div><div class="dv-huy-g">${H.map(b => `<div class="dv-hv" style="${dvHvCol(b)}" data-act="dvHuyLs" data-id="${b.id}" title="Bấm để xem lịch sử vé"><div class="hv-t"><b>${esc(b.ghe)}</b><span>${F.money(b.gia || 0)}đ</span></div><div class="hv-l">${esc(b.ten || '')}${b.sdt ? ' · ' + esc(b.sdt) : ''}</div><div class="hv-l">${esc(b.diemDon || '')}${b.diemDon || b.diemTra ? ' → ' : ''}${esc(b.diemTra || '')}</div><div class="hv-m">Đặt: ${esc(b.nguoiBan || '—')} · ${dvLog.fmt(b.tg)}<br>Hủy: <b>${esc(b.huy.nguoi || '—')}</b> · ${dvLog.fmt(b.huy.tg)}</div><div class="hv-ls">${ic('clock')} Xem lịch sử</div><div class="hv-a">${can && free(b.ghe) ? `<button class="btn sm" data-act="dvRestore" data-id="${b.id}">Khôi phục</button>` : can ? '<span class="muted small">Ghế đã có người</span>' : ''}${lcAdmin() ? `<button class="btn sm danger" data-act="dvPurge" data-id="${b.id}">${ic('trash')} Xóa hẳn</button>` : ''}</div></div>`).join('')}</div></div>`;
}
function dvActBar(cur) {
  if (DV.mvMode && cur && DB.datve.some(x => x.id === DV.mvMode.id && x.chuyen === cur.id)) return dvMvBar();
  const b = DV.selB && DB.datve.find(x => x.id === DV.selB && !x.huy && cur && x.chuyen === cur.id);
  if (!b) return '';
  const GA = dvGrp(b), one = DV.one === b.id && GA.length > 1, G = one ? [b] : GA, tel = String(b.sdt || '').replace(/[^0-9+]/g, ''), ok = Auth.can('lichchay', 'edit') && lcCan(cur), all = (k, v) => G.every(x => !!x[k] === v);
  const paid = G.every(x => x.tt === 'tra'), xn = all('xn', true), len = all('len', true);
  const btn = (k, ico, lb, cls = '', on = false) => `<button type="button" class="ab ${cls}${on ? ' on' : ''}" data-act="dvBA" data-k="${k}">${ic(ico)}<span>${lb}</span></button>`;
  return `<div class="dv-selbar ab-bar"><div class="ab-h"><button class="sb-x" data-act="dvClearSel" aria-label="Bỏ chọn">${ic('x')}</button><div class="sb-t grow"><span>${one ? 'Vé lẻ trong đoàn ' + GA.length + ' vé · ghế' : G.length > 1 ? G.length + ' vé:' : 'Vé:'}</span> <b>${esc(dvSeatsTxt(G))}</b> · ${esc(b.ten)}${b.ma ? ` <span class="dv-ma">${esc(b.ma)}</span>` : ''}${paid ? ' <em class="ab-p">Đã thu</em>' : ''}${xn ? ' <em class="ab-p">Đã xác nhận</em>' : ''}${len ? ' <em class="ab-p">Đã lên xe</em>' : ''} ${callTag(b)}</div><span class="ab-pr">${F.money(sum(G, x => dvTot(x)))}</span></div>
    <div class="ab-ph">${tel ? `<button type="button" class="ab-tel" data-act="dvCall" data-p="${esc(tel)}" data-id="${b.id}">${ic('phone')} ${esc(b.sdt)}</button>` : '<span class="muted">Chưa có SĐT</span>'}<span class="ab-rt">${esc(dvAbbr(b.diemDon) || '—')} → ${esc(dvAbbr(b.diemTra) || '—')}</span></div>
    ${GA.length > 1 ? `<div class="ab-one">${one ? 'Đang chọn 1 vé · chọn vé khác:' : 'Chọn từng vé:'} ${GA.slice().sort((a, c) => String(a.ghe).localeCompare(String(c.ghe), 'vi', { numeric: true })).map(x => `<button type="button" data-act="dvOne" data-id="${x.id}" class="${one && x.id === b.id ? 'on' : ''}" title="${esc((x.ten || '') + (x.sdt ? ' · ' + x.sdt : ''))}">${esc(x.ghe)}</button>`).join('')}</div>` : ''}
    <div class="ab-row">${btn('sua', 'edit', ok ? (G.length > 1 ? 'Sửa cả đoàn' : one ? 'Sửa vé này' : 'Sửa') : 'Xem')}${ok ? btn('huy', 'x', 'Hủy vé', 'red') + btn('tra', 'wallet', paid ? 'Bỏ thu tiền' : 'Thanh toán', '', paid) + btn('xn', 'check', 'Xác nhận', '', xn) + btn('len', 'user', 'Lên xe', '', len) + btn('doi', 'refresh', 'Chuyển vé') + btn('sc', 'copy', 'Sao chép vé') + btn('kh', 'refresh', 'Khứ hồi') : ''}${btn('in', 'printer', 'In vé')}${btn('tc', 'printer', 'In T/C')}${btn('ls', 'clock', 'Lịch sử')}${btn('cp', 'copy', 'Chép thông tin')}</div></div><div class="dv-selpad ab-pad"></div>`;
}
function dvMvBar() {
  const b = DB.datve.find(x => x.id === DV.mvMode.id); if (!b) return '';
  const G = dvGrp(b), k = DV.mvMode.picks.length;
  return `<div class="dv-selbar ab-bar mv-bar"><div class="ab-h"><button class="sb-x" data-act="dvMvCancel" aria-label="Thoát">${ic('x')}</button><div class="sb-t grow"><span>Chuyển ${G.length > 1 ? G.length + ' vé' : 'vé'}:</span> <b>${esc(dvSeatsTxt(G))}</b> · ${esc(b.ten)}</div></div>
    <div class="ab-ph"><span class="mv-hint">${G.length > 1 ? `Chọn ${G.length} ghế trống (đã chọn ${k}/${G.length}: ${esc(DV.mvMode.picks.join(', ') || '—')})` : 'Chạm ghế trống để chuyển tới, hoặc chạm vé khác để đổi chỗ'}</span><button class="sb-st" data-act="dvMvOther">Giờ / ngày khác</button></div></div><div class="dv-selpad ab-pad" style="height:96px!important"></div>`;
}
function dvPkBar(cur) {
  const L = dvPkList(cur); if (!L.length && !DV.pkMode) return '';
  if (!L.length) return `<div class="dv-selbar pk-bar"><button class="sb-x" data-act="dvPkClear" aria-label="Thoát">${ic('x')}</button><div class="sb-t grow"><span>Chọn nhiều vé:</span> <span class="muted small">chạm vào các vé muốn in</span></div><button class="btn" data-act="dvPkAll">Chọn tất cả</button><button class="btn" data-act="dvPkClear">Thoát</button></div><div class="dv-selpad"></div>`;
  const tot = sum(L, dvTot), un = L.filter(x => x.tt !== 'tra');
  return `<div class="dv-selbar pk-bar"><button class="sb-x" data-act="dvPkClear" aria-label="Bỏ chọn">${ic('x')}</button><div class="sb-t grow"><span>Đã chọn ${L.length} vé:</span> <b>${esc(dvSeatsTxt(L))}</b> <span class="muted small">· ${F.money(tot)} đ${un.length ? ' · ' + un.length + ' vé chưa thu' : ''} · ${DV.pkMode ? 'chạm vé để thêm/bỏ' : 'Ctrl + bấm để thêm/bỏ'}</span></div><button class="btn" data-act="dvPkAll">Chọn tất cả</button><button class="btn pri" data-act="dvPkPrint">${ic('printer')} In ${L.length} vé</button>${DV.pkMode ? '<button class="btn" data-act="dvPkClear">Thoát</button>' : ''}</div><div class="dv-selpad"></div>`;
}
const dvSortGone = L => [...L.filter(l => !lcGone(l)), ...L.filter(l => lcGone(l))];
const dvGoneH = (l, i, A) => lcGone(l) && (i === 0 || !lcGone(A[i - 1])) ? '<div class="dv-gone-h">Đã qua giờ khởi hành</div>' : '';
const callTelCls = b => { try { const x = callLast(b); return x ? ' tel-' + x.kq : ''; } catch (e) { return ''; } };
function callListHTML(cur) {
  const seen = {}, R = [];
  dvBook(cur.id).forEach(b => { const k = b.nhom ? 'g' + b.nhom : b.id; if (seen[k]) return; seen[k] = 1; R.push({ b, G: dvGrp(b) }); });
  const ix = x => { const i = LT.find(cur.tuyen, x.b.diemDon); return i < 0 ? 999 : i; };
  R.sort((a, c) => ix(a) - ix(c) || String(a.b.ghe).localeCompare(String(c.b.ghe), 'vi', { numeric: true }));
  if (!R.length) return '<div class="muted">Chưa có hành khách.</div>';
  const done = R.filter(x => (callLast(x.b) || {}).kq === 'ok').length;
  return `<div class="cl-sum"><b>${done}/${R.length}</b> khách đã gọi xác nhận${R.length - done ? ` · còn <b>${R.length - done}</b> khách` : ''}</div><div class="cl">${R.map(({ b, G }) => { const tel = String(b.sdt || '').replace(/[^0-9+]/g, ''), eta = LT.eta(cur, b.diemDon), x = callLast(b); return `<div class="cl-i${x && x.kq === 'ok' ? ' done' : ''}">
    <div class="cl-h"><b class="cl-g">${esc(dvSeatsTxt(G))}</b><div class="cl-n"><b>${esc(b.ten || 'KHÁCH LẺ')}</b><span>${esc(b.diemDon || 'Chưa ghi điểm đón')}${eta ? ' · ~' + eta : ''}${b.tt !== 'tra' ? ' · <em>chưa thu ' + F.money(sum(G, dvTot)) + 'đ</em>' : ''}</span></div>${tel ? `<a class="btn pri cl-call${callTelCls(b)}" href="tel:${esc(tel)}">${ic('phone')} ${esc(b.sdt)}</a>` : '<span class="muted small">Không có SĐT</span>'}</div>
    ${callTag(b) ? `<div class="cl-st">${callTag(b)}${x && x.note ? ` <span class="muted small">${esc(x.note)}</span>` : ''}</div>` : ''}${callBtns(b)}</div>`; }).join('')}</div>`;
}
/* biểu tượng nhỏ trạng thái vé (lái xe / quầy bấm): đổi màu biểu tượng, không đổi màu chữ cả ô */
/* vé hủy giữ đúng màu như lúc còn trên sơ đồ ghế (giữ chỗ / xác nhận / đã thu / đặt cọc…): đọc màu thật của ô ghế theo giao diện đang dùng */
const dvHvCol = b => { try { const k = (b.tt === 'tra' ? 'pd' : 'bk') + (b.xn ? ' xn' : '') + (typeof PM !== 'undefined' ? PM.sCls(b) : ''), ck = k + '|' + (document.documentElement.dataset.sm || '') + '|' + (document.documentElement.dataset.theme || ''); dvHvCol.c = dvHvCol.c || {}; if (!(ck in dvHvCol.c)) { const w = document.createElement('div'); w.className = 'dv-grid'; w.style.cssText = 'position:absolute;left:-9999px;top:0;visibility:hidden'; w.innerHTML = `<button class="dv-seat ${k}"><span class="by">x</span></button>`; document.body.appendChild(w); const cs = getComputedStyle(w.firstChild); dvHvCol.c[ck] = `background:${cs.backgroundColor};border-color:${cs.borderTopColor};border-style:dashed;color:${cs.color}`; w.remove(); } return dvHvCol.c[ck]; } catch (e) { return ''; } };
const dvSti = b => { const c = typeof callLast === 'function' ? callLast(b) : null, I = [];
  if (c) I.push(['phone', c.kq === 'ok' ? 'ok' : c.kq === 'hl' ? 'wn' : 'bad', (typeof callKQ === 'function' ? callKQ(c.kq).t : 'Đã gọi')]);
  if (b.xn) I.push(['check', 'in', 'Đã xác nhận']);
  if (b.vang) I.push(['x', 'bad', 'Khách vắng']); else if (b.len) I.push(['user', 'ok', 'Đã lên xe']);
  if (b.tt === 'tra') I.push(['wallet', 'ok', 'Đã thu' + (b.httt === 'ck' ? ' (chuyển khoản)' : '')]);
  if (b.daXuong) I.push(['down', 'in', 'Đã trả khách']);
  return I.length ? `<span class="sti">${I.map(([i, c, t]) => `<i class="sti-${c}" title="${esc(t)}">${ic(i)}</i>`).join('')}</span>` : ''; };
const dvQK = (b, t) => { const ok = Auth.can('lichchay', 'edit') && lcCan(t); return `<span class="qk">${DV_QK.filter(q => ok || q[1] === 'sua').map(([c, k, tt]) => `<span class="qk-b${k === 'tra' && b.tt === 'tra' ? ' on' : ''}" data-act="dvQK" data-k="${k}" data-id="${b.id}" title="${tt} (phím ${c})">${c}</span>`).join('')}</span>`; };
const DV_PT = ['#7F77DD', '#1D9E75', '#D85A30', '#D4537E', '#378ADD', '#639922', '#BA7517', '#5F5E5A'];
const dvPtColor = s => { const k = (typeof bgNorm === 'function' ? bgNorm(s) : String(s || '').trim().toLowerCase()); let h = 0; for (const c of k) h = (h * 31 + c.charCodeAt(0)) >>> 0; return DV_PT[h % DV_PT.length]; };
const dvLegend = () => `<div class="dv-lg">${[['e', 'Trống'], ['h', 'Giữ chỗ'], ['c', 'Đã xác nhận'], ['p', 'Đã thu'], ['b', 'Đã lên xe'], ['u', 'Sắp hết hạn giữ'], ['l', 'Người khác đang thao tác'], ['i', 'Đã in vé / phơi'], ['o', 'Sửa sau khi in, cần in lại']].map(([k, t]) => `<span><i class="lg-${k}"></i>${t}</span>`).join('')}<span class="lg-tip">Mẹo: bấm <b>Chọn nhiều</b> hoặc giữ <kbd>Ctrl</kbd> + bấm vào vé để in nhiều vé một lượt</span></div>`;
const dvTabBar = cur => `<div class="dv-tabs">${[['ghe', 'Sơ đồ ghế'], ['goi', 'Gọi khách'], ['hk', 'Hành khách' + (cur ? ` (${dvBook(cur.id).length})` : '')], ['dt', 'Đón / Trả'], ['gh', 'Gửi hàng' + (cur ? ` (${GH.list(cur.id).length})` : '')], ['tk', 'Thống kê'], ['lt', 'Lịch chạy ngày']].map(([k, t]) => `<button class="${DV.tab === k ? 'on' : ''}" data-act="dvTab" data-t="${k}">${t}</button>`).join('')}</div>`;
const vDV = {
  title: 'Đặt vé', icon: 'tag', desc: 'Chọn ngày và chuyến, đặt vé theo sơ đồ ghế, xem hành khách và điểm đón trả',
  tools: () => `<button class="btn" data-act="dvSearch">${ic('search')} Tìm vé</button>${Auth.can('lichchay', 'edit') ? `<button class="btn" data-act="gcSet">${ic('clock')} Giữ chỗ</button>` : ''}`,
  render(el) {
    const day = dvDay(), L = dvTrips(), cur = dvCur(), ym = day.slice(0, 7), nd = D.daysIn(ym), lead = (D.parse(ym + '-01').getDay() + 6) % 7;
    const hasTrip = {}; DB.lichchay.forEach(l => { if (l.ngay.slice(0, 7) === ym) hasTrip[l.ngay] = 1; });
    const cells = [...Array(lead).fill(null), ...Array.from({ length: nd }, (_, i) => ym + '-' + String(i + 1).padStart(2, '0'))];
    const calH = `<div class="row" style="align-items:center;gap:6px"><button class="btn sm" data-act="dvNav" data-n="-1">${ic('back')}</button><b class="grow" style="text-align:center">Tháng ${day.slice(5, 7)}/${day.slice(0, 4)}</b><button class="btn sm" data-act="dvNav" data-n="1"><span style="display:inline-block;transform:scaleX(-1);line-height:0">${ic('back')}</span></button></div>
      <div class="dv-days">${['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(x => `<small style="font-size:11px;color:#98a2b3;padding:2px 0">${x}</small>`).join('')}${cells.map(d => d ? `<button class="dv-d ${d === day ? 'sel' : ''} ${d === D.today() ? 'tod' : ''}" data-act="dvDay" data-d="${d}"><b>${+d.slice(8)}</b>${AL.cell(d)}<small style="height:6px">${hasTrip[d] ? '<span style="display:inline-block;width:5px;height:5px;border-radius:50%;background:' + (d === day ? '#fff' : '#38a3e8') + '"></span>' : ''}</small></button>` : '<span></span>').join('')}</div>${AL.selHTML(day)}`;   // lịch tháng (dùng cho cột trái máy tính và đầu trang điện thoại)
    const side = `<div class="dv-side">${calH}
      <div class="row" style="gap:6px;margin-bottom:10px"><input type="date" class="inp" id="dvDate" value="${day}"><button class="btn sm" data-act="dvDay" data-d="${D.today()}">Hôm nay</button></div>
      ${L.length ? `<div class="dv-trips">${dvSortGone(L).map((l, i, A) => { const n = dvBook(l.id).length, c = dvCap(l), v = lcXe(l); return dvGoneH(l, i, A) + `<button class="dv-t ${l.id === (cur && cur.id) ? 'sel' : ''} ${n >= c ? 'full' : ''}${PM.tCls(l)}" data-act="dvTrip" data-id="${l.id}" title="${esc(l.tuyen)}"><div class="tm">${esc(l.gio)}${PM.tMark(l)}${lcGone(l) ? ' <span class="badge b-gray" style="font-size:9px;font-weight:600">Đã xuất bến</span>' : ''}</div><div class="r"><span><i class="${v.bks ? '' : 'off'}"></i>${esc(String(v.bks || '').replace(/^\d+\w-/, '') || '—')}</span><span>${n}|${c}</span></div><div class="dv-bar"><div style="width:${Math.min(100, n / c * 100)}%"></div></div></button>`; }).join('')}</div>` : '<div class="muted small" style="padding:8px">Ngày này chưa có chuyến. Hãy tạo lịch trong mục <b>Lịch chạy</b>.</div>'}</div>`;
    let main = '<div class="dv-main"><div class="dv-body muted">Chưa chọn chuyến.</div></div>';
    if (DV.tab === 'lt') main = `<div class="dv-main">${dvTabBar(cur)}<div class="dv-body" id="dvLt"></div></div>`;
    else if (cur) {
      const B = dvBook(cur.id), cap = dvCap(cur), xe = lcXe(cur), lai = lcEmp(cur).ten || '';
      if (DV.selTrip !== cur.id) { DV.selTrip = cur.id; DV.sel = []; DV.selTT = 'giu'; }
      DV.sel = DV.sel.filter(g => !B.some(x => x.ghe === g));
      let body = '';
      if (DV.tab === 'ghe') {
        const cell = s => {
          if (s === 'D') return '<div class="dv-lbl">TÀI XẾ</div>';
          if (s === 'DOOR') return '<div class="dv-lbl">CỬA</div>';
          if (!s) return '<div></div>';
          const b = B.find(x => x.ghe === s);
          const lk = Lock.other(cur.id, s), gsel = DV.one ? DB.datve.filter(z => z.id === DV.one) : dvGrp(DB.datve.find(z => z.id === DV.selB));
          if (DV.mvMode && !lk) { const pk = DV.mvMode.picks.indexOf(s); if (!b) return `<button class="dv-seat mvt${pk >= 0 ? ' on' : ''}" data-act="dvMvPick" data-g="${s}"><span class="no">${s}</span><span class="plus">${pk >= 0 ? pk + 1 : '↓'}</span></button>`; }
          if (lk && !b) return `<button class="dv-seat lk" data-act="dvLocked" data-g="${s}" data-n="${esc(lk.name || '')}"><span class="no">${s}</span><span class="lkn">🔒 ${esc(lk.name || 'Đang thao tác')}</span><span class="lkd">đang thao tác</span></button>`;
          if (!b) { if (Auth.can('lichchay', 'add') && lcCan(cur)) { const on = DV.sel.includes(s); return `<button class="dv-seat ${on ? 'ms' : ''}" data-act="dvPickSeat" data-g="${s}"><span class="no">${s}</span><span class="plus">${on ? '✓' : '+'}</span></button>`; } return `<button class="dv-seat" data-act="dvSeat" data-id="${cur.id}" data-g="${s}"><span class="no">${s}</span><span class="plus">+</span></button>`; }
          return `<button class="dv-seat ${b.tt === 'tra' ? 'pd' : 'bk'}${GC.isWarn(b) ? ' gcw' : ''}${(DV.pk || []).includes(b.id) ? ' pk' : ''}${b.len ? ' lv' : ''}${b.xn ? ' xn' : ''}${gsel.includes(b) ? ' ms' : ''}${lk ? ' lk' : ''}${b.nhom ? ' grp' : ''}${PM.sCls(b)}${DV.mvIds && DV.mvIds.includes(b.id) ? ' mv' : ''}" data-act="${DV.mvMode && !(DV.mvIds || []).includes(b.id) ? 'dvMvPick' : 'dvSeat'}" data-id="${cur.id}" data-g="${s}" data-b="${b.id}"><span class="no">${s}</span>${PM.badge(b)}${lk ? `<span class="lkn">🔒 ${esc(lk.name || 'Đang thao tác')}</span>` : ''}${b.diemDon ? `<span class="tag" style="background:${dvPtColor(b.diemDon)}">${esc(dvAbbr(b.diemDon))}</span>` : ''}${b.diemDon ? `<span class="dp"><em>Đón:</em> ${esc(b.diemDon)}${LT.eta(cur, b.diemDon) ? ' · ~' + LT.eta(cur, b.diemDon) : ''}</span>` : ''}${b.diemTra ? `<span class="dp"><em>Trả:</em> ${esc(b.diemTra)}</span>` : ''}<div class="pr"><b>${esc(b.ten)}</b><b>${F.money(dvTot(b))}đ</b></div><div class="pr" style="margin-top:2px">${b.sdt ? `<span class="tel${callTelCls(b)}" data-act="dvCall" data-p="${esc(b.sdt)}" data-id="${b.id}">${ic('phone')} ${esc(b.sdt)}</span>` : '<span></span>'}</div>${b.ghiChu ? `<span class="nt">${esc(b.ghiChu)}</span>` : ''}${b.xuatCT ? '<span class="nt">🧾 Xuất chứng từ</span>' : ''}${callTag(b)}${dvSti(b)}${dvQK(b, cur)}<span class="by">${b.len ? (b.tt === 'tra' ? '✓ Đã lên xe' : '<i class="lx-due" title="Khách đã lên xe nhưng chưa thu tiền">Chưa thu</i>') : b.tt === 'tra' ? 'Đã thu' + (b.httt ? ' · ' + (b.httt === 'ck' ? 'CK' : b.httt === 'tm' ? 'TM' : dvHT(b.httt)) : '') : +b.coc > 0 ? 'Đã cọc ' + F.money(b.coc) : b.xn ? '✓ Đã xác nhận' : 'Giữ chỗ'}${b.nguoiBan && !b.len ? ' · ' + esc(b.nguoiBan) : ''}</span></button>`;
        };
        const so = dvSO(cur);
        const gone = lcGone(cur), dI = Math.max(0, so.rows.findIndex(r => r.includes('D'))), band = gone ? `<div class="dv-gone" style="grid-column:1/-1"><b>XE ĐÃ XUẤT BẾN</b><small>${lcAdmin() ? 'Admin vẫn sửa được' : 'Đã khóa mọi thao tác sửa, xóa · chỉ Admin được chỉnh'}</small></div>` : '';
        body = `<div class="dv-grid${gone ? ' is-gone' : ''}" style="grid-template-columns:repeat(${so.cols},minmax(0,1fr))">${so.rows.map((r, i) => r.map(cell).join('') + (i === dI ? band : '')).join('')}</div>` + dvLegend() + dvHuyHTML(cur) + (dvPkBar(cur) || dvActBar(cur)) + (DV.clone && !DV.sel.length && !DV.selB ? `<div class="dv-selbar ab-bar"><div class="ab-h"><button class="sb-x" data-act="dvClearSel" aria-label="Thoát">${ic('x')}</button><div class="sb-t grow"><span>${DV.clone.nhom ? 'Thêm vé cho:' : 'Sao chép vé:'}</span> <b>${esc(DV.clone.ten)}</b>${DV.clone.nhom && DV.clone.chuyen === cur.id ? ' <span class="muted small">· vé thêm vào cùng nhóm, chung mã vé</span>' : ''}</div></div><div class="ab-ph"><span class="mv-hint">Chạm các ghế trống để đặt thêm vé với thông tin này</span></div></div><div class="dv-selpad ab-pad" style="height:96px!important"></div>` : '') + (DV.sel.length ? `<div class="dv-selbar"><button class="sb-x" data-act="dvClearSel" aria-label="Bỏ chọn">${ic('x')}</button><div class="sb-t grow"><span>${DV.sel.length} vé:</span> <b>${DV.sel.map(esc).join(', ')}</b></div><button class="sb-st ${DV.selTT === 'tra' ? 'pd' : ''}" data-act="dvTT">${DV.selTT === 'tra' ? 'Đã thanh toán' : 'Giữ chỗ'}</button><button class="sb-go" data-act="dvBookSel" aria-label="Tiếp tục">${ic('arrow')}</button></div><div class="dv-selpad"></div>` : '');
      } else if (DV.tab === 'hk') {
        const R = B.slice().sort((a, b) => String(a.ghe).localeCompare(String(b.ghe), 'vi', { numeric: true }));
        body = R.length ? `<table class="dv-tbl"><tr><th>Ghế</th><th>Mã vé</th><th>Tên khách</th><th>SĐT</th><th>Điểm đón</th><th>Điểm trả</th><th class="r">Tiền vé</th><th>Tình trạng</th><th>Ghi chú</th></tr>${R.map(b => `<tr><td><b>${esc(b.ghe)}</b></td><td>${esc(b.ma || '')}</td><td>${esc(b.ten)}</td><td>${b.sdt ? `<a class="tel${callTelCls(b)}" href="tel:${esc(String(b.sdt).replace(/[^0-9+]/g, ''))}">${esc(b.sdt)}</a>` : ''}</td><td>${esc(b.diemDon || '')}</td><td>${esc(b.diemTra || '')}</td><td class="r">${F.money(dvTot(b))}</td><td>${b.tt === 'tra' ? 'Đã thanh toán' + (b.httt ? ' · ' + dvHT(b.httt) : '') : +b.coc ? 'Đã cọc ' + F.money(b.coc) : 'Giữ chỗ'}</td><td>${b.xuatCT ? '<b>[Xuất CT]</b> ' : ''}${callTag(b)} ${esc(b.ghiChu || '')}</td></tr>`).join('')}<tr><th colspan="6">Tổng ${R.length} khách</th><th class="r">${F.money(sum(R, b => dvTot(b)))}</th><th colspan="2"></th></tr></table>` : '<div class="muted">Chưa có hành khách.</div>';
      } else if (DV.tab === 'gh') {
        body = GH.tab(cur);
      } else if (DV.tab === 'goi') {
        body = callListHTML(cur);
      } else if (DV.tab === 'dt') {
        const grp = k => { const m = {}; B.forEach(b => { const x = b[k] || '(Chưa ghi)'; (m[x] = m[x] || []).push(b); }); const ix = x => { const i = LT.find(cur.tuyen, x); return i < 0 ? 999 : i; }; return Object.entries(m).sort((p, q) => ix(p[0]) - ix(q[0])).map(([x, a]) => `<tr><td><b>${esc(x)}</b>${LT.eta(cur, x) ? ` <span class="badge b-green">~${LT.eta(cur, x)}</span>` : ''}</td><td class="r">${a.length}</td><td>${a.map(b => esc(b.ghe + ' ' + b.ten)).join(', ')}</td></tr>`).join('') || '<tr><td colspan="3" class="muted">Chưa có</td></tr>'; };
        body = `<h4 style="margin:0 0 6px">Điểm đón</h4><table class="dv-tbl"><tr><th>Điểm đón</th><th class="r">Số khách</th><th>Hành khách</th></tr>${grp('diemDon')}</table><h4 style="margin:14px 0 6px">Điểm trả</h4><table class="dv-tbl"><tr><th>Điểm trả</th><th class="r">Số khách</th><th>Hành khách</th></tr>${grp('diemTra')}</table>`;
      } else {
        const rows = L.map(l => { const bb = dvBook(l.id); return { l, n: bb.length, c: dvCap(l), t: sum(bb, x => dvTot(x)), p: sum(bb.filter(x => x.tt === 'tra'), x => dvTot(x)) }; });
        body = `<table class="dv-tbl"><tr><th>Giờ</th><th>Tuyến</th><th>Số xe</th><th>Lái xe</th><th class="r">Đã bán</th><th class="r">Còn trống</th><th class="r">Doanh thu</th><th class="r">Đã thu</th></tr>${rows.map(r => `<tr><td><b>${esc(r.l.gio)}</b></td><td>${esc(r.l.tuyen)}</td><td>${esc(lcXe(r.l).bks || '')}</td><td>${esc(lcEmp(r.l).ten || '')}</td><td class="r">${r.n}/${r.c}</td><td class="r">${r.c - r.n}</td><td class="r">${F.money(r.t)}</td><td class="r">${F.money(r.p)}</td></tr>`).join('')}<tr><th colspan="4">Tổng ngày ${F.date(day)}</th><th class="r">${sum(rows, r => r.n)}/${sum(rows, r => r.c)}</th><th class="r">${sum(rows, r => r.c - r.n)}</th><th class="r">${F.money(sum(rows, r => r.t))}</th><th class="r">${F.money(sum(rows, r => r.p))}</th></tr></table>`;
      }
      main = `<div class="dv-main"><div class="dm-mh" style="padding:12px 16px;border-bottom:1px solid #e5e7eb;display:flex;flex-wrap:wrap;gap:6px 18px;align-items:center"><b style="font-size:16px">${esc(cur.gio)} · ${esc(cur.tuyen)}</b>${Auth.can('lichchay', 'edit') ? `<button class="btn sm" data-act="ltEdit" data-t="${esc(cur.tuyen)}" title="Điểm dừng và giờ dự kiến của tuyến">${ic('arrow')} Lộ trình</button>` : ''}${LT.get(cur.tuyen).length ? `<div style="flex-basis:100%">${LT.strip(cur, '', '', true)}</div>` : ''}${lcGone(cur) ? '<span class="badge b-red">ĐÃ XUẤT BẾN</span>' : ''}<button class="btn sm${DV.pkMode ? ' on' : ''}" data-act="dvPkMode" title="Bật để chạm chọn nhiều vé, in một lượt">${ic('check')} Chọn nhiều</button><button class="btn sm${PM.bCls(cur)}" data-act="dvPrintMap" data-id="${cur.id}" title="${esc(PM.tip(cur))}">${ic('printer')} ${PM.label(cur)}</button>${lcCan(cur) && Auth.can('lichchay', 'edit') ? `<button class="btn sm" data-act="lcQuick" data-id="${cur.id}">${ic('edit')} Sửa nhanh xe, lái xe</button><button class="btn sm" data-act="mvTrip" data-id="${cur.id}" title="Xe hư, hủy chuyến: chuyển toàn bộ vé và hàng sang chuyến khác">${ic('arrow')} Dời cả chuyến</button>` : lcGone(cur) ? '<span class="muted small">Đã khóa chỉnh sửa (chỉ Admin)</span>' : ''}${cur.doiSang ? (() => { const n2 = DB.lichchay.find(l => l.id === cur.doiSang); return n2 ? `<span class="badge b-amber" title="${esc(cur.lyDoHuy || '')}">Đã chuyển sang ${esc(n2.gio)} ${F.date(n2.ngay)} · ${esc(cur.lyDoHuy || '')}</span>` : ''; })() : ''}<span class="muted small">Xe: <b>${esc(xe.bks || 'chưa gán')}</b> · Lái xe: <b>${esc(lai || 'chưa gán')}</b> · ${B.length}/${cap} ghế khách đã bán · ${cap - B.length} trống · tổng ${cap + sdDriver(dvSO(cur))} chỗ kể cả ghế lái xe</span></div>${dvTabBar(cur)}<div class="dv-body">${body}</div></div>`;
    }
    const R = dvRoutes(), rc = dvRoute();
    const chips = R.length ? `<div class="row dm-hide" style="gap:8px;margin-bottom:12px;align-items:center"><select class="inp" id="dvRoute" data-csq="1" style="width:330px;max-width:100%;font-weight:600">${R.map(r => `<option value="${esc(r)}" ${rc === r ? 'selected' : ''}>${esc(r)}</option>`).join('')}</select></div>` : '';
    let mob = '';
    if (R.length) {
      const B2 = cur ? dvBook(cur.id) : [], cap2 = cur ? dvCap(cur) : 0, tot = sum(B2, b => dvTot(b)), paid = sum(B2.filter(b => b.tt === 'tra'), b => dvTot(b)), hold = B2.filter(b => b.tt !== 'tra').length;
      const idx = cur ? L.findIndex(l => l.id === cur.id) : -1, prv = idx > 0 ? L[idx - 1] : null, nxt = idx >= 0 && idx < L.length - 1 ? L[idx + 1] : null;
      const xe2 = cur ? lcXe(cur) : {}, lai2 = cur ? lcEmp(cur).ten || '' : '';
      const arrow = (t, dis, a) => `<button type="button" class="dm-ar" ${dis ? 'disabled' : ''} ${a}>${t === 'l' ? ic('back') : `<span style="display:inline-block;transform:scaleX(-1);line-height:0">${ic('back')}</span>`}</button>`;
      mob = `<div class="dm-hd"><div class="dm-card"><div class="dm-route"><select class="inp" id="dvRouteM" data-csq="1">${R.map(r => `<option value="${esc(r)}" ${rc === r ? 'selected' : ''}>${esc(r)}</option>`).join('')}</select></div>
        <div class="dm-row">${arrow('l', false, `data-act="dvDay" data-d="${D.add(day, -1)}"`)}<label class="dm-date"><b>${D.dowName[D.parse(day).getDay()]}, ${F.date(day)}</b><input type="date" id="dvDateM" value="${day}"></label>${arrow('r', false, `data-act="dvDay" data-d="${D.add(day, 1)}"`)}<div class="dm-time">${cur ? esc(cur.gio) : '--:--'}</div></div></div></div><div class="dm-cal">${calH}</div>
        ${L.length ? `<div class="dm-trip">${arrow('l', !prv, prv ? `data-act="dvTrip" data-id="${prv.id}"` : '')}<button type="button" class="dm-tx" data-act="dvPick"><span>${cur ? esc(cur.gio) + ' • ' + esc(xe2.bks || 'Chưa gán xe') + (lai2 ? ' • ' + esc(lai2) : '') : 'Chọn chuyến'}</span><em>▾</em></button>${cur ? `<span class="dm-b a">${B2.length}</span><span class="dm-b">${cap2 - B2.length}</span>` : ''}${arrow('r', !nxt, nxt ? `data-act="dvTrip" data-id="${nxt.id}"` : '')}</div>` : '<div class="muted small" style="padding:8px">Ngày này chưa có chuyến.</div>'}
        ${DV.pick && L.length ? `<div class="dm-list">${dvSortGone(L).map((l, i, A) => { const n = dvBook(l.id).length, c = dvCap(l), v = lcXe(l); return dvGoneH(l, i, A) + `<button class="dv-t ${l.id === (cur && cur.id) ? 'sel' : ''} ${n >= c ? 'full' : ''}${PM.tCls(l)}" data-act="dvTrip" data-id="${l.id}"><div class="tm">${esc(l.gio)}${PM.tMark(l)}</div><div class="r"><span><i class="${v.bks ? '' : 'off'}"></i>${esc(String(v.bks || '').replace(/^\d+\w-/, '') || '—')}</span><span>${n}|${c}</span></div><div class="dv-bar"><div style="width:${Math.min(100, n / c * 100)}%"></div></div></button>`; }).join('')}</div>` : ''}
        ${cur ? `<div class="dm-sum"><div class="dm-s1"><span>Tổng vé đặt <b>${B2.length}</b></span><span><i class="o"></i>Trống <b>${cap2 - B2.length}</b></span><span><i class="g"></i>Giữ chỗ <b>${hold}</b></span></div><div class="dm-s2">Tổng tiền <b>${F.money(tot)} đ</b> • Đã thu <b>${F.money(paid)} đ</b></div>${lcGone(cur) ? '<div class="dm-s3">Chuyến đã xuất bến</div>' : ''}</div>
        <div class="dm-act">${lcCan(cur) && Auth.can('lichchay', 'edit') ? `<button class="btn sm" data-act="lcQuick" data-id="${cur.id}">${ic('edit')} Xe, lái xe</button>` : lcGone(cur) ? '<span class="muted small">Đã khóa chỉnh sửa</span>' : ''}<button class="btn sm${DV.pkMode ? ' on' : ''}" data-act="dvPkMode" title="Bật để chạm chọn nhiều vé, in một lượt">${ic('check')} Chọn nhiều</button><button class="btn sm${PM.bCls(cur)}" data-act="dvPrintMap" data-id="${cur.id}" title="${esc(PM.tip(cur))}">${ic('printer')} ${PM.label(cur)}</button></div>` : ''}`;
    }
    el.insertAdjacentHTML('beforeend', `<button type="button" class="dv-sbar" data-act="dvSearch">${ic('search')}<span>Tìm vé theo số điện thoại, tên khách, mã vé…</span></button>` + `<div id="gcBox">${GC.html()}</div>` + (mob ? `<div class="dm">${mob}</div>` : '') + chips + `<div class="dv">${side}${main}</div>`);
    const rm = $('#dvRouteM', el); if (rm) rm.onchange = () => { DV.tuyen = rm.value; DV.trip = null; DV.pick = false; App.render(); };
    const dm = $('#dvDateM', el); if (dm) dm.onchange = () => { if (dm.value) { LC.ngay = dm.value; DV.trip = null; App.render(); } };
    if (DV.tab === 'lt') vLC.renderTable($('#dvLt', el), true);
    const rs = $('#dvRoute', el); if (rs) rs.onchange = () => { DV.tuyen = rs.value; DV.trip = null; App.render(); };
    const di = $('#dvDate', el); if (di) di.onchange = () => { if (di.value) { LC.ngay = di.value; DV.trip = null; App.render(); } };
  },
  excel() { const cur = dvCur(); if (!cur) return toast('Chưa chọn chuyến', 'err'); XLSX.save('Hanh khach ' + cur.gio + ' ' + dvDay(), [xSheet('Hành khách', 'DANH SÁCH HÀNH KHÁCH ' + cur.gio + ' ' + cur.tuyen + ' NGÀY ' + F.date(dvDay()), dvPaxCols, dvBook(cur.id))]); },
  print() { const cur = dvCur(); if (!cur) return toast('Chưa chọn chuyến', 'err'); dvPrintPhoi([cur]); }
};
const dvPaxCols = [{ key: 'ghe', label: 'Ghế' }, { key: 'ma', label: 'Mã vé' }, { key: 'ten', label: 'Tên khách' }, { key: 'sdt', label: 'Số điện thoại' }, { key: 'diemDon', label: 'Điểm đón' }, { key: 'diemTra', label: 'Điểm trả' }, { key: 'gia', label: 'Giá vé', fmt: 'money', sum: true }, { key: 'phuThu', label: 'Phụ thu', fmt: 'money', sum: true }, { key: 'coc', label: 'Đặt cọc', fmt: 'money', sum: true }, { key: 'tt', label: 'Tình trạng', val: b => b.tt === 'tra' ? 'Đã thanh toán' : 'Giữ chỗ' }, { key: 'httt', label: 'Hình thức TT', val: b => dvHT(b.httt) }, { key: 'xuatCT', label: 'Xuất chứng từ', val: b => b.xuatCT ? 'Có' : '' }, { key: 'ghiChu', label: 'Ghi chú' }];
Object.defineProperty(vLC, 'title', { configurable: true, get: () => DRV.on() ? 'Chuyến của tôi' : 'Đặt vé', set() { } });
Object.defineProperty(vLC, 'desc', { configurable: true, get: () => DRV.on() ? 'Các chuyến được phân cho bạn, kèm danh sách khách để gọi' : 'Chọn ngày và chuyến, đặt vé theo sơ đồ ghế; quản lý lịch chạy từng ngày: tuyến, giờ, xe, lái xe', set() { } });
MODL.def('lichchay', vLC);
MODL.load('dvplus').catch(e => console.warn('dvplus', e));   // Đặt vé+: khách chờ, gửi xác nhận, phím tắt, cọc vé đoàn

addCSS(`.dv-grid .dv-seat .sti{position:absolute;right:46px;top:5px;display:flex;gap:3px;z-index:2}.dv-grid .dv-seat .sti i{width:18px;height:18px;border-radius:50%;display:grid;place-items:center;color:#fff;box-shadow:0 1px 2px rgba(0,0,0,.2)}.dv-grid .dv-seat .sti i svg{width:11px;height:11px;stroke:#fff}
.sti-ok{background:#16a34a}.sti-bad{background:#dc2626}.sti-wn{background:#d97706}.sti-in{background:#2563eb}.dv-grid .dv-seat.lv{box-shadow:inset 4px 0 0 #16a34a}
@media(max-width:900px){.dv-grid .dv-seat .sti{right:36px;top:4px;gap:2px}.dv-grid .dv-seat .sti i{width:14px;height:14px}.dv-grid .dv-seat .sti i svg{width:9px;height:9px}}`);
