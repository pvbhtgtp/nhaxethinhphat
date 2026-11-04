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
  if (items.length < 3) { console.error('Không đọc được bảng giá'); process.exit(1); }
  fs.writeFileSync('prices.json', JSON.stringify({ updatedAt: new Date().toISOString(), source: used, unit: 'dong/lit', items }, null, 2));
  console.log('OK', items.length);
})();
