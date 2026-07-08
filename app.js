/**
 * HỆ THỐNG ĐĂNG KÝ ĐỒNG PHỤC 2026 - FRONTEND CONTROLLER
 * Tích hợp:
 * 1. Nhật ký đăng ký gần nhất & tìm kiếm ngay tại trang Đăng ký.
 * 2. Bảng tổng hợp số lượng đồng phục theo Size (Áo sơ mi Nam/Nữ, Quần short, Váy, Áo thể dục, Quần thể dục x Size 1 -> Size 12) tại Admin.
 */

let priceList = [];
let ordersList = [];
let chartInstances = {};
let currentPrintOrder = null;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initApp());
} else {
  initApp();
}

async function initApp() {
  try { checkAuth(); } catch(e){ console.error(e); }
  try { setupNavigation(); } catch(e){ console.error(e); }
  try { setupAdminLogin(); } catch(e){ console.error(e); }
  try { setupLookup(); } catch(e){ console.error(e); }
  try { setupEditOrderForm(); } catch(e){ console.error(e); }

  try {
    await loadPriceData();
  } catch (e) {
    console.error("Lỗi loadPriceData:", e);
    priceList = LocalDB.getPrices();
  }

  try {
    await loadOrdersData();
  } catch (e) {
    console.error("Lỗi loadOrdersData:", e);
    ordersList = LocalDB.getOrders();
  }

  try {
    initRegistrationForm();
    renderRecentRegistrationsLog();
  } catch (e) {
    console.error("Lỗi initRegistrationForm:", e);
  }
}

function setupNavigation() {
  const tabs = document.querySelectorAll('.nav-tab');

  tabs.forEach(tab => {
    tab.onclick = (e) => {
      e.preventDefault();
      const targetId = tab.getAttribute('data-target');

      if (targetId === 'admin-section') {
        const loggedUserStr = sessionStorage.getItem('LOGGED_USER_DATA');
        if (!loggedUserStr) {
          openAdminLoginModal();
          return;
        }
      }

      switchTab(targetId);
    };
  });
}

function switchTab(targetId) {
  const tabs = document.querySelectorAll('.nav-tab');
  const sections = document.querySelectorAll('.view-section');

  tabs.forEach(t => {
    if (t.getAttribute('data-target') === targetId) t.classList.add('active');
    else t.classList.remove('active');
  });

  sections.forEach(s => s.classList.add('hidden'));

  const targetEl = document.getElementById(targetId);
  if (targetEl) {
    targetEl.classList.remove('hidden');
  }

  if (targetId === 'admin-section') {
    const loggedUserStr = sessionStorage.getItem('LOGGED_USER_DATA');
    let userObj = { name: 'Quản trị viên', role: 'admin' };
    if (loggedUserStr) {
      try { userObj = JSON.parse(loggedUserStr); } catch(e){}
    }

    const displayEl = document.getElementById('current-admin-display');
    if (displayEl) displayEl.innerText = `${userObj.name} (${userObj.role === 'admin' ? 'Quyền Admin (Toàn quyền)' : 'Quyền User (Chỉ sửa & kiểm tra)'})`;

    const priceBlock = document.getElementById('price-management-block');
    if (userObj.role === 'user') {
      if (priceBlock) priceBlock.classList.add('hidden');
    } else {
      if (priceBlock) priceBlock.classList.remove('hidden');
    }

    renderDashboard();
    renderSizeSummaryMatrixTable();
    renderAdminOrdersTable();
    renderPriceManagementTable();
  } else if (targetId === 'lookup-section') {
    setupLookup();
  } else if (targetId === 'register-section') {
    renderRecentRegistrationsLog();
  }
}

// ============================================================================
// ĐĂNG NHẬP PHÂN QUYỀN
// ============================================================================

function checkAuth() {
  const loggedUserStr = sessionStorage.getItem('LOGGED_USER_DATA');
  const loginScreen = document.getElementById('compulsory-login-screen');
  const userBanner = document.getElementById('logged-user-banner');
  const nameDisplay = document.getElementById('logged-user-name-display');
  const adminTab = document.getElementById('nav-admin-tab');

  if (loggedUserStr) {
    try {
      const userObj = JSON.parse(loggedUserStr);
      if (loginScreen) loginScreen.classList.add('hidden');
      if (userBanner) userBanner.classList.remove('hidden');
      if (nameDisplay) nameDisplay.innerText = `${userObj.name}`;
      
      // Phân quyền hiển thị tab Admin
      if (userObj.role === 'admin') {
        if (adminTab) adminTab.classList.remove('hidden');
      } else {
        if (adminTab) adminTab.classList.add('hidden');
        // Nếu lỡ đang ở tab admin thì đá về register
        const activeTab = document.querySelector('.nav-tab.active');
        if (activeTab && activeTab.getAttribute('data-target') === 'admin-section') {
          switchTab('register-section');
        }
      }
    } catch(e) {
      sessionStorage.removeItem('LOGGED_USER_DATA');
      showLoginScreen();
    }
  } else {
    showLoginScreen();
  }
}

function showLoginScreen() {
  const loginScreen = document.getElementById('compulsory-login-screen');
  const userBanner = document.getElementById('logged-user-banner');
  const selectEl = document.getElementById('compulsory-login-user-select');

  if (loginScreen) loginScreen.classList.remove('hidden');
  if (userBanner) userBanner.classList.add('hidden');

  if (selectEl && CONFIG.ACCOUNTS) {
    selectEl.innerHTML = CONFIG.ACCOUNTS.map(u => `
      <option value="${u.username}">${u.name}</option>
    `).join('');
  }
}

function handleCompulsoryLogin(e) {
  e.preventDefault();

  const username = document.getElementById('compulsory-login-user-select').value;
  const password = document.getElementById('compulsory-login-password-input').value;
  const errAlert = document.getElementById('compulsory-login-error-alert');
  const errMsg = document.getElementById('compulsory-login-error-msg');

  const matchedUser = CONFIG.ACCOUNTS.find(u => u.username === username && u.password === password);

  if (matchedUser) {
    sessionStorage.setItem('LOGGED_USER_DATA', JSON.stringify({
      username: matchedUser.username,
      name: matchedUser.name,
      role: matchedUser.role
    }));
    if (errAlert) errAlert.classList.add('hidden');
    document.getElementById('compulsory-login-password-input').value = '';
    checkAuth();
    switchTab('register-section');
  } else {
    if (errAlert && errMsg) {
      errMsg.innerText = 'Mật khẩu không chính xác! Vui lòng thử lại.';
      errAlert.classList.remove('hidden');
    }
  }
}

function setupAdminLogin() {
  // Hàm này giữ lại để không lỗi biên dịch nhưng không cần thực thi
}

function logoutAdmin() {
  sessionStorage.removeItem('LOGGED_USER_DATA');
  checkAuth();
}

// ============================================================================
// XUẤT FILE EXCEL (.XLSX)
// ============================================================================

function exportOrdersToXLSX() {
  if (ordersList.length === 0) {
    alert('Không có dữ liệu đơn hàng để xuất!');
    return;
  }

  if (typeof XLSX === 'undefined') {
    alert('Thư viện xuất Excel chưa tải xong, vui lòng thử lại sau giây lát!');
    return;
  }

  const exportData = ordersList.map((o, index) => ({
    'STT': index + 1,
    'Mã Đơn': o.maDon,
    'Ngày Đăng Ký': o.ngayDangKy,
    'Họ và Tên': o.hoTen,
    'Đơn Vị / Lớp': o.donVi,
    'Giới Tính': o.gioiTinh,
    'Chi Tiết Đơn Hàng': (o.chiTietSanPham || []).map(i => `${i.tenSP} (${i.size}) x${i.soLuong}`).join('; '),
    'Tổng Tiền (VNĐ)': o.tongTien,
    'Trạng Thái Thanh Toán': o.trangThaiThanhToan,
    'Ghi Chú': o.ghiChu || ''
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);

  const colWidths = [
    { wch: 6 },
    { wch: 14 },
    { wch: 14 },
    { wch: 25 },
    { wch: 20 },
    { wch: 10 },
    { wch: 45 },
    { wch: 16 },
    { wch: 20 },
    { wch: 25 }
  ];
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "DanhSachDangKy");

  const fileName = `DongPhuc_DanhSachDangKy_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

// ============================================================================
// DỮ LIỆU BẢNG GIÁ & ĐƠN HÀNG
// ============================================================================

async function loadPriceData() {
  if (CONFIG.APPS_SCRIPT_URL) {
    try {
      const res = await fetch(`${CONFIG.APPS_SCRIPT_URL}?action=getPrices`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        priceList = json.data;
        return;
      }
    } catch (err) {
      console.warn('Lỗi kết nối Web App API, dùng Local Database:', err);
    }
  }
  priceList = LocalDB.getPrices();
}

async function loadOrdersData() {
  if (CONFIG.APPS_SCRIPT_URL) {
    try {
      const res = await fetch(`${CONFIG.APPS_SCRIPT_URL}?action=getOrders`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        ordersList = json.data;
        return;
      }
    } catch (err) {
      console.warn('Lỗi kết nối Web App API, dùng Local Database:', err);
    }
  }
  ordersList = LocalDB.getOrders();
}

// ============================================================================
// NHẬT KÝ ĐĂNG KÝ GẦN NHẤT & TÌM KIẾM TẠI TRANG ĐĂNG KÝ
// ============================================================================

function renderRecentRegistrationsLog() {
  const container = document.getElementById('recent-registrations-container');
  if (!container) return;

  const searchKw = (document.getElementById('reg-log-search-input')?.value || '').toLowerCase().trim();

  let filtered = ordersList.filter(o => {
    return !searchKw ||
      (o.maDon || '').toLowerCase().includes(searchKw) ||
      (o.hoTen || '').toLowerCase().includes(searchKw) ||
      (o.donVi || '').toLowerCase().includes(searchKw);
  });

  // Lấy 5 đơn gần nhất
  const recentOrders = filtered.slice(0, 5);

  if (recentOrders.length === 0) {
    container.innerHTML = `
      <div class="text-center py-6 text-slate-400 text-xs italic">
        Không có nhật ký đăng ký nào phù hợp.
      </div>
    `;
    return;
  }

  container.innerHTML = recentOrders.map(o => `
    <div class="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 hover:border-indigo-300 transition-all">
      <div class="space-y-1">
        <div class="flex items-center space-x-2">
          <span class="font-bold text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">${o.maDon}</span>
          <span class="text-xs text-slate-400"><i class="far fa-clock mr-1"></i>${formatDateString(o.ngayDangKy)}</span>
          <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full ${o.trangThaiThanhToan === 'Đã thu' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}">${o.trangThaiThanhToan}</span>
        </div>
        <div class="text-sm font-bold text-slate-800">
          ${o.hoTen} <span class="text-xs font-semibold text-slate-500">(${o.donVi})</span>
        </div>
        <div class="text-xs text-slate-600">
          ${(o.chiTietSanPham || []).map(i => `${i.tenSP} (${i.size}) x${i.soLuong}`).join('; ')}
        </div>
      </div>

      <div class="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
        <div class="text-right">
          <span class="block text-[10px] text-slate-400 uppercase font-semibold">Thành tiền</span>
          <span class="font-extrabold text-indigo-600 text-sm">${formatVND(o.tongTien)}</span>
        </div>
        <button onclick="viewReceiptById('${o.maDon}')" class="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-xs font-bold transition-colors whitespace-nowrap">
          <i class="fas fa-print mr-1"></i> In Biên Lai
        </button>
      </div>
    </div>
  `).join('');
}

// ============================================================================
// FORM ĐĂNG KÝ ĐỒNG PHỤC (4 Ô TỰ ĐỘNG)
// ============================================================================

function initRegistrationForm() {
  const container = document.getElementById('product-rows-container');
  if (!container) return;

  container.innerHTML = '';

  const genderSelect = document.getElementById('reg-gender');
  const selectedGender = genderSelect ? genderSelect.value : 'Nam';

  loadFourDefaultUniformRows(selectedGender);

  if (genderSelect) {
    genderSelect.onchange = () => {
      const currentGender = genderSelect.value;
      const rows = container.querySelectorAll('.product-row');
      if (rows.length >= 2) {
        const row2 = rows[1];
        const pSelect = row2.querySelector('.product-select');
        if (pSelect) {
          pSelect.value = (currentGender === 'Nam') ? 'Quần short' : 'Váy';
          pSelect.dispatchEvent(new Event('change'));
        }
      }
    };
  }

  const addBtn = document.getElementById('add-product-row-btn');
  if (addBtn) {
    addBtn.onclick = () => addProductRow();
  }

  const form = document.getElementById('registration-form');
  if (form) {
    form.onsubmit = handleFormSubmit;
  }
}

function loadFourDefaultUniformRows(gender) {
  const defaultItems = [
    'Áo sơ mi',
    (gender === 'Nam') ? 'Quần short' : 'Váy',
    'Áo thể dục',
    'Quần thể dục'
  ];

  defaultItems.forEach(itemTitle => {
    addProductRow(itemTitle);
  });
}

function addProductRow(defaultProductTitle = '') {
  const container = document.getElementById('product-rows-container');
  if (!container) return;

  const rowId = 'row-' + Date.now() + '-' + Math.floor(Math.random() * 10000);

  let uniqueProducts = [...new Set(priceList.map(item => item.tenSP))];
  if (!uniqueProducts || uniqueProducts.length === 0) {
    uniqueProducts = UNIFORM_CATEGORIES || ['Áo sơ mi', 'Quần short', 'Váy', 'Áo thể dục', 'Quần thể dục'];
  }

  const rowHtml = `
    <div id="${rowId}" class="product-row grid grid-cols-12 gap-3 items-center bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm transition-all hover:border-indigo-300">
      <div class="col-span-12 sm:col-span-4">
        <label class="block text-xs font-semibold text-slate-500 mb-1">Sản phẩm</label>
        <select class="product-select w-full rounded-lg border-slate-300 text-sm focus:ring-indigo-500 focus:border-indigo-500 p-2 border font-medium">
          <option value="">-- Chọn sản phẩm --</option>
          ${uniqueProducts.map(p => `<option value="${p}">${p}</option>`).join('')}
        </select>
      </div>

      <div class="col-span-6 sm:col-span-2">
        <label class="block text-xs font-semibold text-slate-500 mb-1">Size</label>
        <select class="size-select w-full rounded-lg border-slate-300 text-sm focus:ring-indigo-500 focus:border-indigo-500 p-2 border font-bold disabled:bg-slate-100" disabled>
          <option value="">-- Size --</option>
        </select>
      </div>

      <div class="col-span-6 sm:col-span-2">
        <label class="block text-xs font-semibold text-slate-500 mb-1">Đơn giá</label>
        <input type="text" class="unit-price-input w-full rounded-lg border-slate-200 text-sm bg-slate-50 font-semibold text-slate-700 p-2 border" readonly value="0 đ" />
      </div>

      <div class="col-span-8 sm:col-span-2">
        <label class="block text-xs font-semibold text-slate-500 mb-1">Số lượng</label>
        <div class="flex items-center space-x-1">
          <button type="button" class="btn-qty-minus bg-slate-100 hover:bg-slate-200 text-slate-600 px-2.5 py-1.5 rounded-lg font-bold text-sm">-</button>
          <input type="number" class="qty-input w-full text-center rounded-lg border-slate-300 text-sm p-1.5 border font-bold" value="1" min="1" max="99" />
          <button type="button" class="btn-qty-plus bg-slate-100 hover:bg-slate-200 text-slate-600 px-2.5 py-1.5 rounded-lg font-bold text-sm">+</button>
        </div>
      </div>

      <div class="col-span-4 sm:col-span-2 flex items-center justify-between">
        <div>
          <label class="block text-xs font-semibold text-slate-500 mb-1">Thành tiền</label>
          <span class="row-subtotal font-bold text-indigo-600 text-sm">0 đ</span>
        </div>
        <button type="button" class="btn-delete-row text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-2 rounded-lg transition-colors" title="Xóa món">
          <i class="fas fa-trash-alt text-base"></i>
        </button>
      </div>
    </div>
  `;

  container.insertAdjacentHTML('beforeend', rowHtml);
  const rowEl = document.getElementById(rowId);
  bindRowEvents(rowEl);

  if (defaultProductTitle) {
    const pSelect = rowEl.querySelector('.product-select');
    if (pSelect) {
      pSelect.value = defaultProductTitle;
      pSelect.dispatchEvent(new Event('change'));
    }
  }

  calculateTotalSum();
}

function bindRowEvents(rowEl) {
  const pSelect = rowEl.querySelector('.product-select');
  const sSelect = rowEl.querySelector('.size-select');
  const qtyInput = rowEl.querySelector('.qty-input');
  const priceInput = rowEl.querySelector('.unit-price-input');
  const subtotalEl = rowEl.querySelector('.row-subtotal');
  const btnMinus = rowEl.querySelector('.btn-qty-minus');
  const btnPlus = rowEl.querySelector('.btn-qty-plus');
  const btnDelete = rowEl.querySelector('.btn-delete-row');

  pSelect.addEventListener('change', () => {
    const selectedProd = pSelect.value;
    sSelect.innerHTML = '<option value="">-- Size --</option>';
    
    if (!selectedProd) {
      sSelect.disabled = true;
      priceInput.value = '0 đ';
      subtotalEl.innerText = '0 đ';
      calculateTotalSum();
      return;
    }

    let availableSizes = priceList.filter(item => item.tenSP === selectedProd && item.trangThai === 'Hoạt động');
    if (!availableSizes || availableSizes.length === 0) {
      availableSizes = UNIFORM_SIZES.map((sz, i) => ({ size: sz, donGia: 120000 + i * 5000 }));
    }

    availableSizes.forEach(item => {
      const opt = document.createElement('option');
      opt.value = item.size;
      opt.setAttribute('data-price', item.donGia);
      opt.textContent = `${item.size} (${formatVND(item.donGia)})`;
      sSelect.appendChild(opt);
    });

    sSelect.disabled = false;
    if (availableSizes.length > 0) {
      sSelect.selectedIndex = 1;
      updateRowCalculation(rowEl);
    }
  });

  sSelect.addEventListener('change', () => updateRowCalculation(rowEl));
  qtyInput.addEventListener('input', () => updateRowCalculation(rowEl));

  btnMinus.addEventListener('click', () => {
    let val = parseInt(qtyInput.value) || 1;
    if (val > 1) {
      qtyInput.value = val - 1;
      updateRowCalculation(rowEl);
    }
  });

  btnPlus.addEventListener('click', () => {
    let val = parseInt(qtyInput.value) || 1;
    qtyInput.value = val + 1;
    updateRowCalculation(rowEl);
  });

  btnDelete.addEventListener('click', () => {
    rowEl.remove();
    calculateTotalSum();
  });
}

function updateRowCalculation(rowEl) {
  const sSelect = rowEl.querySelector('.size-select');
  const qtyInput = rowEl.querySelector('.qty-input');
  const priceInput = rowEl.querySelector('.unit-price-input');
  const subtotalEl = rowEl.querySelector('.row-subtotal');

  const selectedOpt = sSelect.options[sSelect.selectedIndex];
  const unitPrice = selectedOpt ? Number(selectedOpt.getAttribute('data-price') || 0) : 0;
  const qty = Math.max(1, parseInt(qtyInput.value) || 1);

  const subtotal = unitPrice * qty;
  priceInput.value = formatVND(unitPrice);
  subtotalEl.innerText = formatVND(subtotal);

  calculateTotalSum();
}

function calculateTotalSum() {
  let grandTotal = 0;
  document.querySelectorAll('.product-row').forEach(row => {
    const sSelect = row.querySelector('.size-select');
    const qtyInput = row.querySelector('.qty-input');
    const selectedOpt = sSelect.options[sSelect.selectedIndex];
    const unitPrice = selectedOpt ? Number(selectedOpt.getAttribute('data-price') || 0) : 0;
    const qty = Math.max(1, parseInt(qtyInput.value) || 1);
    
    if (sSelect.value) {
      grandTotal += unitPrice * qty;
    }
  });

  const totalEl = document.getElementById('registration-total-amount');
  if (totalEl) {
    totalEl.innerText = formatVND(grandTotal);
  }
}

async function handleFormSubmit(e) {
  e.preventDefault();

  const hoTen = document.getElementById('reg-fullname').value.trim();
  const sdt = document.getElementById('reg-phone').value.trim();
  const donVi = document.getElementById('reg-unit').value.trim();
  const gioiTinh = document.getElementById('reg-gender').value;
  const ghiChu = document.getElementById('reg-note').value.trim();

  const chiTietSanPham = [];

  document.querySelectorAll('.product-row').forEach(row => {
    const pSelect = row.querySelector('.product-select');
    const sSelect = row.querySelector('.size-select');
    const qtyInput = row.querySelector('.qty-input');

    if (pSelect.value && sSelect.value) {
      const selectedOpt = sSelect.options[sSelect.selectedIndex];
      const donGia = Number(selectedOpt.getAttribute('data-price') || 0);
      const soLuong = parseInt(qtyInput.value) || 1;

      chiTietSanPham.push({
        tenSP: pSelect.value,
        size: sSelect.value,
        donGia: donGia,
        soLuong: soLuong,
        thanhTien: donGia * soLuong
      });
    }
  });

  if (chiTietSanPham.length === 0) {
    alert('Vui lòng chọn ít nhất 1 sản phẩm kèm size!');
    return;
  }

  const tongTien = chiTietSanPham.reduce((sum, item) => sum + item.thanhTien, 0);

  const loggedUser = JSON.parse(sessionStorage.getItem('LOGGED_USER_DATA') || '{}');
  const nguoiTao = loggedUser.username || 'unknown';

  const orderPayload = {
    hoTen,
    sdt,
    donVi,
    gioiTinh,
    chiTietSanPham,
    tongTien,
    ghiChu,
    nguoiTao
  };

  showLoading(true);

  let newOrder = null;

  if (CONFIG.APPS_SCRIPT_URL) {
    try {
      const res = await fetch(CONFIG.APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'createOrder', data: orderPayload })
      });
      const json = await res.json();
      if (json.success) {
        newOrder = {
          maDon: json.maDon,
          ngayDangKy: new Date().toISOString().split('T')[0],
          ...orderPayload,
          trangThaiThanhToan: 'Chưa thu'
        };
      }
    } catch (err) {
      console.warn('POST Apps Script lỗi, dùng Local Database:', err);
    }
  }

  if (!newOrder) {
    newOrder = LocalDB.saveOrder(orderPayload);
  }

  showLoading(false);
  await loadOrdersData();

  document.getElementById('registration-form').reset();
  initRegistrationForm();
  renderRecentRegistrationsLog();

  showOrderSuccessModal(newOrder);
}

function showOrderSuccessModal(order) {
  openReceiptModal(order);
}

// ============================================================================
// TRA CỨU ĐƠN HÀNG
// ============================================================================

function setupLookup() {
  const searchInput = document.getElementById('lookup-keyword');
  const searchBtn = document.getElementById('btn-do-lookup');

  if (searchBtn && searchInput) {
    searchBtn.onclick = () => performLookup(searchInput.value);
    searchInput.onkeyup = (e) => {
      if (e.key === 'Enter') performLookup(searchInput.value);
    };
  }
}

function performLookup(keyword) {
  const container = document.getElementById('lookup-results');
  if (!container) return;

  const kw = (keyword || '').toLowerCase().trim();
  if (!kw) {
    container.innerHTML = `<p class="text-center text-slate-500 py-6">Nhập Mã đơn hàng hoặc Họ tên để tìm kiếm.</p>`;
    return;
  }

  const matches = ordersList.filter(o => 
    (o.maDon || '').toLowerCase().includes(kw) ||
    (o.hoTen || '').toLowerCase().includes(kw) ||
    (o.donVi || '').toLowerCase().includes(kw)
  );

  if (matches.length === 0) {
    container.innerHTML = `
      <div class="text-center py-10 bg-white rounded-2xl border border-slate-200">
        <i class="fas fa-search-minus text-4xl text-slate-300 mb-3"></i>
        <p class="text-slate-600 font-semibold">Không tìm thấy thông tin đăng ký phù hợp.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = matches.map(o => `
    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow">
      <div class="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
        <div>
          <span class="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">${o.maDon}</span>
          <span class="text-xs text-slate-400 ml-2"><i class="far fa-calendar-alt mr-1"></i>${formatDateString(o.ngayDangKy)}</span>
        </div>
        <div>
          <span class="px-3 py-1 text-xs font-semibold rounded-full ${o.trangThaiThanhToan === 'Đã thu' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}">
            <i class="fas ${o.trangThaiThanhToan === 'Đã thu' ? 'fa-check-circle' : 'fa-clock'} mr-1"></i>${o.trangThaiThanhToan}
          </span>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 text-sm">
        <div><span class="text-slate-400">Họ và tên:</span> <strong class="text-slate-800">${o.hoTen}</strong></div>
        <div><span class="text-slate-400">Đơn vị / Lớp:</span> <strong class="text-slate-800">${o.donVi}</strong></div>
      </div>

      <div class="bg-slate-50 rounded-xl p-3 mb-4">
        <div class="text-xs font-bold text-slate-500 uppercase mb-2">Chi tiết sản phẩm:</div>
        <div class="space-y-1.5 text-xs text-slate-700">
          ${(o.chiTietSanPham || []).map(i => `
            <div class="flex justify-between items-center">
              <span>• ${i.tenSP} - Size <strong>${i.size}</strong> x ${i.soLuong}</span>
              <span class="font-semibold">${formatVND(i.thanhTien)}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="flex items-center justify-between pt-2">
        <div>
          <span class="text-xs text-slate-500">Tổng thanh toán:</span>
          <span class="text-lg font-extrabold text-indigo-600 ml-2">${formatVND(o.tongTien)}</span>
        </div>
        <button onclick='viewReceiptById("${o.maDon}")' class="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-xs font-bold transition-colors">
          <i class="fas fa-print mr-1.5"></i> In Biên Lai A4 Ngang
        </button>
      </div>
    </div>
  `).join('');
}

function viewReceiptById(maDon) {
  const order = ordersList.find(o => o.maDon === maDon);
  if (order) openReceiptModal(order);
}

// ============================================================================
// ADMIN DASHBOARD & BÁO CÁO THỐNG KÊ
// ============================================================================

function renderDashboard() {
  const totalOrdersEl = document.getElementById('stat-total-orders');
  const totalRevenueEl = document.getElementById('stat-total-revenue');
  const totalCollectedEl = document.getElementById('stat-collected');
  const totalPendingEl = document.getElementById('stat-pending');

  let tongDon = ordersList.length;
  let tongTien = 0;
  let daThu = 0;
  let chuaThu = 0;

  const byDonVi = {};
  const bySize = {};
  const byGioiTinh = {};

  ordersList.forEach(o => {
    const amt = Number(o.tongTien || 0);
    tongTien += amt;
    if (o.trangThaiThanhToan === 'Đã thu') {
      daThu += amt;
    } else {
      chuaThu += amt;
    }

    const dv = o.donVi || 'Khác';
    byDonVi[dv] = (byDonVi[dv] || 0) + amt;

    const gt = o.gioiTinh || 'Nam/Nữ';
    byGioiTinh[gt] = (byGioiTinh[gt] || 0) + 1;

    if (Array.isArray(o.chiTietSanPham)) {
      o.chiTietSanPham.forEach(item => {
        const sz = item.size || 'N/A';
        bySize[sz] = (bySize[sz] || 0) + Number(item.soLuong || 1);
      });
    }
  });

  if (totalOrdersEl) totalOrdersEl.innerText = tongDon;
  if (totalRevenueEl) totalRevenueEl.innerText = formatVND(tongTien);
  if (totalCollectedEl) totalCollectedEl.innerText = formatVND(daThu);
  if (totalPendingEl) totalPendingEl.innerText = formatVND(chuaThu);

  initCharts({ byDonVi, bySize, byGioiTinh, daThu, chuaThu });
}

/**
 * BẢNG TỔNG HỢP SỐ LƯỢNG ĐỒNG PHỤC THEO SIZE (DÙNG TRONG ADMIN)
 */
function renderSizeSummaryMatrixTable() {
  const tbody = document.getElementById('size-summary-matrix-tbody');
  if (!tbody) return;

  const matrixRows = [
    { key: 'AO_SO_MI_NAM', label: 'ÁO SƠ MI (NAM)' },
    { key: 'AO_SO_MI_NU',  label: 'ÁO SƠ MI (NỮ)' },
    { key: 'QUAN_SHORT',   label: 'QUẦN SHORT' },
    { key: 'VAY',          label: 'VÁY' },
    { key: 'AO_THE_DUC',   label: 'ÁO THỂ DỤC' },
    { key: 'QUAN_THE_DUC', label: 'QUẦN THỂ DỤC' }
  ];

  const sizes = UNIFORM_SIZES || ['Size 1', 'Size 2', 'Size 3', 'Size 4', 'Size 5', 'Size 6', 'Size 7', 'Size 8', 'Size 9', 'Size 10', 'Size 11', 'Size 12'];

  // Khởi tạo bảng đếm 6 hàng x 12 size = 0
  const counts = {};
  matrixRows.forEach(r => {
    counts[r.key] = {};
    sizes.forEach(sz => counts[r.key][sz] = 0);
  });

  // Đếm dữ liệu từ tất cả các đơn đăng ký
  ordersList.forEach(order => {
    const isNam = (order.gioiTinh === 'Nam');
    if (Array.isArray(order.chiTietSanPham)) {
      order.chiTietSanPham.forEach(item => {
        const prod = item.tenSP;
        const sz = item.size;
        const qty = Number(item.soLuong || 1);

        let rowKey = null;
        if (prod === 'Áo sơ mi') {
          rowKey = isNam ? 'AO_SO_MI_NAM' : 'AO_SO_MI_NU';
        } else if (prod === 'Quần short') {
          rowKey = 'QUAN_SHORT';
        } else if (prod === 'Váy') {
          rowKey = 'VAY';
        } else if (prod === 'Áo thể dục') {
          rowKey = 'AO_THE_DUC';
        } else if (prod === 'Quần thể dục') {
          rowKey = 'QUAN_THE_DUC';
        }

        if (rowKey && counts[rowKey] && counts[rowKey][sz] !== undefined) {
          counts[rowKey][sz] += qty;
        }
      });
    }
  });

  // Tính tổng hàng và tổng cột
  const colTotals = {};
  sizes.forEach(sz => colTotals[sz] = 0);
  let grandTotalPieces = 0;

  const rowsHtml = matrixRows.map(r => {
    let rowSum = 0;
    const sizeCells = sizes.map(sz => {
      const val = counts[r.key][sz] || 0;
      rowSum += val;
      colTotals[sz] += val;
      return `<td class="p-2 border border-slate-200 ${val > 0 ? 'font-extrabold text-indigo-700 bg-indigo-50/50' : 'text-slate-400'}">${val > 0 ? val : '-'}</td>`;
    }).join('');

    grandTotalPieces += rowSum;

    return `
      <tr class="hover:bg-slate-50 transition-colors">
        <td class="p-2.5 font-bold text-slate-800 text-left border border-slate-200 bg-slate-50/70">${r.label}</td>
        ${sizeCells}
        <td class="p-2.5 font-black text-indigo-900 border border-slate-200 bg-indigo-100/60">${rowSum > 0 ? rowSum : '-'}</td>
      </tr>
    `;
  }).join('');

  // Hàng tổng cộng cuối cùng
  const footerRowHtml = `
    <tr class="bg-slate-800 text-white font-extrabold">
      <td class="p-2.5 text-left border border-slate-700 uppercase">Tổng cộng theo Size</td>
      ${sizes.map(sz => `<td class="p-2 border border-slate-700 ${colTotals[sz] > 0 ? 'text-amber-300 font-black' : 'text-slate-400'}">${colTotals[sz] > 0 ? colTotals[sz] : '-'}</td>`).join('')}
      <td class="p-2.5 border border-slate-700 text-amber-300 font-black text-sm bg-slate-900">${grandTotalPieces}</td>
    </tr>
  `;

  tbody.innerHTML = rowsHtml + footerRowHtml;
}

function initCharts(data) {
  if (typeof Chart === 'undefined') return;

  const ctxDonVi = document.getElementById('chart-revenue-unit');
  if (ctxDonVi) {
    if (chartInstances.donVi) chartInstances.donVi.destroy();
    chartInstances.donVi = new Chart(ctxDonVi, {
      type: 'bar',
      data: {
        labels: Object.keys(data.byDonVi),
        datasets: [{
          label: 'Doanh thu (VNĐ)',
          data: Object.values(data.byDonVi),
          backgroundColor: 'rgba(79, 70, 229, 0.85)',
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } }
      }
    });
  }

  const ctxSize = document.getElementById('chart-size-ratio');
  if (ctxSize) {
    if (chartInstances.size) chartInstances.size.destroy();
    chartInstances.size = new Chart(ctxSize, {
      type: 'doughnut',
      data: {
        labels: Object.keys(data.bySize),
        datasets: [{
          data: Object.values(data.bySize),
          backgroundColor: ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6']
        }]
      },
      options: { responsive: true }
    });
  }
}

function renderAdminOrdersTable() {
  const tbody = document.getElementById('admin-orders-tbody');
  if (!tbody) return;

  const loggedUserStr = sessionStorage.getItem('LOGGED_USER_DATA');
  let userRole = 'admin';
  if (loggedUserStr) {
    try { userRole = JSON.parse(loggedUserStr).role; } catch(e){}
  }

  const searchKw = (document.getElementById('admin-search-input')?.value || '').toLowerCase().trim();
  const filterStatus = document.getElementById('admin-status-filter')?.value || 'ALL';

  let filtered = ordersList.filter(o => {
    const matchKw = !searchKw || 
      o.maDon.toLowerCase().includes(searchKw) ||
      o.hoTen.toLowerCase().includes(searchKw) ||
      o.donVi.toLowerCase().includes(searchKw);

    const matchStatus = filterStatus === 'ALL' || o.trangThaiThanhToan === filterStatus;
    return matchKw && matchStatus;
  });

  tbody.innerHTML = filtered.map(o => `
    <tr>
      <td class="font-bold text-indigo-600">${o.maDon}</td>
      <td class="text-slate-500 text-xs">${formatDateString(o.ngayDangKy)}</td>
      <td class="font-medium">${o.hoTen}</td>
      <td class="text-slate-600">${o.donVi}<div class="text-[10px] text-slate-400 font-semibold italic">Tạo bởi: ${o.nguoiTao || 'Không rõ'}</div></td>
      <td class="text-xs">
        ${(o.chiTietSanPham || []).map(i => `<div>${i.tenSP} (${i.size}) x${i.soLuong}</div>`).join('')}
      </td>
      <td class="font-extrabold text-slate-800">${formatVND(o.tongTien)}</td>
      <td>
        <button onclick="togglePaymentStatus('${o.maDon}')" class="px-2.5 py-1 text-xs font-semibold rounded-full border transition-all ${o.trangThaiThanhToan === 'Đã thu' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'}">
          ${o.trangThaiThanhToan} <i class="fas fa-sync-alt text-[10px] ml-1 opacity-70"></i>
        </button>
      </td>
      <td>
        <div class="flex items-center space-x-1">
          <button onclick="viewReceiptById('${o.maDon}')" class="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg" title="In biên lai A4 Ngang">
            <i class="fas fa-print"></i>
          </button>
          
          <button onclick="openEditOrderModal('${o.maDon}')" class="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg" title="Sửa đơn đăng ký">
            <i class="fas fa-edit"></i>
          </button>

          ${userRole === 'admin' ? `
            <button onclick="deleteOrderAdmin('${o.maDon}', '${o.hoTen}')" class="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg" title="Xóa đơn đăng ký (Chỉ Admin)">
              <i class="fas fa-trash-alt"></i>
            </button>
          ` : ''}
        </div>
      </td>
    </tr>
  `).join('');
}

// ============================================================================
// CHỨC NĂNG SỬA ĐƠN ĐĂNG KÝ (EDIT ORDER)
// ============================================================================

function setupEditOrderForm() {
  const form = document.getElementById('edit-order-form');
  if (form) {
    form.onsubmit = handleEditOrderSubmit;
  }
}

function openEditOrderModal(maDon) {
  const order = ordersList.find(o => o.maDon === maDon);
  if (!order) return;

  const modal = document.getElementById('edit-order-modal');
  const codeEl = document.getElementById('edit-order-code');
  const idInput = document.getElementById('edit-order-id');
  const nameInput = document.getElementById('edit-fullname');
  const unitInput = document.getElementById('edit-unit');
  const genderSelect = document.getElementById('edit-gender');
  const noteInput = document.getElementById('edit-note');
  const itemsContainer = document.getElementById('edit-items-container');

  if (codeEl) codeEl.innerText = order.maDon;
  if (idInput) idInput.value = order.maDon;
  if (nameInput) nameInput.value = order.hoTen;
  if (unitInput) unitInput.value = order.donVi;
  if (genderSelect) genderSelect.value = order.gioiTinh || 'Nam';
  if (noteInput) noteInput.value = order.ghiChu || '';

  if (itemsContainer) {
    let uniqueProducts = [...new Set(priceList.map(item => item.tenSP))];
    if (!uniqueProducts || uniqueProducts.length === 0) uniqueProducts = UNIFORM_CATEGORIES;
    const sizes = UNIFORM_SIZES || ['Size 1', 'Size 2', 'Size 3', 'Size 4', 'Size 5', 'Size 6', 'Size 7', 'Size 8', 'Size 9', 'Size 10', 'Size 11', 'Size 12'];

    itemsContainer.innerHTML = (order.chiTietSanPham || []).map((item, idx) => `
      <div class="edit-item-row grid grid-cols-12 gap-2 items-center bg-white p-2 rounded-xl border border-slate-200 text-xs">
        <div class="col-span-5">
          <select class="edit-item-product w-full rounded-lg border-slate-300 p-1.5 border font-semibold" onchange="recalcEditTotal()">
            ${uniqueProducts.map(p => `<option value="${p}" ${p === item.tenSP ? 'selected' : ''}>${p}</option>`).join('')}
          </select>
        </div>
        <div class="col-span-3">
          <select class="edit-item-size w-full rounded-lg border-slate-300 p-1.5 border font-bold" onchange="recalcEditTotal()">
            ${sizes.map(sz => `<option value="${sz}" ${sz === item.size ? 'selected' : ''}>${sz}</option>`).join('')}
          </select>
        </div>
        <div class="col-span-2">
          <input type="number" value="${item.soLuong}" min="1" max="99" class="edit-item-qty w-full text-center rounded-lg border-slate-300 p-1 border font-bold" oninput="recalcEditTotal()" />
        </div>
        <div class="col-span-2 text-right">
          <button type="button" onclick="this.closest('.edit-item-row').remove(); recalcEditTotal();" class="text-rose-500 hover:text-rose-700 p-1">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
    `).join('');
  }

  recalcEditTotal();
  if (modal) modal.classList.remove('hidden');
}

function closeEditOrderModal() {
  const modal = document.getElementById('edit-order-modal');
  if (modal) modal.classList.add('hidden');
}

function recalcEditTotal() {
  let total = 0;
  document.querySelectorAll('.edit-item-row').forEach(row => {
    const p = row.querySelector('.edit-item-product')?.value;
    const s = row.querySelector('.edit-item-size')?.value;
    const q = parseInt(row.querySelector('.edit-item-qty')?.value) || 1;

    const match = priceList.find(item => item.tenSP === p && item.size === s);
    const price = match ? match.donGia : 120000;
    total += price * q;
  });

  const totalEl = document.getElementById('edit-total-amount');
  if (totalEl) totalEl.innerText = formatVND(total);
}

async function handleEditOrderSubmit(e) {
  e.preventDefault();

  const maDon = document.getElementById('edit-order-id').value;
  const hoTen = document.getElementById('edit-fullname').value.trim();
  const donVi = document.getElementById('edit-unit').value.trim();
  const gioiTinh = document.getElementById('edit-gender').value;
  const ghiChu = document.getElementById('edit-note').value.trim();

  const chiTietSanPham = [];
  document.querySelectorAll('.edit-item-row').forEach(row => {
    const p = row.querySelector('.edit-item-product').value;
    const s = row.querySelector('.edit-item-size').value;
    const q = parseInt(row.querySelector('.edit-item-qty').value) || 1;

    const match = priceList.find(item => item.tenSP === p && item.size === s);
    const donGia = match ? match.donGia : 120000;

    chiTietSanPham.push({
      tenSP: p,
      size: s,
      donGia: donGia,
      soLuong: q,
      thanhTien: donGia * q
    });
  });

  if (chiTietSanPham.length === 0) {
    alert('Đơn hàng cần có ít nhất 1 sản phẩm!');
    return;
  }

  const tongTien = chiTietSanPham.reduce((sum, i) => sum + i.thanhTien, 0);

  const updatedPayload = {
    maDon,
    hoTen,
    sdt: '',
    donVi,
    gioiTinh,
    chiTietSanPham,
    tongTien,
    ghiChu
  };

  showLoading(true);

  if (CONFIG.APPS_SCRIPT_URL) {
    try {
      await fetch(CONFIG.APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'updateOrder', data: updatedPayload })
      });
    } catch (err) {
      console.warn('Lỗi API update order backend:', err);
    }
  }

  LocalDB.updateOrder(updatedPayload);
  await loadOrdersData();
  showLoading(false);

  closeEditOrderModal();
  renderDashboard();
  renderSizeSummaryMatrixTable();
  renderAdminOrdersTable();
  renderRecentRegistrationsLog();
  alert(`Đã cập nhật đơn đăng ký ${maDon} thành công!`);
}

async function deleteOrderAdmin(maDon, hoTen) {
  if (!confirm(`[CHỈ ADMIN] Bạn có chắc chắn muốn xóa đơn đăng ký ${maDon} của "${hoTen}" không?`)) {
    return;
  }

  showLoading(true);

  if (CONFIG.APPS_SCRIPT_URL) {
    try {
      await fetch(CONFIG.APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'deleteOrder', maDon: maDon })
      });
    } catch (err) {
      console.warn('Lỗi API xóa đơn backend:', err);
    }
  }

  LocalDB.deleteOrder(maDon);
  await loadOrdersData();
  showLoading(false);

  renderDashboard();
  renderSizeSummaryMatrixTable();
  renderAdminOrdersTable();
  renderRecentRegistrationsLog();
  alert(`Đã xóa đơn đăng ký ${maDon} thành công!`);
}

async function togglePaymentStatus(maDon) {
  const order = ordersList.find(o => o.maDon === maDon);
  if (!order) return;

  const newStatus = order.trangThaiThanhToan === 'Đã thu' ? 'Chưa thu' : 'Đã thu';
  
  if (CONFIG.APPS_SCRIPT_URL) {
    try {
      await fetch(CONFIG.APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'updatePayment', maDon: maDon, trangThai: newStatus })
      });
    } catch (err) {
      console.warn('Lỗi API backend:', err);
    }
  }

  LocalDB.updatePayment(maDon, newStatus);
  await loadOrdersData();
  renderDashboard();
  renderSizeSummaryMatrixTable();
  renderAdminOrdersTable();
  renderRecentRegistrationsLog();
}

// ============================================================================
// QUẢN LÝ BẢNG GIÁ 5 SẢN PHẨM X 12 SIZE
// ============================================================================

function renderPriceManagementTable() {
  const container = document.getElementById('price-management-cards-container');
  if (!container) return;

  const categories = UNIFORM_CATEGORIES || ['Áo sơ mi', 'Quần short', 'Váy', 'Áo thể dục', 'Quần thể dục'];
  const sizes = UNIFORM_SIZES || ['Size 1', 'Size 2', 'Size 3', 'Size 4', 'Size 5', 'Size 6', 'Size 7', 'Size 8', 'Size 9', 'Size 10', 'Size 11', 'Size 12'];

  const categoryIcons = {
    'Áo sơ mi': 'fa-tshirt text-indigo-600',
    'Quần short': 'fa-user-nurse text-blue-600',
    'Váy': 'fa-female text-pink-600',
    'Áo thể dục': 'fa-running text-amber-600',
    'Quần thể dục': 'fa-running text-emerald-600'
  };

  container.innerHTML = categories.map(cat => {
    const iconClass = categoryIcons[cat] || 'fa-tshirt text-indigo-600';
    const catPrices = priceList.filter(p => p.tenSP === cat);

    return `
      <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 hover:shadow-md transition-shadow">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-slate-100">
          <div class="flex items-center space-x-2.5">
            <div class="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-base">
              <i class="fas ${iconClass}"></i>
            </div>
            <div>
              <h4 class="font-extrabold text-slate-800 text-sm uppercase">${cat}</h4>
              <span class="text-[11px] text-slate-400">Bảng đơn giá cho 12 Size chuẩn</span>
            </div>
          </div>
          
          <button onclick="saveBulkPricesForCategory('${cat}', this)" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center space-x-1.5">
            <i class="fas fa-save"></i>
            <span>Lưu Bảng Giá ${cat}</span>
          </button>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5">
          ${sizes.map(sz => {
            const match = catPrices.find(p => p.size === sz);
            const currentPrice = match ? match.donGia : 120000;
            return `
              <div class="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center hover:bg-slate-100/80 transition-colors">
                <span class="block text-[11px] font-extrabold text-indigo-700 uppercase">${sz}</span>
                <div class="mt-1.5 relative">
                  <input type="number" value="${currentPrice}" data-category="${cat}" data-size="${sz}" class="bulk-price-input w-full text-center font-extrabold text-xs py-1.5 px-1 rounded-lg border border-slate-300 bg-white text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }).join('');
}

async function saveBulkPricesForCategory(catName, btnEl) {
  const card = btnEl.closest('.bg-white');
  const inputs = card.querySelectorAll('.bulk-price-input');
  
  const sizePriceMap = {};
  inputs.forEach(inp => {
    const sz = inp.getAttribute('data-size');
    const val = Number(inp.value) || 0;
    sizePriceMap[sz] = val;
  });

  showLoading(true);

  if (CONFIG.APPS_SCRIPT_URL) {
    try {
      for (const sz of Object.keys(sizePriceMap)) {
        await fetch(CONFIG.APPS_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({
            action: 'updatePrice',
            priceItem: { tenSP: catName, size: sz, donGia: sizePriceMap[sz], trangThai: 'Hoạt động' }
          })
        });
      }
    } catch(err) {
      console.warn('Lỗi API update prices:', err);
    }
  }

  LocalDB.saveBulkPricesForCategory(catName, sizePriceMap);
  await loadPriceData();
  showLoading(false);

  alert(`Đã lưu bảng giá 12 Size cho "${catName}" thành công!`);
  initRegistrationForm();
}

// ============================================================================
// IN BIÊN LAI THU TIỀN
// ============================================================================

function openReceiptModal(order) {
  currentPrintOrder = order;
  const modal = document.getElementById('receipt-modal');
  const printContent = document.getElementById('receipt-print-area');
  if (!modal || !printContent) return;

  let day = '03', month = '07', year = '2026';
  if (order.ngayDangKy) {
    const parts = order.ngayDangKy.split('-');
    if (parts.length === 3) {
      year = parts[0];
      month = parts[1];
      day = parts[2];
    }
  }

  const generateSingleReceiptHTML = (lienTitle) => `
    <div class="receipt-card">
      
      <div>
        <div class="receipt-header">
          <span style="font-style: italic;">Quy trình đăng ký...</span>
          <span class="receipt-lien-badge">${lienTitle}</span>
        </div>

        <div class="receipt-title-section">
          <h2 class="receipt-org-name">${CONFIG.ORGANIZATION_NAME || 'TRƯỜNG TIỂU HỌC NGUYỄN THANH TUYỀN'}</h2>
          <h1 class="receipt-main-title">BIÊN LAI THU TIỀN</h1>
          <p class="receipt-sub-title">NĂM HỌC 2026 - 2027</p>
          <p class="receipt-date">Ngày ${day} tháng ${month} năm ${year}</p>
        </div>

        <div class="receipt-info-section">
          <div><span class="receipt-info-label">Mã đơn:</span> <span class="receipt-info-value" style="font-family: monospace;">${order.maDon}</span></div>
          <div><span class="receipt-info-label">Học sinh:</span> <span class="receipt-info-value" style="text-transform: uppercase;">${order.hoTen}</span></div>
          <div><span class="receipt-info-label">Đơn vị / Lớp:</span> <span class="receipt-info-value">${order.donVi}</span></div>
          <div><span class="receipt-info-label">Nội dung thu:</span> <span>Đăng ký mua đồng phục học sinh</span></div>
        </div>

        <table class="receipt-table">
          <thead>
            <tr style="background-color: #f8fafc; font-weight: bold; text-align: center;">
              <th style="border: 1px solid #94a3b8; padding: 3px 4px;">Tên hàng</th>
              <th style="border: 1px solid #94a3b8; padding: 3px 4px; width: 45px;">Size</th>
              <th style="border: 1px solid #94a3b8; padding: 3px 4px; text-align: right;">Đơn giá</th>
              <th style="border: 1px solid #94a3b8; padding: 3px 4px; text-align: center; width: 30px;">SL</th>
              <th style="border: 1px solid #94a3b8; padding: 3px 4px; text-align: right;">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            ${(order.chiTietSanPham || []).map(item => `
              <tr>
                <td style="border: 1px solid #94a3b8; padding: 3px 4px;">${item.tenSP}</td>
                <td style="border: 1px solid #94a3b8; padding: 3px 4px; text-align: center; font-weight: bold;">${item.size}</td>
                <td style="border: 1px solid #94a3b8; padding: 3px 4px; text-align: right;">${formatNumberOnly(item.donGia)}</td>
                <td style="border: 1px solid #94a3b8; padding: 3px 4px; text-align: center;">${item.soLuong}</td>
                <td style="border: 1px solid #94a3b8; padding: 3px 4px; text-align: right; font-weight: bold;">${formatNumberOnly(item.thanhTien)}</td>
              </tr>
            `).join('')}
            <tr style="font-weight: bold;">
              <td colspan="4" style="border: 1px solid #94a3b8; padding: 3px 4px; text-align: right;">Tổng cộng:</td>
              <td style="border: 1px solid #94a3b8; padding: 3px 4px; text-align: right; font-weight: 900; color: #0f172a;">${formatNumberOnly(order.tongTien)}</td>
            </tr>
          </tbody>
        </table>

        <div class="receipt-words">
          <strong>(Số tiền bằng chữ):</strong> ${numberToVietnameseWords(order.tongTien)}
        </div>

        <div class="receipt-signatures">
          <div>
            <p class="receipt-signature-title">Người nhận</p>
            <p class="receipt-signature-hint">(Ký, ghi rõ họ tên)</p>
          </div>
          <div>
            <p class="receipt-signature-title">Người thu tiền</p>
            <p class="receipt-signature-hint">(Ký, ghi rõ họ tên)</p>
          </div>
        </div>
      </div>

      <div class="receipt-note-section">
        <div>Ghi chú: ....................................................................................................................................</div>
        <div class="receipt-note-line"></div>
      </div>

    </div>
  `;

  printContent.innerHTML = `
    <div class="twin-receipt-grid">
      ${generateSingleReceiptHTML('Liên 1: Lưu')}
      ${generateSingleReceiptHTML('Liên 2: Khách hàng')}
    </div>
  `;

  modal.classList.remove('hidden');
}

function closeReceiptModal() {
  const modal = document.getElementById('receipt-modal');
  if (modal) modal.classList.add('hidden');
}

function printReceipt() {
  window.print();
}

function exportReceiptToPDF() {
  if (!currentPrintOrder) {
    alert("Không tìm thấy thông tin đơn hàng để xuất PDF!");
    return;
  }

  const element = document.getElementById('receipt-print-area');
  if (!element) return;

  showLoading(true);

  // Tùy chỉnh cấu hình html2pdf để vừa khít 1 trang A4 ngang
  const opt = {
    margin:       [8, 8, 8, 8],
    filename:     `BienLai_${currentPrintOrder.maDon}_${currentPrintOrder.hoTen.replace(/\s+/g, '_')}.pdf`,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2, useCORS: true, logging: false },
    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' }
  };

  html2pdf().set(opt).from(element).save().then(() => {
    showLoading(false);
  }).catch(err => {
    console.error("Lỗi xuất PDF trực tiếp:", err);
    showLoading(false);
    alert("Có lỗi xảy ra khi tạo tệp PDF!");
  });
}

function formatVND(amount) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
}

function formatNumberOnly(amount) {
  return new Intl.NumberFormat('vi-VN').format(amount || 0);
}

function numberToVietnameseWords(number) {
  if (!number || isNaN(number) || number === 0) return "không đồng.";

  const digits = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];

  function readBlock(num, showZeroHundreds) {
    let hundred = Math.floor(num / 100);
    let ten = Math.floor((num % 100) / 10);
    let unit = num % 10;
    let res = "";

    if (hundred > 0 || showZeroHundreds) {
      res += digits[hundred] + " trăm ";
    }
    if (ten > 1) {
      res += digits[ten] + " mươi ";
      if (unit === 1) res += "mốt ";
      else if (unit === 5) res += "lăm ";
      else if (unit > 0) res += digits[unit] + " ";
    } else if (ten === 1) {
      res += "mười ";
      if (unit === 1) res += "một ";
      else if (unit === 5) res += "lăm ";
      else if (unit > 0) res += digits[unit] + " ";
    } else if (ten === 0 && unit > 0) {
      if (hundred > 0 || showZeroHundreds) res += "lẻ ";
      if (unit === 5 && (hundred > 0 || showZeroHundreds)) res += "lăm ";
      else res += digits[unit] + " ";
    }
    return res;
  }

  let numStr = "";
  let val = Math.floor(Math.abs(number));

  let billion = Math.floor(val / 1000000000);
  val %= 1000000000;
  let million = Math.floor(val / 1000000);
  val %= 1000000;
  let thousand = Math.floor(val / 1000);
  let remainder = val % 1000;

  if (billion > 0) {
    numStr += readBlock(billion, false) + "tỷ ";
  }
  if (million > 0) {
    numStr += readBlock(million, billion > 0) + "triệu, ";
  }
  if (thousand > 0) {
    numStr += readBlock(thousand, billion > 0 || million > 0) + "ngàn ";
  }
  if (remainder > 0) {
    numStr += readBlock(remainder, billion > 0 || million > 0 || thousand > 0);
  }

  numStr = numStr.trim();
  if (numStr.endsWith(',')) numStr = numStr.slice(0, -1);
  numStr += " đồng chẵn.";

  return numStr.charAt(0).toUpperCase() + numStr.slice(1);
}

function showLoading(show) {
  const loader = document.getElementById('global-loader');
  if (loader) {
    if (show) loader.classList.remove('hidden');
    else loader.classList.add('hidden');
  }
}

function formatDateString(dateStr) {
  if (!dateStr) return '';
  dateStr = String(dateStr).trim();
  
  if (dateStr.includes('T')) {
    try {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${d}/${m}/${y}`;
      }
    } catch(e) {}
  }
  
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return dateStr;
    }
  }
  
  if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }
  }
  
  return dateStr;
}
