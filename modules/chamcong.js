'use strict';
/* Module Bảng chấm công (bảng, bút tô nhanh, ghi chú tuyến) · tải khi mở màn hình (MODL). */
const tuyenRieng = ym => [...new Set([...(DB.lichchay || []).filter(l => l.tuyen && String(l.ngay).startsWith(ym)).map(l => String(l.tuyen).trim()), ...(DB.giochay || []).map(g => String(g.tuyen || '').trim()).filter(Boolean)])].sort((a, b) => a.localeCompare(b, 'vi'));
function ccTcNote(ym, eid, what) {
  const e = DB.employees.find(x => x.id === eid); if (!isDriver(e)) return what === 'BHXH' ? 'Lương đóng bảo hiểm trong bảng Nhân viên' : 'Lương CK trong bảng Nhân viên';
  const tc = tuyenChinh(e, ym), other = empTuyen(ym, eid).filter(x => x.t !== tc);
  return `${what} trừ 1 lần ở tuyến chính: ${tc || 'chưa có'}${e.tuyenChinh ? ' (đặt cố định)' : ' (tự động)'}` + (other.length ? `\nKhông trừ ở: ${other.map(x => x.t + ' (' + F.num(x.n) + ' công, chỉ tính tiền công)').join(', ')}` : '');
}
function ccRowSum(ym, eid) {
  const a = summarize(ym, eid), o = PO.of(ym, eid), dash = '<span class="muted">–</span>';
  return `<td class="sum">${F.num(a.lv)}</td><td class="sum tc" data-tip="${a.drv ? F.num(a.lc) + ' công (theo tuyến) × tiền tài của xe' : 'Lương cố định (tháng) trong bảng Nhân viên'}">${a.drv || a.tienCong ? F.money(a.tienCong) : dash}</td>`
    + `<td class="sum tc" data-tip="${a.drv ? 'Tiền công × 4%' : 'Chỉ áp dụng cho lái xe'}">${F.money(a.cpKhac)}</td>`
    + `<td class="sum hl tc" data-tip="${esc(ccTcNote(ym, eid, 'Lương CK'))}">${F.money(o.lck)}</td>`
    + `<td class="sum tc" data-tip="${esc(o.bhSkip ? 'Tạm dừng BHXH tháng này: ' + o.idle + ' ngày làm việc không có lịch chạy (từ 14 ngày)' : ccTcNote(ym, eid, 'BHXH'))}">${o.bhSkip ? '<s class="muted">' + F.money(+(DB.employees.find(x => x.id === eid) || {}).luongBH || 0) + '</s> 0' : F.money(o.bh)}</td>`
    + `<td class="sum tc po-tn" data-tip="${esc(PO.tip(o))}">${o.show ? F.money(o.thucNhan) : dash}</td>`;
}
const vCham = {
  title: 'Bảng chấm công', icon: 'calcheck', desc: 'Lái xe tự tính công từ Lịch chạy · Văn phòng tự điền X ngày làm việc',
  tools: () => monthTool(), after: bindMonth,
  sel() { return Array.isArray(UI.ccPbs) ? UI.ccPbs : (UI.ccPbs = UI.pb ? [UI.pb] : []); },
  grp(e, ym = UI.m) { if (!isDriver(e)) return '~Văn phòng'; const m = MRT.main(e, ym); return m ? m.n : (tuyenChinh(e, ym) || '~~Lái xe chưa có lịch chạy'); },
  inSel(e, ym, gs) { const g = vCham.grp(e, ym); return gs.some(v => v.startsWith('x:') ? (g === v.slice(2) && MRT.cross(e, ym) > 0) : (v === g || MRT.ran(e, ym, v) || (isDriver(e) && empTuyen(ym, e.id).some(x => x.t === v)))); },
  emps(allGrp) { const ym = UI.m, end = ym + '-31', gs = UI.ccGrps || []; return DB.employees.filter(e => (!e.ngayVao || e.ngayVao <= end) && (e.trangThai !== 'Nghỉ việc' || summarize(ym, e.id).has) && (!vCham.sel().length || vCham.sel().includes(e.phongBan)) && (allGrp || !gs.length || vCham.inSel(e, ym, gs))); },
  render(el) {
    const ym = UI.m, n = D.daysIn(ym), today = D.today(), all = vCham.emps(true);
    const q = (UI.ccq || '').toLowerCase();
    const GM = new Map(), grpOf = e => vCham.grp(e, ym);
    const gSel = Array.isArray(UI.ccGrps) ? UI.ccGrps : (UI.ccGrps = []), gAll = {}; all.forEach(e => { const g = grpOf(e); gAll[g] = (gAll[g] || 0) + 1; MRT.list.forEach(m => { if (m.n !== g && MRT.ran(e, ym, m.n)) gAll[m.n] = (gAll[m.n] || 0) + 1; }); });
    const found = all.filter(e => !q || (e.ten + ' ' + e.ma).toLowerCase().includes(q)).map((e, i) => ({ e, i, g: (gSel.length === 1 && MRT.ran(e, ym, gSel[0])) ? gSel[0] : grpOf(e) })).filter(x => !gSel.length || vCham.inSel(x.e, ym, gSel)).sort((a, b) => { const r = g => g.startsWith('~~') ? 2 : g.startsWith('~') ? 1 : 0; return r(a.g) - r(b.g) || a.g.localeCompare(b.g, 'vi') || a.i - b.i; }).map(x => (GM.set(x.e, x.g), x.e));
    const gCount = {}; found.forEach(e => { const g = GM.get(e); gCount[g] = (gCount[g] || 0) + 1; }); let lastG = null;
    const pst = pgState('cc', 20), emps = pageSlice(pst, found);
    App.subtitle = F.month(ym);
    const days = Array.from({ length: n }, (_, i) => i + 1);
    el.innerHTML = `
      ${(() => { const sel = vCham.sel(), s0 = UI.ccPbs; UI.ccPbs = []; const A = vCham.emps(); UI.ccPbs = s0; const cnt = p => A.filter(e => e.phongBan === p).length;
        return `<div class="cc-pb no-print"><span class="cc-pbl">${ic('users')} Phòng ban</span><button class="${!sel.length ? 'on' : ''}" data-pbv="">Tất cả <b>${A.length}</b></button>${S().phongBan.filter(p => cnt(p) || sel.includes(p)).map(p => `<button class="${sel.includes(p) ? 'on' : ''}" data-pbv="${esc(p)}">${sel.includes(p) ? ic('check') : ''}${esc(p)} <b>${cnt(p)}</b></button>`).join('')}${sel.length ? `<span class="cc-pbn">Đang chọn ${sel.length} phòng ban · ${all.length} người</span>` : ''}</div>`; })()}
      ${(() => { const rk = g => g.startsWith('~~') ? 2 : g.startsWith('~') ? 1 : 0, G = Object.keys(gAll).filter(g => !g.startsWith('~')).sort((a, b) => (MRT.rank(a) - MRT.rank(b)) || a.localeCompare(b, 'vi')); if (!G.length) return ''; const XC = MRT.list.map(m => ({ v: 'x:' + m.n, m, n: all.filter(e => vCham.grp(e, ym) === m.n && MRT.cross(e, ym)).length })).filter(x => x.n || gSel.includes(x.v));
        return `<div class="cc-pb no-print"><span class="cc-pbl">${ic('bus')} Nhóm tuyến</span><button class="${!gSel.length ? 'on' : ''}" data-grv="">Tất cả <b>${all.length}</b></button>${G.map(g => `<button class="${gSel.includes(g) ? 'on' : ''}" data-grv="${esc(g)}">${gSel.includes(g) ? ic('check') : ''}${esc(g.replace(/^~+/, ''))} <b>${gAll[g]}</b></button>`).join('')}${XC.length ? `<span class="cc-pbl" style="margin-left:6px">Chạy chéo</span>${XC.map(x => `<button class="cc-xb ${gSel.includes(x.v) ? 'on' : ''}" data-grv="${esc(x.v)}" title="Lái xe nhóm ${esc(x.m.n)} có chạy tuyến ${esc(x.m.o.n)} (cả chiều đi và về)">${gSel.includes(x.v) ? ic('check') : ''}${esc(x.m.s)} chạy qua ${esc(x.m.o.s)} <b>${x.n}</b></button>`).join('')}` : ''}${gSel.length ? `<span class="cc-pbn">Đang chọn ${gSel.length} nhóm · ${found.length} người</span>` : ''}<button class="cc-rtp" data-act="rtpPrint" title="In bảng lái xe theo nhóm tuyến đang chọn (chưa chọn = cả 2 nhóm)">${ic('printer')} In bảng lái xe theo tuyến</button><button class="cc-rtp" data-act="rtpExcel" style="margin-left:0">${ic('sheet')} Excel</button></div>`; })()}
      ${(() => { const R = tuyenRieng(ym); if (!R.length) return ''; const ed = !Auth.user || Auth.can('chamcong', 'edit') || Auth.can('caidat', 'edit'), G = {};
        R.forEach(t => { (G[tuyenNhom(t)] = G[tuyenNhom(t)] || []).push(t); });
        return `<details class="cc-ct no-print" ${UI.ccCtOpen ? 'open' : ''}><summary>${ic('bus')} Công lái xe theo tuyến <span>${R.length} tuyến · ${Object.keys(G).length} nhóm · bấm để chỉnh công/chuyến</span></summary><div class="cc-ctb">${Object.entries(G).map(([g, L]) => `<div class="cc-ctg"><b>${ic('bus')} ${esc(g)}</b>${L.map(t => `<label><span>${esc(t)}</span><input class="inp sm num" type="number" min="0" step="0.25" data-ct="${esc(t)}" value="${congTuyen(t)}" ${ed ? '' : 'disabled'}><em>công / chuyến</em></label>`).join('')}</div>`).join('')}<p class="small muted">Mỗi tuyến (chiều đi, chiều về) chấm công riêng: số công trong ô ngày = số chuyến của từng tuyến trong Lịch chạy × công/chuyến của tuyến đó. Danh sách lái xe được gom theo nhóm tuyến.</p></div></details>`; })()}
      ${(() => { const R = PO.rule(), dl = PO.debtors(ym), ed = !Auth.user || Auth.can('chamcong', 'edit') || Auth.can('caidat', 'edit');
        return `<details class="cc-ct no-print" ${UI.ccPoOpen ? 'open' : ''} data-po><summary>${ic('alert')} Xử lý khi lái xe không đủ tiền trừ <span>Phần thiếu không chuyển sang tháng sau</span></summary><div class="cc-ctb po-rules">
          <div class="po-r"><b>1 · Không chuyển nợ</b><span>Thực nhận không bao giờ âm. Phần thiếu tiền bỏ qua, không chuyển sang tháng sau.</span></div>
          <div class="po-r"><b>2 · Thứ tự trừ</b><span>BHXH → Chi phí khác → Lương CK. Hết tiền ở bước nào thì các khoản sau không trừ.</span></div>
          <div class="po-r"><b>3 · Tạm dừng BHXH</b><span><label style="display:inline-flex;gap:6px;align-items:center;background:none;border:0;padding:0"><input type="checkbox" data-po-bh ${R.bh14 ? 'checked' : ''} ${ed ? '' : 'disabled'}> Không trừ BHXH tháng lái xe có từ 14 ngày làm việc không chạy</label> <em>(hỏi kế toán trước khi bật)</em></span></div>
        </div></details>`; })()}
      <div class="pg-host"><div class="cc-wrap"><table class="cc"><thead><tr><th class="nm">Nhân viên<br><small style="font-weight:500">${F.month(ym)}</small></th>
        ${days.map(d => `<th class="${ym + '-' + pad(d) === today ? 'td' : isOff(ym, d) ? 'we' : ''}">${d}<br>${D.dowName[D.dow(ym, d)]}</th>`).join('')}
        <th>Công<br>làm</th><th>Tiền<br>công</th><th>Chi phí<br>khác</th><th>Lương<br>CK</th><th>Trừ<br>BHXH</th><th>Thực<br>nhận</th></tr></thead>
        <tbody>${emps.map(e => { const eg = GM.get(e), gh = eg !== lastG ? (lastG = eg, `<tr class="cc-grp"><td colspan="${n + 7}"><div class="cc-gs">${ic(eg.startsWith('~V') ? 'building' : 'bus')} ${esc(eg.replace(/^~+/, ''))} <span>${gCount[eg]} người</span></div></td></tr>`) : ''; const a = att(ym, e.id), drv = isDriver(e), lc = drv ? lcDays(ym, e.id) : {}, au = drv ? {} : autoDays(ym, e); return gh + `<tr data-e="${e.id}" class="${drv && PO.of(ym, e.id).noChuyen ? 'po-row' : ''}"><td class="nm"><b>${esc(e.ten)}</b>${drv ? ` <span class="cc-drv" data-tip="Ngày công tự lấy từ Lịch chạy">${ic('bus')}</span>${MRT.badge(e, ym)}` : ''}${drv && q ? (T => T.length ? `<div style="font-weight:400;font-size:11px;color:#667085;white-space:normal">${T.map(x => esc(x.t) + ' (' + F.num(x.n) + ' công)').join(' · ')}</div>` : '')(empTuyen(ym, e.id)) : ''}</td>
          ${days.map(d => { const k = a.d[d] || '', auto = !k && (lc[d] || au[d]), c = CODES[k || (auto ? 'X' : '')], lv = !k && lc[d] ? F.num(lc[d].cong) : ''; return `<td class="d ${isOff(ym, d) ? 'we' : ''} ${auto ? 'lc' : ''} ${lv ? 'num' : ''}" data-e="${e.id}" data-d="${d}" style="${c ? `background:${c.bg};color:${c.c}` : ''}"${!k && au[d] ? ' data-tip="Tự điền X · chấm ký hiệu khác nếu nghỉ"' : ''}${lc[d] ? ` data-tip="${F.num(lc[d].cong)} công · ${lc[d].n} chuyến${lc[d].gio.length ? ' (' + esc(lc[d].gio.join(', ')) + ')' : ''}\n${esc(Object.entries(lc[d].tu).map(([g, c]) => g + ': ' + F.num(c) + ' công').join('\n'))}\nXe: ${esc(lc[d].xe.join(', ') || 'chưa gán xe')} · tiền tài ${F.money(lc[d].tt)} đ"` : ''}>${k || lv || (auto ? 'X' : '')}</td>`; }).join('')}
          ${ccRowSum(ym, e.id)}</tr>`; }).join('') || `<tr><td class="nm">Chưa có nhân viên</td></tr>`}</tbody></table></div><div class="tbl-pager" id="ccP">${pagerHTML(pst, found.length)}</div></div>
      <p class="small muted">Công chuẩn: <b>${S().congChuan}</b> ngày/tháng · Ngày nghỉ tuần: <b>${S().ngayNghi === 'T7CN' ? 'Thứ 7 và Chủ nhật' : 'Chủ nhật'}</b> · Công hưởng lương = đi làm + công tác + phép + lễ. Sửa trong Cài đặt.</p>`;
    const ctd = el.querySelector('.cc-ct:not([data-po])'); if (ctd) ctd.addEventListener('toggle', () => { UI.ccCtOpen = ctd.open; });
    const pod = el.querySelector('[data-po]'); if (pod) pod.addEventListener('toggle', () => { UI.ccPoOpen = pod.open; });
    const poSave = (k, v) => { const st = S(); st.noRule = { ...(st.noRule || {}), [k]: v }; PO.c.clear(); PO._fo = undefined; Store.changed(); App.render(); toast('Đã lưu quy tắc xử lý thiếu tiền', 'ok'); };
    const pc = el.querySelector('[data-po-cap]'); if (pc) pc.addEventListener('change', () => poSave('cap', pc.value === '' ? 0 : Math.max(0, Math.min(100, +pc.value))));
    const pb = el.querySelector('[data-po-bh]'); if (pb) pb.addEventListener('change', () => poSave('bh14', pb.checked));
    el.querySelectorAll('[data-ct]').forEach(i => i.addEventListener('change', () => { const st = S(); st.congTuyen = st.congTuyen || {}; const v = i.value === '' ? 1 : Math.max(0, +i.value); st.congTuyen[i.dataset.ct] = v; Store.changed(); App.render(); toast('Đã lưu: ' + esc(i.dataset.ct) + ' = ' + F.num(v) + ' công/chuyến', 'ok'); }));
    el.querySelectorAll('[data-grv]').forEach(b => b.onclick = () => { const v = b.dataset.grv, cur = UI.ccGrps || []; UI.ccGrps = !v ? [] : cur.includes(v) ? cur.filter(x => x !== v) : [...cur, v]; pst.page = 0; App.render(); });
    el.querySelectorAll('[data-pbv]').forEach(b => b.onclick = () => { const v = b.dataset.pbv, cur = vCham.sel(); UI.ccPbs = !v ? [] : cur.includes(v) ? cur.filter(x => x !== v) : [...cur, v]; pst.page = 0; App.render(); });
    bindPager($('#ccP'), pst, App.render);
    let tq; if ($('#ccQ')) $('#ccQ').addEventListener('input', e => { clearTimeout(tq); tq = setTimeout(() => { UI.ccq = e.target.value; pst.page = 0; App.render(); const i = $('#ccQ'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 300); });
    const grid = $('.cc', el);
    const paint = td => {
      const e = td.dataset.e, d = +td.dataset.d, a = att(ym, e);
      if ((a.d[d] || '') === UI.brush) return;
      if (UI.brush) a.d[d] = UI.brush; else delete a.d[d];
      const c = CODES[UI.brush]; td.textContent = UI.brush; td.style.background = c ? c.bg : ''; td.style.color = c ? c.c : '';
      const tr = td.parentElement; $$('td.sum', tr).forEach(x => x.remove()); tr.querySelector('td.ot').insertAdjacentHTML('beforebegin', ccRowSum(ym, e));
      Store.changed();
    };
    grid.addEventListener('mousedown', e => { const td = UI.ccPaint && e.target.closest('td.d'); if (!td) return; e.preventDefault(); painting = true; paint(td); });
    grid.addEventListener('mouseover', e => { if (!painting) return; const td = e.target.closest('td.d'); if (td) paint(td); });
    grid.addEventListener('change', e => { const i = e.target.closest('[data-ot]'); if (!i) return; att(ym, i.dataset.ot).ot = Math.max(0, parseFloat(i.value) || 0); Store.changed(); });
  },
  cols() { const ym = UI.m, n = D.daysIn(ym); return [{ label: 'Mã NV', width: 9 }, { label: 'Họ và tên', width: 24 }, { label: 'Phòng ban', width: 14 }, ...Array.from({ length: n }, (_, i) => ({ label: `${i + 1}\n${D.dowName[D.dow(ym, i + 1)]}`, type: 'center', width: 4.3 })), { label: 'Công làm', type: 'num', sum: true, width: 8 }, { label: 'Tiền công', type: 'money', sum: true, width: 13 }, { label: 'Chi phí khác', type: 'money', sum: true, width: 12 }, { label: 'Lương CK', type: 'money', sum: true, width: 13 }, { label: 'Trừ BHXH', type: 'money', sum: true, width: 13 }, { label: 'Thực nhận', type: 'money', sum: true, width: 14 }]; },
  rows() { const ym = UI.m, n = D.daysIn(ym); return vCham.emps().map(e => { const a = att(ym, e.id), s = summarize(ym, e.id), lc = s.drv ? lcDays(ym, e.id) : {}, au = s.drv ? {} : autoDays(ym, e); return [e.ma, e.ten, e.phongBan, ...Array.from({ length: n }, (_, i) => a.d[i + 1] || (lc[i + 1] ? lc[i + 1].cong : au[i + 1] ? 'X' : '')), s.lv, s.drv || s.tienCong ? s.tienCong : '', s.cpKhac, ...(o => [o.lck, o.bh, o.show ? o.thucNhan : ''])(PO.of(ym, e.id))]; }); },
  legend() { return 'Ký hiệu: ' + Object.entries(CODES).map(([k, c]) => `${k} = ${c.n}`).join(' · '); },
  excel() { XLSX.save(`Bang cham cong ${UI.m}`, [{ name: 'Chấm công ' + UI.m, title: 'BẢNG CHẤM CÔNG ' + F.month(UI.m).toUpperCase(), subtitles: [companyLine()], columns: vCham.cols(), rows: vCham.rows(), totals: true, freezeCols: 2, footer: [vCham.legend()] }]); },
  print() {
    const ym = UI.m, n = D.daysIn(ym), cols = vCham.cols(), rows = vCham.rows();
    const W = cols.reduce((a, c) => a + (c.width || 8), 0), cg = `<colgroup>${cols.map(c => `<col style="width:${((c.width || 8) / W * 100).toFixed(2)}%">`).join('')}</colgroup>`;
    const head = `<tr>${cols.map(c => `<th style="padding:3px 1px;font-size:8.5px">${esc(c.label).replace('\n', '<br>')}</th>`).join('')}</tr>`;
    const body = rows.map(r => `<tr>${r.map((v, i) => { const c = CODES[v]; return `<td class="${i > 2 ? 'c' : ''}" style="padding:3px 1px;font-size:8.5px;${i >= 3 + n ? 'white-space:nowrap;' : ''}${c && i > 2 && i < 3 + n ? `background:${c.bg};color:${c.c};font-weight:700` : ''}">${typeof v === 'number' ? F.num(v) : esc(v)}</td>`; }).join('')}</tr>`).join('');
    Print.run(`<div class="pr">${Print.head()}<h2>Bảng chấm công ${F.month(ym)}</h2><table style="table-layout:fixed;width:100%">${cg}<thead>${head}</thead><tbody>${body}</tbody></table>${Print.signs(['Người chấm công', 'Phụ trách bộ phận', 'Giám đốc'])}</div>`, { landscape: true, title: 'Bang cham cong ' + ym });
  }
};
Object.assign(ACT, {
  brush: d => { UI.brush = d.k; $$('.brush').forEach(b => b.classList.toggle('on', b.dataset.k === d.k)); },
  ccFill: () => {
    const ym = UI.m, n = D.daysIn(ym), today = D.today(); let c = 0;
    vCham.emps().filter(e => !isDriver(e)).forEach(e => { const a = att(ym, e.id); for (let d = 1; d <= n; d++) { if (isOff(ym, d) || a.d[d]) continue; if (ym + '-' + pad(d) > today && ym <= D.ymNow()) continue; a.d[d] = 'X'; c++; } });
    App.changed(); toast(`Đã điền ${c} ô "X" (bỏ qua ngày nghỉ tuần, ngày chưa tới và lái xe: công lái xe lấy từ Lịch chạy)`, 'ok');
  },
  ccClear: async () => { if (await Modal.confirm(`Xóa toàn bộ chấm công ${F.month(UI.m)}${vCham.sel().length ? ' của ' + esc(vCham.sel().join(', ')) : ''}?`, { ok: 'Xóa', danger: true })) { vCham.emps().forEach(e => { if (DB.cham[UI.m]) delete DB.cham[UI.m][e.id]; }); App.changed(); } }
});
MODL.def('chamcong', vCham);
