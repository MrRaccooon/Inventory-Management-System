# InventoryLedger CRM - Backend

Enterprise-capable Inventory & Sales CRM backend built with FastAPI, PostgreSQL, and Redis.

## Features

- **ACID-safe inventory ledger** - No double-selling, transactional stock updates
- **Sales & billing with GST support** - India-specific GST calculations
- **AI Analytics & Forecasting** - ML-powered demand forecasting and insights
- **Comprehensive Reports** - Sales, inventory, profitability, and employee performance
- **Role-based Access Control** - Owner, manager, staff, auditor roles
- **Employee Management** - Attendance tracking and performance metrics
- **RESTful API** - Well-documented API with OpenAPI/Swagger docs

## Tech Stack

- **Framework**: FastAPI 0.104+
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Authentication**: JWT tokens with bcrypt password hashing
- **Caching**: Redis (optional)
- **Background Tasks**: Celery (optional, for ML/export workers)
- **Validation**: Pydantic v2

## Project Structure

```
backend/
├── app/
│   ├── api/
│   │   └── v1/          # API endpoints grouped by feature
│   │       ├── auth.py
│   │       ├── dashboard.py
│   │       ├── products.py
│   │       ├── sales.py
│   │       ├── gst.py
│   │       ├── ai_analytics.py
│   │       ├── reports.py
│   │       ├── employees.py
│   │       ├── profit.py
│   │       └── invoices.py
│   ├── db/
│   │   ├── base.py       # SQLAlchemy base
│   │   └── session.py    # Database session management
│   ├── models/           # SQLAlchemy models
│   ├── schemas/          # Pydantic schemas
│   ├── services/         # Business logic layer
│   ├── utils/            # Utility functions
│   │   ├── auth.py       # JWT, password hashing
│   │   ├── gst.py        # GST calculations
│   │   ├── ledger.py     # Stock ledger management
│   │   └── audit.py      # Audit logging
│   ├── workers/          # Background workers (Celery)
│   ├── config.py         # Configuration
│   └── main.py           # FastAPI app
├── alembic/              # Database migrations
├── requirements.txt
└── README.md
```

## Setup

### 1. Install Dependencies

```bash
cd backend

# Create virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt
```

**Note**: See `REQUIREMENTS.md` for details about dependency versions and compatibility.

### 2. Environment Variables

Create a `.env` file in the `backend/` directory. See `ENV_SETUP.md` for complete documentation.

**Required variables:**
- `DATABASE_URL` - PostgreSQL connection string
- `SECRET_KEY` - JWT secret key (generate a strong random string for production)
- `CORS_ORIGINS` - Comma-separated list of allowed frontend origins

**Quick setup:**
```bash
# Generate a secure SECRET_KEY
python -c "import secrets; print(secrets.token_urlsafe(32))"

# Create .env file with minimum required variables
cat > backend/.env << EOF
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/inventory_ledger
SECRET_KEY=<paste-generated-key-here>
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
DEBUG=False
EOF
```

See `ENV_SETUP.md` for all available environment variables and production checklist.

### 3. Verify Environment Setup

After setting up your `.env` file, verify everything is configured correctly:

```bash
python verify_env.py
```

This script checks:
- All required environment variables are set
- Database connection (if credentials are correct)
- Redis connection (optional)
- SECRET_KEY strength
- CORS origins format

### 4. Database Setup

**For Supabase (Recommended):**

1. Get your connection string from Supabase dashboard:
   - Go to **Project Settings** > **Database**
   - Copy the connection string (use Connection Pooling for production)
   - Add it to your `.env` file as `DATABASE_URL`

2. Run migrations or create tables:
```bash
# Run migrations (if using Alembic)
alembic upgrade head

# Or create tables directly (for development)
python -c "from app.db.base import Base; from app.db.session import engine; Base.metadata.create_all(bind=engine)"
```

**For Local PostgreSQL:**

```bash
# Create database
createdb inventory_ledger

# Run migrations or create tables (same as above)
```

### 5. Run the Server

```bash
# Development
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Production
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

### 6. Access API Documentation

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## API Endpoints

### Authentication
- `POST /api/v1/auth/login` - User login (OAuth2 form)
- `POST /api/v1/auth/login/json` - User login (JSON body)
- `GET /api/v1/auth/me` - Get current user info

### Dashboard
- `GET /api/v1/dashboard` - Get dashboard data (KPIs, trends, alerts)

### Products & Inventory
- `GET /api/v1/products` - List products
- `POST /api/v1/products` - Create product
- `GET /api/v1/products/{id}` - Get product
- `PATCH /api/v1/products/{id}` - Update product
- `POST /api/v1/products/{id}/adjust-stock` - Adjust stock
- `GET /api/v1/products/summary` - Inventory summary

### Sales
- `GET /api/v1/sales` - List sales
- `POST /api/v1/sales` - Create sale
- `GET /api/v1/sales/{id}` - Get sale
- `PATCH /api/v1/sales/{id}` - Update sale
- `POST /api/v1/sales/{id}/void` - Void sale

### GST & Billing
- `GET /api/v1/gst/summary` - GST summary
- `GET /api/v1/gst/report` - Detailed GST report
- `POST /api/v1/gst/invoices/{sale_id}` - Create invoice

### AI Analytics
- `GET /api/v1/ai-analytics` - Get AI insights
- `POST /api/v1/ai-analytics/forecast` - Generate forecast

### Reports
- `GET /api/v1/reports` - Comprehensive reports

### Employees
- `GET /api/v1/employees` - List employees
- `POST /api/v1/employees` - Create employee
- `GET /api/v1/employees/{id}` - Get employee
- `PATCH /api/v1/employees/{id}` - Update employee
- `POST /api/v1/employees/attendance` - Record attendance
- `GET /api/v1/employees/{id}/performance` - Employee performance

### Profitability
- `GET /api/v1/profitability` - Profitability analysis

## Key Features

### Inventory Ledger System

The system uses a ledger-based approach for stock management:

- All stock changes are recorded in `stock_movements` table
- `current_stock` in products table is denormalized for quick access
- Ledger is the single source of truth
- Prevents double-selling and ensures ACID safety

### GST Calculations

- Supports India GST with CGST/SGST/IGST breakdown
- Configurable GST rates (default 18%)
- Automatic GST calculation on sale items
- GST reports for compliance

### AI Analytics

- Demand forecasting based on historical sales
- Restock recommendations
- Slow-moving item identification
- Price optimization suggestions
- Seasonal demand insights

### Authentication & Authorization

- JWT-based authentication
- Role-based access control (owner, manager, staff, auditor, admin)
- Password hashing with bcrypt
- Token expiration and refresh

## Development

### Running Tests

```bash
# Install test dependencies
pip install pytest pytest-asyncio httpx

# Run tests
pytest
```

### Code Style

The project follows PEP 8 style guidelines. Consider using:
- `black` for code formatting
- `flake8` for linting
- `mypy` for type checking

### Database Migrations

```bash
# Create migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

## Production Deployment

### Docker

```bash
# Build image
docker build -t inventory-ledger-backend .

# Run container
docker run -p 8000:8000 --env-file .env inventory-ledger-backend
```

### Environment Variables for Production

- Set `DEBUG=False`
- Use strong `SECRET_KEY`
- Configure proper `CORS_ORIGINS`
- Use managed PostgreSQL (e.g., AWS RDS, Supabase)
- Set up Redis for caching
- Configure Celery workers for background tasks

## Notes

- All timestamps are stored in UTC
- Currency defaults to INR (Indian Rupees)
- GST calculations are India-specific
- Stock movements are immutable (no deletion, only corrections)
- Audit logs track all important actions

## License

Proprietary - All rights reserved

