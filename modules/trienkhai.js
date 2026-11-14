'use strict';
/* Module Triển khai nhà xe mới (chỉ Admin) · tải khi mở màn hình (MODL).
   Mỗi nhà xe mới: dùng CHUNG code của app này (sửa ở đây là mọi nhà xe cùng cập nhật), nhưng có địa chỉ riêng
   (Cloudflare Worker *.workers.dev, khác nguồn với app này nên bộ nhớ trình duyệt không lẫn) và Firebase / Drive riêng của nhà xe đó.
   Worker của nhà xe chỉ chuyển tiếp các tệp của app này và thay phần cấu hình (app-data) bằng cấu hình của nhà xe.
   Danh sách nhà xe lưu trong Cài đặt (settings.nhaxeCon, chỉ cấu hình công khai, không có mật khẩu);
   địa chỉ + mã của "Worker triển khai" chỉ lưu trên máy Admin (localStorage), giống cách lưu cấu hình Zalo Bot. */
const NXT = {
  K: 'nx.trienkhai',
  cfg() { try { return JSON.parse(localStorage.getItem(NXT.K) || '{}') || {}; } catch (e) { return {}; } },
  saveCfg(c) { try { localStorage.setItem(NXT.K, JSON.stringify(c)); return true; } catch (e) { toast('Trình duyệt không cho lưu cấu hình trên máy này', 'err'); return false; } },
  ready: c => /^https:\/\/[\w.-]+\.workers\.dev\/?$/.test(c.url || '') && String(c.key || '').length >= 12,
  list: () => (S().nhaxeCon = S().nhaxeCon || []),
  origin: () => location.origin + location.pathname.replace(/\/[^/]*$/, ''),   // nơi chứa code chung (vd https://pvbhtgtp.github.io/nhaxethinhphat)
  slug: t => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40),
  shell(o) {   // phần cấu hình nhà xe mới (thay app-data): không có dữ liệu, _meta.nx = lần đầu tự tạo dữ liệu trống trên Firebase của nhà xe
    const j = { settings: { company: { ten: o.ten }, adminUser: o.sdt, gsync: { mode: 'fb', fb: o.fb, email: o.email, url: 'firebase:' + o.fb.projectId } }, _meta: { shell: true, nx: o.slug } };
    return JSON.stringify(j).replace(/</g, '\\u003c');
  },
  /* kiểm tra Firebase nhà xe mới bằng 1 kết nối RIÊNG (không đụng kết nối Firebase của nhà xe đang dùng app) */
  async testFb(fb, email, key) {
    await FB.load(); const app = firebase.initializeApp(fb, 'nxt' + Date.now());
    try { await app.auth().signInWithEmailAndPassword(email, key); const s = await app.firestore().collection('nhaxe').limit(1).get(); return { empty: s.empty }; }
    catch (e) { throw FB.err(e); }
    finally { try { await app.auth().signOut(); } catch (e) { } app.delete().catch(() => { }); }
  },
  async call(body) {
    const c = NXT.cfg(); if (!NXT.ready(c)) throw new Error('Chưa cài Worker triển khai (bước 1)');
    let r; try { r = await fetch(c.url.replace(/\/$/, ''), { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ ...body, key: c.key }) }); }
    catch (e) { throw new Error('Không kết nối được Worker triển khai (kiểm tra mạng, địa chỉ Worker)'); }
    let j; try { j = await r.json(); } catch (e) { throw new Error('Worker triển khai trả về không đúng: kiểm tra đã dán đúng mã và bấm Deploy'); }
    if (!j.ok) throw new Error(j.error || 'Lỗi không rõ'); return j;
  },
  /* Mã dán 1 lần vào Cloudflare (Worker tên nx-trienkhai). Biến môi trường: CF_TOKEN (Secret), CF_ACCOUNT, KEY */
  WORKER: String.raw`// WORKER TRIỂN KHAI NHÀ XE MỚI · dán vào Cloudflare → Workers → Create → Edit code → Deploy
// Settings → Variables and Secrets: CF_TOKEN (Secret: API token quyền "Workers Scripts: Edit"), CF_ACCOUNT (Account ID), KEY (mã kết nối, ít nhất 12 ký tự)
const H = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Content-Type': 'application/json' };
const out = (o, s) => new Response(JSON.stringify(o), { status: s || 200, headers: H });
function tenantCode(origin, shell) {
  return 'const ORIGIN = ' + JSON.stringify(origin) + ', SHELL = ' + JSON.stringify(shell) + ';\n' +
    'export default { async fetch(req) {\n' +
    '  const u = new URL(req.url); let p = u.pathname; if (p === "/" || p === "") p = "/index.html";\n' +
    '  const r = await fetch(ORIGIN + p + u.search, { method: req.method === "HEAD" ? "HEAD" : "GET", cf: { cacheTtl: 30 } });\n' +
    '  if (p === "/index.html" && r.ok) { const t = (await r.text()).replace(/(<script id="app-data" type="application\\/json">)[\\s\\S]*?(<\\/script>)/, (m, a, b) => a + SHELL + b);\n' +
    '    return new Response(t, { status: 200, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-cache" } }); }\n' +
    '  return new Response(r.body, { status: r.status, headers: new Headers(r.headers) });\n' +
    '} };\n';
}
async function cf(env, path, init) {
  const r = await fetch('https://api.cloudflare.com/client/v4/accounts/' + env.CF_ACCOUNT + path, { ...init, headers: { Authorization: 'Bearer ' + env.CF_TOKEN, ...((init && init.headers) || {}) } });
  const j = await r.json().catch(() => ({})); if (!j.success) throw new Error(((j.errors || [])[0] || {}).message || ('Cloudflare ' + r.status)); return j.result;
}
export default { async fetch(req, env) {
  if (req.method === 'OPTIONS') return new Response(null, { headers: H });
  if (req.method !== 'POST') return out({ ok: true, ten: 'Worker triển khai nhà xe' });
  try {
    const b = JSON.parse(await req.text());
    if (!env.KEY || String(b.key) !== String(env.KEY)) return out({ ok: false, error: 'Sai mã kết nối' }, 403);
    const sub = (await cf(env, '/workers/subdomain')).subdomain;
    if (b.action === 'ping') return out({ ok: true, sub });
    if (b.action === 'deploy') {
      const name = 'nx-' + String(b.slug || '').replace(/[^a-z0-9-]/g, '').slice(0, 40); if (name.length < 4) throw new Error('Tên địa chỉ không hợp lệ');
      if (!/^https:\/\//.test(b.origin || '') || !b.shell) throw new Error('Thiếu nguồn code hoặc cấu hình');
      const fd = new FormData();
      fd.append('metadata', new Blob([JSON.stringify({ main_module: 'w.js', compatibility_date: '2024-11-01' })], { type: 'application/json' }));
      fd.append('w.js', new Blob([tenantCode(b.origin, b.shell)], { type: 'application/javascript+module' }), 'w.js');
      await cf(env, '/workers/scripts/' + name, { method: 'PUT', body: fd });
      await cf(env, '/workers/scripts/' + name + '/subdomain', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: true }) });
      return out({ ok: true, url: 'https://' + name + '.' + sub + '.workers.dev' });
    }
    return out({ ok: false, error: 'Lệnh không hợp lệ' }, 400);
  } catch (e) { return out({ ok: false, error: String(e.message || e) }, 500); }
} };
`,
  copy(t, msg) { navigator.clipboard.writeText(t).then(() => toast(msg || 'Đã sao chép', 'ok'), () => toast('Máy không cho sao chép tự động, hãy bôi đen và copy', 'err')); },
  /* Bước 1 (1 lần): cài Worker triển khai trên Cloudflare */
  setup() {
    const c = NXT.cfg();
    const m = Modal.open({ title: 'Cài Worker triển khai (làm 1 lần)', width: 760, body: `<ol class="small" style="line-height:1.7;margin-top:0;padding-left:18px">
      <li>Đăng ký / đăng nhập <a href="https://dash.cloudflare.com/sign-up" target="_blank" rel="noopener">Cloudflare</a> (miễn phí).</li>
      <li><b>Workers &amp; Pages</b> → <b>Create</b> → <b>Create Worker</b> → đặt tên <code>nx-trienkhai</code> → <b>Deploy</b> → <b>Edit code</b> → xóa hết, dán mã bên dưới → <b>Deploy</b>.</li>
      <li>Tạo mã API: <a href="https://dash.cloudflare.com/profile/api-tokens" target="_blank" rel="noopener">My Profile → API Tokens</a> → <b>Create Token</b> → mẫu <b>Edit Cloudflare Workers</b> → tạo, chép mã.</li>
      <li>Trong Worker <code>nx-trienkhai</code> → <b>Settings → Variables and Secrets</b>: thêm <code>CF_TOKEN</code> (loại Secret, dán mã API), <code>CF_ACCOUNT</code> (Account ID, xem ở trang chủ Workers bên phải), <code>KEY</code> (tự đặt mã kết nối, ít nhất 12 ký tự) → <b>Deploy</b>.</li>
      <li>Chép địa chỉ Worker (dạng <code>https://nx-trienkhai.ten-ban.workers.dev</code>) và KEY vào 2 ô dưới → <b>Kiểm tra &amp; lưu</b>.</li></ol>
      <div class="row" style="justify-content:space-between;align-items:center"><b>Mã Worker</b><button class="btn sm" data-cp>${ic('copy')} Sao chép mã</button></div>
      <textarea class="inp" readonly rows="7" style="width:100%;font:12px/1.4 monospace">${esc(NXT.WORKER)}</textarea>
      <div class="form" style="margin-top:10px"><label class="field full"><span>Địa chỉ Worker triển khai</span><input class="inp" data-u value="${esc(c.url || '')}" placeholder="https://nx-trienkhai.xxx.workers.dev"></label>
      <label class="field full"><span>Mã kết nối (KEY)</span><input class="inp" data-k type="password" autocomplete="off" value="${esc(c.key || '')}"></label></div>`,
      foot: `<button class="btn" data-x>Đóng</button><button class="btn pri" data-ok>${ic('check')} Kiểm tra &amp; lưu</button>` });
    const q = s => m.el.querySelector(s);
    q('[data-cp]').onclick = () => NXT.copy(NXT.WORKER, 'Đã sao chép mã Worker');
    q('[data-x]').onclick = () => m.close();
    q('[data-ok]').onclick = async () => {
      const v = { url: q('[data-u]').value.trim().replace(/\/$/, ''), key: q('[data-k]').value.trim() };
      if (!NXT.ready(v)) return toast('Địa chỉ phải dạng https://….workers.dev và mã ít nhất 12 ký tự', 'err', 6000);
      const old = NXT.cfg(); NXT.saveCfg(v);
      try { const j = await NXT.call({ action: 'ping' }); NXT.saveCfg({ ...v, sub: j.sub }); toast('Đã kết nối Worker triển khai · tài khoản ' + esc(j.sub) + '.workers.dev', 'ok', 6000); m.close(); App.render(); }
      catch (e) { NXT.saveCfg(old); toast(esc(e.message), 'err', 9000); }
    };
  },
  host: o => { const c = NXT.cfg(); return o.url ? o.url.replace(/^https:\/\//, '') : (c.sub ? 'nx-' + o.slug + '.' + c.sub + '.workers.dev' : 'nx-' + o.slug + '.<tài-khoản>.workers.dev'); },
  /* Bước 2: thêm / sửa nhà xe (từng bước có nút mở đúng trang Google) */
  edit(o0) {
    const isNew = !o0, o = o0 ? JSON.parse(JSON.stringify(o0)) : { ten: '', slug: '', sdt: '', fb: {}, email: '' };
    const pid = () => (o.fb && o.fb.projectId) || '', fc = p => 'https://console.firebase.google.com/project/' + encodeURIComponent(pid()) + p;
    const m = Modal.open({ title: isNew ? 'Thêm nhà xe mới' : 'Nhà xe ' + esc(o.ten), width: 780, body: `<div class="nxt-st">
      <h4>1. Thông tin nhà xe</h4><div class="form">
        <label class="field full"><span>Tên công ty (như trên giấy phép)</span><input class="inp" data-f="ten" value="${esc(o.ten)}" placeholder="CÔNG TY TNHH VẬN TẢI ..."></label>
        <label class="field"><span>Tên địa chỉ (chữ thường, không dấu)</span><input class="inp" data-f="slug" value="${esc(o.slug)}" ${isNew ? '' : 'readonly'} placeholder="hoanglong"><small data-host></small></label>
        <label class="field"><span>Số điện thoại Admin (tên đăng nhập)</span><input class="inp" data-f="sdt" value="${esc(o.sdt)}" inputmode="tel"><small>Mật khẩu lần đầu là <b>1</b>, đăng nhập xong app bắt đổi.</small></label></div>
      <h4>2. Firebase của nhà xe (đăng nhập bằng Gmail của nhà xe)</h4>
      <ol class="small" style="line-height:1.7;padding-left:18px;margin:0 0 8px">
        <li><a href="https://console.firebase.google.com/" target="_blank" rel="noopener">Mở Firebase</a> → <b>Tạo dự án</b> → đặt tên → tạo xong bấm biểu tượng <b>&lt;/&gt; (Web)</b> → đặt tên → chép đoạn <b>firebaseConfig</b> dán vào ô dưới.</li>
        <li><span data-l="fs">Firestore Database</span> → <b>Create database</b> → chọn vị trí <b>asia-southeast1</b> → Production mode.</li>
        <li><span data-l="au">Authentication</span> → <b>Get started</b> → bật <b>Email/Password</b> → tab <b>Users</b> → <b>Add user</b>: email tài khoản dữ liệu + mật khẩu (= mã kết nối, ít nhất 6 ký tự).</li>
        <li><span data-l="dm">Authentication → Settings → Authorized domains</span> → <b>Add domain</b>: <code data-host2></code> <button type="button" class="btn sm" data-cph>Chép</button></li>
        <li><span data-l="ru">Firestore → Rules</span> → xóa hết, dán Rules → <b>Publish</b>. <button type="button" class="btn sm" data-cpr>${ic('copy')} Sao chép Rules</button></li></ol>
      <div class="form">
        <label class="field full"><span>Đoạn firebaseConfig</span><textarea class="inp" data-f="fbcfg" rows="4" placeholder="const firebaseConfig = { apiKey: ..., projectId: ... }">${o.fb && o.fb.projectId ? esc(JSON.stringify(o.fb, null, 1)) : ''}</textarea><small data-fbok></small></label>
        <label class="field"><span>Email tài khoản dữ liệu</span><input class="inp" data-f="email" type="email" value="${esc(o.email)}"></label>
        <label class="field"><span>Mã kết nối (chỉ để kiểm tra, không lưu)</span><input class="inp" data-f="key" type="password" autocomplete="off"></label></div>
      <h4>3. Kho hồ sơ Drive</h4><p class="small" style="margin:0">Làm sau khi app nhà xe chạy: Admin nhà xe vào <b>Management → Kho hồ sơ Google Drive</b>, làm theo hướng dẫn ở đó (bằng Gmail của nhà xe).</p>
      <div data-res style="margin-top:12px"></div></div>`,
      foot: `<button class="btn" data-x>Đóng</button><button class="btn" data-test>${ic('check')} Kiểm tra Firebase</button><button class="btn pri" data-go>${ic('upload')} ${isNew ? 'Triển khai' : 'Triển khai lại'}</button>` });
    const q = s => m.el.querySelector(s), f = k => q(`[data-f="${k}"]`);
    const read = () => { o.ten = f('ten').value.trim(); if (isNew) o.slug = NXT.slug(f('slug').value); o.sdt = String(f('sdt').value).replace(/\D/g, ''); const p = FB.parseCfg(f('fbcfg').value); if (p.projectId) o.fb = p; o.email = f('email').value.trim(); };
    const links = () => { const L = { fs: '/firestore', au: '/authentication/users', dm: '/authentication/settings', ru: '/firestore/databases/-default-/rules' };
      m.el.querySelectorAll('[data-l]').forEach(s => { const t = s.textContent; s.innerHTML = pid() ? `<a href="${esc(fc(L[s.dataset.l]))}" target="_blank" rel="noopener">${esc(t)}</a>` : `<b>${esc(t)}</b>`; });
      const h = NXT.host(o); q('[data-host]').textContent = 'Địa chỉ app: ' + h; q('[data-host2]').textContent = h;
      q('[data-fbok]').textContent = pid() ? '✓ Nhận được dự án: ' + pid() : f('fbcfg').value.trim() ? 'Chưa thấy apiKey / projectId trong đoạn đã dán' : ''; };
    m.el.querySelectorAll('[data-f]').forEach(i => i.addEventListener('input', () => { read(); links(); }));
    if (isNew) f('ten').addEventListener('input', () => { if (!f('slug').dataset.t) { f('slug').value = NXT.slug(f('ten').value.replace(/^(cong ty|công ty)?\s*(tnhh|cp|cổ phần)?\s*(mtv)?\s*/i, '').split(/\s+/).slice(-2).join(' ')); read(); links(); } });
    if (isNew) f('slug').addEventListener('keydown', () => { f('slug').dataset.t = 1; });
    links();
    q('[data-cph]').onclick = () => NXT.copy(NXT.host(o), 'Đã chép tên miền');
    q('[data-cpr]').onclick = () => { read(); if (!/@/.test(o.email)) return toast('Nhập email tài khoản dữ liệu trước', 'err'); NXT.copy(FB.rules(o.email), 'Đã sao chép Rules, dán vào Firestore → Rules → Publish'); };
    q('[data-x]').onclick = () => m.close();
    const need = () => { read(); if (!o.ten) throw new Error('Nhập tên công ty'); if (o.slug.length < 3) throw new Error('Tên địa chỉ ít nhất 3 ký tự (a-z, 0-9, -)');
      if (isNew && NXT.list().some(x => x.slug === o.slug)) throw new Error('Tên địa chỉ này đã dùng cho nhà xe khác'); if (o.sdt.length < 9) throw new Error('Nhập số điện thoại Admin');
      if (!o.fb.apiKey || !o.fb.projectId) throw new Error('Dán đoạn firebaseConfig (cần có apiKey và projectId)'); if (!/@/.test(o.email)) throw new Error('Nhập email tài khoản dữ liệu');
      const me = (GS.cfg().fb || {}).projectId; if (me && o.fb.projectId === me) throw new Error('Đây là Firebase của nhà xe đang dùng app này. Nhà xe mới phải có Firebase riêng'); };
    const busy = async (b, fn) => { b.disabled = true; try { await fn(); } catch (e) { toast(esc(e.message), 'err', 9000); } finally { b.disabled = false; } };
    q('[data-test]').onclick = e => busy(e.currentTarget, async () => { need(); const k = f('key').value; if (k.length < 6) throw new Error('Nhập mã kết nối để kiểm tra');
      const r = await NXT.testFb(o.fb, o.email, k); toast('Kết nối được Firebase ' + esc(o.fb.projectId) + (r.empty ? ' · chưa có dữ liệu (đúng, nhà xe mới)' : ' · đã có dữ liệu'), 'ok', 7000); });
    q('[data-go]').onclick = e => busy(e.currentTarget, async () => {
      need(); if (!NXT.ready(NXT.cfg())) { toast('Cài Worker triển khai trước (nút Cài Worker triển khai)', 'err', 6000); return NXT.setup(); }
      const j = await NXT.call({ action: 'deploy', slug: o.slug, origin: NXT.origin(), shell: NXT.shell(o) });
      o.url = j.url; o.at = dvLog.now(); o.by = dvLog.who();
      const L = NXT.list(), i = L.findIndex(x => x.slug === o.slug); if (i >= 0) L[i] = { ...L[i], ...o }; else L.push(o); App.changed();
      q('[data-res]').innerHTML = NXT.done(o); links(); NXT.bindDone(q('[data-res]'), o);
      toast('Đã triển khai ' + esc(o.ten), 'ok', 6000);
    });
  },
  done(o) {
    const qr = typeof QR !== 'undefined' ? QR.svg(o.url, 30) : '';
    return `<div class="card" style="padding:12px;display:flex;gap:14px;align-items:center;flex-wrap:wrap;background:#f0fdf4;border-color:#bbf7d0">${qr ? `<div>${qr}</div>` : ''}<div class="grow" style="min-width:240px">
      <b>${esc(o.ten)}</b> đã có địa chỉ: <a href="${esc(o.url)}" target="_blank" rel="noopener">${esc(o.url)}</a> <button class="btn sm" data-cpu>${ic('copy')} Chép</button>
      <ol class="small" style="line-height:1.6;margin:8px 0 0;padding-left:18px"><li>Kiểm tra đã thêm <code>${esc(NXT.host(o))}</code> vào Authorized domains và đã Publish Rules.</li>
      <li>Mở địa chỉ trên → nhập <b>mã kết nối</b> → đăng nhập bằng SĐT <b>${esc(o.sdt)}</b>, mật khẩu <b>1</b> → đổi mật khẩu.</li>
      <li>Vào Cài đặt khai báo công ty, tuyến, xe, nhân viên. Nhân viên quét mã QR để mở app.</li></ol></div></div>`;
  },
  bindDone(el, o) { const b = el.querySelector('[data-cpu]'); if (b) b.onclick = () => NXT.copy(o.url, 'Đã chép địa chỉ'); }
};
const vNXT = {
  title: 'Triển khai nhà xe mới', icon: 'upload', desc: 'Tạo app cho nhà xe khác: dùng chung code (cập nhật cùng lúc), địa chỉ, Firebase và Drive riêng của nhà xe đó',
  tools: () => PERM.admin() ? `<button class="btn" data-act="nxtSetup">${ic('settings')} Cài Worker triển khai</button><button class="btn pri" data-act="nxtAdd">${ic('plus')} Thêm nhà xe mới</button>` : '',
  render(el) {
    if (!PERM.admin()) { el.innerHTML = '<div class="card" style="padding:16px">Chỉ Admin dùng được chức năng này.</div>'; return; }
    const c = NXT.cfg(), L = NXT.list();
    el.innerHTML = `${NXT.ready(c) ? '' : `<div class="banner warn" style="margin-bottom:12px">${ic('alert')}<div class="grow">Chưa cài <b>Worker triển khai</b> trên Cloudflare (làm 1 lần, miễn phí).</div><button class="btn sm pri" data-act="nxtSetup">Cài ngay</button></div>`}
      <div class="card"><div class="card-h"><h3>${ic('bus')} Các nhà xe đã triển khai</h3><span class="sub">${L.length} nhà xe · code dùng chung với app này, cập nhật cùng lúc</span></div>
      ${L.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Nhà xe</th><th>Địa chỉ app</th><th>Firebase</th><th>Admin</th><th>Triển khai</th><th></th></tr></thead><tbody>${L.map((o, i) => `<tr>
        <td><b>${esc(o.ten)}</b></td><td>${o.url ? `<a href="${esc(o.url)}" target="_blank" rel="noopener">${esc(NXT.host(o))}</a>` : '<span class="muted">chưa có</span>'}</td><td class="small">${esc((o.fb || {}).projectId || '')}</td><td>${esc(o.sdt || '')}</td><td class="small">${esc(o.at || '')}</td>
        <td><button class="btn sm" data-act="nxtEdit" data-i="${i}">${ic('edit')} Mở</button></td></tr>`).join('')}</tbody></table></div>`
        : `<div class="card-b muted">Chưa có nhà xe nào. Bấm <b>Thêm nhà xe mới</b>.</div>`}</div>`;
  }
};
Object.assign(ACT, { nxtSetup: () => NXT.setup(), nxtAdd: () => NXT.edit(), nxtEdit: d => { const o = NXT.list()[+((d && d.i) ?? -1)]; if (o) NXT.edit(o); } });
addCSS('.nxt-st h4{margin:14px 0 6px;font-size:14px}.nxt-st h4:first-child{margin-top:0}.nxt-st code{background:#f1f5f9;padding:1px 5px;border-radius:4px}');
MODL.def('trienkhai', vNXT);
