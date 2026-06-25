// === Config ===
const API_BASE = '/api';
let currentCategory = 'all';
let searchKeyword = '';
let categories = [];
let siteLogoUrl = null;

// === Init ===
document.addEventListener('DOMContentLoaded', () => {
  initSiteSettings();
  initSearch();
  initHeroImage();
  initScrollingText();
  loadHeroSocial();
  loadPortfolios();
  loadGallery();
  loadResources();
  loadSocialLinks();
  loadVisitCount();
  trackVisit();
  initMobileMenu();
  initQRModal();
  loadCategories();
});

// === Site Settings ===
async function initSiteSettings() {
  try {
    const res = await fetch('/api/settings/site');
    const data = await res.json();
    document.getElementById('siteName').textContent = data.site_name || 'Harrison';

    const logoUrl = data.site_logo_url || 'assets/images/logo.png';
    const logoImg = document.getElementById('logoImg');
    logoImg.src = logoUrl;
    logoImg.onerror = () => { logoImg.src = 'assets/images/logo.png'; };

    const footerLogoImg = document.getElementById('footerLogoImg');
    if (footerLogoImg) {
      footerLogoImg.src = logoUrl;
      footerLogoImg.onerror = () => { footerLogoImg.src = 'assets/images/logo.png'; };
    }

    const favicon = document.querySelector('link[rel="icon"]');
    if (favicon) {
      favicon.href = logoUrl;
      favicon.onerror = () => { favicon.href = 'assets/images/logo.png'; };
    }

    siteLogoUrl = data.site_logo_url || null;
    document.title = data.site_name + ' - 个人作品集';
  } catch (e) { /* use defaults */ }
}

// === QR Modal ===
function initQRModal() {
  const chatBtn = document.getElementById('chatBtn');
  const qrModal = document.getElementById('qrModal');

  const openQR = () => {
    loadQRForModal();
    qrModal.classList.add('active');
  };

  if (chatBtn) chatBtn.addEventListener('click', openQR);
}

function closeQRModal() {
  document.getElementById('qrModal').classList.remove('active');
}

function loadQRForModal() {
  fetch('/api/settings/wechat-qr')
    .then(r => r.json())
    .then(data => {
      const img = document.getElementById('qrModalImage');
      img.src = data.qr_url || 'assets/images/wechat.png';
      img.onerror = () => { img.src = 'assets/images/wechat.png'; };
      if (data.description) {
        document.getElementById('qrModalDesc').textContent = data.description;
      }
    })
    .catch(() => {});
}

// === Categories ===
async function loadCategories() {
  try {
    const res = await fetch('/api/categories');
    categories = await res.json();
    renderCategoryFilters();
  } catch (e) {
    console.error('Failed to load categories:', e);
  }
}

function renderCategoryFilters() {
  const bar = document.getElementById('filterBar');
  if (!bar) return;
  let html = '<button class="filter-btn active" data-category="all">全部</button>';
  categories.forEach(cat => {
    html += `<button class="filter-btn" data-category="${escapeHtml(cat.name)}">${escapeHtml(cat.name)}</button>`;
  });
  bar.innerHTML = html;

  // Re-bind filter events
  bar.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentCategory = btn.dataset.category;
      searchKeyword = '';
      const input = document.getElementById('searchInput');
      if (input) input.value = '';
      bar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadPortfolios();
    });
  });
}

// === Mobile Menu ===
function initMobileMenu() {
  const btn = document.querySelector('.mobile-menu-btn');
  const nav = document.querySelector('.nav');
  if (!btn || !nav) return;
  btn.addEventListener('click', () => {
    nav.style.display = nav.style.display === 'flex' ? 'none' : 'flex';
    nav.style.position = 'absolute';
    nav.style.top = '64px';
    nav.style.left = '0';
    nav.style.right = '0';
    nav.style.background = '#fff';
    nav.style.padding = '16px 24px';
    nav.style.flexDirection = 'column';
    nav.style.gap = '16px';
    nav.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
    nav.style.zIndex = '99';
  });
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => { if (window.innerWidth <= 768) nav.style.display = 'none'; });
  });
}

// === Search ===
function initSearch() {
  const input = document.getElementById('searchInput');
  const btn = document.getElementById('searchBtn');
  if (!input || !btn) return;
  const doSearch = () => {
    searchKeyword = input.value.trim();
    currentCategory = 'all';
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    const allBtn = document.querySelector('.filter-btn[data-category="all"]');
    if (allBtn) allBtn.classList.add('active');
    loadPortfolios();
  };
  btn.addEventListener('click', doSearch);
  input.addEventListener('keypress', (e) => { if (e.key === 'Enter') doSearch(); });
}

// === API Helper ===
async function api(endpoint) {
  const res = await fetch(`${API_BASE}${endpoint}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// === Portfolios ===
async function loadPortfolios() {
  const grid = document.getElementById('portfolioGrid');
  if (!grid) return;
  try {
    let url = '/portfolios';
    const params = new URLSearchParams();
    if (currentCategory !== 'all') params.set('category', currentCategory);
    if (searchKeyword) params.set('search', searchKeyword);
    const qs = params.toString();
    if (qs) url += `?${qs}`;
    const items = await api(url);
    if (items.length === 0) {
      grid.innerHTML = '<div class="empty-state"><h3>暂无作品</h3><p>尝试其他关键词或分类</p></div>';
      return;
    }

    // Load images for each portfolio
    const itemsWithImages = await Promise.all(items.map(async (item) => {
      let images = [];
      try {
        images = await api(`/portfolios/${item.id}/images`);
      } catch (e) { /* ignore */ }
      const imageUrl = (images && images.length > 0 && images[0].image_url) ? images[0].image_url : (item.image_url || 'assets/images/logo.png');
      return { ...item, displayImage: imageUrl };
    }));

    grid.innerHTML = itemsWithImages.map(item => `
      <div class="card" onclick="openPortfolioModal(${item.id})">
        <img class="card-image" src="${item.displayImage}" alt="" loading="lazy" onerror="this.src='assets/images/logo.png'">
        <div class="card-body">
          <div class="card-title">${escapeHtml(item.title)}</div>
          <div class="card-meta"><span>${escapeHtml(item.category)}</span><span>${formatDate(item.created_at)}</span></div>
          ${item.description ? `<div class="card-desc">${escapeHtml(item.description)}</div>` : ''}
        </div>
      </div>
    `).join('');
  } catch (e) { console.error(e); }
}

// === Gallery ===
async function loadGallery() {
  const list = document.getElementById('galleryList');
  if (!list) return;
  try {
    const items = await api('/galleries');
    if (items.length === 0) {
      list.innerHTML = '<div class="empty-state"><h3>暂无资料</h3><p>资料库空空如也</p></div>';
      return;
    }
    list.innerHTML = await Promise.all(items.map(async (item) => {
      let images = [];
      try {
        images = await api(`/galleries/${item.id}/images`);
      } catch (e) { /* ignore */ }
      const imgSrc = (images && images[0] && images[0].image_url) ? images[0].image_url : 'assets/images/logo.png';
      return `
        <div class="gallery-item" onclick="openGalleryModal(${item.id})">
          <div class="gallery-item-image">
            <img src="${imgSrc}" alt="" loading="lazy" onerror="this.src='assets/images/logo.png'">
          </div>
          <div class="gallery-item-info">
            <div class="gallery-item-title">${escapeHtml(item.title)}</div>
            <div class="gallery-item-meta">${formatDate(item.created_at)}</div>
          </div>
          <div class="gallery-item-arrow">→</div>
        </div>
      `;
    })).then(html => html.join(''));
  } catch (e) { console.error(e); }
}

// === Resources ===
async function loadResources() {
  const list = document.getElementById('resourceList');
  if (!list) return;
  try {
    const items = await api('/resources');
    if (items.length === 0) {
      list.innerHTML = '<div class="empty-state"><h3>暂无资源</h3></div>';
      return;
    }
    list.innerHTML = items.map(item => `
      <a class="resource-item" href="${escapeHtml(item.url)}" target="_blank" rel="noopener">
        <div class="resource-item-image">
          ${item.icon_url ? `<img src="${item.icon_url}" alt="">` : '<span style="opacity:0.4;font-size:16px">📎</span>'}
        </div>
        <div class="resource-item-info">
          <div class="resource-item-title">${escapeHtml(item.title)}</div>
          ${item.description ? `<div class="resource-item-desc">${escapeHtml(item.description)}</div>` : ''}
        </div>
        <div class="resource-item-arrow">→</div>
      </a>
    `).join('');
  } catch (e) { console.error(e); }
}

// === Hero Social Links ===
async function loadHeroSocial() {
  const container = document.getElementById('heroSocial');
  if (!container) return;
  try {
    const links = await api('/social-links');
    const targets = ['小红书', '抖音', '视频号'];
    const filtered = links.filter(l => targets.includes(l.platform));
    if (filtered.length === 0) {
      container.innerHTML = '';
      return;
    }
    container.innerHTML = filtered.map(l => `
      <a class="social-icon" href="${escapeHtml(l.url)}" target="_blank" rel="noopener" title="${escapeHtml(l.platform)}">
        ${l.icon_url ? `<img src="${l.icon_url}" alt="${escapeHtml(l.platform)}" onerror="this.style.display='none'">` : `<span>${escapeHtml(l.platform)}</span>`}
        <span>${escapeHtml(l.platform)}</span>
      </a>
    `).join('');
  } catch (e) {
    console.error('Failed to load hero social links:', e);
  }
}

// === Social Links ===
async function loadSocialLinks() {
  const row = document.getElementById('footerSocialRow');
  if (!row) return;
  try {
    const links = await api('/social-links');
    row.innerHTML = links.map(l => `
      <a class="social-link" href="${escapeHtml(l.url)}" target="_blank" rel="noopener" title="${escapeHtml(l.platform)}">
        ${l.icon_url ? `<img src="${l.icon_url}" alt="">` : getPlatformIcon(l.platform)}
      </a>
    `).join('');
  } catch (e) { console.error(e); }
}

function getPlatformIcon(platform) {
  const icons = { '小红书': '📕', '抖音': '🎵', '视频号': '📺', '微信': '💬' };
  return `<span style="font-size:18px">${icons[platform] || '🔗'}</span>`;
}

// === Visit Count ===
async function loadVisitCount() {
  const el = document.getElementById('footerVisitCount');
  const todayEl = document.getElementById('todayVisitCount');
  if (!el) return;
  try {
    const data = await api('/visits');
    el.textContent = data.total.toLocaleString();
    if (todayEl) todayEl.textContent = data.today ? data.today.toLocaleString() : '—';
  } catch (e) { console.error(e); }
}

async function trackVisit() {
  try {
    const res = await fetch(`${API_BASE}/visits`, { method: 'POST' });
    if (res.ok) setTimeout(loadVisitCount, 500);
  } catch (e) { /* ignore */ }
}

// === Detail Page (sub-page, not modal) ===
function openDetailPage(type, id) {
  const detailPage = document.getElementById('detailPage');
  document.body.style.overflow = 'hidden';
  detailPage.classList.add('active');

  // Show loading state
  document.getElementById('detailPageTitle').textContent = '加载中...';
  document.getElementById('detailPageCategory').style.display = 'none';
  document.getElementById('detailPageDate').textContent = '';
  document.getElementById('detailPageGallery').innerHTML = '';
  document.getElementById('detailPageDesc').textContent = '';

  fetch(`/api/${type}/${id}`)
    .then(r => r.json())
    .then(item => {
      document.getElementById('detailPageTitle').textContent = item.title;

      const catEl = document.getElementById('detailPageCategory');
      if (item.category) {
        catEl.textContent = item.category;
        catEl.style.display = 'inline-block';
      } else {
        catEl.style.display = 'none';
      }

      document.getElementById('detailPageDate').textContent = item.created_at
        ? `发布于 ${new Date(item.created_at).toLocaleString('zh-CN')}` : '';

      document.getElementById('detailPageDesc').textContent = item.description || '暂无详情';

      // Load images
      const galleryEl = document.getElementById('detailPageGallery');
      if (type === 'galleries') {
        fetch(`/api/${type}/${id}/images`)
          .then(r => r.json())
          .then(images => {
            if (images.length === 0) {
              galleryEl.innerHTML = '';
              return;
            }
            galleryEl.innerHTML = `<div class="detail-page-images">` + images.map(img => `
              <img src="${img.image_url}" alt="" class="detail-page-image" onerror="this.style.display='none'">
            `).join('') + `</div>`;
          })
          .catch(() => { galleryEl.innerHTML = ''; });
      } else if (type === 'portfolios') {
        fetch(`/api/${type}/${id}/images`)
          .then(r => r.json())
          .then(images => {
            if (images.length === 0 && item.image_url) {
              galleryEl.innerHTML = `<img src="${item.image_url}" alt="" class="detail-page-image" onerror="this.style.display='none'">`;
              return;
            }
            if (images.length === 0) {
              galleryEl.innerHTML = '';
              return;
            }
            galleryEl.innerHTML = `<div class="detail-page-images">` + images.map(img => `
              <img src="${img.image_url}" alt="" class="detail-page-image" onerror="this.style.display='none'">
            `).join('') + `</div>`;
          })
          .catch(() => { galleryEl.innerHTML = ''; });
      }

      // Scroll to top of content
      detailPage.querySelector('.detail-page-content').scrollTop = 0;
    })
    .catch(e => {
      console.error(e);
      document.getElementById('detailPageTitle').textContent = '加载失败';
      document.getElementById('detailPageDesc').textContent = '无法加载详情，请稍后重试';
    });
}

function closeDetailPage() {
  const detailPage = document.getElementById('detailPage');
  detailPage.classList.remove('active');
  document.body.style.overflow = '';
}

// Close detail page on backdrop click
document.addEventListener('click', (e) => {
  const detailPage = document.getElementById('detailPage');
  if (detailPage && e.target === detailPage.querySelector('.detail-page-backdrop')) {
    closeDetailPage();
  }
});

// ESC key to close
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const detailPage = document.getElementById('detailPage');
    if (detailPage && detailPage.classList.contains('active')) {
      closeDetailPage();
    }
    const qrModal = document.getElementById('qrModal');
    if (qrModal && qrModal.classList.contains('active')) {
      closeQRModal();
    }
  }
});

// === Scrolling Text ===
function initScrollingText() {
  const el = document.getElementById('scrollingText');
  if (!el) return;
  const words = ['视觉设计', '数据可视化设计', '画册设计', 'logo设计'];
  let index = 0;
  el.innerHTML = '<span class="scrolling-text-inner">' + words.map(w => `<div>${w}</div>`).join('') + '</span>';
  setInterval(() => {
    index = (index + 1) % words.length;
    const inner = el.querySelector('.scrolling-text-inner');
    if (inner) inner.style.transform = `translateY(-${index * 25}%)`;
  }, 3000);
}

// === Hero Image ===
async function initHeroImage() {
  const heroEl = document.getElementById('heroImage');
  if (!heroEl) return;
  try {
    const res = await fetch('/api/hero-images');
    const images = await res.json();
    if (images.length === 0) return;

    const first = images[0];
    heroEl.innerHTML = '';

    if (first.media_type === 'video') {
      const video = document.createElement('video');
      video.src = first.image_url;
      video.autoplay = true;
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.setAttribute('playsinline', '');
      video.style.cssText = 'width:100%;height:100%;object-fit:cover;';
      heroEl.appendChild(video);
    } else {
      const img = document.createElement('img');
      img.src = first.image_url;
      img.alt = 'Hero';
      img.onerror = () => { img.style.display='none'; heroEl.style.background='#ebebeb'; };
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
      heroEl.appendChild(img);
    }
  } catch (e) { /* use default */ }
}

// === Utils ===
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(str) {
  if (!str) return '-';
  return new Date(str).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

// === Portfolio Fullscreen Modal ===
async function openPortfolioModal(id) {
  const modal = document.getElementById('portfolioModal');
  if (!modal) return;
  try {
    const item = await api(`/portfolios/${id}`);
    document.getElementById('portfolioModalTitle').textContent = item.title;
    const catEl = document.getElementById('portfolioModalCategory');
    if (catEl) {
      catEl.textContent = item.category || '';
      catEl.style.display = item.category ? 'inline-block' : 'none';
    }
    document.getElementById('portfolioModalDate').textContent = item.created_at ? `发布于 ${new Date(item.created_at).toLocaleString('zh-CN')}` : '';
    document.getElementById('portfolioModalDesc').textContent = item.description || '暂无详情';

    const images = await api(`/portfolios/${id}/images`);
    const sorted = images.slice().sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    const mainImg = document.getElementById('portfolioModalImage');
    const mainVideo = document.getElementById('portfolioModalVideo');
    const thumbContainer = document.getElementById('portfolioModalThumbnails');

    if (sorted.length > 0 && sorted[0].image_url) {
      const first = sorted[0];
      if (first.media_type === 'video') {
        mainVideo.src = first.image_url;
        mainVideo.style.display = 'block';
        mainImg.style.display = 'none';
      } else {
        mainImg.src = first.image_url;
        mainImg.style.display = 'block';
        mainVideo.style.display = 'none';
      }
    } else {
      mainImg.style.display = 'none';
      mainVideo.style.display = 'none';
    }

    if (thumbContainer) {
      thumbContainer.innerHTML = sorted.map(img => {
        if (img.media_type === 'video') {
          return `<div class="thumb" onclick="selectPortfolioModalImage('${img.image_url}', 'video', this)" title="视频">
            <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#f0f0f0;font-size:20px;">▶</div>
          </div>`;
        }
        return `<div class="thumb" onclick="selectPortfolioModalImage('${img.image_url}', 'image', this)">
          <img src="${img.image_url}" alt="">
        </div>`;
      }).join('');
    }

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  } catch (e) {
    console.error('Failed to open portfolio modal:', e);
  }
}

function closePortfolioModal() {
  const modal = document.getElementById('portfolioModal');
  if (modal) modal.classList.remove('active');
  const mainVideo = document.getElementById('portfolioModalVideo');
  if (mainVideo) { mainVideo.pause(); mainVideo.src = ''; }
  document.body.style.overflow = '';
}

window.selectPortfolioModalImage = function(url, mediaType, thumbEl) {
  const mainImg = document.getElementById('portfolioModalImage');
  const mainVideo = document.getElementById('portfolioModalVideo');
  if (mainImg && mainVideo) {
    if (mediaType === 'video') {
      mainVideo.src = url;
      mainVideo.style.display = 'block';
      mainImg.style.display = 'none';
    } else {
      mainImg.src = url;
      mainImg.style.display = 'block';
      mainVideo.style.display = 'none';
    }
  }
  document.querySelectorAll('#portfolioModalThumbnails .thumb').forEach(t => t.classList.remove('active'));
  if (thumbEl) thumbEl.classList.add('active');
};

// === Gallery Fullscreen Modal ===
async function openGalleryModal(id) {
  const modal = document.getElementById('galleryModal');
  if (!modal) return;
  try {
    const item = await api(`/galleries/${id}`);
    document.getElementById('galleryModalTitle').textContent = item.title;
    document.getElementById('galleryModalDate').textContent = item.created_at ? `发布于 ${new Date(item.created_at).toLocaleString('zh-CN')}` : '';
    document.getElementById('galleryModalDesc').textContent = item.description || '暂无详情';

    const images = await api(`/galleries/${id}/images`);
    const sorted = images.slice().sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    const mainImg = document.getElementById('galleryModalImage');
    const mainVideo = document.getElementById('galleryModalVideo');
    const thumbContainer = document.getElementById('galleryModalThumbnails');

    if (sorted.length > 0 && sorted[0].image_url) {
      const first = sorted[0];
      if (first.media_type === 'video') {
        mainVideo.src = first.image_url;
        mainVideo.style.display = 'block';
        mainImg.style.display = 'none';
      } else {
        mainImg.src = first.image_url;
        mainImg.style.display = 'block';
        mainVideo.style.display = 'none';
      }
    } else {
      mainImg.style.display = 'none';
      mainVideo.style.display = 'none';
    }

    if (thumbContainer) {
      thumbContainer.innerHTML = sorted.map(img => {
        if (img.media_type === 'video') {
          return `<div class="thumb" onclick="selectGalleryModalImage('${img.image_url}', 'video', this)" title="视频">
            <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#f0f0f0;font-size:20px;">▶</div>
          </div>`;
        }
        return `<div class="thumb" onclick="selectGalleryModalImage('${img.image_url}', 'image', this)">
          <img src="${img.image_url}" alt="">
        </div>`;
      }).join('');
    }

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  } catch (e) {
    console.error('Failed to open gallery modal:', e);
  }
}

function closeGalleryModal() {
  const modal = document.getElementById('galleryModal');
  if (modal) modal.classList.remove('active');
  const mainVideo = document.getElementById('galleryModalVideo');
  if (mainVideo) { mainVideo.pause(); mainVideo.src = ''; }
  document.body.style.overflow = '';
}

window.selectGalleryModalImage = function(url, mediaType, thumbEl) {
  const mainImg = document.getElementById('galleryModalImage');
  const mainVideo = document.getElementById('galleryModalVideo');
  if (mainImg && mainVideo) {
    if (mediaType === 'video') {
      mainVideo.src = url;
      mainVideo.style.display = 'block';
      mainImg.style.display = 'none';
    } else {
      mainImg.src = url;
      mainImg.style.display = 'block';
      mainVideo.style.display = 'none';
    }
  }
  document.querySelectorAll('#galleryModalThumbnails .thumb').forEach(t => t.classList.remove('active'));
  if (thumbEl) thumbEl.classList.add('active');
};

// Close modals on backdrop click
document.addEventListener('click', (e) => {
  const portfolioModal = document.getElementById('portfolioModal');
  const galleryModal = document.getElementById('galleryModal');
  if (portfolioModal && e.target === portfolioModal) closePortfolioModal();
  if (galleryModal && e.target === galleryModal) closeGalleryModal();
});

// ESC key to close modals
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const portfolioModal = document.getElementById('portfolioModal');
    const galleryModal = document.getElementById('galleryModal');
    if (portfolioModal && portfolioModal.classList.contains('active')) closePortfolioModal();
    if (galleryModal && galleryModal.classList.contains('active')) closeGalleryModal();
  }
});
