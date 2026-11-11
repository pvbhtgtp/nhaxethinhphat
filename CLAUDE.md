# Ghi chú bảo trì (cho Claude)

- **Mỗi lần đẩy thay đổi phải tăng `APP_BUILD`** trong `index.html` (`const APP_BUILD = 'YYYY-MM-DDTHH:MM';`).
  File module được tải kèm `?v=APP_BUILD`, và các máy chỉ tự cập nhật khi `APP_BUILD` mới hơn bản đang chạy.
  Không tăng thì máy người dùng vẫn chạy module cũ.
- Trước khi đẩy: `node --check` toàn bộ script (cả script trong `index.html`) và chạy thử màn hình liên quan trên trình duyệt, không có lỗi trang.
