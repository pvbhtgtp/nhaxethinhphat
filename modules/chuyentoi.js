'use strict';
/* Module Chuyến của tôi (lái xe, phụ xe) · thiết kế cho điện thoại: một tay, một chạm, chữ to.
   Dữ liệu: máy có dữ liệu Đặt vé thì tự soạn (TX.build); lái xe nhận tài liệu riêng 'tx_<mã NV>' theo thời gian thực.
   Lái xe chỉ đánh dấu Đã lên xe / Đã thu (ghi vào acts, máy quầy vé tự ghi vào vé); không đặt, sửa, hủy vé. */
const CT = {
  trip: '', tab: 'don', d: '', mon: '', data: null, acts: {}, seen: {}, fresh: {}, un: null, on: '',
  me: () => { try { const e = DRV.me(); return e && e.id ? String(e.id) : ''; } catch (x) { return ''; } },
  live: () => NOTI.can(),
  trips() { const me = CT.me(); if (!me) return []; return CT.live() ? TX.build(me) : (CT.data || []); },
  listen() {
    const me = CT.me(); if (!me || CT.live() || typeof FB === 'undefined' || !FB.db || CT.on === me) return; CT.on = me;
    try { CT.un && CT.un(); } catch (e) { }
    CT.un = FB.col().doc('tx_' + me).onSnapshot(s => {
      const o = s.exists ? s.data() : {}; CT.data = (() => { try { return o.d ? JSON.parse(o.d) : (o.trips || []); } catch (e) { return []; } })(); CT.acts = o.acts || {}; CT.at = o.at || 0; CT.none = !s.exists; CT.err = '';
      const now = Date.now(); CT.data.forEach(t => t.pax.forEach(p => { if (CT.seen[t.id] && !CT.seen[t.id].has(p.id)) CT.fresh[p.id] = now + 90e3; })); CT.data.forEach(t => { CT.seen[t.id] = new Set(t.pax.map(p => p.id)); });
      if (App.cur === 'chuyentoi' && !(typeof UX !== 'undefined' && UX.busy())) App.render(); else if (App.cur === 'chuyentoi') UX.pend.render = true;
    }, e => { CT.on = ''; CT.err = (e && e.code) || 'err'; CT.data = CT.data || []; if (App.cur === 'chuyentoi') App.render(); });
  },
  /* trạng thái vé: dữ liệu gốc + thao tác của lái xe chưa kịp ghi vào vé */
  st(p) { const a = CT.acts[p.id]; const o = { len: p.len, tt: p.tt, httt: p.httt, vang: !!p.vang, xuong: !!p.xuong }; if (a && !CT.live()) { if (a.len != null) o.len = !!a.len; if (a.vang != null) o.vang = !!a.vang; if (a.xuong != null) o.xuong = !!a.xuong; if (a.tt) { o.tt = a.tt; if (a.httt) o.httt = a.httt; } } return o; },
  act(p, o) {
    const me = CT.me(), a = Object.assign({}, CT.acts[p.id] || {}, o, { at: Date.now(), by: me }); CT.acts[p.id] = a;
    if (CT.live()) { const b = (DB.datve || []).find(x => x.id === p.id); if (b) { if (o.len != null) b.len = !!o.len; if (o.vang != null) b.vang = !!o.vang; if (o.xuong != null) b.daXuong = !!o.xuong; if (o.tt === 'tra') { b.tt = 'tra'; b.httt = o.httt || 'tm'; b.lxThu = 1; } if (o.tt === 'giu' && b.lxThu) { b.tt = 'giu'; b.httt = ''; delete b.lxThu; } (b.lichSu = b.lichSu || []).push({ tg: dvLog.now(), nguoi: dvLog.who(), nd: 'Trên xe: ' + (o.vang != null ? (o.vang ? 'khách vắng' : 'bỏ vắng') : o.xuong != null ? (o.xuong ? 'đã trả khách' : 'bỏ đã trả') : o.len != null ? (o.len ? 'đã lên xe' : 'bỏ lên xe') : o.tt === 'tra' ? 'đã thu ' + (o.httt === 'ck' ? 'chuyển khoản' : 'tiền mặt') : 'bỏ đã thu') }); App.changed(); return; } }
    FB.col().doc('tx_' + me).set({ acts: { [p.id]: a } }, { merge: true }).catch(() => toast('Chưa gửi được, kiểm tra mạng', 'err'));
    App.render();
  },
  eta(t, name) { const n = LT.nm(name); if (!n) return ''; let i = t.lt.findIndex(x => LT.nm(x.ten) === n); if (i < 0) i = t.lt.findIndex(x => { const a = LT.nm(x.ten); return a.length > 3 && n.length > 3 && (a.includes(n) || n.includes(a)); }); return i < 0 ? '' : LT.time(t, t.lt[i].phut); },
  idx(t, name) { const n = LT.nm(name); const i = t.lt.findIndex(x => { const a = LT.nm(x.ten); return a === n || (a.length > 3 && n.length > 3 && (a.includes(n) || n.includes(a))); }); return i < 0 ? 999 : i; },
  due: (p, s) => s.tt === 'tra' ? 0 : Math.max(0, p.tien - p.coc),
  sum(t) { let len = 0, can = 0, tm = 0, ck = 0, vang = 0, xuong = 0; t.pax.forEach(p => { const s = CT.st(p); if (s.vang) { vang++; return; } if (s.len) len++; if (s.xuong) xuong++; if (s.tt === 'tra') { if (s.httt === 'ck') ck += p.tien; else tm += p.tien - p.coc; } else can += Math.max(0, p.tien - p.coc); }); return { n: t.pax.length, len, can, tm, ck, vang, xuong, cap: t.so ? sdSeats(t.so).length : t.xe.soCho }; },
  mins(t) { const d = new Date(t.ngay + 'T' + (t.gio || '00:00') + ':00').getTime(); return Math.round((d - Date.now()) / 60000); },
  when(t) { const m = CT.mins(t); if (m > 0) return m >= 60 ? `Còn ${Math.floor(m / 60)} giờ ${m % 60 ? (m % 60) + ' phút' : ''}` : `Còn ${m} phút`; if (m > -180) return 'Đang chạy'; return 'Đã chạy'; },
  /* lý do chưa thấy chuyến: giúp lái xe / quản lý xử lý ngay */
  why() {
    if (typeof FO !== 'undefined' && FO.on) return 'App đang chạy dự phòng Google Drive (Firebase hết hạn mức), chuyến sẽ hiện khi Firebase có lại.';
    if (CT.err === 'permission-denied') return 'Luật bảo mật Firebase chưa cập nhật bản mới. Báo Admin mở app, bấm "Cập nhật ngay" rồi Publish.';
    if (CT.err) return 'Chưa kết nối được để nhận chuyến (' + esc(CT.err) + '). Kiểm tra mạng rồi mở lại app.';
    if (CT.live()) return 'Khi điều hành phân công chuyến hôm nay hoặc ngày mai cho bạn, chuyến sẽ hiện ở đây.';
    if (CT.none) return 'Chưa nhận được chuyến nào. Sau khi điều hành gắn tên bạn vào chuyến hôm nay / ngày mai (trên app bản mới), chuyến sẽ tự hiện.';
    return 'Không có chuyến hôm nay và ngày mai' + (CT.at ? ' (cập nhật lúc ' + new Date(CT.at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ')' : '') + '.';
  },
  map: n => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(n),
  INC: ['Sự cố xe / hỏng xe', 'Tai nạn / va chạm', 'Khách gây rối / an ninh', 'Kẹt xe / trễ giờ', 'Khác'],
  report(t) {          // báo sự cố trên chuyến → sổ Phản ánh & sự cố (máy văn phòng tự ghi), có gọi nhanh điều hành
    let loai = CT.INC[0];
    const m = Modal.open({ title: 'Báo sự cố · ' + esc(t.gio) + ' ' + esc(t.tuyen), width: 420, body: `<div class="ct-inc">${CT.INC.map((x, i) => `<button type="button" class="ct-b${i ? '' : ' sel'}" data-l="${esc(x)}">${esc(x)}</button>`).join('')}</div>
      <textarea class="inp" data-nd rows="3" placeholder="Mô tả ngắn: chuyện gì, ở đâu, cần hỗ trợ gì" style="margin-top:10px;width:100%"></textarea>
      <label class="ct-b ct-ph"><input type="file" accept="image/*" capture="environment" data-ph hidden>${ic('camera')} <span>Chụp ảnh hiện trường (nên có)</span></label><img data-pv hidden style="max-width:100%;border-radius:10px;margin-top:8px">`, foot: '<button class="btn" data-no>Đóng</button><button class="btn pri" data-ok>Gửi báo cáo</button>' });
    m.el.querySelectorAll('[data-l]').forEach(b => b.onclick = () => { loai = b.dataset.l; m.el.querySelectorAll('[data-l]').forEach(x => x.classList.toggle('sel', x === b)); });
    m.el.querySelector('[data-no]').onclick = () => m.close();
    let photo = ''; const ph = m.el.querySelector('[data-ph]'), pv = m.el.querySelector('[data-pv]');
    ph.onchange = async () => { const f = ph.files[0]; if (!f) return; try { photo = await resizeImage(f, 1280); pv.src = photo; pv.hidden = false; m.el.querySelector('.ct-ph span').textContent = 'Chụp lại ảnh khác'; } catch (e) { toast('Không đọc được ảnh', 'err'); } };
    m.el.querySelector('[data-ok]').onclick = async () => {
      const nd = m.el.querySelector('[data-nd]').value.trim(); if (!nd) return toast('Nhập mô tả ngắn', 'err');
      const ok = m.el.querySelector('[data-ok]'); ok.disabled = true;
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6), x = { chuyen: t.id, loai, nd, at: Date.now(), bks: (t.xe || {}).bks || '' }, me = CT.me();
      if (photo) { try { await IMGX.open(); x.anh = IMGX.PRE + await IMGX.upload(photo); } catch (e) { toast('Chưa tải được ảnh lên kho (mạng yếu), báo cáo vẫn gửi không kèm ảnh', 'err', 5000); } }   // ảnh lên Drive, máy chủ chỉ giữ mã tham chiếu
      if (CT.live()) { const who = ((DB.employees || []).find(e => String(e.id) === me) || {}).ten || dvLog.who(); if (TX.inc(id, x, me, who)) App.changed(); }
      else FB.col().doc('tx_' + me).set({ inc: { [id]: x } }, { merge: true }).catch(() => toast('Chưa gửi được, kiểm tra mạng rồi gửi lại', 'err'));
      m.close(); toast(ic('check') + ' Đã gửi báo sự cố cho điều hành', 'ok', 3000);
    };
  },
  /* giấy tờ của chính lái xe sắp / đã hết hạn: nhắc 1 lần mỗi ngày khi mở màn hình (thông báo tự tắt) */
  gt() {
    const me = CT.me(), e = (DB.employees || []).find(x => String(x.id) === me) || {}; let g = DB._me && String(DB._me.id) === me ? DB._me.gt : null;
    if (!g) { g = { bangHetHan: e.bangHetHan || '' }; try { const sk = llLatest(me, 'sk'), th = llLatest(me, 'th'); if (sk) g.sk = { han: llHan(sk) }; if (th) g.th = { han: th.hetHan || '' }; } catch (x) { } }
    const td = D.today(), out = [];
    [['Giấy phép lái xe', g.bangHetHan], ['Giấy khám sức khỏe', g.sk && g.sk.han], ['Thẻ tập huấn nghiệp vụ', g.th && g.th.han]].forEach(([n, h]) => { if (!h) return; const k = D.diff(h, td); if (k <= 30) out.push(n + (k < 0 ? ' đã hết hạn ' + F.date(h) : ' còn ' + k + ' ngày (hết hạn ' + F.date(h) + ')')); });
    return out;
  },
  nhac() { const k = 'ct.gt.' + CT.me() + '.' + D.today(); try { if (localStorage.getItem(k)) return; } catch (e) { } const L = CT.gt(); if (!L.length) return; try { localStorage.setItem(k, '1'); } catch (e) { } toast(ic('alert') + ' Giấy tờ của bạn cần gia hạn: ' + L.map(esc).join('; '), 'err', 9000); },
  /* lịch thu nhỏ: chuyến của tôi theo ngày bất kỳ (lái xe tra cứu nhanh) */
  mineAll() { const me = CT.me(), seen = new Set(); return (DB.lichchay || []).filter(l => l && [l.laiXe, l.laiXe2, l.phuXe].map(String).includes(me) && !seen.has(l.id) && seen.add(l.id)); },
  full: false, wk: '',
  cal() {
    const td = D.today(), d = CT.d || td, cnt = {};
    CT.mineAll().forEach(l => { if (l.ngay) cnt[l.ngay] = (cnt[l.ngay] || 0) + 1; });
    let cells, title;
    if (CT.full) { const ym = CT.mon || d.slice(0, 7), nd = D.daysIn(ym), lead = (D.parse(ym + '-01').getDay() + 6) % 7; title = F.month ? F.month(ym) : ym;
      cells = [...Array(lead).fill(''), ...Array.from({ length: nd }, (_, i) => ym + '-' + String(i + 1).padStart(2, '0'))]; }
    else { const base = CT.wk || d, mon = D.add(base, -((D.parse(base).getDay() + 6) % 7)); cells = Array.from({ length: 7 }, (_, i) => D.add(mon, i)); title = 'Tháng ' + (+cells[3].slice(5, 7)) + '/' + cells[3].slice(0, 4); }
    return `<div class="ct-cal${CT.full ? '' : ' wk'}"><div class="ct-calh"><button type="button" data-cm="-1">${ic('back')}</button><b>${title}</b><button type="button" data-cm="1" class="nx">${ic('back')}</button>${d !== td ? '<button type="button" class="ct-today" data-cd="' + td + '">Hôm nay</button>' : ''}<button type="button" class="ct-today" data-cf>${CT.full ? 'Thu gọn' : 'Cả tháng'}</button></div>
      <div class="ct-calg">${['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(x => `<small>${x}</small>`).join('')}${cells.map(x => x ? `<button type="button" data-cd="${x}" class="${x === d ? 'sel' : ''}${x === td ? ' td' : ''}${cnt[x] ? ' has' : ''}">${+x.slice(8)}${cnt[x] ? `<i>${cnt[x]}</i>` : ''}</button>` : '<span></span>').join('')}</div></div>`;
  },
  dayList(d) {
    const L = CT.mineAll().filter(l => l.ngay === d).sort((a, b) => String(a.gio).localeCompare(String(b.gio))), me = CT.me();
    const nm = id => ((DB.employees || []).find(e => String(e.id) === String(id)) || {}).ten || '';
    if (!L.length) return `<div class="ct-empty sm">${ic('bus')}<b>Không có chuyến ngày ${F.date(d)}</b></div>`;
    return `<div class="ct-lbl">${L.length} chuyến ngày ${F.date(d)}</div>` + L.map(l => { const v = (DB.vehicles || []).find(x => x.id === l.xeId) || {}, mates = [l.laiXe, l.laiXe2, l.phuXe].filter(x => x && String(x) !== me).map(nm).filter(Boolean);
      return `<div class="ct-card sm"><div class="ct-h"><b class="ct-time">${esc(l.gio || '')}</b><span class="ct-when">${l.phuXe && String(l.phuXe) === me ? 'Phụ xe' : 'Lái xe'}</span></div><div class="ct-route">${esc(l.tuyen || '')}</div><div class="ct-sub">${ic('bus')} ${esc(v.bks || 'Chưa gán xe')}${mates.length ? ' · Cùng: ' + esc(mates.join(', ')) : ''}</div></div>`; }).join('');
  },
  /* ---------- màn hình danh sách chuyến ---------- */
  list(el, T) {
    const td0 = D.today(), d = CT.d || td0;
    if (d !== td0 && !(d === D.add(td0, 1) && T.some(t => t.ngay === d))) { el.innerHTML = `<div class="ct">${CT.cal()}${CT.dayList(d)}</div>`; return CT.bindCal(el); }
    if (d === D.add(td0, 1)) T = T.filter(t => t.ngay === d);
    const td = D.today(), nx = T.find(t => CT.mins(t) > -180) || T[T.length - 1];
    const card = (t, big) => { const s = CT.sum(t), m = CT.mins(t); return `<button class="ct-card${big ? ' big' : ''}${m < -180 ? ' gone' : ''}" data-ct="${esc(t.id)}">
      <div class="ct-h"><b class="ct-time">${esc(t.gio)}</b><span class="ct-when ${m > 0 && m <= 60 ? 'soon' : ''}">${t.ngay === td ? '' : 'Ngày mai · '}${CT.when(t)}</span></div>
      <div class="ct-route">${esc(t.tuyen)}</div><div class="ct-sub">${ic('bus')} ${esc(t.xe.bks || 'Chưa gán xe')}${t.vai === 'Phụ xe' ? ' · Phụ xe' : ''}</div>
      <div class="ct-kpi"><div><b>${s.n}<small>/${s.cap || '?'}</small></b><span>Khách</span></div><div><b>${s.len}</b><span>Đã lên</span></div><div><b>${F.money(s.can)}</b><span>Cần thu</span></div></div></button>`; };
    el.innerHTML = `<div class="ct">${CT.cal()}${T.length ? card(nx, true) + (T.filter(t => t !== nx).length ? `<div class="ct-lbl">Các chuyến khác</div>${T.filter(t => t !== nx).map(t => card(t)).join('')}` : '') : `<div class="ct-empty">${ic('bus')}<b>Chưa có chuyến hôm nay và ngày mai</b><span>${CT.why()}</span></div>`}</div>`;
    el.querySelectorAll('[data-ct]').forEach(b => b.onclick = () => { CT.trip = b.dataset.ct; CT.tab = 'don'; App.render(); window.scrollTo(0, 0); });
    CT.bindCal(el);
  },
  bindCal(el) {
    el.querySelectorAll('[data-cd]').forEach(b => b.onclick = () => { CT.d = b.dataset.cd; CT.mon = CT.d.slice(0, 7); CT.wk = ''; App.render(); });
    el.querySelectorAll('[data-cm]').forEach(b => b.onclick = () => { const n = +b.dataset.cm; if (CT.full) CT.mon = D.ymAdd(CT.mon || (CT.d || D.today()).slice(0, 7), n); else CT.wk = D.add(CT.wk || CT.d || D.today(), 7 * n); App.render(); });
    const f = el.querySelector('[data-cf]'); if (f) f.onclick = () => { CT.full = !CT.full; CT.mon = (CT.wk || CT.d || D.today()).slice(0, 7); App.render(); };
  },
  /* ---------- màn hình một chuyến ---------- */
  one(el, t) {
    const s = CT.sum(t), gone = CT.mins(t) < -20, now = Date.now();
    const row = p => { const st = CT.st(p), due = CT.due(p, st), nw = CT.fresh[p.id] > now; return `<div class="ct-p${st.len || st.vang || (CT.tab === 'tra' && st.xuong) ? ' on' : ''}${st.vang ? ' vang' : ''}${nw ? ' new' : ''}">
      <div class="ct-pt"><span class="ct-seat">${esc(p.ghe)}</span><div class="grow"><b>${esc(p.ten || 'Khách')}</b>${st.vang ? ' <span class="ct-tag vang">Vắng</span>' : ''}${st.xuong ? ' <span class="ct-tag">Đã trả</span>' : ''}${p.gc ? `<div class="ct-gc">${esc(p.gc)}</div>` : ''}<div class="ct-pm">${CT.tab === 'don' ? (p.tra ? 'Trả: ' + esc(p.tra) : '') : 'Trả: ' + esc(p.tra || 'chưa ghi điểm trả')}</div></div>
        <div class="ct-money">${st.tt === 'tra' ? `<span class="ok">Đã thu${st.httt === 'ck' ? ' CK' : ''}</span>` : `<b>${F.money(due)}</b><small>${p.coc ? 'đã cọc ' + F.money(p.coc) : 'cần thu'}</small>`}</div></div>
      <div class="ct-acts${CT.tab === 'don' ? ' c4' : ''}">${p.sdt ? `<a class="ct-b call" href="tel:${esc(p.sdt)}">${ic('phone')} Gọi</a>` : '<span></span>'}${CT.tab === 'don'
        ? `<button class="ct-b ${st.len ? 'done' : ''}" data-len="${esc(p.id)}" ${st.vang ? 'disabled' : ''}>${ic('check')} ${st.len ? 'Đã lên' : 'Lên xe'}</button><button class="ct-b ${st.vang ? 'warn' : ''}" data-vang="${esc(p.id)}" ${st.len ? 'disabled' : ''}>${ic('x')} ${st.vang ? 'Đã vắng' : 'Vắng'}</button>`
        : `<button class="ct-b ${st.xuong ? 'done' : ''}" data-xuong="${esc(p.id)}" ${st.vang ? 'disabled' : ''}>${ic('check')} ${st.xuong ? 'Đã trả' : 'Trả khách'}</button>`}<button class="ct-b ${st.tt === 'tra' ? 'done' : 'pay'}" data-pay="${esc(p.id)}" ${st.vang ? 'disabled' : ''}>${ic('wallet')} ${st.tt === 'tra' ? 'Đã thu' : 'Thu'}</button></div></div>`; };
    const grp = key => { const G = {}; t.pax.forEach(p => { const k = p[key] || '(Chưa ghi điểm)'; (G[k] = G[k] || []).push(p); }); return Object.entries(G).sort((a, b) => CT.idx(t, a[0]) - CT.idx(t, b[0]) || a[0].localeCompare(b[0], 'vi'))
      .map(([k, L]) => { L.sort((a, b) => (CT.st(a).len || CT.st(a).vang) - (CT.st(b).len || CT.st(b).vang) || String(a.ghe).localeCompare(String(b.ghe), 'vi', { numeric: true })); const e = CT.eta(t, k), left = L.filter(p => { const z = CT.st(p); return CT.tab === 'tra' ? !z.xuong && !z.vang : !z.len && !z.vang; }).length;
        return `<div class="ct-stop"><div class="ct-sh">${k !== '(Chưa ghi điểm)' ? `<a href="${CT.map(k)}" target="_blank" rel="noopener" title="Chỉ đường">${ic('map')} ${esc(k)}</a>` : esc(k)}${e ? `<em>~${e}</em>` : ''}<span>${left ? left + ' chờ' : '✓ đủ'}/${L.length}</span></div>${L.map(row).join('')}</div>`; }).join(''); };
    let body = '';
    if (CT.tab === 'don') body = t.pax.length ? grp('don') : '<div class="ct-empty sm">Chưa có khách đặt vé.</div>';
    else if (CT.tab === 'tra') body = (t.pax.length ? grp('tra') : '') + `<div class="ct-lbl">Hàng gửi (${t.hang.length})</div>${t.hang.length ? t.hang.map(h => `<div class="ct-p"><div class="ct-pt"><span class="ct-seat">${ic('box')}</span><div class="grow"><b>${esc(h.ten)}</b>${h.sl ? ` <small>× ${esc(h.sl)}</small>` : ''}<div class="ct-pm">${h.noi ? 'Giao: ' + esc(h.noi) : ''}${h.nhan ? ' · ' + esc(h.nhan) : ''}</div></div><div class="ct-money">${h.thu === 'nhan' ? `<b>${F.money(h.tien)}</b><small>thu người nhận</small>` : '<span class="ok">Đã trả cước</span>'}</div></div>${h.sdt ? `<div class="ct-acts"><a class="ct-b call" href="tel:${esc(h.sdt)}">${ic('phone')} Gọi người nhận</a></div>` : ''}</div>`).join('') : '<div class="ct-empty sm">Không có hàng gửi.</div>'}`;
    else { const so = t.so; body = so ? `<div class="ct-grid" style="grid-template-columns:repeat(${so.cols},minmax(0,1fr))">${so.rows.map(r => r.map(x => { if (x === 'D') return '<div class="ct-g lbl">Tài xế</div>'; if (x === 'DOOR') return '<div class="ct-g lbl">Cửa</div>'; if (!x) return '<div></div>'; const p = t.pax.find(q => q.ghe === x), st = p ? CT.st(p) : null; return `<div class="ct-g ${p ? (st.len ? 'len' : st.tt === 'tra' ? 'pd' : 'bk') : ''}"><b>${esc(x)}</b>${p ? `<small>${esc(String(p.don || '').slice(0, 14))}</small>` : ''}</div>`; }).join('')).join('')}</div><div class="ct-leg"><span><i class="bk"></i>Chưa thu</span><span><i class="pd"></i>Đã thu</span><span><i class="len"></i>Đã lên xe</span><span><i></i>Trống</span></div>` : '<div class="ct-empty sm">Xe chưa có sơ đồ ghế.</div>'; }
    const done = gone ? `<div class="ct-sum"><b>Tổng kết chuyến</b><div class="ct-kpi"><div><b>${s.len}/${s.n}</b><span>Khách đã lên</span></div><div><b>${F.money(s.tm)}</b><span>Tiền mặt đã thu</span></div><div><b>${F.money(s.ck)}</b><span>Chuyển khoản</span></div></div>${s.vang ? `<div class="ct-warn">${s.vang} khách vắng</div>` : ''}${s.n - s.len - s.vang ? `<div class="ct-warn">${s.n - s.len - s.vang} khách chưa đánh dấu lên xe hoặc vắng</div>` : ''}${s.can ? `<div class="ct-warn">Còn ${F.money(s.can)} chưa thu</div>` : ''}</div>` : '';
    el.innerHTML = `<div class="ct ct-in">
      <div class="ct-top"><button class="ct-back" data-back>${ic('back')}</button><div class="grow"><div class="ct-h"><b class="ct-time">${esc(t.gio)}</b><span class="ct-when">${t.ngay === D.today() ? '' : F.date(t.ngay) + ' · '}${CT.when(t)}</span></div><div class="ct-route">${esc(t.tuyen)}</div><div class="ct-sub">${ic('bus')} ${esc(t.xe.bks || 'Chưa gán xe')}</div></div></div>
      <div class="ct-kpi big"><div><b>${s.n}<small>/${s.cap || '?'}</small></b><span>Khách</span></div><div><b>${s.len}</b><span>Đã lên</span></div><div><b>${F.money(s.can)}</b><span>Còn phải thu</span></div></div>
      <div class="ct-docs"><span class="${t.lenh ? 'ok' : 'no'}">${ic('file')} ${t.lenh ? 'Lệnh ' + esc(String(t.lenh.so || '').replace(/^LVC-/, '')) + (t.lenh.tt === 'dong' ? ' · đã đóng' : ' · đang mở') : 'Chưa có lệnh vận chuyển'}</span><span class="${t.nt === 'ok' ? 'ok' : t.nt ? 'no' : 'no'}">${ic('check')} ${t.nt === 'ok' ? 'Nghiệm thu đạt' : t.nt === 'fail' ? 'Nghiệm thu không đạt' : t.nt === 'part' ? 'Nghiệm thu chưa đủ' : 'Chưa nghiệm thu'}</span><button class="ct-b warn sm" data-inc>${ic('alert')} Báo sự cố</button></div>
      ${done}
      <div class="ct-tabs">${[['don', 'Đón khách'], ['ghe', 'Sơ đồ ghế'], ['tra', 'Trả & hàng']].map(([k, n]) => `<button class="${CT.tab === k ? 'on' : ''}" data-tab="${k}">${n}</button>`).join('')}</div>
      <div class="ct-body">${body}</div>
      <div class="ct-foot"><div><small>Đã thu</small><b>${F.money(s.tm + s.ck)}</b></div><div><small>Còn phải thu</small><b class="${s.can ? 'due' : ''}">${F.money(s.can)}</b></div></div></div>`;
    el.querySelector('[data-back]').onclick = () => { CT.trip = ''; App.render(); };
    el.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { CT.tab = b.dataset.tab; App.render(); });
    const P = id => t.pax.find(p => p.id === id);
    el.querySelectorAll('[data-len]').forEach(b => b.onclick = () => { const p = P(b.dataset.len); if (p) CT.act(p, { len: !CT.st(p).len }); });
    el.querySelectorAll('[data-vang]').forEach(b => b.onclick = () => { const p = P(b.dataset.vang); if (p) CT.act(p, { vang: !CT.st(p).vang }); });
    el.querySelectorAll('[data-xuong]').forEach(b => b.onclick = () => { const p = P(b.dataset.xuong); if (p) CT.act(p, { xuong: !CT.st(p).xuong }); });
    el.querySelector('[data-inc]').onclick = () => CT.report(t);
    el.querySelectorAll('[data-pay]').forEach(b => b.onclick = () => { const p = P(b.dataset.pay); if (!p) return; const st = CT.st(p);
      if (st.tt === 'tra') { if (!st.httt || CT.acts[p.id]) return Modal.confirm('Bỏ đánh dấu đã thu của ghế ' + esc(p.ghe) + '?', { ok: 'Bỏ đã thu' }).then(ok => ok && CT.act(p, { tt: 'giu' })); return toast('Vé đã thu tại quầy', ''); }
      const m = Modal.open({ title: 'Thu tiền ghế ' + esc(p.ghe) + ' · ' + esc(p.ten || ''), width: 380, body: `<div style="text-align:center;font-size:30px;font-weight:800;margin:4px 0 14px">${F.money(CT.due(p, st))} đ</div><div class="ct-pay"><button class="ct-b pay" data-h="tm">${ic('money')} Tiền mặt</button><button class="ct-b pay" data-h="ck">${ic('wallet')} Chuyển khoản</button></div>`, foot: '<button class="btn" data-no>Đóng</button>' });
      m.el.querySelector('[data-no]').onclick = () => m.close();
      m.el.querySelectorAll('[data-h]').forEach(x => x.onclick = () => { m.close(); CT.act(p, { tt: 'tra', httt: x.dataset.h }); });
    });
  }
};
ICONS.camera = ICONS.camera || '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>';
ICONS.map = ICONS.map || '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>';
addCSS(`.ct{max-width:640px;margin:0 auto;display:flex;flex-direction:column;gap:12px;padding-bottom:96px}@media(max-width:900px){.ct-in{padding-bottom:170px}}
.ct-card{display:block;width:100%;text-align:left;border:1px solid #e4e7ec;background:#fff;border-radius:18px;padding:14px 16px;font:inherit;cursor:pointer;box-shadow:0 1px 3px rgba(16,24,40,.06)}.ct-card.big{border:2px solid var(--p);box-shadow:0 10px 30px -12px rgba(37,99,235,.35)}.ct-card.gone{opacity:.6}
.ct-h{display:flex;align-items:baseline;justify-content:space-between;gap:8px}.ct-time{font-size:26px;font-weight:800;letter-spacing:-.5px}.ct-card:not(.big) .ct-time{font-size:20px}.ct-when{font-size:13px;font-weight:700;color:#475467}.ct-when.soon{color:#dc2626}
.ct-route{font-size:16px;font-weight:700;margin-top:2px}.ct-sub{font-size:13.5px;color:#475467;display:flex;align-items:center;gap:6px;margin-top:2px}.ct-sub svg{width:16px;height:16px}
.ct-kpi{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px}.ct-kpi>div{background:#f5f7fb;border-radius:12px;padding:8px 10px}.ct-kpi b{display:block;font-size:19px;font-weight:800}.ct-kpi b small{font-size:13px;color:#64748b;font-weight:600}.ct-kpi span{font-size:12px;color:#64748b}
.ct-kpi.big>div{background:#fff;border:1px solid #e4e7ec}.ct-lbl{font-size:12px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:.4px;margin:6px 2px 0}
.ct-empty{display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center;padding:40px 16px;color:#64748b;background:#fff;border:1px dashed #d0d5dd;border-radius:16px}.ct-empty svg{width:40px;height:40px;color:#94a3b8}.ct-empty b{color:#1f2937;font-size:16px}.ct-empty.sm{padding:18px}
.ct-top{display:flex;gap:10px;align-items:flex-start;background:#fff;border:1px solid #e4e7ec;border-radius:18px;padding:12px 14px}.ct-back{border:0;background:#f1f5f9;border-radius:12px;width:42px;height:42px;display:flex;align-items:center;justify-content:center;cursor:pointer;flex:none}.ct-back svg{width:20px;height:20px}
.ct-tabs{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;background:#eef2f6;padding:4px;border-radius:14px;position:sticky;top:0;z-index:5}.ct-tabs button{white-space:nowrap;border:0;background:none;font:inherit;font-weight:700;font-size:14px;padding:11px 6px;border-radius:11px;color:#475467;cursor:pointer}.ct-tabs button.on{background:#fff;color:#0f172a;box-shadow:0 1px 3px rgba(15,23,42,.12)}
.ct-stop{background:#fff;border:1px solid #e4e7ec;border-radius:16px;overflow:hidden;margin-bottom:10px}.ct-sh{display:flex;align-items:center;gap:8px;padding:10px 14px;background:#f8fafc;border-bottom:1px solid #eef2f6;font-weight:800;font-size:15px}.ct-sh a{color:inherit;text-decoration:none;display:inline-flex;align-items:center;gap:5px}.ct-sh a svg{width:17px;height:17px;color:var(--p)}.ct-sh em{font-style:normal;background:#dcfce7;color:#15803d;border-radius:8px;padding:1px 7px;font-size:12.5px}.ct-sh span{margin-left:auto;font-size:12.5px;color:#64748b;font-weight:700}
.ct-p{padding:12px 14px;border-bottom:1px solid #f1f5f9}.ct-p:last-child{border-bottom:0}.ct-p.on{background:#f8fafc}.ct-p.on .ct-pt{opacity:.55}.ct-p.new{animation:ctNew 1.2s ease 4;box-shadow:inset 4px 0 0 #f59e0b}@keyframes ctNew{50%{background:#fef3c7}}
.ct-pt{display:flex;gap:10px;align-items:flex-start}.ct-seat{min-width:42px;height:42px;border-radius:12px;background:#eef2ff;color:#3730a3;font-weight:800;display:flex;align-items:center;justify-content:center;font-size:15px}.ct-seat svg{width:20px;height:20px}.ct-pt b{font-size:15.5px}.ct-pm{font-size:13px;color:#64748b}.ct-gc{font-size:12.5px;color:#b45309;font-weight:600}
.ct-money{text-align:right;white-space:nowrap}.ct-money b{font-size:16px;display:block}.ct-money small{font-size:11.5px;color:#64748b}.ct-money .ok{color:#15803d;font-weight:800;font-size:13px}
.ct-acts{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:10px}.ct-b{display:flex;align-items:center;justify-content:center;gap:6px;min-height:46px;border-radius:12px;border:1.5px solid #d0d5dd;background:#fff;font:inherit;font-weight:700;font-size:14.5px;color:#1f2937;cursor:pointer;text-decoration:none}.ct-b svg{width:18px;height:18px}
.ct-b.call{border-color:#86efac;color:#15803d}.ct-b.pay{border-color:#93c5fd;color:#1d4ed8}.ct-b.done{background:#16a34a;border-color:#16a34a;color:#fff}.ct-pay{display:grid;grid-template-columns:1fr 1fr;gap:10px}.ct-pay .ct-b{min-height:60px;font-size:16px}
.ct-grid{display:grid;gap:6px;background:#fff;border:1px solid #e4e7ec;border-radius:16px;padding:10px}.ct-g{min-width:0;overflow:hidden;min-height:54px;border:1.5px dashed #d0d5dd;border-radius:10px;padding:5px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;font-size:12px}.ct-g b{font-size:15px}.ct-g small{font-size:10.5px;line-height:1.2;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ct-g.bk{background:#fee2e2;border:1.5px solid #fca5a5}.ct-g.pd{background:#dcfce7;border:1.5px solid #86efac}.ct-g.len{background:#16a34a;border-color:#16a34a;color:#fff}.ct-g.lbl{border:0;color:#64748b;font-weight:800}
.ct-leg{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:12.5px;color:#475467;margin-top:8px}.ct-leg i{display:inline-block;width:14px;height:14px;border-radius:4px;border:1.5px dashed #d0d5dd;vertical-align:-2px;margin-right:5px}.ct-leg i.bk{background:#fee2e2;border:1.5px solid #fca5a5}.ct-leg i.pd{background:#dcfce7;border:1.5px solid #86efac}.ct-leg i.len{background:#16a34a;border-color:#16a34a}
.ct-sum{background:#fff;border:1px solid #e4e7ec;border-radius:16px;padding:12px 14px}.ct-warn{margin-top:8px;color:#b45309;font-weight:700;font-size:13.5px}
.ct-foot{position:fixed;left:0;right:0;bottom:var(--bn-h,0px);z-index:40;display:grid;grid-template-columns:1fr 1fr;gap:8px;max-width:640px;margin:0 auto;padding:10px 14px calc(10px + env(safe-area-inset-bottom));background:rgba(255,255,255,.96);backdrop-filter:blur(8px);border-top:1px solid #e4e7ec}.ct-foot small{display:block;font-size:12px;color:#64748b}.ct-foot b{font-size:18px}.ct-foot b.due{color:#dc2626}
@media(max-width:900px){.ct-foot{bottom:64px}}
.ct-acts.c4{grid-template-columns:repeat(4,1fr);gap:6px}.ct-acts.c4 .ct-b{font-size:13px;gap:4px;padding:0 4px}.ct-b:disabled{opacity:.35;cursor:not-allowed}.ct-b.warn{border-color:#fdba74;color:#c2410c}.ct-b.warn.sel,.ct-b.sel{background:#fff7ed;border-color:#f97316}.ct-b.sm{min-height:36px;font-size:13px;padding:0 10px}
.ct-p.vang .ct-pt{opacity:.45}.ct-tag{font-size:11px;font-weight:800;background:#dcfce7;color:#15803d;border-radius:6px;padding:1px 6px;vertical-align:2px}.ct-tag.vang{background:#fee2e2;color:#b91c1c}
.ct-docs{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;background:#fff;border:1px solid #e4e7ec;border-radius:14px;padding:8px 12px;font-size:13px;font-weight:600}.ct-docs span{display:inline-flex;align-items:center;gap:4px}.ct-docs svg{width:15px;height:15px}.ct-docs .ok{color:#15803d}.ct-docs .no{color:#b45309}.ct-docs .ct-b{margin-left:auto}
.ct-ph{margin-top:10px;cursor:pointer}.ct-inc{display:grid;grid-template-columns:1fr 1fr;gap:8px}.ct-inc .ct-b{min-height:48px;font-size:13.5px;padding:4px 8px;text-align:center}
.ct-cal{background:#fff;border:1px solid #e4e7ec;border-radius:16px;padding:8px 10px}.ct-calh{display:flex;align-items:center;gap:6px;margin-bottom:4px}.ct-calh b{flex:1;text-align:center;font-size:15px}.ct-calh button{border:0;background:#f1f5f9;border-radius:10px;min-width:34px;height:32px;display:flex;align-items:center;justify-content:center;cursor:pointer;font:inherit;font-weight:700;font-size:13px}.ct-calh .nx svg{transform:rotate(180deg)}.ct-calh svg{width:16px;height:16px}.ct-calh .ct-today{padding:0 10px;background:#eff6ff;color:#1d4ed8}
.ct-calg{display:grid;grid-template-columns:repeat(7,1fr);gap:3px;text-align:center}.ct-calg small{font-size:11px;color:#98a2b3;padding:2px 0}.ct-cal.wk .ct-calg button{height:40px}.ct-calg button{position:relative;border:0;background:none;border-radius:10px;height:34px;font:inherit;font-size:14px;font-weight:600;color:#1f2937;cursor:pointer}.ct-calg button.has{background:#eef2ff;color:#3730a3;font-weight:800}.ct-calg button.td{box-shadow:inset 0 0 0 2px #93c5fd}.ct-calg button.sel{background:var(--p);color:#fff}.ct-calg i{position:absolute;top:1px;right:3px;font-style:normal;font-size:9.5px;font-weight:800;color:#dc2626}.ct-calg button.sel i{color:#fff}
.ct-card.sm{cursor:default;padding:10px 14px}.ct-card.sm .ct-time{font-size:18px}`);
MODL.def('chuyentoi', {
  title: 'Chuyến của tôi', icon: 'bus', desc: 'Chuyến hôm nay, ngày mai: khách theo điểm đón, gọi khách, đánh dấu lên xe, thu tiền',
  render(el) {
    if (!CT.me()) { el.innerHTML = '<div class="ct"><div class="ct-empty"><b>Tài khoản chưa gắn với hồ sơ nhân viên</b><span>Nhờ quản lý kiểm tra số điện thoại trong hồ sơ nhân viên.</span></div></div>'; return; }
    CT.listen(); if (!CT.live() && CT.data == null) { el.innerHTML = '<div class="ct"><div class="ct-empty sm">Đang tải chuyến…</div></div>'; return; }
    const T = CT.trips(), t = CT.trip && T.find(x => x.id === CT.trip); setTimeout(() => { try { CT.nhac(); } catch (e) { } }, 800);
    if (t) CT.one(el, t); else { CT.trip = ''; CT.list(el, T); }
  }
});
setInterval(() => { try { if (App.cur === 'chuyentoi' && !document.hidden && !(typeof UX !== 'undefined' && UX.busy())) App.render(); } catch (e) { } }, 60000);   // đồng hồ đếm ngược, giờ dự kiến
