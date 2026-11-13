#!/usr/bin/env bash
# ============================================================================
#  Cài app Nhà Xe Thịnh Phát lên VPS (chạy cạnh NocoBase), có HTTPS miễn phí
#
#  Cách chạy (trên VPS, Ubuntu/Debian):
#     curl -fsSL https://pvbhtgtp.github.io/nhaxethinhphat/scripts/cai-vps.sh | sudo bash
#
#  Kết quả:
#     https://app.<IP>.sslip.io  → app Thịnh Phát (tự cập nhật mỗi 5 phút theo GitHub)
#     https://nb.<IP>.sslip.io   → NocoBase (đi qua HTTPS, NocoBase vẫn chạy như cũ)
#  sslip.io là tên miền miễn phí tự trỏ về IP của VPS, nên có HTTPS mà không cần mua tên miền.
#  Chạy lại script bao nhiêu lần cũng được (không xóa dữ liệu NocoBase).
#
#  Tùy chọn: IP=1.2.3.4  NB_PORT=13000  (đặt trước lệnh bash nếu cần)
# ============================================================================
set -euo pipefail
xanh() { printf '\033[1;32m%s\033[0m\n' "$*"; }
vang() { printf '\033[1;33m%s\033[0m\n' "$*"; }
do_()  { printf '\033[1;31m%s\033[0m\n' "$*"; }

[ "$(id -u)" = 0 ] || { do_ "Cần quyền root. Chạy lại: curl -fsSL .../cai-vps.sh | sudo bash"; exit 1; }

REPO=https://github.com/pvbhtgtp/nhaxethinhphat.git
DIR=/opt/thinhphat
NB_PORT=${NB_PORT:-13000}

# ---------- 1. Công cụ cần có ----------
xanh "[1/6] Kiểm tra công cụ (curl, git, docker)…"
if command -v apt-get >/dev/null; then
  command -v curl >/dev/null || { apt-get update -qq; apt-get install -y -qq curl; }
  command -v git  >/dev/null || { apt-get update -qq; apt-get install -y -qq git; }
fi
command -v git >/dev/null || { do_ "Không cài được git, cài tay rồi chạy lại"; exit 1; }
if ! command -v docker >/dev/null; then
  vang "Chưa có Docker → đang cài…"; curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker >/dev/null 2>&1 || true

# ---------- 2. IP và tên miền sslip.io ----------
xanh "[2/6] Lấy IP của VPS…"
IP=${IP:-$(curl -fsS4 --max-time 8 https://api.ipify.org || curl -fsS4 --max-time 8 https://ifconfig.me || hostname -I | awk '{print $1}')}
[[ "$IP" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]] || { do_ "Không lấy được IPv4 (được: '$IP'). Chạy lại với IP=1.2.3.4"; exit 1; }
D=${IP//./-}
APP_HOST="app.$D.sslip.io"
NB_HOST="nb.$D.sslip.io"
echo "   IP: $IP"

# ---------- 3. NocoBase đang chạy ở cổng nào ----------
xanh "[3/6] Tìm NocoBase…"
if ! curl -fsS -o /dev/null --max-time 5 "http://127.0.0.1:$NB_PORT" ; then
  P=$(docker ps --format '{{.Image}} {{.Ports}}' 2>/dev/null | grep -i nocobase | grep -oE '0\.0\.0\.0:[0-9]+' | head -1 | cut -d: -f2 || true)
  if [ -n "${P:-}" ]; then NB_PORT=$P; fi
fi
if curl -fsS -o /dev/null --max-time 5 "http://127.0.0.1:$NB_PORT"; then echo "   NocoBase ở cổng $NB_PORT"; else vang "   Chưa thấy NocoBase ở cổng $NB_PORT (vẫn cài app; NocoBase chạy lại sau sẽ tự vào được)"; fi

# ---------- 4. Cổng 80/443 phải trống (Caddy cần để xin HTTPS) ----------
xanh "[4/6] Kiểm tra cổng 80 và 443…"
docker rm -f thinhphat-caddy >/dev/null 2>&1 || true
BUSY=$(ss -ltnpH 2>/dev/null | awk '{print $4" "$6}' | grep -E ':(80|443) ' || true)
if [ -n "$BUSY" ]; then
  do_ "Cổng 80/443 đang bị chương trình khác dùng:"; echo "$BUSY"
  do_ "Tắt chương trình đó (vd: systemctl stop nginx apache2 && systemctl disable nginx apache2) hoặc đổi NocoBase sang cổng khác, rồi chạy lại script."
  exit 1
fi
if command -v ufw >/dev/null && ufw status | grep -q "Status: active"; then ufw allow 80/tcp >/dev/null; ufw allow 443/tcp >/dev/null; echo "   Đã mở cổng 80, 443 trên tường lửa ufw"; fi

# ---------- 5. Tải app từ GitHub + tự cập nhật ----------
xanh "[5/6] Tải app Thịnh Phát…"
mkdir -p "$DIR"
if [ -d "$DIR/app/.git" ]; then git -C "$DIR/app" pull -q --ff-only || { git -C "$DIR/app" fetch -q --depth 1 origin && git -C "$DIR/app" reset -q --hard FETCH_HEAD; }
else rm -rf "$DIR/app"; git clone -q --depth 1 "$REPO" "$DIR/app"; fi
cat > /etc/cron.d/thinhphat <<EOF
# Tự lấy bản app mới nhất từ GitHub mỗi 5 phút
*/5 * * * * root cd $DIR/app && (git pull -q --ff-only || (git fetch -q --depth 1 origin && git reset -q --hard FETCH_HEAD)) >/dev/null 2>&1
EOF
chmod 644 /etc/cron.d/thinhphat

# ---------- 6. Caddy: HTTPS + phục vụ app + chuyển tiếp NocoBase ----------
xanh "[6/6] Cài Caddy (HTTPS tự động)…"
cat > "$DIR/Caddyfile" <<EOF
$APP_HOST {
	root * /srv/app
	encode gzip
	@luonmoi path / /index.html /sw.js /manifest.json /prices.json
	header @luonmoi Cache-Control "no-cache"
	file_server {
		hide .git
	}
}

$NB_HOST {
	reverse_proxy 127.0.0.1:$NB_PORT
}

http://$IP {
	redir https://$APP_HOST{uri}
}
EOF
docker pull -q caddy:2 >/dev/null
docker run -d --name thinhphat-caddy --restart unless-stopped --network host \
  -v "$DIR/Caddyfile:/etc/caddy/Caddyfile:ro" -v "$DIR/app:/srv/app:ro" \
  -v thinhphat_caddy_data:/data -v thinhphat_caddy_config:/config caddy:2 >/dev/null

printf '   Đang xin chứng chỉ HTTPS'
for i in $(seq 1 30); do
  if curl -fsS -o /dev/null --max-time 5 "https://$APP_HOST/index.html"; then OK=1; break; fi
  printf '.'; sleep 3
done; echo

echo
if [ "${OK:-}" = 1 ]; then xanh "XONG!"; else vang "Đã cài, nhưng HTTPS chưa lên. Kiểm tra cổng 80/443 đã mở ở nhà cung cấp VPS (Security group/Firewall), rồi xem: docker logs thinhphat-caddy"; fi
cat <<EOF

  App Thịnh Phát : https://$APP_HOST
  NocoBase       : https://$NB_HOST   (vẫn vào được như cũ: http://$IP:$NB_PORT)

  Việc còn lại:
   1) Firebase Console → Authentication → Settings → Authorized domains → Add domain:
        $APP_HOST
   2) Nhúng vào NocoBase: tạo trang mới → Thêm khối "Iframe" → chọn URL → dán:
        https://$APP_HOST
   3) Trên điện thoại mở https://$APP_HOST → đăng nhập → "Thêm vào màn hình chính".

  Gỡ bỏ: docker rm -f thinhphat-caddy && rm -rf $DIR /etc/cron.d/thinhphat
EOF
