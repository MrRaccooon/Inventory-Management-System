# JavaScript Express Backend - Quick Start

## Running the Server

```bash
# Navigate to the j-backend folder
cd j-backend

# Install dependencies (if not already done)
npm install

# Start development server (with hot reload)
npm run dev

# OR start production server
npm start
```

The server runs on **http://localhost:8000** by default.

---

## Environment Configuration

Create a `.env` file in the `j-backend` folder:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/inventory_ledger
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=your-secret-key-change-in-production
DEBUG=true
PORT=8000
```

---

## Changes from Python Backend

| Aspect | Python (FastAPI) | JavaScript (Express) |
|--------|------------------|---------------------|
| **ORM** | SQLAlchemy | Sequelize |
| **Validation** | Pydantic | Joi |
| **Background Jobs** | Celery | Bull Queue |
| **Password Hashing** | passlib/bcrypt | bcryptjs |
| **JWT Library** | python-jose | jsonwebtoken |
| **Date Handling** | datetime | date-fns |

### Key Differences

1. **Database Sessions**: Instead of `Depends(get_db)`, use Sequelize models directly or `sequelize.transaction()` for transactions.

2. **Async/Await**: Both use async/await, but Express uses `express-async-handler` wrapper for route handlers.

3. **Response Format**: Identical JSON response structure maintained across all endpoints.

4. **Authentication**: Same JWT token format - tokens from Python backend will work with JS backend and vice versa (if using same `SECRET_KEY`).

5. **API Paths**: All endpoints are identical (`/api/v1/...`).

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start with nodemon (auto-restart) |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Auto-fix lint issues |
| `npm test` | Run tests |

---

## Health Check

Verify the server is running:

```bash
curl http://localhost:8000/health
```

Expected response:
```json
{
  "status": "healthy",
  "app": "InventoryLedger CRM",
  "version": "1.0.0"
}
```

