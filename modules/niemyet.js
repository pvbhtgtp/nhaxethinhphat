'use strict';
/* In bảng niêm yết trên xe tuyến cố định (NĐ158 GĐ5) · tải khi bấm nút (MODL), không phải màn hình riêng.
   Trong xe: giá vé, biển số, hành trình, dịch vụ phục vụ, hành lý miễn cước, số điện thoại đường dây nóng.
   Ngoài xe: bảng tên bến đi – bến đến (kính trước, chữ cao ≥ 6 cm); bảng tên + số điện thoại đơn vị hai bên thân xe (≥ 20 × 20 cm).
   Căn cứ: quy định niêm yết của Bộ GTVT (TT 12/2020, nay TT 36/2024) — đối chiếu văn bản gốc khi áp dụng. */
const NY = {
  cfg: () => (S().niemYet = S().niemYet || {}),
  routes() { const G = {}; (DB.giochay || []).map(g => g.tuyen).filter(Boolean).forEach(t => { const k = TTT.key(t); if (!G[k]) G[k] = t; }); return Object.values(G).sort(); },
  prices(tuyen) {
    const k = TTT.key(tuyen), td = D.today();
    const L = (DB.banggia || []).filter(b => TTT.key(b.tuyen) === k && String(b.tuNgay || '') <= td).sort((a, b) => String(b.tuNgay || '').localeCompare(String(a.tuNgay || '')));
    return L.length ? (L[0].chang || []).filter(c => +c.gia > 0) : [];
  },
  pageIn(xe, tuyen, o) {
    const c = S().company || {}, ti = TTT.get(tuyen), P = NY.prices(tuyen), e = TTT.ends(tuyen);
    const row = (l, v) => v ? `<tr><td style="width:34%;padding:7px 10px;border:1px solid #000;font-weight:700">${l}</td><td style="padding:7px 10px;border:1px solid #000">${v}</td></tr>` : '';
    const gia = P.length ? `<table style="width:100%;border-collapse:collapse;font-size:17px">${P.map(x => `<tr><td style="padding:3px 0">${esc(x.don && x.tra ? x.don + ' – ' + x.tra : 'Toàn tuyến ' + (e[0] || '') + ' – ' + (e[e.length - 1] || ''))}</td><td style="padding:3px 0;text-align:right;font-weight:700;white-space:nowrap">${F.money(x.gia)} đ/vé</td></tr>`).join('')}</table>` : '<i>(Chưa có bảng giá vé đang áp dụng cho tuyến này)</i>';
    return `<div style="font-family:'Times New Roman',serif;color:#000;font-size:16px">
      <div style="text-align:center;font-weight:700;font-size:17px">${esc(String(c.ten || '').toUpperCase())}</div>
      <div style="text-align:center;margin:2px 0 14px">${c.diaChi ? esc(c.diaChi) + ' · ' : ''}ĐT: ${esc(c.sdt || '')}</div>
      <div style="text-align:center;font-weight:700;font-size:26px;letter-spacing:.5px;margin-bottom:4px">THÔNG TIN NIÊM YẾT TRÊN XE</div>
      <div style="text-align:center;font-weight:700;font-size:30px;margin:6px 0 14px;border:3px solid #000;display:inline-block;padding:4px 22px;position:relative;left:50%;transform:translateX(-50%)">${esc(xe.bks || '')}</div>
      <table style="width:100%;border-collapse:collapse;font-size:16px">
        ${row('Tuyến', esc(ti.ten || tuyen) + (ti.maTuyen ? ' · Mã số tuyến ' + esc(ti.maTuyen) : '') + (ti.cuLy ? ' · Cự ly ' + esc(ti.cuLy) + ' km' : ''))}
        ${row('Bến đi – bến đến', esc((ti.benA || '') + ' – ' + (ti.benB || '')) + ' và ngược lại')}
        ${row('Hành trình chạy xe', esc(ti.hanhTrinh || '') + (ti.hanhTrinh ? ' và ngược lại' : ''))}
        ${row('Giá vé', gia)}
        ${row('Hành lý miễn cước', o.hanhLy ? esc(o.hanhLy) + ' kg/hành khách' : '')}
        ${row('Dịch vụ phục vụ hành khách', esc(o.dichVu || '').replace(/\n/g, '<br>'))}
      </table>
      <div style="margin-top:18px;border:3px solid #000;padding:12px 14px;text-align:center">
        <div style="font-weight:700;font-size:18px">ĐƯỜNG DÂY NÓNG TIẾP NHẬN PHẢN ÁNH CỦA HÀNH KHÁCH</div>
        <div style="font-weight:700;font-size:34px;margin-top:4px">${esc(o.hotline || c.sdt || '')}</div>
        ${o.soSo ? `<div style="margin-top:6px;font-size:15px">Sở Xây dựng: <b>${esc(o.soSo)}</b></div>` : ''}
      </div></div>`;
  },
  pageFront(tuyen) {
    const ti = TTT.get(tuyen), e = TTT.ends(tuyen), a = (ti.benA || ('BX ' + (e[0] || ''))).toUpperCase(), b = (ti.benB || ('BX ' + (e[e.length - 1] || ''))).toUpperCase();
    return `<div style="font-family:Arial,sans-serif;color:#000;text-align:center;padding-top:30mm">
      <div style="font-size:12px;color:#555;margin-bottom:6mm">Bảng tên bến đặt phía trên kính chắn gió trước · chữ cao tối thiểu 6 cm · in khổ A4 ngang hoặc phóng to khi in</div>
      <div style="font-weight:900;font-size:64pt;line-height:1.15">${esc(a)}</div><div style="font-weight:900;font-size:40pt;margin:4mm 0">⇄</div><div style="font-weight:900;font-size:64pt;line-height:1.15">${esc(b)}</div></div>`;
  },
  pageSide() {
    const c = S().company || {};
    return `<div style="font-family:Arial,sans-serif;color:#000;text-align:center">
      <div style="font-size:12px;color:#555;margin:0 0 6mm">Bảng tên đơn vị dán hai bên thân xe hoặc hai cánh cửa · kích thước tối thiểu 20 × 20 cm (in 2 bản)</div>
      <div style="width:170mm;height:170mm;margin:0 auto;border:4px solid #000;display:flex;flex-direction:column;justify-content:center;padding:10mm;box-sizing:border-box">
        <div style="font-weight:900;font-size:26pt;line-height:1.25">${esc(String(c.ten || '').toUpperCase())}</div>
        <div style="font-weight:900;font-size:40pt;margin-top:10mm">ĐT: ${esc(c.sdt || '')}</div></div></div>`;
  },
  open() {
    if (!Auth.guard('phuongtien', 'view')) return;
    const R = NY.routes(), X = (DB.vehicles || []).filter(v => !v.ngung && v.bks), o = NY.cfg(), c = S().company || {};
    if (!R.length) return toast('Chưa có tuyến nào trong Giờ chạy', 'err');
    const m = Modal.open({ title: 'In bảng niêm yết trên xe', width: 640, body: `<div class="form">
      <div class="field"><label>Tuyến</label><select class="inp" id="nyT">${R.map(t => `<option>${esc(t)}</option>`).join('')}</select></div>
      <div class="field"><label>Xe (chọn một hoặc nhiều)</label><div class="ny-xe">${X.map(v => `<label><input type="checkbox" value="${esc(v.id)}"> ${esc(v.bks)}</label>`).join('')}</div></div>
      <div class="row" style="gap:10px"><div class="field grow"><label>Đường dây nóng của nhà xe</label><input class="inp" id="nyH" value="${esc(o.hotline || c.sdt || '')}"></div><div class="field grow"><label>Hành lý miễn cước (kg/khách)</label><input class="inp" id="nyL" type="number" value="${esc(o.hanhLy || '')}" placeholder="Theo quy định của nhà xe"></div></div>
      <div class="field"><label>Số điện thoại tiếp nhận phản ánh của Sở (nếu Sở yêu cầu)</label><input class="inp" id="nyS" value="${esc(o.soSo || '')}"></div>
      <div class="field"><label>Dịch vụ phục vụ hành khách trên xe</label><textarea class="inp" id="nyD" rows="3" placeholder="VD: Nước uống, khăn lạnh, wifi, điều hòa…">${esc(o.dichVu || '')}</textarea></div>
      <div class="field"><label>In kèm</label><div class="ny-xe"><label><input type="checkbox" id="nyF" checked> Bảng tên bến (kính trước)</label><label><input type="checkbox" id="nyB" checked> Bảng tên đơn vị (thân xe)</label></div></div>
      <p class="small muted" style="margin:0">Giá vé lấy từ Bảng giá vé đang áp dụng; tuyến, mã tuyến, bến, hành trình lấy từ Giờ chạy › Thông tin tuyến.</p></div>`,
      foot: `<button class="btn" data-no>Hủy</button><button class="btn pri" data-go>${ic('printer')} Xem trước & in</button>` });
    const q = s => m.el.querySelector(s);
    q('[data-no]').onclick = () => m.close();
    q('[data-go]').onclick = () => {
      const ids = [...m.el.querySelectorAll('.ny-xe input[value]:checked')].map(i => i.value), xs = X.filter(v => ids.includes(v.id));
      if (!xs.length) return toast('Chọn ít nhất một xe', 'err');
      Object.assign(o, { hotline: q('#nyH').value.trim(), hanhLy: q('#nyL').value.trim(), soSo: q('#nyS').value.trim(), dichVu: q('#nyD').value.trim() }); App.changed();
      const t = q('#nyT').value, pages = xs.map(v => NY.pageIn(v, t, o));
      if (q('#nyF').checked) pages.push(NY.pageFront(t)); if (q('#nyB').checked) pages.push(NY.pageSide());
      m.close();
      const k = PRN.key; let prev = null; try { prev = localStorage.getItem(k); localStorage.setItem(k, 'preview'); } catch (e) { }
      try { Print.preview(pages.map(p => `<div class="pd-doc">${p}</div>`).join(''), { title: 'Niem yet tren xe' }); }
      finally { try { prev == null ? localStorage.removeItem(k) : localStorage.setItem(k, prev); } catch (e) { } }
    };
  }
};
addCSS(`.ny-xe{display:flex;flex-wrap:wrap;gap:6px 14px}.ny-xe label{display:inline-flex;align-items:center;gap:6px;font-size:13px;cursor:pointer}.ny-xe input{width:16px;height:16px;accent-color:var(--p)}`);
MODL.def('niemyet', { title: 'Niêm yết trên xe', render() { } });
