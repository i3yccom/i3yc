# Harrison Portfolio - Backend

Node.js/Express backend with PostgreSQL for portfolio management.

## Features
- Portfolio management with multi-image/video support
- Gallery/resource management
- Social links management
- Hero image/video carousel
- Visit statistics
- Admin panel with fullscreen modals
- JWT authentication

## Tech Stack
- Node.js + Express
- PostgreSQL (production) / SQLite (development)
- Multer for file uploads
- JWT for authentication
- bcrypt for password hashing

## Deployment

### Option 1: Railway (Recommended)
1. Push this repo to GitHub
2. Go to [Railway.app](https://railway.app) and create a new project
3. Connect your GitHub repo
4. Add a PostgreSQL plugin
5. Set environment variables:
   - `DATABASE_URL` (auto-set by Railway)
   - `JWT_SECRET` (generate a random string)
   - `NODE_ENV=production`
6. Deploy!

### Option 2: Render
1. Push this repo to GitHub
2. Go to [Render.com](https://render.com) and create a new Web Service
3. Connect your GitHub repo
4. Add a PostgreSQL database
5. Set environment variables:
   - `DATABASE_URL` (from Render PostgreSQL)
   - `JWT_SECRET` (generate a random string)
   - `NODE_ENV=production`
6. Deploy!

### Option 3: Fly.io
1. Install Fly CLI: `curl -L https://fly.io/install.sh | sh`
2. Run `fly launch` in this directory
3. Add PostgreSQL: `fly postgres create`
4. Set secrets: `fly secrets set JWT_SECRET=your-secret DATABASE_URL=postgres://...`
5. Deploy: `fly deploy`

## Environment Variables
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (production/development)
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT tokens

## Initial Setup
After first deployment, visit `/admin` and login with:
- Username: `admin`
- Password: `admin123`

**Important**: Change the default password after first login!

## Local Development
1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and configure
3. Run: `npm start`
4. Visit: `http://localhost:3000/admin`

## License
ISC
