# HƯỚNG DẪN TRIỂN KHAI HỆ THỐNG ĐĂNG KÝ ĐỒNG PHỤC

## 1. Khởi tạo Google Sheets & Apps Script Backend
1. Truy cập [Google Sheets](https://sheets.google.com) và tạo một **Trang tính mới** (Tên ví dụ: *DongPhuc_Database*).
2. Trên menu Google Sheets, chọn **Mở rộng (Extensions)** -> **Apps Script**.
3. Xóa nội dung mặc định trong trình biên tập Apps Script, copy toàn bộ mã từ tệp [Code.gs](file:///c:/Users/HP/OneDrive/M%C3%A1y%20t%C3%ADnh/begin/DongPhuc/Code.gs) và dán vào.
4. Chọn hàm `initDatabase` ở thanh menu trên cùng và bấm **Chạy (Run)**.
   - Lần đầu tiên chạy, Google sẽ yêu cầu Cấp quyền (Review Permissions -> Advanced -> Allow).
   - Hàm này sẽ tự động khởi tạo 4 trang tính: `Gia`, `DangKy`, `KhachHang`, `DanhMuc` và chèn dữ liệu mẫu.

## 2. Triển khai (Deploy) làm Web App
1. Nhấp vào nút **Triển khai (Deploy)** ở góc trên bên phải -> chọn **Phát hành mới (New deployment)**.
2. Chọn loại hình triển khai: **Ứng dụng Web (Web app)**.
3. Cấu hình triển khai:
   - **Mô tả (Description)**: *Hệ thống Đăng ký Đồng phục API*
   - **Thực thi dưới danh nghĩa (Execute as)**: *Tôi (Me)*
   - **Ai có quyền truy cập (Who has access)**: *Bất kỳ ai (Anyone)*
4. Nhấp **Triển khai (Deploy)** và sao chép **URL ứng dụng web (Web App URL)** (có dạng: `https://script.google.com/macros/s/AKfycb.../exec`).

## 3. Cấu hình Frontend
1. Mở tệp `js/config.js` trên máy tính.
2. Dán URL Web App vừa sao chép vào biến `APPS_SCRIPT_URL`:
   ```javascript
   const CONFIG = {
     APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycb.../exec',
     // ...
   };
   ```
3. Lưu tệp và mở `index.html` bằng trình duyệt để bắt đầu sử dụng!

## 4. Các tính năng nổi bật
- **Đăng ký động**: Thêm nhiều sản phẩm, tự động tính tổng tiền theo Size và Bảng giá.
- **Biên lai A5 QR**: Tạo mẫu biên lai chuẩn khổ A5 có QR Code tra cứu và nút In nhanh (`Ctrl + P`).
- **Thống kê Dashboard**: Biểu đồ Chart.js trực quan doanh thu theo đơn vị, cơ cấu size, tỷ lệ thanh toán.
- **Quản lý Bảng giá**: Điều chỉnh đơn giá theo size trực tiếp từ Admin mà không cần sửa code backend.
