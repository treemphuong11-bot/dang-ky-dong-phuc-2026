/**
 * ============================================================================
 * HỆ THỐNG ĐĂNG KÝ ĐỒNG PHỤC - GOOGLE APPS SCRIPT BACKEND (CONSOLIDATED)
 * NĂM HỌC 2026 - 2027
 * ============================================================================
 */

const SHEET_NAMES = {
  GIA: 'Gia',
  DANG_KY: 'DangKy',
  KHACH_HANG: 'KhachHang',
  DANH_MUC: 'DanhMuc'
};

function initDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Sheet Gia
  let sheetGia = ss.getSheetByName(SHEET_NAMES.GIA);
  if (!sheetGia) {
    sheetGia = ss.insertSheet(SHEET_NAMES.GIA);
    sheetGia.appendRow(['MaSP', 'TenSP', 'Size', 'GioiTinh', 'DonGia', 'TrangThai']);
    
    const samplePrices = [
      ['SP01', 'Áo sơ mi', 'Size 1', 'Nam/Nữ', 120000, 'Hoạt động'],
      ['SP01', 'Áo sơ mi', 'Size 2', 'Nam/Nữ', 125000, 'Hoạt động'],
      ['SP01', 'Áo sơ mi', 'Size 3', 'Nam/Nữ', 130000, 'Hoạt động'],
      ['SP02', 'Quần short', 'Size 1', 'Nam', 110000, 'Hoạt động'],
      ['SP02', 'Quần short', 'Size 2', 'Nam', 115000, 'Hoạt động'],
      ['SP03', 'Váy', 'Size 1', 'Nữ', 140000, 'Hoạt động'],
      ['SP03', 'Váy', 'Size 2', 'Nữ', 145000, 'Hoạt động'],
      ['SP04', 'Áo thể dục', 'Size 1', 'Chung', 100000, 'Hoạt động'],
      ['SP05', 'Quần thể dục', 'Size 1', 'Chung', 100000, 'Hoạt động']
    ];
    samplePrices.forEach(row => sheetGia.appendRow(row));
  }

  // 2. Sheet DangKy
  let sheetDangKy = ss.getSheetByName(SHEET_NAMES.DANG_KY);
  if (!sheetDangKy) {
    sheetDangKy = ss.insertSheet(SHEET_NAMES.DANG_KY);
    sheetDangKy.appendRow([
      'MaDon', 'NgayDangKy', 'HoTen', 'SDT', 'DonVi', 
      'GioiTinh', 'ChiTietSanPham', 'TongTien', 'TrangThaiThanhToan', 'GhiChu'
    ]);
    
    const sampleOrderItems = JSON.stringify([
      { tenSP: 'Áo sơ mi', size: 'Size 3', donGia: 130000, soLuong: 1, thanhTien: 130000 },
      { tenSP: 'Váy', size: 'Size 2', donGia: 145000, soLuong: 1, thanhTien: 145000 },
      { tenSP: 'Áo thể dục', size: 'Size 2', donGia: 105000, soLuong: 1, thanhTien: 105000 },
      { tenSP: 'Quần thể dục', size: 'Size 2', donGia: 105000, soLuong: 1, thanhTien: 105000 }
    ]);
    sheetDangKy.appendRow([
      'DP-2026-001', 
      new Date().toISOString().split('T')[0], 
      'NGUYỄN THỊ PHƯƠNG HÀ', 
      '', 
      'Lớp 1-1A4-2026-2027', 
      'Nữ', 
      sampleOrderItems, 
      485000, 
      'Đã thu', 
      ''
    ]);
  }

  // 3. Sheet KhachHang
  let sheetKH = ss.getSheetByName(SHEET_NAMES.KHACH_HANG);
  if (!sheetKH) {
    sheetKH = ss.insertSheet(SHEET_NAMES.KHACH_HANG);
    sheetKH.appendRow(['ID', 'HoTen', 'SDT', 'DonVi']);
  }

  // 4. Sheet DanhMuc
  let sheetDM = ss.getSheetByName(SHEET_NAMES.DANH_MUC);
  if (!sheetDM) {
    sheetDM = ss.insertSheet(SHEET_NAMES.DANH_MUC);
    sheetDM.appendRow(['MaDM', 'TenDM']);
    sheetDM.appendRow(['DM01', 'Áo sơ mi']);
    sheetDM.appendRow(['DM02', 'Quần short']);
    sheetDM.appendRow(['DM03', 'Váy']);
    sheetDM.appendRow(['DM04', 'Áo thể dục']);
    sheetDM.appendRow(['DM05', 'Quần thể dục']);
  }

  Logger.log('Khởi tạo Database 2026-2027 thành công!');
}

function doGet(e) {
  try {
    const action = e.parameter ? (e.parameter.action || 'getPrices') : 'getPrices';
    let result = {};

    switch (action) {
      case 'getPrices':
        result = { success: true, data: getPriceList() };
        break;
      case 'getOrders':
        result = { success: true, data: getOrdersList() };
        break;
      case 'getDashboard':
        result = { success: true, data: getDashboardStats() };
        break;
      case 'lookup':
        const keyword = e.parameter ? (e.parameter.keyword || '') : '';
        result = { success: true, data: lookupOrders(keyword) };
        break;
      default:
        result = { success: false, message: 'Action không hợp lệ' };
    }

    return respondJSON(result);
  } catch (error) {
    return respondJSON({ success: false, message: error.toString() });
  }
}

function doPost(e) {
  try {
    let postData = {};
    if (e && e.postData && e.postData.contents) {
      postData = JSON.parse(e.postData.contents);
    }

    const action = postData.action || '';
    let result = {};

    switch (action) {
      case 'createOrder':
        result = createOrder(postData.data);
        break;
      case 'updateOrder':
        result = updateOrder(postData.data);
        break;
      case 'updatePayment':
        result = updatePaymentStatus(postData.maDon, postData.trangThai);
        break;
      case 'deleteOrder':
        result = deleteOrder(postData.maDon);
        break;
      case 'updatePrice':
        result = updatePriceItem(postData.priceItem);
        break;
      default:
        result = { success: false, message: 'Action POST không hợp lệ' };
    }

    return respondJSON(result);
  } catch (error) {
    return respondJSON({ success: false, message: error.toString() });
  }
}

function getPriceList() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.GIA);
  if (!sheet) return [];
  const rows = sheet.getDataRange().getValues();
  rows.shift();
  
  return rows.map(r => ({
    maSP: r[0],
    tenSP: r[1],
    size: r[2],
    gioiTinh: r[3],
    donGia: Number(r[4]),
    trangThai: r[5]
  }));
}

function getOrdersList() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.DANG_KY);
  if (!sheet) return [];
  const rows = sheet.getDataRange().getValues();
  rows.shift();

  return rows.map(r => {
    let chiTiet = [];
    try {
      chiTiet = typeof r[6] === 'string' ? JSON.parse(r[6]) : r[6];
    } catch(err) {
      chiTiet = [];
    }
    return {
      maDon: r[0],
      ngayDangKy: r[1],
      hoTen: r[2],
      sdt: r[3],
      donVi: r[4],
      gioiTinh: r[5],
      chiTietSanPham: chiTiet,
      tongTien: Number(r[7]),
      trangThaiThanhToan: r[8],
      ghiChu: r[9]
    };
  });
}

function createOrder(orderData) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.DANG_KY);
  if (!sheet) throw new Error("Sheet DangKy không tồn tại");

  const lastRow = sheet.getLastRow();
  const newIndex = String(lastRow).padStart(3, '0');
  const maDon = `DP-2026-${newIndex}`;
  const ngayDangKy = new Date().toISOString().split('T')[0];

  const chiTietJSON = JSON.stringify(orderData.chiTietSanPham || []);

  sheet.appendRow([
    maDon,
    ngayDangKy,
    orderData.hoTen,
    orderData.sdt || '',
    orderData.donVi,
    orderData.gioiTinh || 'Nam',
    chiTietJSON,
    orderData.tongTien,
    'Chưa thu',
    orderData.ghiChu || ''
  ]);

  return {
    success: true,
    maDon: maDon,
    message: 'Tạo đơn đăng ký thành công'
  };
}

function updateOrder(orderData) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.DANG_KY);
  const rows = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === orderData.maDon) {
      sheet.getRange(i + 1, 3).setValue(orderData.hoTen);
      sheet.getRange(i + 1, 4).setValue(orderData.sdt || '');
      sheet.getRange(i + 1, 5).setValue(orderData.donVi);
      sheet.getRange(i + 1, 6).setValue(orderData.gioiTinh);
      sheet.getRange(i + 1, 7).setValue(JSON.stringify(orderData.chiTietSanPham || []));
      sheet.getRange(i + 1, 8).setValue(orderData.tongTien);
      sheet.getRange(i + 1, 10).setValue(orderData.ghiChu || '');
      return { success: true, message: `Đã cập nhật thông tin đơn ${orderData.maDon}` };
    }
  }
  return { success: false, message: 'Không tìm thấy mã đơn' };
}

function updatePaymentStatus(maDon, trangThai) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.DANG_KY);
  const rows = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === maDon) {
      sheet.getRange(i + 1, 9).setValue(trangThai);
      return { success: true, message: `Cập nhật trạng thái đơn ${maDon}: ${trangThai}` };
    }
  }
  return { success: false, message: 'Không tìm thấy mã đơn' };
}

function deleteOrder(maDon) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.DANG_KY);
  const rows = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === maDon) {
      sheet.deleteRow(i + 1);
      return { success: true, message: `Đã xóa đơn đăng ký ${maDon}` };
    }
  }
  return { success: false, message: 'Không tìm thấy mã đơn để xóa' };
}

function updatePriceItem(priceItem) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.GIA);
  const rows = sheet.getDataRange().getValues();

  let updated = false;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][1] === priceItem.tenSP && rows[i][2] === priceItem.size) {
      sheet.getRange(i + 1, 5).setValue(priceItem.donGia);
      sheet.getRange(i + 1, 6).setValue(priceItem.trangThai || 'Hoạt động');
      updated = true;
      break;
    }
  }

  if (!updated) {
    sheet.appendRow([
      priceItem.maSP || ('SP' + Math.floor(Math.random() * 100)),
      priceItem.tenSP,
      priceItem.size,
      priceItem.gioiTinh || 'Nam/Nữ',
      priceItem.donGia,
      priceItem.trangThai || 'Hoạt động'
    ]);
  }

  return { success: true, message: 'Đã lưu thông tin giá' };
}

function lookupOrders(keyword) {
  const orders = getOrdersList();
  if (!keyword) return orders;
  const kw = keyword.toLowerCase().trim();
  return orders.filter(o => 
    o.maDon.toLowerCase().includes(kw) ||
    o.hoTen.toLowerCase().includes(kw) ||
    o.donVi.toLowerCase().includes(kw)
  );
}

function getDashboardStats() {
  const orders = getOrdersList();
  
  let tongDon = orders.length;
  let tongTien = 0;
  let daThu = 0;
  let chuaThu = 0;

  const byDonVi = {};
  const bySize = {};
  const byGioiTinh = {};

  orders.forEach(o => {
    const amount = o.tongTien || 0;
    tongTien += amount;
    if (o.trangThaiThanhToan === 'Đã thu') {
      daThu += amount;
    } else {
      chuaThu += amount;
    }

    const dv = o.donVi || 'Chưa phân loại';
    byDonVi[dv] = (byDonVi[dv] || 0) + amount;

    const gt = o.gioiTinh || 'Nam';
    byGioiTinh[gt] = (byGioiTinh[gt] || 0) + 1;

    if (Array.isArray(o.chiTietSanPham)) {
      o.chiTietSanPham.forEach(item => {
        const sz = item.size || 'N/A';
        bySize[sz] = (bySize[sz] || 0) + Number(item.soLuong || 1);
      });
    }
  });

  return {
    tongDon,
    tongTien,
    daThu,
    chuaThu,
    byDonVi,
    bySize,
    byGioiTinh
  };
}

function respondJSON(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
