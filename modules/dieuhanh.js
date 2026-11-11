'use strict';
/* Module Điều hành xe (bảng điều hành); quét ảnh, nhập Excel, cảnh báo, lưu phân công ở index vì dùng chung · tải khi mở màn hình (MODL). */
const dhAbbr = r => { const ini = t => String(t || '').split(/\s+/).filter(Boolean).map(x => x[0].toUpperCase()).join(''), p = String(r || '').split(/\s*(?:⇄|<>)\s*/).map(ini).filter(Boolean); return p.length ? p.join('⇄') : String(r || ''); };
const vDH = {
  print: false,
  title: 'Điều hành xe', icon: 'kanban', desc: 'Bảng điều hành theo tuyến và giờ chạy: xe, lái xe và số vé của từng chuyến',
  tools: () => `${VT.pick()}<button class="btn" data-act="dhPrint">${ic('printer')} In phân công</button><button class="btn xl" data-act="dhImport">${ic('sheet')} Nhập Excel</button><button class="btn" data-act="dhScan">${ic('upload')} Quét ảnh</button>${Auth.can('hoso', 'add') ? `<button class="btn" data-act="dhSaveRange" title="Lưu Bảng phân công của nhiều ngày vào Lưu trữ hồ sơ">${ic('folder')} Lưu phân công vào hồ sơ</button>` : ''}<button class="btn" data-act="lcGen">${ic('refresh')} Tạo lịch từ Giờ chạy</button>`,
  render(el) {
    const day = lcDay(), T = DB.lichchay.filter(l => l.ngay === day), GC = DB.giochay.filter(g => g.tt !== 'ĐÓNG' && g.tuyen && g.gio);
    const allR = [...new Set([...T.map(l => l.tuyen), ...GC.map(g => g.tuyen)])].sort(routeCmp), allG = [...new Set(allR.map(dhGrp))], sel = dhSel.filter(g => allG.includes(g)), curL = sel.length ? sel : (allG[0] ? [allG[0]] : []);
    const TR = T.filter(l => curL.includes(dhGrp(l.tuyen))), gios = [...new Set([...TR.map(l => l.gio), ...GC.filter(g => curL.includes(dhGrp(g.tuyen))).map(g => g.gio)])].sort(), nHid = 0, routes = curL.flatMap(g => allR.filter(r => dhGrp(r) === g).sort((a, b) => (a.toUpperCase() === g ? -1 : 0) - (b.toUpperCase() === g ? -1 : 0)));
    const used = {}; T.forEach(l => { if (l.xeId) used[l.xeId] = (used[l.xeId] || 0) + 1; });
    const veh = DB.vehicles.filter(v => !v.ngung);
    const chip = l => { const xc = lcHide(l) ? [] : XC.of(l), v = lcXe(l), e = lcEmp(l), n = dvBook(l.id).length, c = dvCap(l), wn = dhDocWarn(l), wt = dhTimeWarn(l), wk = (wn.length ? `<span class="dx-wn" title="Giấy tờ hết hạn (NĐ 158/2024, Điều 11 khoản 4):\n• ${esc(wn.join('\n• '))}">⚠ ${wn.length}</span>` : '') + (wt.length ? `<span class="dx-wn dx-wt" title="Thời gian lái xe (NĐ 158/2024, Điều 11 khoản 5; Luật TTATGTĐB Điều 64):\n• ${esc(wt.join('\n• '))}">⏱ ${wt.length}</span>` : ''), lk = !(l.laiXe || l.khoa) || !Auth.can('dieuhanh', 'edit') ? '' : l.khoa ? (lcAdmin() ? `<span class="dx-lk" role="button" data-act="dhUnlock" data-id="${l.id}" title="Chuyến đang khóa: chỉ Admin thấy tên lái xe. Bấm để mở khóa cho mọi người cùng thấy">${ic('lock')}</span>` : `<span class="dx-lk" title="Chuyến đã khóa, chỉ Admin xem và mở khóa được">${ic('lock')}</span>`) : lcCan(l) ? `<span class="dx-lk" role="button" data-act="dhUnlock" data-id="${l.id}" title="Bấm để khóa chuyến: ẩn tên lái xe, chỉ Admin thấy">${ic('unlock')}</span>` : ''; return `<button class="dx-chip ${n >= c ? 'full' : ''} ${lcGone(l) ? 'gone' : ''} ${xc.length ? 'dx-cross' : ''}" data-act="dhChip" data-id="${l.id}" data-lx="${lcHide(l) ? '' : esc([l.laiXe, l.laiXe2].filter(Boolean).join(' '))}" data-xe="${esc(l.xeId || '')}" title="Bấm để sửa nhanh xe, lái xe, hủy chuyến hoặc mở sơ đồ ghế. Rê chuột (điện thoại: nhấn giữ) vào tên lái xe hoặc biển số để xem các giờ người / xe đó chạy trong ngày">${lk}${wk}<b class="bk">${v.bks ? esc(v.bks) : '<span class="un">Chưa gán xe</span>'}</b><span class="nm">${e.ten ? avatarHTML(e.ten, e.avatar, 'dx-av') + esc(e.ten) : '<span class="un">Chưa gán lái xe</span>'}</span><span class="st"><span class="n">${n}/${c}</span> vé${lcGone(l) ? '<em>Đã xuất bến</em>' : ''}</span>${xc.length ? `<span class="dx-xc" title="${esc(XC.tip(xc))}">⇄ Chạy chéo: ${xc.map(x => (x.kind === 'xe' ? 'xe' : 'lái xe') + ' tuyến ' + x.main.s).join(', ')}</span>` : ''}</button>`; };
    const lbl = dhMode === 'group' ? 'nhóm tuyến đường' : 'tuyến đường', allL = dhMode === 'group' ? 'Tất cả các nhóm tuyến đường' : 'Tất cả các tuyến đường';
    const selBox = `<div class="dx-chips">${allG.length > 1 ? `<button type="button" class="dx-cp all ${curL.length === allG.length ? 'on' : ''}" data-act="dhAll" title="${allL}">Tất cả</button>` : ''}${allG.map(g => `<button type="button" class="dx-cp ${curL.includes(g) ? 'on' : ''}" data-act="dhG" data-g="${esc(g)}" title="Bấm để chọn / bỏ ${lbl} này">${esc(g)}</button>`).join('') || `<span class="muted">Chưa có ${lbl}</span>`}</div>`;
    const nT = TR.filter(l => l.laiXe).length, nDay = T.filter(l => l.laiXe).length, nNo = TR.filter(l => !l.laiXe).length, nMiss = routes.reduce((a, r) => a + gios.filter(g => GC.some(x => x.tuyen === r && x.gio === g) && !TR.some(l => l.tuyen === r && l.gio === g)).length, 0);
    const head = `<div class="dx-bar"><div class="dx-dt"><button class="btn sm" data-act="dhNav" data-n="-1" title="Ngày trước">${ic('back')}</button><span class="dx-dp"><button type="button" class="inp dx-dbtn" data-act="dhPop" title="Bấm để mở lịch (dương và âm lịch)">${ic('calendar')}<b>${F.date(day)}</b><span class="car">▾</span></button>${dhPop ? '<div class="dx-pop">@@DXCAL@@</div>' : ''}</span><button class="btn sm" data-act="dhNav" data-n="1" title="Ngày sau"><span style="display:inline-block;transform:scaleX(-1);line-height:0">${ic('back')}</span></button><button class="btn sm" data-act="dhNav" data-n="0">Hôm nay</button><b class="dx-dow">${D.dowName[D.parse(day).getDay()]}, ${F.date(day)}<span class="dx-al">🌙 ${AL.txt(day)}</span></b></div><div class="dx-rt"><div class="dx-modes">${[['route', 'Tuyến đường'], ['group', 'Nhóm tuyến đường']].map(m => `<button type="button" class="dx-rd ${dhMode === m[0] ? 'on' : ''}" data-act="dhMode" data-m="${m[0]}"><i></i>${m[1]}</button>`).join('')}</div>${selBox}</div></div><div class="dx-stats"><span><b>${nT}</b> chuyến đã chọn có lái xe</span><span><b>${nDay}</b> chuyến cả ngày</span>${nNo ? `<span class="mut"><b>${nNo}</b> chuyến chưa gán lái xe</span>` : ''}${nMiss ? `<span class="mut"><b>${nMiss}</b> giờ chưa tạo chuyến${Auth.can('dieuhanh', 'add') ? ` · <a role="button" style="cursor:pointer" data-act="lcGen">Tạo lịch từ Giờ chạy</a>` : ''}</span>` : ''}</div>`;
    const table = routes.length && gios.length ? `<div class="dx-wrap"><table class="dx" style="--dxw:${120 + gios.length * 200 + 64}px"><thead><tr><th class="rt"></th>${gios.map(g => `<th>${esc(g)}</th>`).join('')}<th class="dx-addh"></th></tr></thead><tbody>${routes.map(r => `<tr><th class="rt" title="${esc(r)}">${esc(dhAbbr(r))} <span class="dx-cnt">(${TR.filter(l => l.tuyen === r && l.laiXe).length})</span></th>${gios.map(g => { const L = TR.filter(l => l.tuyen === r && l.gio === g), gc = !L.length && GC.find(x => x.tuyen === r && x.gio === g); return `<td data-t="${esc(g)}" class="${L.length ? '' : 'e'}">${L.map(chip).join('')}${gc ? (Auth.can('dieuhanh', 'add') ? `<button type="button" class="dx-chip dx-new" data-act="dhMk" data-r="${esc(r)}" data-g="${esc(g)}" title="Giờ chạy có trong mục Giờ chạy nhưng hôm nay chưa tạo chuyến. Bấm để tạo và gán xe, lái xe">${ic('plus')}<b>Tạo chuyến</b><span class="nm">${gc.xeId ? esc((DB.vehicles.find(v => v.id === gc.xeId) || {}).bks || '') : 'Chưa có chuyến'}</span></button>` : '<span class="dx-nt">Chưa có chuyến</span>') : ''}</td>`; }).join('')}<td class="dx-addc">${Auth.can('dieuhanh', 'add') ? `<button type="button" class="dx-addbtn" data-act="dhAddGio" data-r="${esc(r)}" title="Thêm giờ chạy cho tuyến ${esc(r)}">${ic('plus')}</button>` : ''}</td></tr>`).join('')}</tbody></table></div>` : '<div class="muted" style="padding:20px">Chưa có giờ chạy nào. Vào mục <b>Giờ chạy</b> để thêm giờ chạy cho các tuyến.</div>';
    const foot = `<details class="dx-foot"><summary>Xe chưa điều (${veh.filter(v => !used[v.id]).length}) · Xe đã điều (${veh.filter(v => used[v.id]).length})</summary><div><b>Xe chưa điều:</b>${veh.filter(v => !used[v.id]).map(v => `<span><i class="lk"></i>${esc(v.bks)} (${esc(v.soCho || '?')})</span>`).join('') || '<span class="muted">Không còn xe</span>'}</div><div><b>Xe đã điều:</b>${veh.filter(v => used[v.id]).map(v => `<span><i></i>${esc(v.bks)} (${used[v.id]})</span>`).join('') || '<span class="muted">Chưa điều xe nào</span>'}</div></details>`;
    const ym = day.slice(0, 7), nd = D.daysIn(ym), lead = (D.parse(ym + '-01').getDay() + 6) % 7, hasT = {}; DB.lichchay.forEach(l => { if (l.ngay.slice(0, 7) === ym && l.laiXe) hasT[l.ngay] = 1; });
    const cells = [...Array(lead).fill(null), ...Array.from({ length: nd }, (_, i) => ym + '-' + String(i + 1).padStart(2, '0'))];
    const cal = `<div class="dv-side dx-cal"><div class="row" style="align-items:center;gap:6px"><button class="btn sm" data-act="dhMon" data-n="-1">${ic('back')}</button><b class="grow" style="text-align:center">Tháng ${day.slice(5, 7)}/${day.slice(0, 4)}</b><button class="btn sm" data-act="dhMon" data-n="1"><span style="display:inline-block;transform:scaleX(-1);line-height:0">${ic('back')}</span></button></div>
      <div class="dv-days">${['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(x => `<small style="font-size:11px;color:#98a2b3;padding:2px 0">${x}</small>`).join('')}${cells.map(d => d ? `<button class="dv-d ${d === day ? 'sel' : ''} ${d === D.today() ? 'tod' : ''}" data-act="dhDay" data-d="${d}"><b>${+d.slice(8)}</b>${AL.cell(d)}<small style="height:6px">${hasT[d] ? '<span style="display:inline-block;width:5px;height:5px;border-radius:50%;background:' + (d === day ? '#fff' : 'var(--vt-a,#38a3e8)') + '"></span>' : ''}</small></button>` : '<span></span>').join('')}</div>${AL.selHTML(day)}
      <button class="btn sm" data-act="dhDay" data-d="${D.today()}" style="width:100%">Hôm nay</button></div>`;
    el.insertAdjacentHTML('beforeend', `<div class="dx-top2">${head.replace('@@DXCAL@@', () => cal)}</div>` + table);
    const cd = el.querySelector('.dx-cald'); if (cd) cd.ontoggle = () => { try { localStorage.setItem('dh.cal', cd.open ? '1' : '0'); } catch (e) { } };
    const di = $('#dhDate', el); if (di) di.onchange = () => { if (di.value) { LC.ngay = di.value; App.render(); } };
  },
};
{ const r0 = vDH.render; vDH.render = function (el) { r0.call(this, el); const tok = el._kmTok = {}; MODL.load('kmxe').then(() => { if (el._kmTok === tok && el.isConnected && App.cur === 'dieuhanh') kmPanel(el); }).catch(() => { }); }; }
/* vào màn hình hôm nay: cuộn tới cột giờ chạy kế tiếp và tô sáng cột đó */
vDH.goNext = function (el) {
  const day = LC.ngay || D.today(); if (day !== D.today()) return;
  const w = el.querySelector('.dx-wrap'), hs = w ? [...w.querySelectorAll('thead th')].slice(1, -1) : []; if (!hs.length) return;
  const n = new Date(), now = String(n.getHours()).padStart(2, '0') + ':' + String(n.getMinutes()).padStart(2, '0');
  const th = hs.find(h => h.textContent.trim() >= now) || hs[hs.length - 1]; th.classList.add('dx-next');
  const rt = w.querySelector('thead th.rt'), d = th.getBoundingClientRect().left - w.getBoundingClientRect().left - (rt ? rt.getBoundingClientRect().width : 0) - 8; w.scrollLeft = Math.max(0, w.scrollLeft + d);
};
{ const r1 = vDH.render; vDH.render = function (el) { r1.call(this, el); if (vDH._enter) { vDH._enter = false; requestAnimationFrame(() => { try { vDH.goNext(el); } catch (e) { } }); } }; }
{ const g0 = App.go; App.go = function (id) { if (id === 'dieuhanh' && App.cur !== 'dieuhanh') vDH._enter = true; return g0.apply(this, arguments); }; }
vDH._enter = App.cur !== 'dieuhanh' || true;
addCSS(`.dx thead th.dx-next{background:var(--p)!important;color:#fff!important;border-radius:8px 8px 0 0}`);
MODL.def('dieuhanh', vDH);

/* Tô sáng: rê chuột (điện thoại: nhấn giữ) vào tên lái xe hoặc biển số → nổi bật mọi chuyến trong ngày của người / xe đó, kèm bảng tóm tắt giờ chạy */
const dhHL = {
  on(el, kind, id, pin) {
    const w = el.querySelector('.dx-wrap'); if (!w || !id) return;
    dhHL.off(el, true); dhHL.cur = { kind, id, pin };
    w.classList.add('dx-focus');
    w.querySelectorAll('.dx-chip,.dc-t').forEach(c => { const v = kind === 'lx' ? (c.dataset.lx || '').split(' ') : [c.dataset.xe]; c.classList.toggle('dx-hl', v.includes(id)); });
    const day = lcDay(), L = DB.lichchay.filter(l => l.ngay === day && !lcHide(l) && (kind === 'lx' ? [l.laiXe, l.laiXe2].includes(id) : l.xeId === id)).sort((a, b) => String(a.gio).localeCompare(String(b.gio)));
    const who = kind === 'lx' ? ((DB.employees.find(e => e.id === id) || {}).ten || '') : ((DB.vehicles.find(v => v.id === id) || {}).bks || '');
    const m = t => { const [h, mi] = String(t || '0:0').split(':').map(Number); return h * 60 + (mi || 0); }, hm = x => Math.floor(x / 60) + 'g' + String(x % 60).padStart(2, '0');
    const rows = L.map((l, i) => { const o = kind === 'lx' ? ((lcXe(l) || {}).bks || 'chưa gán xe') : (lcEmp(l).ten || 'chưa gán lái xe'), gap = i ? m(l.gio) - m(L[i - 1].gio) : null;
      const xc = XC.of(l).filter(x => x.kind === kind && x.id === id);
      return `${gap !== null ? `<span class="dx-gap${gap < 60 ? ' bad' : ''}">${gap <= 0 ? 'trùng giờ' : 'cách ' + hm(gap)}</span>` : ''}<span class="dx-hlt${xc.length ? ' xc' : ''}"><b>${esc(l.gio)}</b> ${esc(dhAbbr(l.tuyen))} · ${esc(o)}${xc.length ? ' · ⇄ chéo' : ''}</span>`; }).join('');
    let bar = el.querySelector('.dx-hlbar'); if (!bar) { bar = document.createElement('div'); bar.className = 'dx-hlbar'; el.appendChild(bar); }
    bar.innerHTML = `<div class="dx-hlh"><b>${esc(who)}</b> · ${L.length} chuyến ngày ${F.date(day)}${L.length > 1 ? ` · từ ${esc(L[0].gio)} đến ${esc(L[L.length - 1].gio)}` : ''}${pin ? '<button type="button" class="dx-hlx" aria-label="Đóng">×</button>' : ''}</div><div class="dx-hlr">${rows}</div>`;
  },
  off(el, keep) { const w = el.querySelector('.dx-wrap'); if (w) { w.classList.remove('dx-focus'); w.querySelectorAll('.dx-hl').forEach(c => c.classList.remove('dx-hl')); } if (!keep) { const b = el.querySelector('.dx-hlbar'); if (b) b.remove(); dhHL.cur = null; } },
  bind(el) {
    if (el._dxHl) return; el._dxHl = 1;
    const tgt = e => { const c = e.target.closest && e.target.closest('.dx-chip,.dc-t'); if (!c) return null; if (e.target.closest('.nm')) return c.dataset.lx ? ['lx', c.dataset.lx.split(' ')[0]] : null; if (e.target.closest('.bk')) return c.dataset.xe ? ['xe', c.dataset.xe] : null; return null; };
    let tm = null, swallow = false, lt = 0; const mouse = () => Date.now() - lt > 800;   // bỏ qua sự kiện chuột giả sau khi chạm màn hình
    el.addEventListener('mouseover', e => { if (!mouse() || (dhHL.cur && dhHL.cur.pin)) return; const t = tgt(e); if (t && !(dhHL.cur && dhHL.cur.kind === t[0] && dhHL.cur.id === t[1])) dhHL.on(el, t[0], t[1]); });
    el.addEventListener('mouseout', e => { if (!mouse() || !dhHL.cur || dhHL.cur.pin) return; const n = e.relatedTarget ? tgt({ target: e.relatedTarget }) : null; if (!n || n[0] !== dhHL.cur.kind || n[1] !== dhHL.cur.id) dhHL.off(el); });
    el.addEventListener('touchstart', e => { lt = Date.now(); const t = tgt(e); clearTimeout(tm); if (!t) return; tm = setTimeout(() => { swallow = true; dhHL.on(el, t[0], t[1], true); if (navigator.vibrate) try { navigator.vibrate(20); } catch (x) { } }, 450); }, { passive: true });
    ['touchend', 'touchmove', 'touchcancel'].forEach(k => el.addEventListener(k, () => clearTimeout(tm), { passive: true }));
    el.addEventListener('contextmenu', e => { if (tgt(e)) e.preventDefault(); });
    el.addEventListener('click', e => {
      if (swallow) { swallow = false; e.preventDefault(); e.stopPropagation(); return; }
      if (e.target.closest('.dx-hlx') || (dhHL.cur && dhHL.cur.pin && !e.target.closest('.dx-hlbar'))) { dhHL.off(el); if (e.target.closest('.dx-hlx')) { e.preventDefault(); e.stopPropagation(); } }
    }, true);
  }
};
addCSS(`.dx-chip{transition:opacity .15s,box-shadow .15s}.dx-chip .nm,.dx-chip .bk{cursor:help}.dx-focus .dx-chip,.dx-focus .dc-t{opacity:.28}.dx-focus .dx-chip.dx-hl,.dx-focus .dc-t.dx-hl{opacity:1;box-shadow:0 0 0 3px #f59e0b,0 4px 14px rgba(245,158,11,.45);position:relative;z-index:1}
.dx-hlbar{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(76px + env(safe-area-inset-bottom));z-index:60;max-width:min(760px,calc(100vw - 24px));background:#1e293b;color:#fff;border-radius:12px;padding:8px 12px;box-shadow:0 8px 24px rgba(0,0,0,.3);font-size:13px;pointer-events:auto}
.dx-hlh{display:flex;flex-wrap:wrap;align-items:center;gap:2px 6px;margin-bottom:4px}.dx-hlh>b{white-space:nowrap}.dx-hlx{margin-left:auto;background:none;border:0;color:#fff;font-size:20px;line-height:1;cursor:pointer;padding:0 4px}
.dx-hlr{display:flex;flex-wrap:wrap;align-items:center;gap:4px 6px}.dx-hlt.xc{background:#fdba74;box-shadow:inset 0 0 0 2px #c2410c}.dx-hlt{background:#f59e0b;color:#1e293b;border-radius:6px;padding:2px 7px;white-space:nowrap}.dx-gap{font-size:11px;color:#cbd5e1}.dx-gap.bad{color:#fca5a5;font-weight:700}
@media(min-width:900px){.dx-hlbar{bottom:16px}}`);
addCSS(`.dx-chip.dx-cross{border-left:4px dashed #ea580c!important;background:linear-gradient(90deg,#fff7ed,#fff 60%)}.dx-xc{display:block;width:max-content;max-width:100%;overflow:hidden;text-overflow:ellipsis;margin-top:4px;font-size:10.5px;font-weight:800;color:#c2410c;background:#ffedd5;border:1px solid #fdba74;border-radius:6px;padding:0 5px;cursor:help;white-space:nowrap}`);
{ const r2 = vDH.render; vDH.render = function (el) { r2.call(this, el); dhHL.cur = null; dhHL.bind(el); }; }
/* ===== Dạng thẻ (điện thoại): mỗi tuyến 1 khối có vòng tỉ lệ lấp ghế, thống kê vé, nút Tăng cường; mỗi chuyến 1 ô:
   giờ · vé/ghế · tuyến · lái xe · BIỂN SỐ ĐẦY ĐỦ (tự co chữ cho vừa ô, không viết tắt). Bấm ô = sửa nhanh như dạng bảng. ===== */
const DC = {
  open: new Set(), shut: new Set(),
  mode() { let m = ''; try { m = localStorage.getItem('dh.view') || ''; } catch (e) { } return m || (window.innerWidth < 760 ? 'the' : 'bang'); },
  set(m) { try { localStorage.setItem('dh.view', m); } catch (e) { } App.render(); },
  ring(n, c) { const r = 26, L = 2 * Math.PI * r, p = c ? Math.min(1, n / c) : 0; return `<svg viewBox="0 0 64 64" class="dc-ring"><circle cx="32" cy="32" r="${r}" fill="none" stroke="#e5e7eb" stroke-width="6"/><circle cx="32" cy="32" r="${r}" fill="none" stroke="var(--p)" stroke-width="6" stroke-linecap="round" stroke-dasharray="${(L * p).toFixed(1)} ${L.toFixed(1)}" transform="rotate(-90 32 32)"/><text x="32" y="31" text-anchor="middle" class="a">${n}</text><text x="32" y="45" text-anchor="middle" class="b">|${c}</text></svg>`; },
  tile(l) {
    const v = lcXe(l) || {}, e = lcEmp(l) || {}, n = dvBook(l.id).length, c = dvCap(l), gone = lcGone(l), miss = !l.laiXe || !l.xeId;
    let xc = []; try { xc = lcHide(l) ? [] : XC.of(l); } catch (x) { } const wn = (() => { try { return dhDocWarn(l).length + dhTimeWarn(l).length; } catch (x) { return 0; } })();
    return `<button type="button" class="dc-t${gone ? ' gone' : ''}${miss ? ' miss' : ''}${xc.length ? ' dx-cross' : ''}" data-act="dhChip" data-id="${l.id}" data-lx="${lcHide(l) ? '' : esc([l.laiXe, l.laiXe2].filter(Boolean).join(' '))}" data-xe="${esc(l.xeId || '')}" ${xc.length ? `title="${esc(XC.tip(xc))}"` : ''}>
      <div class="dc-h"><b>${esc(l.gio || '')}</b>${wn ? `<i class="dc-w">⚠${wn}</i>` : ''}<span><b>${n}</b>|${c}</span></div>
      <div class="dc-r">${esc(dhAbbr(l.tuyen))}${xc.length ? ' <em>⇄ chéo</em>' : ''}</div>
      <div class="dc-n nm">${e.ten ? esc(e.ten) : '<span class="un">Chưa gán lái xe</span>'}</div>
      <div class="dc-x bk">${v.bks ? esc(v.bks) : '<span class="un">Chưa gán xe</span>'}</div></button>`;
  },
  html(el) {
    const day = lcDay(), routes = [...el.querySelectorAll('.dx tbody th.rt')].map(th => th.title).filter(Boolean);
    if (!routes.length) return '';
    const GC = (DB.giochay || []).filter(g => g.tt !== 'ĐÓNG' && g.tuyen && g.gio), can = Auth.can('dieuhanh', 'add');
    return routes.map(r => {
      const T = (DB.lichchay || []).filter(l => l.ngay === day && l.tuyen === r).sort((a, b) => String(a.gio).localeCompare(String(b.gio)));
      let bk = 0, tt = 0, cap = 0; T.forEach(l => { const B = dvBook(l.id); bk += B.length; tt += B.filter(b => b.tt === 'tra').length; cap += dvCap(l) || 0; });
      const miss = GC.filter(g => g.tuyen === r && !T.some(l => l.gio === g.gio)).sort((a, b) => String(a.gio).localeCompare(String(b.gio)));
      const shut = DC.shut.has(r);
      return `<section class="dc-rt"><div class="dc-hd" data-dcr="${esc(r)}">${DC.ring(bk, cap)}<div class="grow"><h3>${esc(r)}</h3><div class="dc-st">TT: <b>${tt}</b> · ĐC: <b>${bk - tt}</b> · Trống: <b>${Math.max(0, cap - bk)}</b> · Tổng ghế: <b>${cap}</b></div></div><span class="dc-cv${shut ? '' : ' up'}">${ic('back')}</span></div>
        ${shut ? '' : `<div class="dc-bar"><span>${T.length} chuyến</span>${can ? `<button type="button" class="dc-add" data-act="dhAddGio" data-r="${esc(r)}">Tăng cường ${ic('plus')}</button>` : ''}</div>
        <div class="dc-g">${T.map(DC.tile).join('')}${can ? miss.map(g => `<button type="button" class="dc-t dc-mk" data-act="dhMk" data-r="${esc(r)}" data-g="${esc(g.gio)}"><div class="dc-h"><b>${esc(g.gio)}</b></div><div class="dc-r">${ic('plus')} Tạo chuyến</div></button>`).join('') : ''}</div>`}</section>`;
    }).join('');
  },
  fit(root) {   // biển số, tên lái xe: tự co chữ cho vừa ô, không cắt bớt
    root.querySelectorAll('.dc-x').forEach(x => { x.style.fontSize = ''; let f = parseFloat(getComputedStyle(x).fontSize) || 15, i = 0; while (x.scrollWidth > x.clientWidth + 1 && f > 10 && i++ < 12) { f -= 0.5; x.style.fontSize = f + 'px'; } });
  }
};
addCSS(`.dc-sw{display:inline-flex;border:1px solid #d0d5dd;border-radius:10px;overflow:hidden;margin:0 0 10px}.dc-sw button{border:0;background:#fff;font:inherit;font-size:13px;font-weight:700;padding:6px 14px;cursor:pointer;color:#475467}.dc-sw button.on{background:var(--p);color:#fff}
.dc-wrap{display:flex;flex-direction:column;gap:12px}.dc-rt{background:#fff;border:1px solid #e4e7ec;border-radius:16px;box-shadow:0 1px 3px rgba(16,24,40,.06);overflow:hidden}
.dc-hd{display:flex;gap:12px;align-items:center;padding:12px 14px;cursor:pointer;border-bottom:1px solid #eef2f6}.dc-hd h3{margin:0;color:var(--p);font-size:19px;line-height:1.2}.dc-st{font-size:13px;color:#344054;margin-top:3px}.dc-ring{width:62px;height:62px;flex:none}.dc-ring .a{font-size:17px;font-weight:800;fill:var(--p)}.dc-ring .b{font-size:11px;fill:#64748b}
.dc-cv svg{width:20px;height:20px;color:var(--p);transform:rotate(-90deg);transition:transform .15s}.dc-cv.up svg{transform:rotate(90deg)}
.dc-bar{display:flex;justify-content:space-between;align-items:center;padding:10px 14px 4px;color:#64748b;font-size:14px}.dc-add{border:0;background:none;color:var(--p);font:inherit;font-weight:700;font-size:14.5px;display:inline-flex;align-items:center;gap:4px;cursor:pointer}.dc-add svg{width:18px;height:18px}
.dc-g{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;padding:8px 12px 14px}@media(min-width:760px){.dc-g{grid-template-columns:repeat(auto-fill,minmax(150px,1fr))}}
.dc-t{display:flex;flex-direction:column;align-items:stretch;text-align:left;width:auto;min-width:0;padding:0;margin:0;border:1.5px solid #d0d5dd;border-radius:10px;background:#fff;font:inherit;color:#1f2937;cursor:pointer;overflow:hidden;box-shadow:none}
.dc-h{display:flex;align-items:center;gap:4px;background:#f2f4f7;padding:5px 7px}.dc-h>b{font-size:15.5px;font-weight:800}.dc-h span{margin-left:auto;font-size:12.5px;color:#475467}.dc-h span b{font-size:13.5px;color:#1f2937}.dc-w{font-style:normal;font-size:10.5px;font-weight:800;color:#b91c1c;background:#fee2e2;border-radius:5px;padding:0 4px}
.dc-r{padding:5px 7px 0;font-size:13px;font-weight:700;color:#344054}.dc-r em{font-style:normal;font-size:10.5px;color:#c2410c;background:#ffedd5;border-radius:5px;padding:0 4px}
.dc-n{padding:3px 7px 0;font-size:13px;line-height:1.25;color:#1f2937;min-height:2.5em;overflow-wrap:anywhere}.dc-x{padding:3px 7px 7px;font-size:15px;font-weight:800;letter-spacing:-.2px;white-space:nowrap;overflow:hidden}.dc-t .un{color:#b42318;font-weight:600;font-size:12px}
.dc-t.gone{opacity:.6}.dc-t.gone .dc-h{background:#e5e7eb}.dc-t.miss{border:1.5px dashed #f04438}.dc-t.dx-cross{border-left:4px dashed #ea580c}.dc-mk{border:1.5px dashed #94a3b8!important;background:#f8fafc!important}.dc-mk .dc-r{display:flex;align-items:center;gap:4px;padding-bottom:10px;color:var(--p)}.dc-mk svg{width:15px;height:15px}`);
{ const r3 = vDH.render; vDH.render = function (el) {
  r3.call(this, el);
  try {
    const w = el.querySelector('.dx-wrap'); if (!w) return; const m = DC.mode();
    w.insertAdjacentHTML('beforebegin', `<div class="dc-sw"><button type="button" data-dcm="the" class="${m === 'the' ? 'on' : ''}">Dạng thẻ</button><button type="button" data-dcm="bang" class="${m === 'bang' ? 'on' : ''}">Dạng bảng</button></div>`);
    el.querySelectorAll('[data-dcm]').forEach(b => b.onclick = () => DC.set(b.dataset.dcm));
    if (m !== 'the') return;
    const h = DC.html(el); if (!h) return;
    w.className = 'dx-wrap dc-wrap'; w.innerHTML = h;
    w.querySelectorAll('[data-dcr]').forEach(x => x.onclick = () => { const r = x.dataset.dcr; DC.shut.has(r) ? DC.shut.delete(r) : DC.shut.add(r); App.render(); });
    requestAnimationFrame(() => DC.fit(w));
  } catch (e) { console.warn('DC', e); try { SYS.add('Điều hành dạng thẻ', e); } catch (x) { } }
}; }
