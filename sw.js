/* Nhà Xe Thịnh Phát · file nền để trình duyệt cho cài app. KHÔNG lưu bản cũ: luôn lấy bản mới nhất từ máy chủ. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  /* chia sẻ ảnh từ Zalo / thư viện ảnh vào app (share_target trong manifest): cất ảnh tạm rồi mở app, app tự lấy ra tạo phiếu */
  const u = new URL(e.request.url);
  if (e.request.method === 'POST' && u.searchParams.get('share') === '1') {
    e.respondWith((async () => {
      try {
        const fd = await e.request.formData(), fs = fd.getAll('images').filter(f => f && f.size), c = await caches.open('nx-share');
        for (const k of await c.keys()) await c.delete(k);
        let i = 0; for (const f of fs.slice(0, 8)) await c.put('./__share/' + (i++) + '?n=' + encodeURIComponent(f.name || 'anh.jpg'), new Response(f, { headers: { 'Content-Type': f.type || 'image/jpeg' } }));
      } catch (x) { }
      return Response.redirect('./?share=1', 303);
    })());
    return;
  }
  if (e.request.mode !== 'navigate') return;              // dữ liệu, ảnh, Firebase: đi thẳng như bình thường
  e.respondWith(fetch(e.request).catch(() => new Response('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:sans-serif;display:grid;place-items:center;height:100vh;margin:0;background:#ecfdf5;color:#065f46;text-align:center"><div><h2>Mất kết nối mạng</h2><p>Kiểm tra mạng rồi bấm tải lại.</p><button onclick="location.reload()" style="padding:10px 22px;border:0;border-radius:10px;background:#059669;color:#fff;font-size:16px">Tải lại</button></div>', { headers: { 'Content-Type': 'text/html; charset=utf-8' } })));
});
