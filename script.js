// Мэдээлэл холбоо сүлжээний админ панелийн JavaScript логик
// ========================================================

// Анхны өгөгдөл
let websites = [];
let activityLog = [];
let monitoring = false;
let monitorInterval = 30;
let currentEditId = null;

// Local Storage-д өгөгдөл хадгалах функц
function saveToStorage() {
  localStorage.setItem('networkholboo_websites', JSON.stringify(websites));
  localStorage.setItem('networkholboo_log', JSON.stringify(activityLog));
  updateStats();
}

// Local Storage-с өгөгдөл авах функц
function loadFromStorage() {
  const saved_websites = localStorage.getItem('networkholboo_websites');
  const saved_log = localStorage.getItem('networkholboo_log');
  
  if (saved_websites) websites = JSON.parse(saved_websites);
  if (saved_log) activityLog = JSON.parse(saved_log);
  
  renderWebsites();
  updateStats();
}

// Үйл явцын лог нэмэх
function addLog(action, details = '') {
  const now = new Date();
  const time = now.toLocaleTimeString('mn-MN');
  const entry = {
    time: time,
    action: action,
    details: details
  };
  
  activityLog.unshift(entry);
  if (activityLog.length > 100) activityLog.pop();
  saveToStorage();
}

// Сайтуудын статистик шинэчлэх
function updateStats() {
  const total = websites.length;
  const active = websites.filter(w => w.status === 'online').length;
  const warning = websites.filter(w => w.status === 'warning').length;
  const inactive = websites.filter(w => w.status === 'offline').length;
  
  document.getElementById('totalWebsites').textContent = total;
  document.getElementById('activeWebsites').textContent = active;
  document.getElementById('warningWebsites').textContent = warning;
  document.getElementById('inactiveWebsites').textContent = inactive;
  
  updateRecentActivity();
}

// Сүүлийн үйлдлүүдийг харуулах
function updateRecentActivity() {
  const container = document.getElementById('recentActivity');
  const recent = activityLog.slice(0, 10);
  
  if (recent.length === 0) {
    container.innerHTML = '<p style="color: #999;">Үйлдэл байхгүй</p>';
    return;
  }
  
  container.innerHTML = recent.map(log => `
    <div style="padding: 10px; border-bottom: 1px solid #eee; font-size: 0.9em;">
      <strong>${log.time}</strong> - ${log.action}
      ${log.details ? `<span style="color: #999;"> (${log.details})</span>` : ''}
    </div>
  `).join('');
}

// Сайт үүсгэх функц
function createWebsite(name, url, description) {
  const website = {
    id: Date.now(),
    name: name,
    url: url,
    description: description,
    status: 'checking',
    checkCount: 0,
    uptime: 100,
    lastCheck: '-',
    createdAt: new Date().toLocaleString('mn-MN')
  };
  
  websites.push(website);
  addLog('Сайт нэмэв', name);
  saveToStorage();
  renderWebsites();
}

// Сайт засах функц
function updateWebsite(id, name, url, description) {
  const website = websites.find(w => w.id === id);
  if (website) {
    website.name = name;
    website.url = url;
    website.description = description;
    addLog('Сайт засав', name);
    saveToStorage();
    renderWebsites();
  }
}

// Сайт хасах функц
function deleteWebsite(id) {
  const website = websites.find(w => w.id === id);
  if (website) {
    websites = websites.filter(w => w.id !== id);
    addLog('Сайт хасав', website.name);
    saveToStorage();
    renderWebsites();
  }
}

// Сайтуудыг эргүүлэн дүрслэх
function renderWebsites() {
  const container = document.getElementById('websitesList');
  const searchText = document.getElementById('searchInput').value.toLowerCase();
  const filterStatus = document.getElementById('filterStatus').value;
  
  let filtered = websites.filter(w => {
    const matchSearch = w.name.toLowerCase().includes(searchText) || 
                       w.url.toLowerCase().includes(searchText);
    const matchFilter = filterStatus === '' || w.status === filterStatus;
    return matchSearch && matchFilter;
  });
  
  if (filtered.length === 0) {
    container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 50px; color: #999;"><p style="font-size: 1.2em;">📭 Сайт байхгүй байна</p></div>';
    return;
  }
  
  container.innerHTML = filtered.map(w => `
    <div class="website-card">
      <div class="website-card-header">
        <h3 class="website-name">${w.name}</h3>
        <span class="status-badge status-${w.status}">${getStatusBadge(w.status)}</span>
      </div>
      <a href="${w.url}" class="website-url" target="_blank">🔗 ${w.url}</a>
      <p class="website-description">${w.description}</p>
      <div class="website-stats">
        <div class="website-stat">
          <div style="font-size: 0.8em; color: #999;">Шалгалт</div>
          <div class="website-stat-value">${w.checkCount}</div>
        </div>
        <div class="website-stat">
          <div style="font-size: 0.8em; color: #999;">Ажилласан</div>
          <div class="website-stat-value">${w.uptime.toFixed(1)}%</div>
        </div>
        <div class="website-stat">
          <div style="font-size: 0.8em; color: #999;">Сүүлийн</div>
          <div class="website-stat-value">${w.lastCheck}</div>
        </div>
      </div>
      <div class="website-actions">
        <button class="edit-btn" onclick="editWebsite(${w.id})">✏️ Засах</button>
        <button class="check-btn" onclick="checkWebsite(${w.id})">🔍 Шалгах</button>
        <button class="delete-btn" onclick="confirmDelete(${w.id})">🗑️ Хасах</button>
      </div>
    </div>
  `).join('');
}

// Статусын бадж авах
function getStatusBadge(status) {
  const badges = {
    'online': '✅ Идэвхтэй',
    'offline': '❌ Идэвхгүй',
    'warning': '⚠️ Анхаарах',
    'checking': '⏳ Шалгаж байна'
  };
  return badges[status] || status;
}

// Сайтын статус шалгах
function checkWebsite(id) {
  const website = websites.find(w => w.id === id);
  if (!website) return;
  
  website.status = 'checking';
  renderWebsites();
  
  // Симуляцион: 1-3 сек хүлээх
  setTimeout(() => {
    const isOnline = Math.random() > 0.3; // 70% онлайн
    website.status = isOnline ? 'online' : (Math.random() > 0.5 ? 'warning' : 'offline');
    website.checkCount++;
    website.lastCheck = new Date().toLocaleTimeString('mn-MN');
    website.uptime = Math.max(95 + Math.random() * 5, website.uptime - 2);
    
    saveToStorage();
    renderWebsites();
    addLog('Сайтыг шалгав', `${website.name} - ${website.status}`);
  }, 1000 + Math.random() * 2000);
}

// Сайтыг засахын тулд нээх
function editWebsite(id) {
  currentEditId = id;
  const website = websites.find(w => w.id === id);
  
  document.getElementById('modalTitle').textContent = 'Сайтыг засах';
  document.getElementById('websiteName').value = website.name;
  document.getElementById('websiteUrl').value = website.url;
  document.getElementById('websiteDescription').value = website.description;
  
  document.getElementById('websiteModal').classList.add('show');
}

// Сайтыг хасахыг баталгаажуулах
function confirmDelete(id) {
  const website = websites.find(w => w.id === id);
  document.getElementById('confirmTitle').textContent = 'Сайтыг хасах';
  document.getElementById('confirmMessage').textContent = `"${website.name}" сайтыг үнэхээр хасах уу?`;
  
  document.getElementById('confirmYes').onclick = () => {
    deleteWebsite(id);
    document.getElementById('confirmModal').classList.remove('show');
  };
  
  document.getElementById('confirmModal').classList.add('show');
}

// Таб сэлгэх
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', function(e) {
    e.preventDefault();
    const tabName = this.getAttribute('data-tab');
    
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    
    document.getElementById(tabName).classList.add('active');
    this.classList.add('active');
  });
});

// Сайт нэмэх форм
document.getElementById('websiteForm').addEventListener('submit', function(e) {
  e.preventDefault();
  
  const name = document.getElementById('websiteName').value.trim();
  const url = document.getElementById('websiteUrl').value.trim();
  const description = document.getElementById('websiteDescription').value.trim();
  
  if (!name || !url) {
    alert('Нэр болон URL оруулна уу!');
    return;
  }
  
  if (currentEditId) {
    updateWebsite(currentEditId, name, url, description);
    currentEditId = null;
  } else {
    createWebsite(name, url, description);
  }
  
  document.getElementById('websiteModal').classList.remove('show');
  this.reset();
});

// Сайт нэмэх товчны сонсогч
document.getElementById('addWebsiteBtn').addEventListener('click', () => {
  currentEditId = null;
  document.getElementById('modalTitle').textContent = 'Сайт нэмэх';
  document.getElementById('websiteForm').reset();
  document.getElementById('websiteModal').classList.add('show');
});

// Modal хаах
document.getElementById('closeModal').addEventListener('click', () => {
  document.getElementById('websiteModal').classList.remove('show');
});

document.getElementById('cancelBtn').addEventListener('click', () => {
  document.getElementById('websiteModal').classList.remove('show');
});

document.getElementById('confirmNo').addEventListener('click', () => {
  document.getElementById('confirmModal').classList.remove('show');
});

// Хайх функц
document.getElementById('searchInput').addEventListener('input', renderWebsites);
document.getElementById('filterStatus').addEventListener('change', renderWebsites);

// Одоогийн цагийн сонсогч
setInterval(() => {
  const now = new Date();
  document.getElementById('currentTime').textContent = now.toLocaleTimeString('mn-MN');
}, 1000);

// Мониторингийг эхлүүлэх
document.getElementById('startMonitorBtn').addEventListener('click', () => {
  monitoring = true;
  document.getElementById('startMonitorBtn').style.display = 'none';
  document.getElementById('stopMonitorBtn').style.display = 'inline-block';
  document.getElementById('monitorStatus').textContent = '🟢 Идэвхтэй';
  document.getElementById('monitorStatus').classList.add('running');
  
  addLog('Мониторинг эхлүүлэв');
  monitorLoop();
});

// Мониторингийг зогсоох
document.getElementById('stopMonitorBtn').addEventListener('click', () => {
  monitoring = false;
  document.getElementById('startMonitorBtn').style.display = 'inline-block';
  document.getElementById('stopMonitorBtn').style.display = 'none';
  document.getElementById('monitorStatus').textContent = '🔴 Идэвхгүй';
  document.getElementById('monitorStatus').classList.remove('running');
  
  addLog('Мониторинг зогсоов');
});

// Мониторингийн үндсэн давталт
function monitorLoop() {
  if (!monitoring) return;
  
  websites.forEach(website => {
    checkWebsite(website.id);
  });
  
  setTimeout(monitorLoop, monitorInterval * 1000);
}

// Логог цэвэрлэх
document.getElementById('clearLogBtn').addEventListener('click', () => {
  document.getElementById('monitorLog').innerHTML = '';
  addLog('Хяналтын лог цэвэрлэв');
});

// Тохиргоо хадгалах
document.getElementById('saveSettingsBtn').addEventListener('click', () => {
  monitorInterval = parseInt(document.getElementById('monitorInterval').value) || 30;
  alert('✅ Тохиргоо хадгалагдлаа!');
  addLog('Тохиргоо хадгалав');
});

document.getElementById('resetSettingsBtn').addEventListener('click', () => {
  document.getElementById('monitorInterval').value = 30;
  monitorInterval = 30;
  alert('↺ Тохиргоо эргүүлэгдлээ!');
});

// Гарах товчны сонсогч
document.querySelector('.logout-btn').addEventListener('click', () => {
  if (confirm('Үнэхээр гарах уу?')) {
    alert('👋 Баяр уяа!');
  }
});

// Modal эконо нээлээ
document.getElementById('websiteModal').addEventListener('click', function(e) {
  if (e.target === this) {
    this.classList.remove('show');
  }
});

document.getElementById('confirmModal').addEventListener('click', function(e) {
  if (e.target === this) {
    this.classList.remove('show');
  }
});

// Систем эхлүүлэх
document.addEventListener('DOMContentLoaded', () => {
  loadFromStorage();
});
