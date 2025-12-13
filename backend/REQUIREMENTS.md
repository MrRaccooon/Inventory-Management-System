# Requirements Files Explanation

This project uses two requirements files to separate production and development dependencies.

## Files

### `requirements.txt` - Production Dependencies

Contains all packages needed to run the application in production:

- **FastAPI & Server**: FastAPI, Uvicorn
- **Database**: SQLAlchemy (>=2.0.36 for Python 3.13 compatibility), psycopg3, Alembic
- **Authentication**: python-jose, passlib
- **Data Processing**: NumPy, Pandas
- **PDF/Excel**: reportlab, weasyprint, openpyxl
- **Caching**: Redis
- **Background Tasks**: Celery, Flower
- **Other**: Pydantic, python-dotenv, loguru, etc.

**Install:**
```bash
pip install -r requirements.txt
```

### `requirements-dev.txt` - Development Dependencies

Contains tools only needed during development:

- **Testing**: pytest, pytest-asyncio, pytest-cov
- **Code Quality**: black (formatter), flake8 (linter), mypy (type checker), isort (import sorter)
- **Development Tools**: ipython, ipdb

**Install:**
```bash
pip install -r requirements-dev.txt
```

## Key Version Notes

### SQLAlchemy >=2.0.36
- Required for Python 3.13 compatibility
- Fixes typing issues with Python 3.13's typing system
- If using Python <3.13, 2.0.23+ works fine

### Pydantic >=2.6.0
- Required for FastAPI 0.104+
- Pydantic 2.x has breaking changes from v1.x

### NumPy >=2.0.0
- Python 3.13 compatibility
- Works with Pandas 2.2.x

### psycopg[binary] >=3.1.0
- Modern PostgreSQL driver for Python 3.13
- Better than psycopg2-binary for newer Python versions

## Installation Order

If you encounter issues, install in this order:

```bash
# 1. Upgrade pip
pip install --upgrade pip

# 2. Install production dependencies
pip install -r requirements.txt

# 3. Install development dependencies (optional)
pip install -r requirements-dev.txt
```

## Troubleshooting

### SQLAlchemy Import Errors (Python 3.13)
**Solution:** Ensure SQLAlchemy >=2.0.36 is installed:
```bash
pip install --upgrade "sqlalchemy>=2.0.36,<3.0.0"
```

### NumPy/Pandas Conflicts
**Solution:** Install NumPy before Pandas:
```bash
pip uninstall numpy pandas
pip install numpy>=2.0.0
pip install pandas>=2.2.0
```

### psycopg Import Errors
**Solution:** Ensure psycopg3 is installed:
```bash
pip install "psycopg[binary]>=3.1.0"
```

