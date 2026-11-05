'use strict';
/* Module Thuế & bảo hiểm · tải khi mở màn hình (MODL). */
/* ---------- Thuế & bảo hiểm ---------- */
UI.y = defaultMonth().slice(0, 4);
const vThue = {
  title: 'Thuế TNCN & Bảo hiểm', label: 'Thuế & bảo hiểm', icon: 'percent', desc: 'Tổng hợp theo năm và công cụ tính lương Gross / Net',
  tools: () => { const ys = [...new Set([...Object.keys(DB.cham).map(m => m.slice(0, 4)), D.today().slice(0, 4)])].sort(); return `<label class="row small" style="gap:6px">Năm ${selectHTML('yPick', ys, UI.y)}</label>`; },
  after: () => onVal('yPick', v => { UI.y = v; App.render(); }),
  months() { return Array.from({ length: 12 }, (_, i) => UI.y + '-' + pad(i + 1)).filter(m => DB.cham[m] && Object.keys(DB.cham[m]).length); },
  data() {
    const ms = vThue.months(), per = {};
    const mrows = ms.map(m => { const L = payroll(m); L.forEach(x => { const p = per[x.id] = per[x.id] || { id: x.id, ma: x.ma, ten: x.ten, mst: x.mst, soNPT: x.soNPT, thang: 0, gross: 0, tnct: 0, bh: 0, gt: 0, thue: 0, net: 0 }; p.thang++; p.gross += x.gross; p.tnct += x.tnChiuThue; p.bh += x.bhNLD; p.gt += x.giamTru; p.thue += x.thue; p.net += x.thucLinh; });
      return { id: m, thang: F.month(m), nv: L.length, gross: sum(L, x => x.gross), tnct: sum(L, x => x.tnChiuThue), bh: sum(L, x => x.bhNLD), bhdn: sum(L, x => x.bhDN), thue: sum(L, x => x.thue), net: sum(L, x => x.thucLinh) }; });
    return { mrows, erows: Object.values(per).sort((a, b) => b.thue - a.thue) };
  },
  mcols: [{ key: 'thang', label: 'Tháng' }, { key: 'nv', label: 'Số NV', align: 'c', xtype: 'int' }, { key: 'gross', label: 'Tổng thu nhập', fmt: 'money', sum: true }, { key: 'tnct', label: 'TN chịu thuế', fmt: 'money', sum: true }, { key: 'bh', label: 'BH NLĐ', fmt: 'money', sum: true }, { key: 'bhdn', label: 'BH + KPCĐ DN', fmt: 'money', sum: true }, { key: 'thue', label: 'Thuế TNCN', fmt: 'money', sum: true }, { key: 'net', label: 'Thực lĩnh', fmt: 'money', sum: true }],
  ecols: [{ key: 'ma', label: 'Mã NV' }, { key: 'ten', label: 'Họ và tên' }, { key: 'mst', label: 'MST' }, { key: 'soNPT', label: 'NPT', align: 'c', xtype: 'int' }, { key: 'thang', label: 'Số tháng', align: 'c', xtype: 'int' }, { key: 'tnct', label: 'TN chịu thuế', fmt: 'money', sum: true }, { key: 'bh', label: 'BH bắt buộc', fmt: 'money', sum: true }, { key: 'gt', label: 'Giảm trừ gia cảnh', fmt: 'money', sum: true }, { key: 'thue', label: 'Thuế đã khấu trừ', fmt: 'money', sum: true }],
  render(el) {
    const { mrows, erows } = vThue.data(); App.subtitle = 'Năm ' + UI.y;
    el.innerHTML = `<div class="grid cols-21"><div><div id="tM"></div></div><div>${card('Tính nhanh lương Gross ⇄ Net', `
      <div class="form"><label class="field"><span>Số tiền</span><input class="inp num" id="cAmt" data-money value="30.000.000"></label><label class="field"><span>Loại</span><select class="inp" id="cType"><option value="g">Đây là lương Gross</option><option value="n">Đây là lương Net</option></select></label>
      <label class="field"><span>Lương đóng BH</span><input class="inp num" id="cBH" data-money placeholder="Bằng lương Gross"></label><label class="field"><span>Số người phụ thuộc</span><input class="inp num" type="number" min="0" id="cNPT" value="0"></label></div>
      <div class="calc-out mt" id="cOut"></div>`)}</div></div>
      <div class="mt"><div class="card-h" style="padding:0 0 10px;border:0"><h3>Quyết toán thuế theo nhân viên · năm ${UI.y}</h3></div><div id="tE"></div></div>`;
    table($('#tM'), { id: 'tm', columns: vThue.mcols, rows: mrows, search: false, free: true, empty: 'Chưa có dữ liệu năm này' });
    table($('#tE'), { id: 'te', columns: vThue.ecols, rows: erows, ph: 'Tìm nhân viên...' });
    const run = () => {
      const amt = F.parse($('#cAmt').value), npt = +$('#cNPT').value || 0, bhIn = F.parse($('#cBH').value);
      const fromGross = g => { const b = bhOf(bhIn || g, true), bd = bhOf(bhIn || g, false); const bh = b.bhxh + b.bhyt + b.bhtn; const tn = Math.max(0, g - bh - S().gtBanThan - npt * S().gtNPT); const t = taxOf(tn); return { g, b, bh, tn, t, net: g - bh - t, dn: bd.bhxh + bd.bhyt + bd.bhtn + bd.kpcd }; };
      let r;
      if ($('#cType').value === 'g') r = fromGross(amt);
      else { let lo = amt, hi = amt * 2 + 1e7; for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (fromGross(mid).net < amt) lo = mid; else hi = mid; } r = fromGross(Math.round(hi)); }
      $('#cOut').innerHTML = `<div><span>Lương Gross</span><b>${F.vnd(r.g)}</b></div><div><span>BHXH ${S().bhxhNLD}% · BHYT ${S().bhytNLD}% · BHTN ${S().bhtnNLD}%</span><b>- ${F.money(r.bh)}</b></div><div><span>Giảm trừ gia cảnh</span><b>${F.money(S().gtBanThan + npt * S().gtNPT)}</b></div><div><span>Thu nhập tính thuế</span><b>${F.money(r.tn)}</b></div><div><span>Thuế TNCN</span><b>- ${F.money(r.t)}</b></div><div><span>Lương Net</span><b class="big">${F.vnd(r.net)}</b></div><div><span class="muted">DN đóng thêm BH + KPCĐ</span><b class="muted">${F.money(r.dn)}</b></div><div><span class="muted">Tổng chi phí DN</span><b class="muted">${F.money(r.g + r.dn)}</b></div>`;
    };
    ['cAmt', 'cNPT', 'cBH'].forEach(i => $('#' + i).addEventListener('input', run)); $('#cType').addEventListener('change', run); run();
  },
  excel() { const { mrows, erows } = vThue.data(); XLSX.save(`Thue TNCN va BH nam ${UI.y}`, [xSheet('Theo tháng', 'TỔNG HỢP THUẾ TNCN & BẢO HIỂM NĂM ' + UI.y, vThue.mcols, mrows), xSheet('Theo nhân viên', 'QUYẾT TOÁN THUẾ TNCN THEO NHÂN VIÊN NĂM ' + UI.y, vThue.ecols, erows)]); },
  print() { const { mrows, erows } = vThue.data(); Print.run(`<div class="pr">${Print.head()}<h2>Tổng hợp thuế TNCN & bảo hiểm năm ${UI.y}</h2>${Print.table(vThue.mcols, mrows)}<h2 style="font-size:15px;margin-top:20px">Chi tiết theo nhân viên</h2>${Print.table(vThue.ecols, erows)}${Print.signs(['Người lập biểu', 'Kế toán trưởng', 'Giám đốc'])}</div>`, { landscape: true, title: 'Thue TNCN ' + UI.y }); }
};
MODL.def('thue', vThue);
