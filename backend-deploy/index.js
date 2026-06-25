// Portfolios API
app.get('/api/portfolios', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM portfolios ORDER BY created_at DESC');
    const items = await Promise.all(result.rows.map(async (item) => {
      const images = await pool.query(
        'SELECT * FROM portfolio_images WHERE portfolio_id = $1 ORDER BY sort_order, id',
        [item.id]
      );
      return { ...item, images: images.rows };
    }));
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/portfolios/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM portfolios WHERE id = $1', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: '作品不存在' });
    
    const images = await pool.query(
      'SELECT * FROM portfolio_images WHERE portfolio_id = $1 ORDER BY sort_order, id',
      [req.params.id]
    );
    res.json({ ...result.rows[0], images: images.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/portfolios', authMiddleware, async (req, res) => {
  try {
    const { title, category, description, image_url } = req.body;
    const result = await pool.query(
      'INSERT INTO portfolios (title, category, description, image_url) VALUES ($1, $2, $3, $4) RETURNING *',
      [title, category, description, image_url]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/portfolios/:id', authMiddleware, async (req, res) => {
  try {
    const { title, category, description, image_url } = req.body;
    const result = await pool.query(
      'UPDATE portfolios SET title = $1, category = $2, description = $3, image_url = $4 WHERE id = $5 RETURNING *',
      [title, category, description, image_url, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: '作品不存在' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/portfolios/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM portfolios WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: '作品不存在' });
    res.json({ message: '删除成功' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Portfolio images API
app.get('/api/portfolios/:id/images', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM portfolio_images WHERE portfolio_id = $1 ORDER BY sort_order, id',
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/portfolios/:id/images', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const { sort_order, media_type } = req.body;
    const image_url = req.file ? `/uploads/${req.file.filename}` : null;
    if (!image_url) return res.status(400).json({ error: '媒体不能为空' });
    const result = await pool.query(
      'INSERT INTO portfolio_images (portfolio_id, image_url, media_type, sort_order) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.params.id, image_url, media_type || 'image', sort_order || 0]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/portfolio-images/:imageId', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM portfolio_images WHERE id = $1 RETURNING id', [req.params.imageId]);
    if (!result.rows[0]) return res.status(404).json({ error: '图片不存在' });
    res.json({ message: '删除成功' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Galleries API
app.get('/api/galleries', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM galleries ORDER BY created_at DESC');
    const items = await Promise.all(result.rows.map(async (item) => {
      const images = await pool.query(
        'SELECT * FROM gallery_images WHERE gallery_id = $1 ORDER BY sort_order, id',
        [item.id]
      );
      return { ...item, images: images.rows };
    }));
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/galleries/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM galleries WHERE id = $1', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: '资料不存在' });
    
    const images = await pool.query(
      'SELECT * FROM gallery_images WHERE gallery_id = $1 ORDER BY sort_order, id',
      [req.params.id]
    );
    res.json({ ...result.rows[0], images: images.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/galleries', authMiddleware, async (req, res) => {
  try {
    const { title, description } = req.body;
    const result = await pool.query(
      'INSERT INTO galleries (title, description) VALUES ($1, $2) RETURNING *',
      [title, description]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/galleries/:id', authMiddleware, async (req, res) => {
  try {
    const { title, description } = req.body;
    const result = await pool.query(
      'UPDATE galleries SET title = $1, description = $2 WHERE id = $3 RETURNING *',
      [title, description, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: '资料不存在' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/galleries/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM galleries WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: '资料不存在' });
    res.json({ message: '删除成功' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Gallery images API
app.get('/api/galleries/:id/images', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM gallery_images WHERE gallery_id = $1 ORDER BY sort_order, id',
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/galleries/:id/images', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const { sort_order, media_type } = req.body;
    const image_url = req.file ? `/uploads/${req.file.filename}` : null;
    if (!image_url) return res.status(400).json({ error: '媒体不能为空' });
    const result = await pool.query(
      'INSERT INTO gallery_images (gallery_id, image_url, media_type, sort_order) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.params.id, image_url, media_type || 'image', sort_order || 0]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/gallery-images/:imageId', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM gallery_images WHERE id = $1 RETURNING id', [req.params.imageId]);
    if (!result.rows[0]) return res.status(404).json({ error: '图片不存在' });
    res.json({ message: '删除成功' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Resources API
app.get('/api/resources', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM resources ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/resources', authMiddleware, async (req, res) => {
  try {
    const { title, url, icon_url, description } = req.body;
    const result = await pool.query(
      'INSERT INTO resources (title, url, icon_url, description) VALUES ($1, $2, $3, $4) RETURNING *',
      [title, url, icon_url, description]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/resources/:id', authMiddleware, async (req, res) => {
  try {
    const { title, url, icon_url, description } = req.body;
    const result = await pool.query(
      'UPDATE resources SET title = $1, url = $2, icon_url = $3, description = $4 WHERE id = $5 RETURNING *',
      [title, url, icon_url, description, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: '资源不存在' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/resources/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM resources WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: '资源不存在' });
    res.json({ message: '删除成功' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Categories API
app.get('/api/categories', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/categories', authMiddleware, async (req, res) => {
  try {
    const { name } = req.body;
    const result = await pool.query('INSERT INTO categories (name) VALUES ($1) RETURNING *', [name]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/categories/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM categories WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: '分类不存在' });
    res.json({ message: '删除成功' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Social links API
app.get('/api/social-links', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM social_links ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/social-links', authMiddleware, async (req, res) => {
  try {
    const { platform, url, icon_url } = req.body;
    const result = await pool.query(
      'INSERT INTO social_links (platform, url, icon_url) VALUES ($1, $2, $3) RETURNING *',
      [platform, url, icon_url]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/social-links/:id', authMiddleware, async (req, res) => {
  try {
    const { platform, url, icon_url } = req.body;
    const result = await pool.query(
      'UPDATE social_links SET platform = $1, url = $2, icon_url = $3 WHERE id = $4 RETURNING *',
      [platform, url, icon_url, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: '链接不存在' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/social-links/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM social_links WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: '链接不存在' });
    res.json({ message: '删除成功' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Hero images API
app.get('/api/hero-images', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM hero_images ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/hero-images', authMiddleware, async (req, res) => {
  try {
    const { image_url, media_type, title } = req.body;
    const result = await pool.query(
      'INSERT INTO hero_images (image_url, media_type, title) VALUES ($1, $2, $3) RETURNING *',
      [image_url, media_type || 'image', title]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/hero-images/:id', authMiddleware, async (req, res) => {
  try {
    const { image_url, media_type, title } = req.body;
    const result = await pool.query(
      'UPDATE hero_images SET image_url = $1, media_type = $2, title = $3 WHERE id = $4 RETURNING *',
      [image_url, media_type || 'image', title, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: '轮播图不存在' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/hero-images/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM hero_images WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: '轮播图不存在' });
    res.json({ message: '删除成功' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Site config API
app.get('/api/site-config', async (req, res) => {
  try {
    const result = await pool.query('SELECT config_key, config_value FROM site_config');
    const config = {};
    result.rows.forEach(row => { config[row.config_key] = row.config_value; });
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/site-config', authMiddleware, async (req, res) => {
  try {
    const entries = Object.entries(req.body);
    for (const [key, value] of entries) {
      await pool.query(
        `INSERT INTO site_config (config_key, config_value) VALUES ($1, $2)
         ON CONFLICT (config_key) DO UPDATE SET config_value = $2, updated_at = CURRENT_TIMESTAMP`,
        [key, value]
      );
    }
    res.json({ message: '配置已更新' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// WeChat API
app.get('/api/wechat-qr', async (req, res) => {
  try {
    const result = await pool.query("SELECT config_value FROM site_config WHERE config_key = 'wechat_qr'");
    const qr = result.rows[0];
    res.json({ qr_url: qr ? qr.config_value : null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/wechat-qr', authMiddleware, upload.single('qr'), async (req, res) => {
  try {
    const qr_url = req.file ? `/uploads/${req.file.filename}` : req.body.qr_url;
    await pool.query(
      `INSERT INTO site_config (config_key, config_value) VALUES ('wechat_qr', $1)
       ON CONFLICT (config_key) DO UPDATE SET config_value = $1, updated_at = CURRENT_TIMESTAMP`,
      [qr_url]
    );
    res.json({ qr_url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Visits API
app.get('/api/visits', async (req, res) => {
  try {
    const totalResult = await pool.query('SELECT SUM(count) as total FROM visits');
    const today = new Date().toISOString().split('T')[0];
    const todayResult = await pool.query('SELECT count FROM visits WHERE date = $1', [today]);
    res.json({
      total: totalResult.rows[0].total || 0,
      today: todayResult.rows[0] ? todayResult.rows[0].count : 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/visits', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const existing = await pool.query('SELECT * FROM visits WHERE date = $1', [today]);
    
    if (existing.rows.length > 0) {
      await pool.query('UPDATE visits SET count = count + 1 WHERE date = $1', [today]);
    } else {
      await pool.query('INSERT INTO visits (date, count) VALUES ($1, 1)', [today]);
    }
    
    res.json({ message: 'Visit counted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upload API
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, '/tmp/market-uploads/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

app.post('/api/upload', authMiddleware, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    res.json({ url: `/uploads/${req.file.filename}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve admin panel
app.get('/admin*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html'));
});

// Start server
async function startServer() {
  try {
    await initDatabase();
    await initAdminUser();
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`Admin panel: http://localhost:${PORT}/admin`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
