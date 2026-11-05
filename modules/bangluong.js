'use strict';
/* Module Bảng lương (bảng, phân trang, sửa trực tiếp); tính lương payroll/summarize ở index vì Zalo, Thông tin của tôi dùng · tải khi mở màn hình (MODL). */
/* ---------- Bảng lương ---------- */
const PCOLS = [
  { k: 'ma', l: 'Mã NV', t: 'text' }, { k: 'ten', l: 'Họ và tên', t: 'text', w: 24 },
  { k: 'luongCB', l: 'Lương cơ bản', t: 'money', g: 'Thu nhập' }, { k: 'cong', l: 'Công hưởng lương', t: 'num', g: 'Thu nhập' }, { k: 'luongCong', l: 'Lương theo công', t: 'money', g: 'Thu nhập' },
  { k: 'pcCT', l: 'PC chịu thuế', t: 'money', g: 'Thu nhập' }, { k: 'pcKT', l: 'PC không thuế', t: 'money', g: 'Thu nhập' }, { k: 'ot', l: 'Giờ OT', t: 'num', g: 'Thu nhập' }, { k: 'tienOT', l: 'Tiền OT', t: 'money', g: 'Thu nhập' },
  { k: 'thuong', l: 'Thưởng', t: 'money', g: 'Thu nhập', input: 1 }, { k: 'gross', l: 'Tổng thu nhập', t: 'money', g: 'Thu nhập', b: 1 },
  { k: 'luongBH', l: 'Lương đóng BH', t: 'money', g: 'Bảo hiểm NLĐ' }, { k: 'bhxh', l: 'BHXH', t: 'money', g: 'Bảo hiểm NLĐ' }, { k: 'bhyt', l: 'BHYT', t: 'money', g: 'Bảo hiểm NLĐ' }, { k: 'bhtn', l: 'BHTN', t: 'money', g: 'Bảo hiểm NLĐ' },
  { k: 'tnChiuThue', l: 'TN chịu thuế', t: 'money', g: 'Thuế TNCN' }, { k: 'soNPT', l: 'Số NPT', t: 'int', g: 'Thuế TNCN' }, { k: 'giamTru', l: 'Giảm trừ gia cảnh', t: 'money', g: 'Thuế TNCN' }, { k: 'tnTinhThue', l: 'TN tính thuế', t: 'money', g: 'Thuế TNCN' }, { k: 'thue', l: 'Thuế TNCN', t: 'money', g: 'Thuế TNCN', b: 1 },
  { k: 'tamUng', l: 'Tạm ứng', t: 'money', g: 'Khấu trừ', input: 1 }, { k: 'khauTru', l: 'Khấu trừ khác', t: 'money', g: 'Khấu trừ', input: 1 },
  { k: 'thucLinh', l: 'THỰC LĨNH', t: 'money', b: 1 }
];
const vLuong = {
  title: 'Bảng lương', icon: 'wallet', desc: 'Tự tính lương theo công, OT, BHXH, thuế TNCN. Ô màu vàng nhập trực tiếp.',
  tools: () => monthTool() + `<button class="btn" data-act="slipAll">${ic('receipt')} In phiếu lương</button>` + (ZB.admin() ? `<button class="btn" data-act="zbOpen">${ic('send')} Gửi Zalo</button>` : ''), after: bindMonth,
  render(el) {
    App.subtitle = F.month(UI.m);
    el.innerHTML = `<div class="tbl-card"><div class="tbl-tools"><div class="search">${ic('search')}<input class="inp" id="plQ" placeholder="Tìm nhân viên..." value="${esc(UI.plq || '')}"></div>${selectHTML('pbF', [{ value: '', label: 'Tất cả phòng ban' }, ...S().phongBan], UI.pb)}${(() => { const T = allTuyen(UI.m), L = payroll(UI.m, UI.pb), n = t => L.filter(x => x.tuyenChinh === t).length; return selectHTML('tuF', [{ value: '', label: 'Tất cả nhóm tuyến' }, ...[...new Set([...T, ...L.map(x => x.tuyenChinh).filter(Boolean)])].map(t => ({ value: t, label: `${t} (${n(t)})` }))], UI.plTuyen === '__none' ? '' : UI.plTuyen || ''); })()}<span class="grow"></span><span class="small muted">Thuế theo biểu 5 bậc, giảm trừ ${F.short(S().gtBanThan)}/NPT ${F.short(S().gtNPT)}</span></div><div class="tbl-wrap" id="plW"></div><div class="tbl-pager" id="plP"></div></div>`;
    const pst = pgState('pl', 20);
    onVal('pbF', v => { UI.pb = v; pst.page = 0; App.render(); });
    onVal('tuF', v => { UI.plTuyen = v; pst.page = 0; App.render(); });
    bindPager($('#plP'), pst, vLuong.draw);
    $('#plQ').addEventListener('input', e => { UI.plq = e.target.value; pst.page = 0; vLuong.draw(); });
    $('#plW').addEventListener('change', e => {
      const i = e.target.closest('[data-k]'); if (!i) return;
      const ym = UI.m; DB.extra[ym] = DB.extra[ym] || {}; const x = DB.extra[ym][i.dataset.e] = DB.extra[ym][i.dataset.e] || {};
      x[i.dataset.k] = F.parse(i.value); Store.changed(); keepFocus(vLuong.draw);
    });
    vLuong.draw();
  },
  list() { const q = (UI.plq || '').toLowerCase(), tu = UI.plTuyen === '__none' ? '' : UI.plTuyen || ''; return payroll(UI.m, UI.pb).filter(x => (!q || (x.ten + ' ' + x.ma + ' ' + x.phongBan).toLowerCase().includes(q)) && (!tu || (tu === '__none' ? !x.tuyenChinh : x.tuyenChinh === tu))); },
  draw() {
    const L = vLuong.list(), w = $('#plW'); if (!w) return;
    const pst = pgState('pl', 20), V = pageSlice(pst, L), off = pst.page * pst.size;
    $('#plP').innerHTML = pagerHTML(pst, L.length, ' · dòng Tổng cộng tính cho tất cả');
    // 2 cột đầu (STT, Họ tên) đứng yên khi cuộn ngang; cột Mã NV được ẩn trên màn hình
    const LEFT = [0, 44];
    const sk = (i, extra = '') => i <= 1 ? ` class="stk ${extra}" style="left:${LEFT[i]}px;${i < 1 ? 'min-width:44px;max-width:44px;' : 'min-width:170px;'}${i === 1 ? 'box-shadow:inset -1px 0 0 #e3e7ef' : ''}"` : (extra ? ` class="${extra}"` : '');
    const VCOLS = PCOLS.filter(c => c.k !== 'ma');
    const fmtv = (c, v) => c.t === 'num' ? F.num(v) : c.t === 'int' ? v : c.t === 'text' ? esc(v) : F.money(v);
    const al = c => c.t !== 'text' ? 'r' : '';
    let r1 = `<th${sk(0, 'c')} rowspan="2">STT</th>`, r2 = '';
    VCOLS.forEach((c, i) => {
      if (!c.g) r1 += `<th${sk(i + 1, al(c))} rowspan="2">${c.l}</th>`;
      else { if (!i || VCOLS[i - 1].g !== c.g) r1 += `<th class="c grp" colspan="${VCOLS.filter(x => x.g === c.g).length}">${c.g}</th>`; r2 += `<th class="${al(c)}" style="top:33px">${c.l}</th>`; }
    });
    const totCell = c => c.t === 'money' && !['luongCB', 'luongBH'].includes(c.k) ? F.money(sum(L, x => x[c.k])) : ['cong', 'ot'].includes(c.k) ? F.num(sum(L, x => x[c.k])) : '';
    w.innerHTML = `<table class="tbl compact pl"><thead><tr style="height:33px">${r1}<th rowspan="2"></th></tr><tr>${r2}</tr></thead>
      <tbody>${V.map((x, ri) => `<tr><td${sk(0, 'c')}>${off + ri + 1}</td>${VCOLS.map((c, i) => c.input
        ? `<td class="in"><input data-k="${c.k}" data-e="${x.id}" value="${x[c.k] ? F.money(x[c.k]) : ''}" data-money inputmode="numeric" placeholder="0"></td>`
        : `<td${sk(i + 1, al(c) + (c.k === 'thucLinh' ? ' net' : ''))}>${c.k === 'ten' ? `<b>${esc(x.ten)}</b>` : c.b ? `<b>${fmtv(c, x[c.k])}</b>` : fmtv(c, x[c.k])}${c.k === 'luongBH' && x.noBH && x.luongBH ? ' <span class="badge b-amber" data-tip="Nghỉ không lương từ 14 ngày trở lên: tháng này không đóng BH">!</span>' : ''}${c.k === 'luongCong' && x.coDinh ? ' <span class="badge b-p" data-tip="Lương cố định: trả đủ mức này, không tính theo công">CĐ</span>' : ''}</td>`).join('')}<td class="act"><button class="ibtn" data-act="slip" data-id="${x.id}" data-tip="In phiếu lương">${ic('receipt')}</button></td></tr>`).join('') || `<tr><td colspan="30"><div class="empty">Không có nhân viên trong kỳ này</div></td></tr>`}</tbody>
      ${L.length ? `<tfoot><tr><td${sk(0)}></td>${VCOLS.map((c, i) => `<td${sk(i + 1, al(c))}>${i === 0 ? 'TỔNG CỘNG' : totCell(c)}</td>`).join('')}<td></td></tr></tfoot>` : ''}</table>`;
  },
  excel() {
    const L = vLuong.list();
    const cols = [{ label: 'STT', type: 'int', width: 6 }, ...PCOLS.map(c => ({ label: c.l, type: c.t, sum: c.t === 'money' && !['luongCB', 'luongBH'].includes(c.k) || ['cong', 'ot'].includes(c.k), width: c.w || (c.t === 'money' ? 14 : c.t === 'text' ? 16 : 9) }))];
    const rows = L.map((x, i) => [i + 1, ...PCOLS.map(c => x[c.k])]);
    const s = S();
    const dn = L.map((x, i) => [i + 1, x.ma, x.ten, x.luongBH, x.bhxh, x.bhyt, x.bhtn, x.bhNLD, x.bdxh, x.bdyt, x.bdtn, x.kpcd, x.bhDN, x.bhNLD + x.bhDN]);
    XLSX.save(`Bang luong ${UI.m}`, [
      { name: 'Bảng lương ' + UI.m, title: 'BẢNG THANH TOÁN TIỀN LƯƠNG ' + F.month(UI.m).toUpperCase(), subtitles: [companyLine(), `Công chuẩn ${s.congChuan} ngày · Giảm trừ bản thân ${F.money(s.gtBanThan)} · NPT ${F.money(s.gtNPT)}/người · BH NLĐ ${s.bhxhNLD}% + ${s.bhytNLD}% + ${s.bhtnNLD}%`], columns: cols, rows, totals: true, freezeCols: 3 },
      { name: 'Bảo hiểm ' + UI.m, title: 'BẢNG TRÍCH NỘP BẢO HIỂM BẮT BUỘC ' + F.month(UI.m).toUpperCase(), subtitles: [companyLine()], columns: [{ label: 'STT', type: 'int', width: 6 }, { label: 'Mã NV', width: 9 }, { label: 'Họ và tên', width: 24 }, { label: 'Lương đóng BH', type: 'money' }, { label: `BHXH NLĐ ${s.bhxhNLD}%`, type: 'money', sum: true }, { label: `BHYT NLĐ ${s.bhytNLD}%`, type: 'money', sum: true }, { label: `BHTN NLĐ ${s.bhtnNLD}%`, type: 'money', sum: true }, { label: 'Cộng NLĐ', type: 'money', sum: true }, { label: `BHXH DN ${s.bhxhDN}%`, type: 'money', sum: true }, { label: `BHYT DN ${s.bhytDN}%`, type: 'money', sum: true }, { label: `BHTN DN ${s.bhtnDN}%`, type: 'money', sum: true }, { label: `KPCĐ ${s.kpcdDN}%`, type: 'money', sum: true }, { label: 'Cộng DN', type: 'money', sum: true }, { label: 'Tổng phải nộp', type: 'money', sum: true }], rows: dn, totals: true }
    ]);
  },
  print() {
    const L = vLuong.list();
    const pc = PCOLS.filter(c => !['phongBan', 'tuyen', 'luongBH', 'pcKT', 'ot', 'soNPT', 'tnChiuThue'].includes(c.k));
    const body = L.map((x, i) => `<tr><td class="c">${i + 1}</td>${pc.map(c => `<td class="${c.t === 'text' ? '' : 'r'}">${c.t === 'text' ? esc(x[c.k]) : c.t === 'num' ? F.num(x[c.k]) : F.money(x[c.k])}</td>`).join('')}<td style="width:60px"></td></tr>`).join('');
    const foot = `<tr><td></td>${pc.map((c, i) => `<td class="r">${i === 1 ? 'Tổng cộng' : c.t === 'money' && c.k !== 'luongCB' ? F.money(sum(L, x => x[c.k])) : ''}</td>`).join('')}<td></td></tr>`;
    Print.run(`<div class="pr">${Print.head()}<h2>Bảng thanh toán tiền lương</h2><div class="pr-sub">${F.month(UI.m)}${UI.pb ? ' · ' + esc(UI.pb) : ''}</div><table><thead><tr><th>STT</th>${pc.map(c => `<th>${c.l}</th>`).join('')}<th>Ký nhận</th></tr></thead><tbody>${body}</tbody><tfoot>${foot}</tfoot></table><div class="pr-note">Tổng số tiền thực lĩnh bằng chữ: <b>${docSo(sum(L, x => x.thucLinh))}</b>.</div>${Print.signs(['Người lập biểu', 'Kế toán trưởng', 'Giám đốc'])}</div>`, { landscape: true, title: 'Bang luong ' + UI.m });
  }
};
MODL.def('bangluong', vLuong);
