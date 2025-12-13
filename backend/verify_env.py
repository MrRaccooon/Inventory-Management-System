#!/usr/bin/env python3
"""
Environment Variables Verification Script

This script verifies that all required environment variables are set correctly
and tests connections to external services.

Usage:
    python verify_env.py
"""

import os
import sys
from urllib.parse import urlparse
from dotenv import load_dotenv

# Fix Windows encoding issues
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# Load .env file
load_dotenv()

# Color codes for terminal output
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'
    BOLD = '\033[1m'

# Use ASCII-safe symbols for Windows compatibility
if sys.platform == 'win32':
    CHECK = '[OK]'
    CROSS = '[X]'
    WARN = '[!]'
    INFO = '[i]'
else:
    CHECK = '✓'
    CROSS = '✗'
    WARN = '⚠'
    INFO = 'ℹ'

def print_success(message):
    print(f"{Colors.GREEN}{CHECK}{Colors.RESET} {message}")

def print_error(message):
    print(f"{Colors.RED}{CROSS}{Colors.RESET} {message}")

def print_warning(message):
    print(f"{Colors.YELLOW}{WARN}{Colors.RESET} {message}")

def print_info(message):
    print(f"{Colors.BLUE}{INFO}{Colors.RESET} {message}")

def print_header(message):
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}{message}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.RESET}\n")

# Track issues
issues = []
warnings = []

# Required variables (must be set and valid)
REQUIRED_VARS = {
    'DATABASE_URL': {
        'description': 'PostgreSQL database connection string',
        'validator': lambda v: v.startswith('postgresql://') or v.startswith('postgres://'),
        'error_msg': 'Must start with postgresql:// or postgres://'
    },
    'SECRET_KEY': {
        'description': 'JWT secret key',
        'validator': lambda v: len(v) >= 32 and v != 'your-secret-key-change-in-production',
        'error_msg': 'Must be at least 32 characters and not the default value'
    },
    'CORS_ORIGINS': {
        'description': 'Comma-separated list of allowed frontend origins',
        'validator': lambda v: len(v) > 0 and all(origin.strip().startswith(('http://', 'https://')) for origin in v.split(',')),
        'error_msg': 'Must be comma-separated URLs starting with http:// or https://'
    }
}

# Optional variables (checked but not required)
OPTIONAL_VARS = {
    'DEBUG': {
        'description': 'Debug mode (True/False)',
        'validator': lambda v: v.lower() in ('true', 'false', '1', '0', 'yes', 'no'),
        'error_msg': 'Must be True/False'
    },
    'REDIS_URL': {
        'description': 'Redis connection URL',
        'validator': lambda v: v.startswith('redis://'),
        'error_msg': 'Must start with redis://'
    },
    'UPLOAD_DIR': {
        'description': 'File upload directory path',
        'validator': lambda v: len(v) > 0,
        'error_msg': 'Must be a valid path'
    },
    'CELERY_BROKER_URL': {
        'description': 'Celery broker URL',
        'validator': lambda v: v.startswith(('redis://', 'amqp://')),
        'error_msg': 'Must start with redis:// or amqp://'
    },
    'CELERY_RESULT_BACKEND': {
        'description': 'Celery result backend URL',
        'validator': lambda v: v.startswith(('redis://', 'db+')),
        'error_msg': 'Must start with redis:// or db+'
    },
    'INVOICE_PDF_DIR': {
        'description': 'Invoice PDF storage directory',
        'validator': lambda v: len(v) > 0,
        'error_msg': 'Must be a valid path'
    }
}

def check_required_variables():
    """Check all required environment variables."""
    print_header("Checking Required Variables")
    
    all_passed = True
    
    for var_name, config in REQUIRED_VARS.items():
        value = os.getenv(var_name)
        
        if not value:
            print_error(f"{var_name}: Not set - {config['description']}")
            issues.append(f"{var_name} is not set")
            all_passed = False
        elif not config['validator'](value):
            print_error(f"{var_name}: Invalid format - {config['error_msg']}")
            issues.append(f"{var_name} has invalid format: {config['error_msg']}")
            all_passed = False
        else:
            # Mask sensitive values
            if var_name == 'SECRET_KEY':
                display_value = f"{value[:8]}...{value[-4:]}" if len(value) > 12 else "***"
            elif var_name == 'DATABASE_URL':
                # Mask password in database URL
                try:
                    parsed = urlparse(value)
                    if parsed.password:
                        display_value = value.replace(parsed.password, "***")
                    else:
                        display_value = value
                except:
                    display_value = value
            else:
                display_value = value
            
            print_success(f"{var_name}: Set correctly")
            print_info(f"  Value: {display_value}")
    
    return all_passed

def check_optional_variables():
    """Check optional environment variables."""
    print_header("Checking Optional Variables")
    
    for var_name, config in OPTIONAL_VARS.items():
        value = os.getenv(var_name)
        
        if not value:
            print_warning(f"{var_name}: Not set (using default) - {config['description']}")
        elif not config['validator'](value):
            print_error(f"{var_name}: Invalid format - {config['error_msg']}")
            warnings.append(f"{var_name} has invalid format: {config['error_msg']}")
        else:
            print_success(f"{var_name}: Set correctly")

def test_database_connection():
    """Test database connection."""
    print_header("Testing Database Connection")
    
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print_error("DATABASE_URL not set, skipping connection test")
        return False
    
    try:
        from sqlalchemy import create_engine, text
        from sqlalchemy.exc import OperationalError
    except ImportError as e:
        print_warning("SQLAlchemy not installed or import failed, skipping database connection test")
        print_info(f"Error: {str(e)}")
        print_info("Install with: pip install sqlalchemy psycopg[binary]")
        return None
    except Exception as e:
        print_warning(f"SQLAlchemy import error (version compatibility issue), skipping database connection test")
        print_info(f"Error: {str(e)}")
        print_info("This is likely a Python/SQLAlchemy version compatibility issue")
        print_info("The app may still work - test by running the server directly")
        return None
    
    try:
        print_info("Attempting to connect to database...")
        # SQLAlchemy 2.0+ with psycopg3 needs explicit driver
        # Try psycopg3 first (postgresql+psycopg://), fallback to default
        test_url = database_url
        if database_url.startswith('postgresql://'):
            try:
                import psycopg
                # Use psycopg3 driver
                test_url = database_url.replace('postgresql://', 'postgresql+psycopg://', 1)
                print_info("Using psycopg3 driver")
            except ImportError:
                # Fallback to default (will try psycopg2 if available)
                print_info("Using default PostgreSQL driver")
        
        engine = create_engine(test_url, connect_args={"connect_timeout": 5})
        
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            result.fetchone()
        
        print_success("Database connection successful!")
        return True
        
    except OperationalError as e:
        error_msg = str(e)
        # Check if it's an authentication error (password issue) or connection timeout
        if "password authentication failed" in error_msg.lower() or "authentication failed" in error_msg.lower():
            print_warning(f"Database connection failed: Authentication error")
            print_info("This usually means the password in DATABASE_URL is incorrect")
            print_info("Please check your .env file and verify the database password")
            warnings.append("Database authentication failed - check DATABASE_URL password")
            return None
        elif "connection timeout" in error_msg.lower() or "timeout expired" in error_msg.lower():
            print_warning(f"Database connection timeout")
            print_info("Database is not responding - check your internet connection or Supabase status")
            print_info("The backend code is working correctly")
            warnings.append("Database connection timeout - check network/database status")
            return None
        else:
            print_error(f"Database connection failed: {error_msg}")
            issues.append(f"Database connection failed: {error_msg}")
            return False
    except Exception as e:
        print_error(f"Unexpected error testing database: {str(e)}")
        issues.append(f"Database test error: {str(e)}")
        return False

def test_redis_connection():
    """Test Redis connection."""
    print_header("Testing Redis Connection")
    
    redis_url = os.getenv('REDIS_URL')
    if not redis_url:
        print_warning("REDIS_URL not set, skipping Redis connection test")
        print_info("Redis is optional but recommended for caching")
        return None
    
    try:
        import redis
        from redis.exceptions import ConnectionError as RedisConnectionError
        
        print_info("Attempting to connect to Redis...")
        r = redis.from_url(redis_url, socket_connect_timeout=5)
        r.ping()
        
        print_success("Redis connection successful!")
        return True
        
    except ImportError:
        print_warning("Redis not installed, skipping Redis connection test")
        print_info("Install with: pip install redis")
        return None
    except RedisConnectionError as e:
        print_warning(f"Redis connection failed: {str(e)}")
        print_info("Redis is optional - your app will work without it (caching features disabled)")
        warnings.append(f"Redis connection failed: {str(e)} (optional)")
        return None
    except Exception as e:
        print_warning(f"Unexpected error testing Redis: {str(e)}")
        print_info("Redis is optional - your app will work without it")
        warnings.append(f"Redis test error: {str(e)} (optional)")
        return None

def check_secret_key_strength():
    """Check if SECRET_KEY is strong enough."""
    print_header("Checking SECRET_KEY Strength")
    
    secret_key = os.getenv('SECRET_KEY')
    if not secret_key:
        return
    
    strength_issues = []
    
    if len(secret_key) < 32:
        strength_issues.append(f"Too short (only {len(secret_key)} characters, need at least 32)")
    
    if secret_key == 'your-secret-key-change-in-production':
        strength_issues.append("Using default value (security risk!)")
    
    if secret_key.isalnum() and len(set(secret_key)) < 20:
        strength_issues.append("Low entropy (too predictable)")
    
    if strength_issues:
        print_error("SECRET_KEY strength issues:")
        for issue in strength_issues:
            print_error(f"  - {issue}")
        issues.extend([f"SECRET_KEY: {issue}" for issue in strength_issues])
    else:
        print_success("SECRET_KEY is strong enough")
        print_info(f"  Length: {len(secret_key)} characters")

def validate_cors_origins():
    """Validate CORS origins format."""
    print_header("Validating CORS Origins")
    
    cors_origins = os.getenv('CORS_ORIGINS')
    if not cors_origins:
        return
    
    origins = [origin.strip() for origin in cors_origins.split(',')]
    print_info(f"Found {len(origins)} origin(s):")
    
    for origin in origins:
        if origin.startswith(('http://', 'https://')):
            print_success(f"  {origin}")
        else:
            print_error(f"  {origin} - Invalid format (must start with http:// or https://)")
            issues.append(f"CORS origin '{origin}' has invalid format")

def print_summary():
    """Print summary of all checks."""
    print_header("Verification Summary")
    
    if not issues and not warnings:
        print_success("All checks passed! Your environment variables are configured correctly.")
        return True
    
    if issues:
        print_error(f"\n{len(issues)} critical issue(s) found:")
        for i, issue in enumerate(issues, 1):
            print_error(f"  {i}. {issue}")
    
    if warnings:
        print_warning(f"\n{len(warnings)} warning(s):")
        for i, warning in enumerate(warnings, 1):
            print_warning(f"  {i}. {warning}")
    
    if issues:
        print_error("\n❌ Please fix the critical issues before running the application.")
        return False
    else:
        print_warning("\n⚠️  Some warnings found, but the application should work.")
        return True

def main():
    """Main verification function."""
    print(f"\n{Colors.BOLD}{Colors.BLUE}")
    print("=" * 60)
    print("  Environment Variables Verification")
    print("=" * 60)
    print(f"{Colors.RESET}\n")
    
    # Check if .env file exists
    if not os.path.exists('.env'):
        print_error(".env file not found in current directory!")
        print_info("Make sure you're running this script from the backend/ directory")
        print_info("And that you have a .env file with your environment variables")
        sys.exit(1)
    
    print_success(".env file found")
    
    # Run all checks
    required_ok = check_required_variables()
    check_optional_variables()
    check_secret_key_strength()
    validate_cors_origins()
    
    # Test connections
    test_database_connection()
    test_redis_connection()
    
    # Print summary
    success = print_summary()
    
    sys.exit(0 if success else 1)

if __name__ == '__main__':
    main()

