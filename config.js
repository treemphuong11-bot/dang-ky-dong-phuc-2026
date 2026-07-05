/**
 * CONFIG & MOCK DATABASE HANDLER
 * Tự động chuyển đổi giữa Chế độ Demo Cục bộ (Local Database) và Google Apps Script Web App Live API.
 */

const CONFIG = {
  APPS_SCRIPT_URL: '', // Dán URL Google Apps Script Web App tại đây sau khi deploy
  APP_TITLE: 'ĐĂNG KÝ ĐỒNG PHỤC NĂM HỌC 2026 - 2027',
  ORGANIZATION_NAME: 'TRƯỜNG TIỂU HỌC NGUYỄN THANH TUYỀN',
  ACADEMIC_YEAR: 'NĂM HỌC 2026 - 2027',
  
  ACCOUNTS: [
    { username: 'admin', name: 'Quản trị viên (Admin)', role: 'admin', password: 'ngochanh123' },
    { username: 'user', name: 'Nhân viên kiểm tra (User)', role: 'user', password: '123' }
  ]
};

// 5 Sản Phẩm Chuẩn & 12 Size (Size 1 -> Size 12)
const UNIFORM_CATEGORIES = ['Áo sơ mi', 'Quần short', 'Váy', 'Áo thể dục', 'Quần thể dục'];
const UNIFORM_SIZES = ['Size 1', 'Size 2', 'Size 3', 'Size 4', 'Size 5', 'Size 6', 'Size 7', 'Size 8', 'Size 9', 'Size 10', 'Size 11', 'Size 12'];

// Sinh 60 đơn giá mẫu cho 5 loại x 12 size
const DEFAULT_PRICES = [];

UNIFORM_CATEGORIES.forEach((cat, cIdx) => {
  let basePrice = 120000;
  if (cat === 'Quần short') basePrice = 110000;
  if (cat === 'Váy') basePrice = 140000;
  if (cat === 'Áo thể dục' || cat === 'Quần thể dục') basePrice = 100000;

  UNIFORM_SIZES.forEach((sz, sIdx) => {
    DEFAULT_PRICES.push({
      maSP: `SP0${cIdx + 1}`,
      tenSP: cat,
      size: sz,
      gioiTinh: (cat === 'Quần short') ? 'Nam' : (cat === 'Váy' ? 'Nữ' : 'Chung'),
      donGia: basePrice + (sIdx * 5000),
      trangThai: 'Hoạt động'
    });
  });
});

const DEFAULT_ORDERS = [
  {
    maDon: 'DP-2026-001',
    ngayDangKy: '2026-07-03',
    hoTen: 'NGUYỄN THỊ PHƯƠNG HÀ',
    sdt: '',
    donVi: 'Lớp 1-1A4-2026-2027',
    gioiTinh: 'Nữ',
    chiTietSanPham: [
      { tenSP: 'Áo sơ mi', size: 'Size 3', donGia: 130000, soLuong: 1, thanhTien: 130000 },
      { tenSP: 'Váy', size: 'Size 2', donGia: 145000, soLuong: 1, thanhTien: 145000 },
      { tenSP: 'Áo thể dục', size: 'Size 2', donGia: 105000, soLuong: 1, thanhTien: 105000 },
      { tenSP: 'Quần thể dục', size: 'Size 2', donGia: 105000, soLuong: 1, thanhTien: 105000 }
    ],
    tongTien: 485000,
    trangThaiThanhToan: 'Đã thu',
    ghiChu: ''
  }
];

class LocalDB {
  static getPrices() {
    try {
      const data = localStorage.getItem('DP_PRICES');
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch(e) {}
    localStorage.setItem('DP_PRICES', JSON.stringify(DEFAULT_PRICES));
    return DEFAULT_PRICES;
  }

  static savePrices(prices) {
    localStorage.setItem('DP_PRICES', JSON.stringify(prices));
  }

  static getOrders() {
    try {
      const data = localStorage.getItem('DP_ORDERS');
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch(e) {}
    localStorage.setItem('DP_ORDERS', JSON.stringify(DEFAULT_ORDERS));
    return DEFAULT_ORDERS;
  }

  static saveOrder(orderData) {
    const orders = this.getOrders();
    const newIdx = String(orders.length + 1).padStart(3, '0');
    const maDon = `DP-2026-${newIdx}`;
    const newOrder = {
      maDon: maDon,
      ngayDangKy: new Date().toISOString().split('T')[0],
      hoTen: orderData.hoTen,
      sdt: orderData.sdt || '',
      donVi: orderData.donVi,
      gioiTinh: orderData.gioiTinh || 'Nam',
      chiTietSanPham: orderData.chiTietSanPham || [],
      tongTien: orderData.tongTien,
      trangThaiThanhToan: 'Chưa thu',
      ghiChu: orderData.ghiChu || ''
    };
    orders.unshift(newOrder);
    localStorage.setItem('DP_ORDERS', JSON.stringify(orders));
    return newOrder;
  }

  static updateOrder(orderData) {
    const orders = this.getOrders();
    const idx = orders.findIndex(o => o.maDon === orderData.maDon);
    if (idx !== -1) {
      orders[idx] = {
        ...orders[idx],
        hoTen: orderData.hoTen,
        sdt: orderData.sdt || '',
        donVi: orderData.donVi,
        gioiTinh: orderData.gioiTinh,
        chiTietSanPham: orderData.chiTietSanPham || [],
        tongTien: orderData.tongTien,
        ghiChu: orderData.ghiChu || ''
      };
      localStorage.setItem('DP_ORDERS', JSON.stringify(orders));
      return true;
    }
    return false;
  }

  static updatePayment(maDon, trangThai) {
    const orders = this.getOrders();
    const idx = orders.findIndex(o => o.maDon === maDon);
    if (idx !== -1) {
      orders[idx].trangThaiThanhToan = trangThai;
      localStorage.setItem('DP_ORDERS', JSON.stringify(orders));
      return true;
    }
    return false;
  }

  static deleteOrder(maDon) {
    let orders = this.getOrders();
    orders = orders.filter(o => o.maDon !== maDon);
    localStorage.setItem('DP_ORDERS', JSON.stringify(orders));
    return true;
  }

  static savePriceItem(item) {
    const prices = this.getPrices();
    const idx = prices.findIndex(p => p.tenSP === item.tenSP && p.size === item.size);
    if (idx !== -1) {
      prices[idx].donGia = item.donGia;
      prices[idx].trangThai = item.trangThai || 'Hoạt động';
    } else {
      prices.push({
        maSP: item.maSP || ('SP' + (prices.length + 1)),
        tenSP: item.tenSP,
        size: item.size,
        gioiTinh: item.gioiTinh || 'Nam/Nữ',
        donGia: Number(item.donGia),
        trangThai: item.trangThai || 'Hoạt động'
      });
    }
    this.savePrices(prices);
    return true;
  }

  static saveBulkPricesForCategory(tenSP, sizePriceMap) {
    const prices = this.getPrices();
    Object.keys(sizePriceMap).forEach(sizeKey => {
      const donGia = sizePriceMap[sizeKey];
      const idx = prices.findIndex(p => p.tenSP === tenSP && p.size === sizeKey);
      if (idx !== -1) {
        prices[idx].donGia = Number(donGia);
      } else {
        prices.push({
          maSP: 'SP_BULK',
          tenSP: tenSP,
          size: sizeKey,
          gioiTinh: 'Chung',
          donGia: Number(donGia),
          trangThai: 'Hoạt động'
        });
      }
    });
    this.savePrices(prices);
    return true;
  }
}
