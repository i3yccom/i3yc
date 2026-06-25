const API_BASE = '/api';
let authToken = localStorage.getItem('admin_token');
let siteLogoUrl = null;

// ============ Auth ============
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  
  try {
    const res = await fetch(`${API_BASE}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    const data = await res.json();
    if (res.ok) {
      authToken = data.token;
      localStorage.setItem('admin_token', authToken);
      document.getElementById('loginPage').classList.add('hidden');
      document.getElementById('adminDashboard').classList.remove('hidden');
      document.getElementById('currentUsername').value = data.username;
      loadAllData();
    } else {
      alert(data.error || '登录失败');
    }
  } catch (err) {
    alert('登录失败: ' + err.message);
  }
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('admin_token');
  authToken = null;
  document.getElementById('adminDashboard').classList.add('hidden');
  document.getElementById('loginPage').classList.remove('hidden');
});

// ============ Navigation ============
document.querySelectorAll('.sidebar-nav .nav-link').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const section = link.dataset.section;
    document.querySelectorAll('.sidebar-nav .nav-link').forEach(l => l.classList.remove('active'));
    link.classList.add('active');
    document.querySelectorAll('.main-content .section').forEach(s => s.classList.remove('active'));
    document.getElementById(`${section}Section`).classList.add('active');
  });
});

// ============ API Helper ============
async function apiCall(endpoint, options = {}) {
  const headers = { 'Authorization': `Bearer ${authToken}` };
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: { ...headers, ...options.headers }
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ============ File Upload Helper ============
async function uploadFile(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${authToken}` },
    body: formData
  });
  
  const contentType = res.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    const text = await res.text();
    throw new Error(text.includes('Only image and video') ? '只支持图片和视频文件' : '上传失败，服务器返回异常');
  }
  
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  return data.url;
}

// ============ Portfolio Management ============
const portfolioModal = document.getElementById('portfolioModal');
const portfolioForm = document.getElementById('portfolioForm');

document.getElementById('addPortfolioBtn').addEventListener('click', () => {
  portfolioForm.reset();
  document.getElementById('portfolioId').value = '';
  const preview = document.getElementById('portfolioImagePreview');
  preview.classList.add('hidden');
  preview.src = '';
  document.getElementById('portfolioPreviewPlaceholder').style.display = 'block';
  document.getElementById('portfolioCurrentImages').innerHTML = '';
  document.getElementById('portfolioModalTitle').textContent = '新增作品';
  loadCategoryOptions(document.getElementById('portfolioCategory'));
  portfolioModal.classList.add('active');
});

function closePortfolioModal() { if (portfolioModal) portfolioModal.classList.remove('active'); }
function closeGalleryModal() { if (galleryModal) galleryModal.classList.remove('active'); }
portfolioModal.querySelector('.modal-close').addEventListener('click', closePortfolioModal);
portfolioModal.addEventListener('click', (e) => { if (e.target === portfolioModal) closePortfolioModal(); });
portfolioModal.querySelector('.modal-cancel').addEventListener('click', closePortfolioModal);

portfolioForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('portfolioId').value;
  const title = document.getElementById('portfolioTitle').value;
  const category = document.getElementById('portfolioCategory').value;
  const description = document.getElementById('portfolioDescription').value;
  const imageFiles = document.getElementById('portfolioImage').files;
  
  try {
    let portfolioId = id;
    if (!portfolioId) {
      const res = await apiCall('/portfolios', {
        method: 'POST',
        body: JSON.stringify({ title, category, description })
      });
      portfolioId = res.id;
    } else {
      await apiCall(`/portfolios/${portfolioId}`, {
        method: 'PUT',
        body: JSON.stringify({ title, category, description })
      });
    }
    
    if (imageFiles.length > 0) {
      for (let i = 0; i < imageFiles.length; i++) {
        const formData = new FormData();
        formData.append('image', imageFiles[i]);
        formData.append('sort_order', i);
        await fetch(`${API_BASE}/portfolios/${portfolioId}/images`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${authToken}` },
          body: formData
        });
      }
    }
    
    closePortfolioModal();
    loadPortfolios();
  } catch (err) {
    alert('操作失败: ' + err.message);
  }
});

async function loadCategoryOptions(selectEl) {
  try {
    const cats = await apiCall('/categories');
    selectEl.innerHTML = cats.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
  } catch (e) {
    selectEl.innerHTML = `<option value="UI/UX Design">UI/UX Design</option><option value="视觉设计">视觉设计</option><option value="数据可视化">数据可视化</option><option value="画册设计">画册设计</option>`;
  }
}

async function loadPortfolios() {
  const tbody = document.getElementById('portfolioTableBody');
  if (!tbody) return;
  try {
    const items = await apiCall('/portfolios');
    if (items.length === 0) {
      tbody.innerHTML = `<tr class="empty-row"><td colspan="5"><div class="empty-state"><h3>暂无作品</h3></div></td></tr>`;
      return;
    }
    tbody.innerHTML = items.map(item => `
      <tr>
        <td><strong>${escapeHtml(item.title)}</strong></td>
        <td><span class="badge">${escapeHtml(item.category)}</span></td>
        <td class="icon-cell">${item.image_url ? `<img src="${item.image_url}" alt="">` : '—'}</td>
        <td>${formatDate(item.created_at)}</td>
        <td class="actions-cell">
          <button class="btn btn-secondary btn-sm" onclick="editPortfolio(${item.id})">编辑</button>
          <button class="btn btn-danger btn-sm" onclick="deletePortfolio(${item.id})">删除</button>
        </td>
      </tr>
    `).join('');
  } catch (err) { console.error('Failed to load portfolios:', err); }
}

async function editPortfolio(id) {
  try {
    const item = await apiCall(`/portfolios/${id}`);
    document.getElementById('portfolioId').value = item.id;
    document.getElementById('portfolioTitle').value = item.title;
    await loadCategoryOptions(document.getElementById('portfolioCategory'));
    document.getElementById('portfolioCategory').value = item.category;
    document.getElementById('portfolioDescription').value = item.description || '';
    document.getElementById('portfolioModalTitle').textContent = '编辑作品';

    const preview = document.getElementById('portfolioImagePreview');
    const placeholder = document.getElementById('portfolioPreviewPlaceholder');
    if (item.image_url) {
      preview.src = item.image_url;
      preview.classList.remove('hidden');
      if (placeholder) placeholder.style.display = 'none';
    } else {
      preview.classList.add('hidden');
      preview.src = '';
      if (placeholder) placeholder.style.display = 'block';
    }

    await loadPortfolioImages(id);
    portfolioModal.classList.add('active');
  } catch (err) { alert('加载失败: ' + err.message); }
}

async function deletePortfolio(id) {
  if (!confirm('确定要删除这个作品吗？')) return;
  try {
    await apiCall(`/portfolios/${id}`, { method: 'DELETE' });
    loadPortfolios();
  } catch (err) { alert('删除失败: ' + err.message); }
}

// ============ Category Management ============
const categoryModal = document.getElementById('categoryModal');
const categoryForm = document.getElementById('categoryForm');

document.getElementById('addCategoryBtn').addEventListener('click', () => {
  categoryForm.reset();
  document.getElementById('categoryId').value = '';
  document.getElementById('categoryModalTitle').textContent = '新增分类';
  categoryModal.classList.add('active');
});

function closeCategoryModal() { categoryModal.classList.remove('active'); }
categoryModal.querySelector('.modal-close').addEventListener('click', closeCategoryModal);
categoryModal.addEventListener('click', (e) => { if (e.target === categoryModal) closeCategoryModal(); });
categoryModal.querySelector('.modal-cancel').addEventListener('click', closeCategoryModal);

categoryForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('categoryId').value;
  const name = document.getElementById('categoryName').value;
  const sort_order = parseInt(document.getElementById('categorySort').value) || 0;
  
  try {
    if (id) {
      await apiCall(`/categories/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ name, sort_order })
      });
    } else {
      await apiCall('/categories', {
        method: 'POST',
        body: JSON.stringify({ name, sort_order })
      });
    }
    closeCategoryModal();
    loadCategories();
  } catch (err) { alert('操作失败: ' + err.message); }
});

async function loadCategories() {
  const tbody = document.getElementById('categoryTableBody');
  if (!tbody) return;
  try {
    const items = await apiCall('/categories');
    if (items.length === 0) {
      tbody.innerHTML = `<tr class="empty-row"><td colspan="4"><div class="empty-state"><h3>暂无分类</h3></div></td></tr>`;
      return;
    }
    tbody.innerHTML = items.map(item => `
      <tr>
        <td><strong>${escapeHtml(item.name)}</strong></td>
        <td>${item.sort_order}</td>
        <td>${formatDate(item.created_at)}</td>
        <td class="actions-cell">
          <button class="btn btn-secondary btn-sm" onclick="editCategory(${item.id})">编辑</button>
          <button class="btn btn-danger btn-sm" onclick="deleteCategory(${item.id})">删除</button>
        </td>
      </tr>
    `).join('');
  } catch (err) { console.error('Failed to load categories:', err); }
}

async function editCategory(id) {
  try {
    const items = await apiCall('/categories');
    const item = items.find(c => c.id === id);
    if (!item) return;
    document.getElementById('categoryId').value = item.id;
    document.getElementById('categoryName').value = item.name;
    document.getElementById('categorySort').value = item.sort_order || 0;
    document.getElementById('categoryModalTitle').textContent = '编辑分类';
    categoryModal.classList.add('active');
  } catch (err) { alert('加载失败: ' + err.message); }
}

async function deleteCategory(id) {
  if (!confirm('确定要删除这个分类吗？')) return;
  try {
    await apiCall(`/categories/${id}`, { method: 'DELETE' });
    loadCategories();
  } catch (err) { alert('删除失败: ' + err.message); }
}

// ============ Hero Image Management ============
const heroModal = document.getElementById('heroModal');
const heroForm = document.getElementById('heroForm');

document.getElementById('addHeroBtn').addEventListener('click', () => {
  heroForm.reset();
  document.getElementById('heroId').value = '';
  document.getElementById('heroImagePreview').classList.add('hidden');
  document.getElementById('heroModalTitle').textContent = '添加轮播图';
  heroModal.classList.add('active');
});

function closeHeroModal() { heroModal.classList.remove('active'); }
heroModal.querySelector('.modal-close').addEventListener('click', closeHeroModal);
heroModal.addEventListener('click', (e) => { if (e.target === heroModal) closeHeroModal(); });
heroModal.querySelector('.modal-cancel').addEventListener('click', closeHeroModal);

heroForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('heroId').value;
  const mediaType = document.getElementById('heroMediaType').value;
  const imageFile = document.getElementById('heroImageUpload').files[0];
  const sort_order = parseInt(document.getElementById('heroSort').value) || 0;

  if (!imageFile && !id) {
    alert('请选择文件');
    return;
  }

  try {
    let image_url = null;
    if (imageFile) image_url = await uploadFile(imageFile);

    if (id) {
      await apiCall(`/hero-images/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ image_url, media_type: mediaType, sort_order })
      });
    } else {
      await apiCall('/hero-images', {
        method: 'POST',
        body: JSON.stringify({ image_url, media_type: mediaType, sort_order })
      });
    }
    closeHeroModal();
    loadHeroImages();
  } catch (err) { alert('操作失败: ' + err.message); }
});

async function loadHeroImages() {
  const tbody = document.getElementById('heroTableBody');
  if (!tbody) return;
  try {
    const items = await apiCall('/hero-images');
    if (items.length === 0) {
      tbody.innerHTML = `<tr class="empty-row"><td colspan="5"><div class="empty-state"><h3>暂无媒体</h3></div></td></tr>`;
      return;
    }
    tbody.innerHTML = items.map(item => `
      <tr>
        <td class="icon-cell">${item.media_type === 'video' ? '🎬' : '<img src="' + item.image_url + '" alt="" style="width:80px;height:50px;object-fit:cover;border-radius:6px;">'}</td>
        <td><span class="badge">${item.media_type === 'video' ? '视频' : '图片'}</span></td>
        <td>${item.sort_order}</td>
        <td>${formatDate(item.created_at)}</td>
        <td class="actions-cell">
          <button class="btn btn-danger btn-sm" onclick="deleteHeroImage(${item.id})">删除</button>
        </td>
      </tr>
    `).join('');
  } catch (err) { console.error('Failed to load hero images:', err); }
}

async function deleteHeroImage(id) {
  if (!confirm('确定要删除这个媒体吗？')) return;
  try {
    await apiCall(`/hero-images/${id}`, { method: 'DELETE' });
    loadHeroImages();
  } catch (err) { alert('删除失败: ' + err.message); }
}

// ============ Resource Management ============
const resourceModal = document.getElementById('resourceModal');
const resourceForm = document.getElementById('resourceForm');

document.getElementById('addResourceBtn').addEventListener('click', () => {
  resourceForm.reset();
  document.getElementById('resourceId').value = '';
  document.getElementById('resourceIconPreview').classList.add('hidden');
  document.getElementById('resourceModalTitle').textContent = '新增资源';
  resourceModal.classList.add('active');
});

function closeResourceModal() { resourceModal.classList.remove('active'); }
resourceModal.querySelector('.modal-close').addEventListener('click', closeResourceModal);
resourceModal.addEventListener('click', (e) => { if (e.target === resourceModal) closeResourceModal(); });
resourceModal.querySelector('.modal-cancel').addEventListener('click', closeResourceModal);

resourceForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('resourceId').value;
  const title = document.getElementById('resourceTitle').value;
  const url = document.getElementById('resourceUrl').value;
  const description = document.getElementById('resourceDescription').value;
  const iconFile = document.getElementById('resourceIcon').files[0];
  
  try {
    let icon_url = null;
    if (iconFile) icon_url = await uploadFile(iconFile);
    
    const formData = new FormData();
    formData.append('title', title);
    formData.append('url', url);
    formData.append('description', description);
    if (iconFile) formData.append('icon', iconFile);
    
    if (id) {
      const res = await fetch(`${API_BASE}/resources/${id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${authToken}` },
        body: formData
      });
      if (!res.ok) throw new Error('Update failed');
    } else {
      const res = await fetch(`${API_BASE}/resources`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` },
        body: formData
      });
      if (!res.ok) throw new Error('Create failed');
    }
    
    closeResourceModal();
    loadResources();
  } catch (err) { alert('操作失败: ' + err.message); }
});

async function loadResources() {
  const tbody = document.getElementById('resourceTableBody');
  if (!tbody) return;
  try {
    const items = await apiCall('/resources');
    if (items.length === 0) {
      tbody.innerHTML = `<tr class="empty-row"><td colspan="5"><div class="empty-state"><h3>暂无资源</h3></div></td></tr>`;
      return;
    }
    tbody.innerHTML = items.map(item => `
      <tr>
        <td><strong>${escapeHtml(item.title)}</strong></td>
        <td><a href="${escapeHtml(item.url)}" target="_blank" style="color:var(--primary);font-size:13px">${escapeHtml(item.url)}</a></td>
        <td class="icon-cell">${item.icon_url ? `<img src="${item.icon_url}" alt="">` : '—'}</td>
        <td style="font-size:13px;color:#666;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(item.description) || ''}</td>
        <td class="actions-cell">
          <button class="btn btn-secondary btn-sm" onclick="editResource(${item.id})">编辑</button>
          <button class="btn btn-danger btn-sm" onclick="deleteResource(${item.id})">删除</button>
        </td>
      </tr>
    `).join('');
  } catch (err) { console.error('Failed to load resources:', err); }
}

async function editResource(id) {
  try {
    const item = await apiCall(`/resources/${id}`);
    document.getElementById('resourceId').value = item.id;
    document.getElementById('resourceTitle').value = item.title;
    document.getElementById('resourceUrl').value = item.url;
    document.getElementById('resourceDescription').value = item.description || '';
    document.getElementById('resourceModalTitle').textContent = '编辑资源';
    const preview = document.getElementById('resourceIconPreview');
    if (item.icon_url) {
      preview.src = item.icon_url;
      preview.classList.remove('hidden');
    }
    resourceModal.classList.add('active');
  } catch (err) { alert('加载失败: ' + err.message); }
}

async function deleteResource(id) {
  if (!confirm('确定要删除这个资源吗？')) return;
  try {
    await apiCall(`/resources/${id}`, { method: 'DELETE' });
    loadResources();
  } catch (err) { alert('删除失败: ' + err.message); }
}

// ============ Social Links Management ============
const socialModal = document.getElementById('socialModal');
const socialForm = document.getElementById('socialForm');

document.getElementById('addSocialBtn').addEventListener('click', () => {
  socialForm.reset();
  document.getElementById('socialId').value = '';
  document.getElementById('socialModalTitle').textContent = '添加链接';
  socialModal.classList.add('active');
});

function closeSocialModal() { socialModal.classList.remove('active'); }
socialModal.querySelector('.modal-close').addEventListener('click', closeSocialModal);
socialModal.addEventListener('click', (e) => { if (e.target === socialModal) closeSocialModal(); });
socialModal.querySelector('.modal-cancel').addEventListener('click', closeSocialModal);

socialForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('socialId').value;
  const platform = document.getElementById('socialPlatform').value;
  const url = document.getElementById('socialUrl').value;
  const iconFile = document.getElementById('socialIcon').files[0];

  try {
    let icon_url = null;
    if (iconFile) icon_url = await uploadFile(iconFile);

    const body = { platform, url };
    if (icon_url) body.icon_url = icon_url;

    if (id) {
      await apiCall(`/social-links/${id}`, {
        method: 'PUT',
        body: JSON.stringify(body)
      });
    } else {
      await apiCall('/social-links', {
        method: 'POST',
        body: JSON.stringify(body)
      });
    }

    closeSocialModal();
    loadSocialLinks();
  } catch (err) { alert('操作失败: ' + err.message); }
});

async function loadSocialLinks() {
  const tbody = document.getElementById('socialTableBody');
  if (!tbody) return;
  try {
    const links = await apiCall('/social-links');
    if (links.length === 0) {
      tbody.innerHTML = `<tr class="empty-row"><td colspan="4"><div class="empty-state"><h3>暂无链接</h3></div></td></tr>`;
      return;
    }
    tbody.innerHTML = links.map(l => `
      <tr>
        <td><strong>${escapeHtml(l.platform)}</strong></td>
        <td><a href="${escapeHtml(l.url)}" target="_blank" style="color:var(--primary);font-size:13px">${escapeHtml(l.url)}</a></td>
        <td class="icon-cell">${l.icon_url ? `<img src="${l.icon_url}" alt="">` : `<span style="font-size:18px">${getPlatformEmoji(l.platform)}</span>`}</td>
        <td class="actions-cell">
          <button class="btn btn-secondary btn-sm" onclick="editSocialLink(${l.id})">编辑</button>
          <button class="btn btn-danger btn-sm" onclick="deleteSocialLink(${l.id})">删除</button>
        </td>
      </tr>
    `).join('');
  } catch (err) { console.error('Failed to load social links:', err); }
}

function getPlatformEmoji(platform) {
  const map = { '小红书': '📕', '抖音': '🎵', '视频号': '📺', '微信': '💬' };
  return map[platform] || '🔗';
}

async function editSocialLink(id) {
  try {
    const l = await apiCall(`/social-links/${id}`);
    document.getElementById('socialId').value = l.id;
    document.getElementById('socialPlatform').value = l.platform;
    document.getElementById('socialUrl').value = l.url;
    document.getElementById('socialModalTitle').textContent = '编辑链接';
    socialModal.classList.add('active');
  } catch (err) { alert('加载失败: ' + err.message); }
}

async function deleteSocialLink(id) {
  if (!confirm('确定要删除这个链接吗？')) return;
  try {
    await apiCall(`/social-links/${id}`, { method: 'DELETE' });
    loadSocialLinks();
  } catch (err) { alert('删除失败: ' + err.message); }
}

// ============ WeChat QR Management ============
document.getElementById('saveWechatQRBtn').addEventListener('click', async () => {
  const file = document.getElementById('wechatQRUpload').files[0];
  const desc = document.getElementById('wechatQRDesc').value;
  
  try {
    let qr_url = null;
    if (file) qr_url = await uploadFile(file);
    
    const body = {};
    if (qr_url) body.qr_url = qr_url;
    if (desc) body.description = desc;
    
    await apiCall('/admin/wechat-qr', { method: 'POST', body: JSON.stringify(body) });
    alert('微信二维码保存成功');
    loadWechatQR();
  } catch (err) {
    alert('保存失败: ' + err.message);
  }
});

async function loadWechatQR() {
  try {
    const data = await apiCall('/settings/wechat-qr');
    const img = document.getElementById('currentQRImg');
    img.src = data.qr_url || 'assets/images/wechat.png';
    document.getElementById('wechatQRDesc').value = data.description || '';
  } catch (err) { /* use default */ }
}

document.getElementById('deleteQRBtn').addEventListener('click', async () => {
  if (!confirm('确定要删除微信二维码吗？')) return;
  try {
    await apiCall('/admin/wechat-qr', { 
      method: 'POST', 
      body: JSON.stringify({ qr_url: '', description: '' }) 
    });
    alert('删除成功');
    loadWechatQR();
  } catch (err) { alert('删除失败: ' + err.message); }
});

// ============ Site Config Management ============
document.getElementById('saveSiteConfigBtn').addEventListener('click', async () => {
  const site_name = document.getElementById('siteNameInput').value;
  const logoFile = document.getElementById('siteLogoUpload').files[0];
  
  try {
    let site_logo_url = null;
    if (logoFile) site_logo_url = await uploadFile(logoFile);
    
    const body = {};
    if (site_name) body.site_name = site_name;
    if (site_logo_url) body.site_logo_url = site_logo_url;
    
    if (Object.keys(body).length === 0) {
      alert('请填写要修改的内容');
      return;
    }
    
    await apiCall('/admin/site-settings', { method: 'POST', body: JSON.stringify(body) });
    alert('网站设置保存成功');
    loadSiteConfig();
  } catch (err) {
    alert('保存失败: ' + err.message);
  }
});

async function loadSiteConfig() {
  try {
    const data = await apiCall('/settings/site');
    document.getElementById('siteNameInput').value = data.site_name || 'Harrison';
    document.getElementById('currentLogoImg').src = data.site_logo_url || 'assets/images/logo.png';
    siteLogoUrl = data.site_logo_url || null;
  } catch (err) { /* use defaults */ }
}

// ============ Settings ============
document.getElementById('changePasswordBtn').addEventListener('click', async () => {
  const newPassword = document.getElementById('newPassword').value;
  if (!newPassword) { alert('请输入新密码'); return; }
  
  try {
    const res = await fetch(`${API_BASE}/admin/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
      body: JSON.stringify({ newPassword })
    });
    const data = await res.json();
    if (res.ok) {
      alert('密码修改成功');
      document.getElementById('newPassword').value = '';
    } else {
      alert(data.error || '修改失败');
    }
  } catch (err) { alert('修改失败: ' + err.message); }
});

// ============ Image Preview ============
document.querySelectorAll('input[type="file"]').forEach(input => {
  input.addEventListener('change', function() {
    const preview = this.closest('.form-group').querySelector('.image-preview');
    if (preview && this.files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => { preview.src = e.target.result; preview.classList.remove('hidden'); };
      reader.readAsDataURL(this.files[0]);
    }
  });
});

// ============ Gallery Management ============
const galleryModal = document.getElementById('galleryModal');
const galleryForm = document.getElementById('galleryForm');

document.getElementById('addGalleryBtn').addEventListener('click', () => {
  galleryForm.reset();
  document.getElementById('galleryId').value = '';
  const preview = document.getElementById('galleryImagePreview');
  preview.classList.add('hidden');
  preview.src = '';
  const placeholder = document.getElementById('galleryPreviewPlaceholder');
  if (placeholder) placeholder.style.display = 'block';
  document.getElementById('galleryModalTitle').textContent = '新增资料';
  galleryModal.classList.add('active');
});

galleryModal.querySelector('.modal-close').addEventListener('click', closeGalleryModal);
galleryModal.addEventListener('click', (e) => { if (e.target === galleryModal) closeGalleryModal(); });
galleryModal.querySelector('.modal-cancel').addEventListener('click', closeGalleryModal);

galleryForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('galleryId').value;
  const title = document.getElementById('galleryTitle').value;
  const description = document.getElementById('galleryDescription').value;
  const imageFiles = document.getElementById('galleryImageUpload').files;
  
  try {
    let galleryId = id;
    if (!galleryId) {
      const res = await apiCall('/galleries', {
        method: 'POST',
        body: JSON.stringify({ title, description })
      });
      galleryId = res.id;
    } else {
      await apiCall(`/galleries/${galleryId}`, {
        method: 'PUT',
        body: JSON.stringify({ title, description })
      });
    }
    
    if (imageFiles.length > 0) {
      for (let i = 0; i < imageFiles.length; i++) {
        const formData = new FormData();
        formData.append('image', imageFiles[i]);
        formData.append('sort_order', i);
        await fetch(`${API_BASE}/galleries/${galleryId}/images`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${authToken}` },
          body: formData
        });
      }
    }
    
    closeGalleryModal();
    loadGalleries();
  } catch (err) { alert('操作失败: ' + err.message); }
});

async function loadGalleries() {
  const tbody = document.getElementById('galleryTableBody');
  if (!tbody) return;
  try {
    const items = await apiCall('/galleries');
    if (items.length === 0) {
      tbody.innerHTML = `<tr class="empty-row"><td colspan="4"><div class="empty-state"><h3>暂无资料</h3></div></td></tr>`;
      return;
    }
    tbody.innerHTML = items.map(item => `
      <tr>
        <td><strong>${escapeHtml(item.title)}</strong></td>
        <td><span class="badge">${item.image_count || 0} 张</span></td>
        <td>${formatDate(item.created_at)}</td>
        <td class="actions-cell">
          <button class="btn btn-secondary btn-sm" onclick="selectGalleryForImages(${item.id})">管理图片</button>
          <button class="btn btn-secondary btn-sm" onclick="editGallery(${item.id})">编辑</button>
          <button class="btn btn-danger btn-sm" onclick="deleteGallery(${item.id})">删除</button>
        </td>
      </tr>
    `).join('');
  } catch (err) { console.error('Failed to load galleries:', err); }
}

let currentGalleryId = null;

async function selectGalleryForImages(galleryId) {
  currentGalleryId = galleryId;
  document.getElementById('addGalleryImageBtn').disabled = false;
  document.getElementById('galleryImagesHint').textContent = '当前管理资料图片：ID ' + galleryId;
  await loadGalleryImages(galleryId);
}

async function loadGalleryImages(galleryId) {
  const container = document.getElementById('galleryCurrentImages');
  const preview = document.getElementById('galleryImagePreview');
  const placeholder = document.getElementById('galleryPreviewPlaceholder');
  const thumbnails = document.getElementById('galleryThumbnails');
  if (!container) return;
  try {
    const res = await apiCall(`/galleries/${galleryId}/images`);
    const sorted = res.slice().sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    const first = sorted[0];
    const preview = document.getElementById('galleryImagePreview');
    const previewVideo = document.getElementById('galleryImagePreviewVideo');
    if (first && first.image_url) {
      if (preview) {
        if (first.media_type === 'video') {
          if (previewVideo) { previewVideo.src = first.image_url; previewVideo.style.display = 'block'; }
          preview.classList.add('hidden');
        } else {
          preview.src = first.image_url;
          preview.classList.remove('hidden');
          if (previewVideo) previewVideo.style.display = 'none';
        }
      }
      if (placeholder) placeholder.style.display = 'none';
    } else {
      if (preview) { preview.classList.add('hidden'); preview.src = ''; }
      if (previewVideo) { previewVideo.style.display = 'none'; previewVideo.src = ''; }
      if (placeholder) placeholder.style.display = 'block';
    }
    const rest = sorted.slice(1);
    if (rest.length === 0) {
      container.innerHTML = '';
      if (thumbnails) thumbnails.innerHTML = '';
      return;
    }
    if (thumbnails) {
      thumbnails.innerHTML = rest.map(img => {
        if (img.media_type === 'video') {
          return `<div class="thumb" onclick="selectGalleryImage(${img.id}, ${galleryId}, this)" title="视频">
            <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#f0f0f0;font-size:18px;">▶</div>
          </div>`;
        }
        return `<div class="thumb" onclick="selectGalleryImage(${img.id}, ${galleryId}, this)">
          <img src="${img.image_url}" alt="">
        </div>`;
      }).join('');
    }
    container.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(60px,1fr));gap:8px;margin-top:12px;">
        ${rest.map(img => `
          <div style="position:relative;">
            ${img.media_type === 'video'
              ? `<div style="width:100%;height:60px;display:flex;align-items:center;justify-content:center;background:#f0f0f0;border-radius:6px;border:1px solid var(--hairline);font-size:20px;">▶</div>`
              : `<img src="${img.image_url}" alt="" style="width:100%;height:60px;object-fit:cover;border-radius:6px;border:1px solid var(--hairline);">`
            }
            <button type="button" onclick="deleteGalleryImage(${img.id}, ${galleryId})" style="position:absolute;top:-6px;right:-6px;width:20px;height:20px;border-radius:50%;background:var(--primary);color:#fff;border:none;font-size:12px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;">×</button>
          </div>
        `).join('')}
      </div>
    `;
  } catch (err) { console.error('Failed to load gallery images:', err); }
}

window.selectGalleryImage = function(imageId, galleryId, thumbEl) {
  const preview = document.getElementById('galleryImagePreview');
  const previewVideo = document.getElementById('galleryImagePreviewVideo');
  const placeholder = document.getElementById('galleryPreviewPlaceholder');
  const img = thumbEl ? thumbEl.querySelector('img') : null;
  if (img && preview) {
    preview.src = img.src;
    preview.classList.remove('hidden');
    if (previewVideo) previewVideo.style.display = 'none';
    if (placeholder) placeholder.style.display = 'none';
    document.querySelectorAll('#galleryThumbnails .thumb').forEach(t => t.classList.remove('active'));
    if (thumbEl) thumbEl.classList.add('active');
  }
};

async function deleteGalleryImage(imageId, galleryId) {
  if (!confirm('确定要删除这张图片吗？')) return;
  try {
    await apiCall(`/gallery-images/${imageId}`, { method: 'DELETE' });
    loadGalleryImages(galleryId);
    loadGalleries();
  } catch (err) { alert('删除失败: ' + err.message); }
}

async function editGallery(id) {
  try {
    const item = await apiCall(`/galleries/${id}`);
    document.getElementById('galleryId').value = item.id;
    document.getElementById('galleryTitle').value = item.title;
    document.getElementById('galleryDescription').value = item.description || '';
    document.getElementById('galleryModalTitle').textContent = '编辑资料';

    const preview = document.getElementById('galleryImagePreview');
    const placeholder = document.getElementById('galleryPreviewPlaceholder');
    if (item.image_url) {
      preview.src = item.image_url;
      preview.classList.remove('hidden');
      if (placeholder) placeholder.style.display = 'none';
    } else {
      preview.classList.add('hidden');
      preview.src = '';
      if (placeholder) placeholder.style.display = 'block';
    }

    await loadGalleryImages(id);
    galleryModal.classList.add('active');
  } catch (err) { alert('加载失败: ' + err.message); }
}

// Gallery image upload via hidden file input
document.getElementById('addGalleryImageBtn').addEventListener('click', async () => {
  if (!currentGalleryId) {
    alert('请先选择一个资料项');
    return;
  }
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.multiple = true;
  input.onchange = async () => {
    const files = Array.from(input.files);
    if (files.length === 0) return;
    try {
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append('image', files[i]);
        formData.append('sort_order', i);
        await fetch(`${API_BASE}/galleries/${currentGalleryId}/images`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${authToken}` },
          body: formData
        });
      }
      alert('图片上传成功');
      loadGalleryImages(currentGalleryId);
      loadGalleries();
    } catch (err) { alert('上传失败: ' + err.message); }
  };
  input.click();
});

// ============ Portfolio Multi-Image Management ============
async function loadPortfolioImages(portfolioId) {
  try {
    const res = await apiCall(`/portfolios/${portfolioId}/images`);
    const container = document.getElementById('portfolioCurrentImages');
    const preview = document.getElementById('portfolioImagePreview');
    const placeholder = document.getElementById('portfolioPreviewPlaceholder');
    const thumbnails = document.getElementById('portfolioThumbnails');
    if (!container) return;

    if (!res || res.length === 0) {
      container.innerHTML = '';
      if (preview) { preview.classList.add('hidden'); preview.src = ''; }
      if (placeholder) placeholder.style.display = 'block';
      if (thumbnails) thumbnails.innerHTML = '';
      return;
    }

    const sorted = res.slice().sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    const first = sorted[0];
    if (preview && first && first.image_url) {
      if (first.media_type === 'video') {
        if (previewVideo) { previewVideo.src = first.image_url; previewVideo.style.display = 'block'; }
        preview.classList.add('hidden');
      } else {
        preview.src = first.image_url;
        preview.classList.remove('hidden');
        if (previewVideo) previewVideo.style.display = 'none';
      }
      if (placeholder) placeholder.style.display = 'none';
    } else {
      if (preview) { preview.classList.add('hidden'); preview.src = ''; }
      if (previewVideo) { previewVideo.style.display = 'none'; previewVideo.src = ''; }
      if (placeholder) placeholder.style.display = 'block';
    }

    const rest = sorted.slice(1);
    if (rest.length === 0) {
      container.innerHTML = '';
      if (thumbnails) thumbnails.innerHTML = '';
      return;
    }

    if (thumbnails) {
      thumbnails.innerHTML = rest.map(img => {
        if (img.media_type === 'video') {
          return `<div class="thumb" onclick="selectPortfolioImage(${img.id}, ${portfolioId}, this)" title="视频">
            <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#f0f0f0;font-size:18px;">▶</div>
          </div>`;
        }
        return `<div class="thumb" onclick="selectPortfolioImage(${img.id}, ${portfolioId}, this)">
          <img src="${img.image_url}" alt="">
        </div>`;
      }).join('');
    }

    container.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(60px,1fr));gap:8px;margin-top:12px;">
        ${rest.map(img => `
          <div style="position:relative;">
            ${img.media_type === 'video'
              ? `<div style="width:100%;height:60px;display:flex;align-items:center;justify-content:center;background:#f0f0f0;border-radius:6px;border:1px solid var(--hairline);font-size:20px;">▶</div>`
              : `<img src="${img.image_url}" alt="" style="width:100%;height:60px;object-fit:cover;border-radius:6px;border:1px solid var(--hairline);">`
            }
            <button type="button" onclick="deletePortfolioImage(${img.id}, ${portfolioId})" style="position:absolute;top:-6px;right:-6px;width:20px;height:20px;border-radius:50%;background:var(--primary);color:#fff;border:none;font-size:12px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;">×</button>
          </div>
        `).join('')}
      </div>
    `;
  } catch (err) { console.error('Failed to load portfolio images:', err); }
}

window.selectPortfolioImage = function(imageId, portfolioId, thumbEl) {
  const preview = document.getElementById('portfolioImagePreview');
  const previewVideo = document.getElementById('portfolioImagePreviewVideo');
  const placeholder = document.getElementById('portfolioPreviewPlaceholder');
  const img = thumbEl ? thumbEl.querySelector('img') : null;
  if (img && preview) {
    preview.src = img.src;
    preview.classList.remove('hidden');
    if (previewVideo) previewVideo.style.display = 'none';
    if (placeholder) placeholder.style.display = 'none';
    document.querySelectorAll('#portfolioThumbnails .thumb').forEach(t => t.classList.remove('active'));
    if (thumbEl) thumbEl.classList.add('active');
  }
};

async function deletePortfolioImage(imageId, portfolioId) {
  if (!confirm('确定要删除这张图片吗？')) return;
  try {
    await apiCall(`/portfolio-images/${imageId}`, { method: 'DELETE' });
    loadPortfolioImages(portfolioId);
  } catch (err) { alert('删除失败: ' + err.message); }
}

// ============ Load All Data ============
function loadAllData() {
  loadPortfolios();
  loadCategories();
  loadHeroImages();
  loadResources();
  loadSocialLinks();
  loadWechatQR();
  loadSiteConfig();
  loadGalleries();
}

// ============ Utilities ============
function escapeHtml(text) { const div = document.createElement('div'); div.textContent = text; return div.innerHTML; }
function formatDate(str) {
  if (!str) return '-';
  return new Date(str).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

// ============ Init ============
if (authToken) {
  document.getElementById('loginPage').classList.add('hidden');
  document.getElementById('adminDashboard').classList.remove('hidden');
  loadAllData();
}
