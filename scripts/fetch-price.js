// Node 20+, không cần thư viện. Lấy giá bán lẻ Petrolimex (vùng 1) -> prices.json
const fs = require('fs');
const SOURCES = [
  'https://webgia.com/gia-xang-dau/petrolimex/',
  'https://webgia.com/gia-xang-dau/',
];
function parse(html) {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<\/(td|th)>/gi, ' | ')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
  const items = [];
  for (const line of text.split('\n')) {
    const m = line.trim().match(/^(.*?(?:Xăng|Dầu)[^|]*?)\s*\|\s*(\d{2}\.\d{3})\s*\|\s*(\d{2}\.\d{3})/i);
    if (m) items.push({ name: m[1].trim(), vung1: Number(m[2].replace('.', '')), vung2: Number(m[3].replace('.', '')) });
  }
  return items;
}
// Đổi tên mặt hàng trên web -> tên khóa trong app
function key(n) {
  if (/0[,.]001/.test(n)) return 'DO 0,001S-V';
  if (/0[,.]05/.test(n)) return 'DO 0,05S-II';
  if (/E5/i.test(n)) return 'E5 RON92-II';
  if (/E10/i.test(n) && /(mức\s*3|-III)/i.test(n)) return 'E10 RON95-III';
  return '';
}
function vnNow() {
  const p = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date());
  return p; // YYYY-MM-DD HH:MM
}
(async () => {
  let items = [], used = '';
  for (const url of SOURCES) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; fuel-price-bot)' } });
      if (!res.ok) continue;
      items = parse(await res.text());
      if (items.length >= 3) { used = url; break; }
    } catch (e) { console.error('Lỗi', url, e.message); }
  }
  if (items.length < 3) { console.error('Không đọc được bảng giá — giữ nguyên prices.json cũ'); process.exit(1); }
  const gia = {};
  for (const it of items) { const k = key(it.name); if (k && !gia[k]) gia[k] = it.vung1; }
  if (!Object.keys(gia).length) { console.error('Không khớp mặt hàng nào'); process.exit(1); }

  let old = {};
  try { old = JSON.parse(fs.readFileSync('prices.json', 'utf8')); } catch (e) { }
  const oldGia = old.gia || {};
  const changed = Object.keys(gia).some(k => oldGia[k] !== gia[k]);
  const truoc = changed ? Object.fromEntries(Object.keys(gia).filter(k => oldGia[k] && oldGia[k] !== gia[k]).map(k => [k, oldGia[k]])) : (old.truoc || {});
  const hieuLuc = changed || !old.hieuLuc ? vnNow() : old.hieuLuc;

  fs.writeFileSync('prices.json', JSON.stringify({ updatedAt: new Date().toISOString(), source: used, unit: 'dong/lit', vung: 1, hieuLuc, gia, truoc, items }, null, 2));
  console.log('OK', gia);
})();
