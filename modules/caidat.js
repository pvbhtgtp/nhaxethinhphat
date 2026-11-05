'use strict';
/* Module Cài đặt (thông tin công ty, mẫu in, quyết định, nội quy…) · tải khi mở màn hình (MODL). */
function qdCard() {
  const s = S(), q = Object.assign({ chucDanh: 'Người trực tiếp điều hành hoạt động vận tải', trinhDo: '', noi: 'Đồng Nai', ngayKy: D.today() }, s.qdBo || {});
  return card('Mẫu quyết định bổ nhiệm người điều hành vận tải', `<p class="small muted" style="margin-top:0">Theo Nghị định 158/2024/NĐ-CP, đơn vị kinh doanh vận tải phải có người trực tiếp điều hành hoạt động vận tải. Chọn nhân viên, nhập các thông tin còn lại rồi in. Họ tên, ngày sinh, CCCD, địa chỉ tự lấy từ hồ sơ nhân viên.</p>${lpDocBtn('qdOpen', q.chucDanh ? 'Chức danh: ' + esc(q.chucDanh) : '')}`);
}
function printCard() {
  const st = S(); st.inCfg = { ...PCFG.DEF, ...(st.inCfg || {}) };
  // hậu tố văn bản dùng chung với "Ký hiệu số HĐLĐ" (company.kyHieuHD), cỡ chữ vé K80 dùng chung với menu tài khoản (ve80.fs)
  const o = new Proxy(st.inCfg, {
    get: (t, k) => k === 'kyHieuHD' ? PCFG.suffix() : k === 'fs80' ? (+((S().ve80 || {}).fs) || 100) : t[k],
    set: (t, k, v) => {
      if (k === 'kyHieuHD') { const c = S().company = S().company || {}; c.kyHieuHD = String(v || '').trim().toUpperCase() || 'TGTP'; }
      else if (k === 'fs80') { S().ve80 = { ...(S().ve80 || {}), fs: Math.min(140, Math.max(70, +v || 100)) }; }
      else t[k] = v;
      return true;
    }
  });
  const fields = [
    { type: 'section', label: 'Khổ giấy và phông chữ mặc định' },
    { key: 'paper', label: 'Khổ giấy mặc định', type: 'select', options: [{ value: 'A4', label: 'A4 (210 × 297 mm)' }, { value: 'A5', label: 'A5 (148 × 210 mm)' }, { value: '80', label: 'K80 (rộng 80 mm, dài tự co theo nội dung)' }], hint: 'Bảng rộng (chấm công, lương, bảng kê) chỉ in A4 / A5' },
    { key: 'font', label: 'Phông chữ văn bản in', type: 'select', options: PCFG.FONTS.map(f => ({ value: f, label: f.replace(/'/g, '') })), hint: 'Văn bản pháp lý chuẩn: Times New Roman' },
    { key: 'fsDoc', label: 'Cỡ chữ văn bản (pt)', type: 'number', hint: 'Chuẩn văn bản hành chính: 13 – 14' },
    { key: 'fs80', label: 'Cỡ chữ vé / phiếu K80 (%)', type: 'number', hint: '70 – 140. Nhỏ hơn thì tiết kiệm giấy' },
    { type: 'section', label: 'Lề trang A4 / A5 (mm)' },
    { key: 'mTop', label: 'Lề trên', type: 'number', hint: 'Chuẩn 20 – 25' }, { key: 'mBottom', label: 'Lề dưới', type: 'number', hint: 'Chuẩn 20 – 25' },
    { key: 'mLeft', label: 'Lề trái', type: 'number', hint: 'Chuẩn 30 – 35' }, { key: 'mRight', label: 'Lề phải', type: 'number', hint: 'Chuẩn 15 – 20' },
    { type: 'section', label: 'Đánh số văn bản và hồ sơ' },
    { key: 'kyHieuHD', label: 'Hậu tố số văn bản (mã hồ sơ)', hint: 'Mặc định TGTP, ví dụ 01/QĐBN-TGTP. Dùng chung với Ký hiệu số HĐLĐ ở Thông tin công ty', full: true }
  ];
  return settingsCard('Quy tắc in', fields, o, 2, () => PCFG.css());
}
function paCard() {
  const s = S(), q = Object.assign({ loaiXe: 'Ghế ngồi', noi: 'Đồng Nai', ngayKy: D.today() }, s.paKD || {});
  return card('Mẫu phương án kinh doanh vận tải hành khách theo tuyến cố định', `<p class="small muted" style="margin-top:0">Nộp kèm hồ sơ đăng ký khai thác tuyến gửi Sở Giao thông vận tải. Tên đơn vị, giấy phép, số xe, số chỗ, số lái xe, giờ xuất bến từng đầu bến tự lấy từ dữ liệu app. Chọn tuyến, nhập phần còn lại rồi in.</p>${lpDocBtn('paOpen', 'Giờ xuất bến, số xe, số lái xe tự lấy từ app')}`);
}
function nqCard() {
  const q = Object.assign({ ngayKy: D.today() }, NQ_DEF, S().nqLD || {});
  return card('Nội quy lao động', `<p class="small muted" style="margin-top:0">Theo mẫu nội quy của công ty. Sửa các thông số cần thiết (giờ làm việc, ngày nghỉ, tỷ lệ làm thêm, kỷ luật...), thêm quy định riêng nếu cần rồi in. Nên đăng ký nội quy với cơ quan lao động khi công ty có từ 10 lao động trở lên.</p>${lpDocBtn('nqOpen', 'Làm việc ' + esc(q.gioNgay) + ' giờ/ngày, ' + esc(q.ngayTuan) + ' ngày/tuần')}`);
}
const LEGAL_FIELDS = [
      { key: 'cccdGDSo', label: 'Số CCCD giám đốc' }, { key: 'gpkdSo', label: 'Số GPKD vận tải' }, { key: 'gpkdNgay', label: 'Ngày cấp GPKD vận tải', type: 'date' }, { key: 'gpkdNoiCap', label: 'Nơi cấp GPKD vận tải' },
      { key: 'gpkdImg', label: 'Giấy phép kinh doanh', type: 'image', max: 2400, full: true, hint: 'Tải ảnh chụp hoặc quét giấy phép' },
      { key: 'cccdGDTruoc', label: 'CCCD giám đốc (mặt trước)', type: 'image', max: 2400 }, { key: 'cccdGDSau', label: 'CCCD giám đốc (mặt sau)', type: 'image', max: 2400 },
      { key: 'chenKy', label: 'Chèn chữ ký giám đốc và con dấu vào các bản in', type: 'checkbox', def: true, full: true },
      { key: 'chuKyGD', label: 'Chữ ký giám đốc', type: 'image', max: 400, hint: 'Chụp trên giấy trắng, app tự tách nền, tự in vào hợp đồng' }, { key: 'conDau', label: 'Con dấu công ty', type: 'image', max: 400, hint: 'Chụp hoặc quét con dấu, app tự tách nền trắng' }];
const vSet = {
  title: 'Cài đặt', icon: 'settings', desc: 'Thông tin công ty, công chuẩn, tỷ lệ bảo hiểm, biểu thuế TNCN', print: false,
  render(el) {
    const s = S();
    el.innerHTML = `<div class="grid cols-2">
      <div class="grid">${settingsCard('Thông tin công ty', Auth.can('users', 'view') ? [...COMPANY_FIELDS, { type: 'section', label: 'Hồ sơ pháp lý & chữ ký (chỉ Admin xem)' }, ...LEGAL_FIELDS] : COMPANY_FIELDS, s.company)}${atgtCard()}${qdCard()}${paCard()}${nqCard()}${printCard()}</div>
      <div class="grid">
        ${settingsCard('Chấm công & làm thêm', [{ key: 'congChuan', label: 'Công chuẩn / tháng', type: 'number' }, { key: 'gioCong', label: 'Số giờ / công', type: 'number' }, { key: 'heSoOT', label: 'Hệ số làm thêm giờ', type: 'number', hint: '1,5 ngày thường · 2 ngày nghỉ · 3 ngày lễ' }, { key: 'ngayNghi', label: 'Ngày nghỉ hằng tuần', type: 'select', options: [{ value: 'CN', label: 'Chủ nhật' }, { value: 'T7CN', label: 'Thứ 7 và Chủ nhật' }] }], s)}
        ${settingsCard('Phòng ban', [{ key: 'pbText', label: 'Mỗi dòng một phòng ban', type: 'textarea', rows: 6, full: true }], { pbText: s.phongBan.join('\n') }, 2)}
      </div>
      ${bxCard()}${settingsCard('Bảo hiểm bắt buộc (%)', [{ key: 'luongCoSo', label: 'Lương cơ sở', type: 'money', hint: 'Trần BHXH, BHYT = 20 lần' }, { key: 'ltVung', label: 'Lương tối thiểu vùng', type: 'money', hint: 'Vùng I 5.310.000 (2026). Trần BHTN = 20 lần' },
        { type: 'section', label: 'Người lao động đóng' }, { key: 'bhxhNLD', label: 'BHXH', type: 'number' }, { key: 'bhytNLD', label: 'BHYT', type: 'number' }, { key: 'bhtnNLD', label: 'BHTN', type: 'number' },
        { type: 'section', label: 'Doanh nghiệp đóng' }, { key: 'bhxhDN', label: 'BHXH (gồm TNLĐ-BNN)', type: 'number' }, { key: 'bhytDN', label: 'BHYT', type: 'number' }, { key: 'bhtnDN', label: 'BHTN', type: 'number' }, { key: 'kpcdDN', label: 'Kinh phí công đoàn', type: 'number' }], s, 3)}
      <div id="taxBox">${card('Thuế TNCN (biểu lũy tiến từng phần)', `<div class="form">${fieldHTML({ key: 'gtBanThan', label: 'Giảm trừ bản thân / tháng', type: 'money' }, s.gtBanThan)}${fieldHTML({ key: 'gtNPT', label: 'Giảm trừ mỗi người phụ thuộc', type: 'money' }, s.gtNPT)}</div>
        <table class="tbl compact bac mt"><thead><tr><th>Bậc</th><th class="r">Thu nhập tính thuế đến (đồng/tháng)</th><th class="r">Thuế suất %</th></tr></thead><tbody>${s.bac.map((b, i) => `<tr><td>${i + 1}</td><td><input data-money data-bd="${i}" value="${b.den ? F.money(b.den) : ''}" placeholder="Không giới hạn"></td><td><input type="number" data-bt="${i}" value="${b.ts}"></td></tr>`).join('')}</tbody></table>
        <p class="small muted">Mặc định theo quy định áp dụng từ kỳ tính thuế 2026: giảm trừ 15,5 triệu, người phụ thuộc 6,2 triệu, biểu 5 bậc 5% · 10% · 20% · 30% · 35%. Khi luật thay đổi, sửa ở đây là bảng lương tự tính lại.</p>
        <div class="row"><button class="btn pri" data-act="taxSave">${ic('check')} Lưu cài đặt thuế</button><button class="btn" data-act="taxReset">${ic('refresh')} Về mặc định 2026</button></div>`)}</div>
    </div>`;
    setTimeout(() => { const b = $$('#view [data-sfsave]')[2]; if (b) b.onclick = () => { const v = b.closest('.card').querySelector('textarea').value.split('\n').map(x => x.trim()).filter(Boolean); if (!v.length) return toast('Cần ít nhất 1 phòng ban', 'err'); s.phongBan = [...new Set(v)]; App.changed(false); toast('Đã cập nhật phòng ban', 'ok'); }; }, 10);
  }
};
const lpDocBtn = (act, n) => `<div class="lp-doc"><button class="btn pri" data-act="${act}">${ic('eye')} Soạn &amp; xem trước</button><span class="small muted">${n}</span></div>`;
{ const r0 = vSet.render; vSet.render = function (el) { const r = r0.apply(this, arguments); try { if (PD.isAdmin()) PD.mount(el); } catch (e) { console.warn('PD', e); } return r; }; vSet.desc = 'Phân quyền theo phòng ban, thông tin công ty, công chuẩn, bảo hiểm, thuế TNCN'; }
function bxCard() {
  const ym = BX.ym(), L = BX.emps(), ed = BX.canEdit(), T = BX.tot();
  const rows = L.map(e => { const v = BX.val(e); return `<tr><td class="nw muted">${ym.slice(5)}/${ym.slice(0, 4)}</td><td><b>${esc(e.ten)}</b></td><td class="c"><input type="checkbox" data-bx="bh" data-e="${e.id}" ${v.bh ? 'checked' : ''} ${ed ? '' : 'disabled'} style="width:20px;height:20px"></td><td><input class="inp r" data-bx="ck" data-e="${e.id}" value="${v.ck ? F.money(v.ck) : ''}" inputmode="numeric" placeholder="0" ${ed ? '' : 'disabled'}></td><td><input class="inp r" data-bx="ml" data-e="${e.id}" value="${v.ml ? F.money(v.ml) : ''}" inputmode="numeric" placeholder="0" ${ed ? '' : 'disabled'}></td></tr>`; }).join('');
  return card('Đóng BHXH & lương chuyển khoản theo tháng', `<div class="v2f"><p class="small muted" style="margin-top:0">Chọn tháng, tick nhân viên đóng BHXH, nhập lương chuyển khoản và số tiền Bảo hiểm xã hội (mức lương đóng BHXH). Có thể lưu bảng thành PDF vào Lưu trữ hồ sơ.</p>
    <div class="row" style="gap:8px;margin-bottom:10px;align-items:center;flex-wrap:wrap"><label class="field" style="margin:0"><span>Tháng</span><input type="month" class="inp" data-bx="m" value="${ym}"></label><span class="grow"></span>${ed ? `<button class="btn" data-bxa="fill">Lấy từ hồ sơ nhân viên</button><button class="btn" data-bxa="all">Tick đóng BHXH tất cả</button>` : ''}<button class="btn pri" data-bxa="save">${ic('folder')} Lưu hồ sơ</button></div>
    <div class="tbl-wrap free"><table class="tbl compact bx-t"><thead><tr><th>Tháng</th><th>Tên nhân viên</th><th class="c">Đóng BHXH</th><th class="r">Lương chuyển khoản</th><th class="r" title="Mức lương đóng bảo hiểm xã hội">Bảo hiểm xã hội</th></tr></thead><tbody>${rows || '<tr><td colspan="5" class="empty">Chưa có nhân viên</td></tr>'}</tbody><tfoot><tr id="bxTot" style="font-weight:700"><td></td><td>Tổng cộng</td><td class="c">${T.n} người</td><td class="r">${F.money(T.ck)}</td><td class="r">${F.money(T.ml)}</td></tr></tfoot></table></div></div>`);
}
function atgtCard() {
  const q = ATG.get();
  return card('Mẫu quyết định thành lập Ban An toàn giao thông', `<p class="small muted" style="margin-top:0">Soạn quyết định thành lập Ban An toàn giao thông (thành viên, nhiệm vụ), xem trước bản in rồi in hoặc lưu bản PDF vào Lưu trữ hồ sơ. Các căn cứ pháp lý chỉ là mẫu, cần đối chiếu văn bản hiện hành.</p>${lpDocBtn('atgOpen', 'Ban: ' + esc(q.ten) + ' · Số ' + esc(q.so))}`);
}
MODL.def('caidat', vSet);
