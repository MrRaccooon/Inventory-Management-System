# Environment Variables Setup

Create a `.env` file in the `backend/` directory with the following variables.

## Quick Start

1. **Generate SECRET_KEY:**
   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(32))"
   ```

2. **Get DATABASE_URL from Supabase:**
   - Go to Supabase Dashboard → Project Settings → Database
   - Copy connection string and replace `[YOUR-PASSWORD]` and `[YOUR-PROJECT-REF]`

3. **Verify your setup:**
   ```bash
   python verify_env.py
   ```

## Required Environment Variables

```env
# Application Configuration
APP_NAME=InventoryLedger CRM
APP_VERSION=1.0.0
DEBUG=False

# Database Configuration
# For Supabase: Get connection string from Project Settings > Database > Connection String
# Format: postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
# Or for direct connection: postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
# 
# Example Supabase connection string (replace with your actual values):
# DATABASE_URL=postgresql://postgres.xxxxxxxxxxxxx:your-password@aws-0-us-east-1.pooler.supabase.com:6543/postgres
#
# For local PostgreSQL:
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/inventory_ledger

DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres

# JWT Authentication
# IMPORTANT: Change this to a strong random secret in production!
# Generate with: python -c "import secrets; print(secrets.token_urlsafe(32))"
SECRET_KEY=your-secret-key-change-in-production-min-32-characters-long
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# CORS Configuration
# Comma-separated list of allowed origins
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:8080
```

## Optional Environment Variables

```env
# Redis Configuration (for caching)
REDIS_URL=redis://localhost:6379/0

# File Upload Configuration
MAX_UPLOAD_SIZE=10485760
UPLOAD_DIR=./uploads

# GST Configuration (India)
DEFAULT_GST_RATE=18.0

# AI/ML Configuration
FORECAST_MODEL_VERSION=1.0
FORECAST_LOOKBACK_DAYS=180
AI_CACHE_TTL_HOURS=24

# Background Workers (Celery - optional)
CELERY_BROKER_URL=redis://localhost:6379/1
CELERY_RESULT_BACKEND=redis://localhost:6379/2

# Invoice/PDF Generation
INVOICE_PDF_DIR=./invoices
```

## Quick Setup

1. Copy this template to `backend/.env`:
```bash
cd backend
# Create .env file manually or copy from this template
```

2. Generate a secure SECRET_KEY:
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

3. Get your Supabase DATABASE_URL:
   - Go to your Supabase project dashboard
   - Navigate to **Project Settings** > **Database**
   - Under **Connection string**, select **URI** or **Connection pooling**
   - Copy the connection string
   - Replace `[YOUR-PASSWORD]` with your database password
   - Replace `[YOUR-PROJECT-REF]` with your project reference ID
   
   **Connection Pooling (Recommended for production):**
   ```
   postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
   ```
   
   **Direct Connection (For migrations/debugging):**
   ```
   postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```

4. Set CORS_ORIGINS to match your frontend URL(s)
   - If deploying frontend, add your production URL
   - Example: `CORS_ORIGINS=http://localhost:5173,https://yourdomain.com`

## Supabase-Specific Notes

### Finding Your Connection Details

1. **Project Reference ID**: Found in your Supabase project URL
   - URL format: `https://[PROJECT-REF].supabase.co`
   - Example: If URL is `https://abcdefghijklmnop.supabase.co`, your project ref is `abcdefghijklmnop`

2. **Database Password**: Set when creating the project (can be reset in Settings)

3. **Connection Pooling vs Direct Connection**:
   - **Pooling** (port 6543): Better for production, handles multiple connections efficiently
   - **Direct** (port 5432): Better for migrations, direct database access

### Supabase Connection String Examples

**Using Connection Pooling (Recommended):**
```env
DATABASE_URL=postgresql://postgres.abcdefghijklmnop:your-password@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

**Using Direct Connection:**
```env
DATABASE_URL=postgresql://postgres:your-password@db.abcdefghijklmnop.supabase.co:5432/postgres
```

### Supabase SSL Connection (if required)

Some Supabase instances require SSL. Add `?sslmode=require` to your connection string:
```env
DATABASE_URL=postgresql://postgres:your-password@db.abcdefghijklmnop.supabase.co:5432/postgres?sslmode=require
```

## How to Get Each Value

### DEBUG
- Development: `DEBUG=True`
- Production: `DEBUG=False`

### DATABASE_URL
**For Supabase:**
1. Go to https://app.supabase.com
2. Project Settings → Database → Connection string
3. Copy URI and replace `[YOUR-PASSWORD]` and `[YOUR-PROJECT-REF]`

**Project Reference:** Found in your Supabase URL: `https://[PROJECT-REF].supabase.co`

### SECRET_KEY
Generate with: `python -c "import secrets; print(secrets.token_urlsafe(32))"`
⚠️ Must be at least 32 characters and unique!

### CORS_ORIGINS
Comma-separated frontend URLs:
- Development: `http://localhost:5173,http://localhost:3000`
- Production: `https://yourdomain.com`

### REDIS_URL (Optional)
- Local: `redis://localhost:6379/0`
- Cloud: Get from your Redis provider
- **Note:** App works without Redis (caching disabled)

### Other Optional Variables
- `UPLOAD_DIR` - Default: `./uploads`
- `CELERY_BROKER_URL` - Only if using Celery
- `CELERY_RESULT_BACKEND` - Only if using Celery
- `INVOICE_PDF_DIR` - Default: `./invoices`

## Production Checklist

- [ ] Set `DEBUG=False`
- [ ] Generate a strong `SECRET_KEY` (32+ characters)
- [ ] Use Supabase connection pooling URL for production
- [ ] Set proper `CORS_ORIGINS` (only your frontend domain)
- [ ] Configure Redis for caching (recommended, optional)
- [ ] Set up Celery workers if using background tasks
- [ ] Enable SSL in Supabase connection if required

