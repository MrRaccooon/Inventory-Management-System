# API Testing Guide - Inventory Management System

**Base URL**: `http://localhost:8000`  
**Total Endpoints**: 89  
**Last Updated**: December 13, 2025

---

## Table of Contents

1. [Authentication & Authorization (18 endpoints)](#authentication--authorization)
2. [Shop Management (5 endpoints)](#shop-management)
3. [Category Management (5 endpoints)](#category-management)
4. [Customer Management (6 endpoints)](#customer-management)
5. [Supplier Management (5 endpoints)](#supplier-management)
6. [Product & Inventory (13 endpoints)](#product--inventory)
7. [Sales Management (8 endpoints)](#sales-management)
8. [Invoice Management (5 endpoints)](#invoice-management)
9. [GST Reports (3 endpoints)](#gst-reports)
10. [Notifications (5 endpoints)](#notifications)
11. [Employees (7 endpoints)](#employees)
12. [Reports & Analytics (6 endpoints)](#reports--analytics)
13. [Search (3 endpoints)](#search)
14. [Dashboard (1 endpoint)](#dashboard)
15. [AI Analytics (1 endpoint)](#ai-analytics)
16. [Profitability (1 endpoint)](#profitability)

---

## Prerequisites

1. **Start the server**:
   ```bash
   cd backend
   .venv\Scripts\activate  # Windows
   uvicorn app.main:app --reload
   ```

2. **Access API Documentation**:
   - Swagger UI: http://localhost:8000/docs
   - ReDoc: http://localhost:8000/redoc

3. **Testing Tools**:
   - Postman
   - cURL
   - Python requests
   - Swagger UI (built-in)

---

## Authentication & Authorization

### 1. Register (Sign Up)

**Endpoint**: `POST /api/v1/auth/register`  
**Auth Required**: No  
**Description**: Create a new user account with optional shop creation

**Sample Request**:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "shop_name": "John's Electronics",
  "role": "owner",
  "gst_number": "29ABCDE1234F1Z5"
}
```

**Testing Steps**:
1. Send POST request with the above JSON
2. Should return 201 Created with user details
3. Note the `user_id` and `shop_id` from response
4. Email verification token is generated (check server logs in development)

**Expected Response**:
```json
{
  "id": "uuid-here",
  "shop_id": "shop-uuid-here",
  "name": "John Doe",
  "email": "john@example.com",
  "role": "owner",
  "is_active": true,
  "email_verified": false,
  "last_login": null
}
```

---

### 2. Login (OAuth2)

**Endpoint**: `POST /api/v1/auth/login`  
**Auth Required**: No  
**Content-Type**: `application/x-www-form-urlencoded`  
**Description**: Standard OAuth2 login

**Sample Request** (Form Data):
```
username=john@example.com
password=SecurePass123!
```

**cURL Example**:
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=john@example.com&password=SecurePass123!"
```

**Testing Steps**:
1. Use the email as `username` and password from registration
2. Should return 200 OK with access token
3. Save the `access_token` for subsequent requests
4. Token expires in 30 minutes (default)

**Expected Response**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer"
}
```

---

### 3. Login (JSON)

**Endpoint**: `POST /api/v1/auth/login/json`  
**Auth Required**: No  
**Description**: JSON-based login (alternative to OAuth2)

**Sample Request**:
```json
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Testing Steps**:
1. Send POST request with JSON body
2. Should return 200 OK with access token
3. Use this token in Authorization header: `Bearer <token>`

---

### 4. Refresh Token

**Endpoint**: `POST /api/v1/auth/refresh`  
**Auth Required**: No  
**Description**: Get a new access token using refresh token

**Sample Request**:
```json
{
  "refresh_token": "your-refresh-token-here"
}
```

**Testing Steps**:
1. First login and obtain a refresh token (implement in login endpoints)
2. Use refresh token to get new access token
3. New token valid for 30 minutes

---

### 5. Get Current User

**Endpoint**: `GET /api/v1/auth/me`  
**Auth Required**: Yes  
**Description**: Get current authenticated user information

**Headers**:
```
Authorization: Bearer <your-access-token>
```

**Testing Steps**:
1. Add Authorization header with valid token
2. Send GET request
3. Should return current user details

**Expected Response**:
```json
{
  "id": "uuid",
  "shop_id": "shop-uuid",
  "name": "John Doe",
  "email": "john@example.com",
  "role": "owner",
  "is_active": true,
  "email_verified": false,
  "last_login": "2025-12-13T10:30:00Z"
}
```

---

### 6. Update Profile

**Endpoint**: `PATCH /api/v1/auth/me`  
**Auth Required**: Yes  
**Description**: Update user profile (name, email)

**Sample Request**:
```json
{
  "name": "John Updated Doe",
  "email": "john.updated@example.com"
}
```

**Testing Steps**:
1. Send PATCH with updated fields (all fields optional)
2. Can update name, email, or both
3. Should return updated user details

---

### 7. Change Password

**Endpoint**: `POST /api/v1/auth/change-password`  
**Auth Required**: Yes  
**Description**: Change password for authenticated user

**Sample Request**:
```json
{
  "current_password": "SecurePass123!",
  "new_password": "NewSecurePass456!"
}
```

**Testing Steps**:
1. Must provide correct current password
2. New password must be different
3. After success, login with new password

---

### 8. Forgot Password

**Endpoint**: `POST /api/v1/auth/forgot-password`  
**Auth Required**: No  
**Description**: Request password reset token

**Sample Request**:
```json
{
  "email": "john@example.com"
}
```

**Testing Steps**:
1. Send email of registered user
2. Returns reset token (in development, check server logs)
3. In production, token sent via email
4. Token valid for 30 minutes

**Expected Response**:
```json
{
  "message": "Password reset email sent",
  "reset_token": "token-here-for-testing"
}
```

---

### 9. Reset Password

**Endpoint**: `POST /api/v1/auth/reset-password`  
**Auth Required**: No  
**Description**: Reset password using token

**Sample Request**:
```json
{
  "token": "reset-token-from-forgot-password",
  "new_password": "NewPassword123!"
}
```

**Testing Steps**:
1. Use token from forgot-password endpoint
2. Set new password
3. Token is single-use only
4. Login with new password after reset

---

### 10. Verify Email

**Endpoint**: `POST /api/v1/auth/verify-email`  
**Auth Required**: No  
**Description**: Verify email address with token

**Sample Request**:
```json
{
  "token": "email-verification-token"
}
```

**Testing Steps**:
1. Use token generated during registration
2. Sets `email_verified` to true
3. Token is single-use

---

### 11. Resend Verification Email

**Endpoint**: `POST /api/v1/auth/resend-verification`  
**Auth Required**: No  
**Description**: Resend email verification token

**Sample Request**:
```json
{
  "email": "john@example.com"
}
```

**Testing Steps**:
1. Send email of unverified user
2. New token generated (24hr expiry)
3. Can be called multiple times

---

### 12. Logout

**Endpoint**: `POST /api/v1/auth/logout`  
**Auth Required**: Yes  
**Description**: Logout user (client-side token invalidation)

**Testing Steps**:
1. Send POST with valid token
2. Client should discard token
3. Subsequent requests with same token still work (JWT is stateless)

---

### 13. Deactivate Account

**Endpoint**: `POST /api/v1/auth/deactivate-account`  
**Auth Required**: Yes  
**Description**: Deactivate own account (soft delete)

**Sample Request**:
```json
{
  "current_password": "SecurePass123!",
  "new_password": "dummy"
}
```

**Testing Steps**:
1. Must provide current password for confirmation
2. Account set to `is_active: false`
3. Cannot login after deactivation
4. Admin can reactivate

---

### 14. Reactivate Account

**Endpoint**: `POST /api/v1/auth/reactivate-account/{user_id}`  
**Auth Required**: Yes (Owner/Admin only)  
**Description**: Reactivate deactivated user account

**Sample Request**: None (path parameter only)

**Testing Steps**:
1. Must be owner or admin
2. Provide user_id in URL path
3. Sets `is_active: true`
4. User can login again

**Example**:
```bash
POST /api/v1/auth/reactivate-account/550e8400-e29b-41d4-a716-446655440000
```

---

### 15. Setup 2FA

**Endpoint**: `POST /api/v1/auth/2fa/setup`  
**Auth Required**: Yes  
**Description**: Setup Two-Factor Authentication

**Sample Request**:
```json
{
  "password": "SecurePass123!"
}
```

**Testing Steps**:
1. Provide password for confirmation
2. Returns QR code (base64 image) and secret
3. Scan QR with authenticator app (Google Authenticator, Authy)
4. Secret key stored but 2FA not enabled yet

**Expected Response**:
```json
{
  "message": "Scan QR code with authenticator app",
  "qr_code": "data:image/png;base64,iVBORw0KG...",
  "secret": "JBSWY3DPEHPK3PXP",
  "note": "Save this secret key"
}
```

---

### 16. Enable 2FA

**Endpoint**: `POST /api/v1/auth/2fa/enable`  
**Auth Required**: Yes  
**Description**: Enable 2FA after setup

**Sample Request**:
```json
{
  "code": "123456"
}
```

**Testing Steps**:
1. Get 6-digit code from authenticator app
2. Code changes every 30 seconds
3. Verifies and enables 2FA
4. Future logins require OTP code

---

### 17. Disable 2FA

**Endpoint**: `POST /api/v1/auth/2fa/disable`  
**Auth Required**: Yes  
**Description**: Disable Two-Factor Authentication

**Sample Request**:
```json
{
  "password": "SecurePass123!"
}
```

**Testing Steps**:
1. Provide password for confirmation
2. Disables 2FA and removes secret
3. Normal login resumes

---

### 18. Login with 2FA

**Endpoint**: `POST /api/v1/auth/login/2fa`  
**Auth Required**: No  
**Description**: Login with email, password, and OTP code

**Sample Request**:
```json
{
  "email": "john@example.com",
  "password": "SecurePass123!",
  "code": "123456"
}
```

**Testing Steps**:
1. User must have 2FA enabled
2. Get current OTP from authenticator app
3. Provide all three: email, password, code
4. Returns access token on success

---

## Shop Management

### 19. Create Shop

**Endpoint**: `POST /api/v1/shops`  
**Auth Required**: Yes  
**Description**: Create a new shop

**Sample Request**:
```json
{
  "name": "Tech Store Mumbai",
  "address": "123 MG Road, Mumbai",
  "city": "Mumbai",
  "state": "Maharashtra",
  "pincode": "400001",
  "gst_number": "27ABCDE1234F1Z5",
  "phone": "+91-9876543210",
  "email": "info@techstore.com"
}
```

**Testing Steps**:
1. Send POST with shop details
2. Returns created shop with ID
3. User becomes associated with shop

---

### 20. List Shops

**Endpoint**: `GET /api/v1/shops`  
**Auth Required**: Yes (Admin only)  
**Description**: List all shops

**Query Parameters**:
- `skip`: Offset (default: 0)
- `limit`: Limit (default: 100)

**Testing Steps**:
1. Admin users see all shops
2. Owners see their shop only
3. Supports pagination

**Example**:
```
GET /api/v1/shops?skip=0&limit=10
```

---

### 21. Get Shop

**Endpoint**: `GET /api/v1/shops/{shop_id}`  
**Auth Required**: Yes  
**Description**: Get specific shop details

**Testing Steps**:
1. Provide shop_id in URL
2. Users can only view their own shop
3. Admins can view any shop

**Example**:
```
GET /api/v1/shops/550e8400-e29b-41d4-a716-446655440000
```

---

### 22. Update Shop

**Endpoint**: `PATCH /api/v1/shops/{shop_id}`  
**Auth Required**: Yes (Owner/Admin)  
**Description**: Update shop details

**Sample Request**:
```json
{
  "name": "Updated Store Name",
  "phone": "+91-9876543211",
  "email": "newemail@techstore.com"
}
```

**Testing Steps**:
1. All fields optional
2. Only owner or admin can update
3. Returns updated shop details

---

### 23. Delete Shop

**Endpoint**: `DELETE /api/v1/shops/{shop_id}`  
**Auth Required**: Yes (Admin only)  
**Description**: Delete a shop

**Testing Steps**:
1. Admin only operation
2. Returns 204 No Content
3. Soft delete (can be recovered)

---

## Category Management

### 24. Create Category

**Endpoint**: `POST /api/v1/categories`  
**Auth Required**: Yes  
**Description**: Create product category

**Sample Request**:
```json
{
  "name": "Electronics",
  "description": "Electronic items and gadgets",
  "parent_id": null
}
```

**Testing Steps**:
1. `parent_id` can be null for root category
2. Or provide parent category ID for subcategory
3. Returns created category

---

### 25. List Categories

**Endpoint**: `GET /api/v1/categories`  
**Auth Required**: Yes  
**Description**: List all categories

**Query Parameters**:
- `skip`: Offset
- `limit`: Limit

**Testing Steps**:
1. Returns categories for current shop
2. Supports pagination
3. Shows hierarchical structure

---

### 26. Get Category

**Endpoint**: `GET /api/v1/categories/{category_id}`  
**Auth Required**: Yes  
**Description**: Get specific category

**Testing Steps**:
1. Returns category details
2. Shop isolation enforced

---

### 27. Update Category

**Endpoint**: `PATCH /api/v1/categories/{category_id}`  
**Auth Required**: Yes  
**Description**: Update category

**Sample Request**:
```json
{
  "name": "Updated Electronics",
  "description": "New description"
}
```

---

### 28. Delete Category

**Endpoint**: `DELETE /api/v1/categories/{category_id}`  
**Auth Required**: Yes (Owner/Manager/Admin)  
**Description**: Delete category (soft delete)

---

## Customer Management

### 29. Create Customer

**Endpoint**: `POST /api/v1/customers`  
**Auth Required**: Yes  
**Description**: Create new customer

**Sample Request**:
```json
{
  "name": "Rahul Sharma",
  "email": "rahul@example.com",
  "phone": "+91-9876543210",
  "address": "456 Park Street",
  "city": "Delhi",
  "state": "Delhi",
  "pincode": "110001",
  "gst_number": "07ABCDE1234F1Z5",
  "credit_limit": 50000.00,
  "notes": "Regular customer"
}
```

**Testing Steps**:
1. Phone is required, email optional
2. Duplicate phone in same shop not allowed
3. Returns created customer with ID

---

### 30. List Customers

**Endpoint**: `GET /api/v1/customers`  
**Auth Required**: Yes  
**Description**: List all customers

**Query Parameters**:
- `skip`: Offset (default: 0)
- `limit`: Limit (default: 100)
- `search`: Search by name/phone/email
- `is_active`: Filter by status

**Testing Steps**:
1. Returns customers for current shop
2. Search works across name, phone, email
3. Can filter by active status

**Example**:
```
GET /api/v1/customers?search=rahul&is_active=true&skip=0&limit=10
```

---

### 31. Get Customer

**Endpoint**: `GET /api/v1/customers/{customer_id}`  
**Auth Required**: Yes  
**Description**: Get customer details

---

### 32. Update Customer

**Endpoint**: `PATCH /api/v1/customers/{customer_id}`  
**Auth Required**: Yes  
**Description**: Update customer

**Sample Request**:
```json
{
  "phone": "+91-9876543211",
  "credit_limit": 75000.00
}
```

---

### 33. Delete Customer

**Endpoint**: `DELETE /api/v1/customers/{customer_id}`  
**Auth Required**: Yes (Owner/Manager/Admin)  
**Description**: Delete customer (soft delete)

---

### 34. Get Customer Purchase History

**Endpoint**: `GET /api/v1/customers/{customer_id}/purchase-history`  
**Auth Required**: Yes  
**Description**: Get customer's purchase history

**Query Parameters**:
- `skip`: Offset
- `limit`: Limit (default: 50)

**Testing Steps**:
1. Shows all sales for this customer
2. Based on phone number matching
3. Includes totals and order count

**Expected Response**:
```json
{
  "customer_id": "uuid",
  "customer_name": "Rahul Sharma",
  "total_purchases": 125000.00,
  "total_orders": 15,
  "purchases": [
    {
      "sale_id": "uuid",
      "invoice_no": "INV-001",
      "date": "2025-12-13T10:30:00Z",
      "total_amount": 5000.00,
      "payment_type": "cash",
      "status": "paid"
    }
  ]
}
```

---

## Supplier Management

### 35. Create Supplier

**Endpoint**: `POST /api/v1/suppliers`  
**Auth Required**: Yes  
**Description**: Create new supplier

**Sample Request**:
```json
{
  "name": "ABC Electronics Pvt Ltd",
  "company_name": "ABC Electronics",
  "email": "contact@abc.com",
  "phone": "+91-9876543210",
  "address": "Industrial Area Phase 1",
  "city": "Bangalore",
  "state": "Karnataka",
  "pincode": "560001",
  "gst_number": "29ABCDE1234F1Z5",
  "pan_number": "ABCDE1234F",
  "payment_terms": "Net 30",
  "notes": "Preferred supplier"
}
```

---

### 36. List Suppliers

**Endpoint**: `GET /api/v1/suppliers`  
**Auth Required**: Yes  
**Description**: List all suppliers

**Query Parameters**:
- `skip`, `limit`, `search`, `is_active`

---

### 37-39. Get/Update/Delete Supplier

Similar to Customer endpoints (37-39)

---

## Product & Inventory

### 40. Create Product

**Endpoint**: `POST /api/v1/products`  
**Auth Required**: Yes  
**Description**: Create new product

**Sample Request**:
```json
{
  "name": "iPhone 15 Pro",
  "sku": "IPH15PRO-256",
  "description": "iPhone 15 Pro 256GB",
  "category_id": "category-uuid",
  "unit_price": 129900.00,
  "unit_cost": 110000.00,
  "current_stock": 10,
  "reorder_point": 5,
  "barcode": "1234567890123",
  "gst_rate": 18.0
}
```

---

### 41. List Products

**Endpoint**: `GET /api/v1/products`  
**Auth Required**: Yes  
**Description**: List all products

**Query Parameters**:
- `skip`, `limit`
- `search`: Search by name/SKU
- `category_id`: Filter by category
- `low_stock`: Boolean

**Example**:
```
GET /api/v1/products?search=iphone&low_stock=true&skip=0&limit=20
```

---

### 42. Get Product

**Endpoint**: `GET /api/v1/products/{product_id}`  
**Auth Required**: Yes  

---

### 43. Update Product

**Endpoint**: `PATCH /api/v1/products/{product_id}`  
**Auth Required**: Yes  

**Sample Request**:
```json
{
  "unit_price": 124900.00,
  "reorder_point": 3
}
```

---

### 44. Adjust Stock

**Endpoint**: `POST /api/v1/products/{product_id}/adjust-stock`  
**Auth Required**: Yes  
**Description**: Manually adjust product stock

**Query Parameters**:
- `new_quantity`: Target stock level
- `reason`: Reason for adjustment

**Example**:
```
POST /api/v1/products/{id}/adjust-stock?new_quantity=50&reason=Physical count adjustment
```

**Testing Steps**:
1. Creates stock movement record
2. Updates current_stock to new_quantity
3. Tracks who made the adjustment

---

### 45. Inventory Summary

**Endpoint**: `GET /api/v1/products/summary`  
**Auth Required**: Yes  
**Description**: Get inventory overview

**Expected Response**:
```json
{
  "total_products": 150,
  "total_stock_value": 5500000.00,
  "low_stock_count": 12,
  "out_of_stock_count": 3
}
```

---

### 46. Get Low Stock Products

**Endpoint**: `GET /api/v1/products/low-stock`  
**Auth Required**: Yes  
**Description**: List products at or below reorder point

**Expected Response**:
```json
{
  "low_stock_products": [
    {
      "id": "uuid",
      "name": "Product Name",
      "sku": "SKU-123",
      "current_stock": 2,
      "reorder_point": 5,
      "unit_price": 1000.00
    }
  ],
  "count": 12
}
```

---

### 47. Trigger Low Stock Check

**Endpoint**: `POST /api/v1/products/check-low-stock`  
**Auth Required**: Yes  
**Description**: Manually trigger low stock alert generation

**Testing Steps**:
1. Checks all products against reorder points
2. Creates notifications for low stock items
3. Prevents duplicate alerts

**Expected Response**:
```json
{
  "message": "Low stock check completed. Created 3 alert(s)",
  "alerts_created": 3,
  "notifications": [...]
}
```

---

### 48. Get Product by Barcode

**Endpoint**: `GET /api/v1/products/barcode/{barcode}`  
**Auth Required**: Yes  
**Description**: Lookup product by barcode/SKU

**Example**:
```
GET /api/v1/products/barcode/1234567890123
```

**Testing Steps**:
1. Uses SKU as barcode identifier
2. Quick lookup for POS systems
3. Returns 404 if not found

---

### 49. Bulk Barcode Scan

**Endpoint**: `POST /api/v1/products/scan-barcode`  
**Auth Required**: Yes  
**Description**: Scan multiple barcodes at once

**Sample Request**:
```json
{
  "barcodes": ["SKU-001", "SKU-002", "SKU-003"]
}
```

**Expected Response**:
```json
{
  "scanned": 3,
  "found": 2,
  "not_found": 1,
  "results": [
    {
      "barcode": "SKU-001",
      "found": true,
      "product": {...}
    },
    {
      "barcode": "SKU-003",
      "found": false,
      "error": "Product not found"
    }
  ]
}
```

---

### 50. Export Products CSV

**Endpoint**: `GET /api/v1/products/export/csv`  
**Auth Required**: Yes  
**Description**: Export all products as CSV

**Testing Steps**:
1. Returns CSV file download
2. Includes all product fields
3. Use for backup or reporting

---

### 51. Import Products CSV

**Endpoint**: `POST /api/v1/products/import/csv`  
**Auth Required**: Yes  
**Content-Type**: `multipart/form-data`  
**Description**: Bulk import products from CSV

**Sample Request**:
```
file: products.csv (file upload)
```

**CSV Format**:
```csv
SKU,Name,Description,Category ID,Price MRP,Cost Price,Current Stock,Min Stock,Barcode
SKU-001,Product 1,Description,uuid,1000,800,50,10,12345
```

**Testing Steps**:
1. Upload CSV file
2. Creates new products or updates existing (by SKU)
3. Returns summary with errors

**Expected Response**:
```json
{
  "message": "Bulk import completed",
  "created": 25,
  "updated": 10,
  "errors": [
    "Row 5: Invalid price format"
  ],
  "total_processed": 35
}
```

---

### 52. Advanced Product Search

**Endpoint**: `GET /api/v1/search/advanced/products`  
**Auth Required**: Yes  
**Description**: Advanced multi-filter product search

**Query Parameters**:
- `name`: Product name (partial match)
- `sku`: SKU (partial match)
- `category_id`: Category UUID
- `min_price`, `max_price`: Price range
- `min_stock`, `max_stock`: Stock range
- `is_active`: Active status
- `low_stock_only`: Boolean
- `skip`, `limit`: Pagination

**Example**:
```
GET /api/v1/search/advanced/products?name=iphone&min_price=50000&max_price=150000&low_stock_only=false
```

**Expected Response**:
```json
{
  "products": [...],
  "total": 15,
  "skip": 0,
  "limit": 100,
  "filters_applied": {
    "name": "iphone",
    "min_price": 50000,
    "max_price": 150000
  }
}
```

---

## Sales Management

### 53. Create Sale

**Endpoint**: `POST /api/v1/sales`  
**Auth Required**: Yes  
**Description**: Create new sale/transaction

**Sample Request**:
```json
{
  "items": [
    {
      "product_id": "product-uuid",
      "quantity": 2,
      "unit_price": 1000.00,
      "discount": 100.00,
      "gst_rate": 18.0
    }
  ],
  "payment_type": "cash",
  "customer_info": {
    "name": "John Doe",
    "phone": "+91-9876543210"
  },
  "notes": "Walk-in customer"
}
```

**Testing Steps**:
1. Stock automatically deducted
2. Invoice number auto-generated
3. Profit calculated automatically
4. Creates stock movement records

---

### 54. List Sales

**Endpoint**: `GET /api/v1/sales`  
**Auth Required**: Yes  
**Description**: List all sales

**Query Parameters**:
- `skip`, `limit`
- `start_date`, `end_date`: Date range filter

**Example**:
```
GET /api/v1/sales?start_date=2025-12-01&end_date=2025-12-31&skip=0&limit=50
```

---

### 55. Get Sale

**Endpoint**: `GET /api/v1/sales/{sale_id}`  
**Auth Required**: Yes  
**Description**: Get sale details with items

---

### 56. Update Sale

**Endpoint**: `PATCH /api/v1/sales/{sale_id}`  
**Auth Required**: Yes  
**Description**: Update sale

**Sample Request**:
```json
{
  "status": "paid",
  "notes": "Payment received"
}
```

---

### 57. Void Sale

**Endpoint**: `POST /api/v1/sales/{sale_id}/void`  
**Auth Required**: Yes  
**Description**: Void/cancel a sale

**Testing Steps**:
1. Sets status to 'void'
2. Restores stock for all items
3. Creates reversal stock movements
4. Cannot be undone

---

### 58. Refund Sale

**Endpoint**: `POST /api/v1/sales/{sale_id}/refund`  
**Auth Required**: Yes  
**Description**: Process full or partial refund

**Sample Request**:
```json
{
  "reason": "Customer returned items",
  "refund_amount": null,
  "items": ["item-uuid-1", "item-uuid-2"]
}
```

**Testing Steps**:
1. `items` = null for full refund
2. Provide item UUIDs for partial refund
3. Stock restored for refunded items
4. Status set to 'refunded'

---

### 59. Get Payment Methods

**Endpoint**: `GET /api/v1/sales/payment-methods`  
**Auth Required**: No  
**Description**: Get list of available payment methods

**Expected Response**:
```json
{
  "payment_methods": [
    {
      "code": "cash",
      "name": "Cash",
      "description": "Cash payment"
    },
    {
      "code": "card",
      "name": "Card",
      "description": "Debit/Credit card"
    },
    {
      "code": "upi",
      "name": "UPI",
      "description": "UPI payment"
    }
  ]
}
```

---

### 60. Get Payment Statistics

**Endpoint**: `GET /api/v1/sales/payment-stats`  
**Auth Required**: Yes  
**Description**: Get payment method breakdown

**Query Parameters**:
- `start_date`, `end_date`: Date range

**Expected Response**:
```json
{
  "payment_stats": [
    {
      "payment_type": "cash",
      "count": 150,
      "total_amount": 450000.00
    },
    {
      "payment_type": "upi",
      "count": 200,
      "total_amount": 650000.00
    }
  ]
}
```

---

## Invoice Management

### 61. Create Invoice

**Endpoint**: `POST /api/v1/invoices/{sale_id}`  
**Auth Required**: Yes  
**Description**: Generate invoice for a sale

**Testing Steps**:
1. Provide sale_id in URL
2. Creates invoice record
3. Returns invoice details

---

### 62. List Invoices

**Endpoint**: `GET /api/v1/invoices`  
**Auth Required**: Yes  
**Description**: List all invoices

**Query Parameters**:
- `skip`, `limit`
- `start_date`, `end_date`

---

### 63. Get Invoice

**Endpoint**: `GET /api/v1/invoices/{invoice_id}`  
**Auth Required**: Yes  

---

### 64. Get Invoices by Sale

**Endpoint**: `GET /api/v1/invoices/sale/{sale_id}`  
**Auth Required**: Yes  
**Description**: Get all invoices for a specific sale

---

### 65. Delete Invoice

**Endpoint**: `DELETE /api/v1/invoices/{invoice_id}`  
**Auth Required**: Yes (Owner/Manager)  
**Description**: Delete an invoice

---

## GST Reports

### 66. GST Summary

**Endpoint**: `GET /api/v1/gst/summary`  
**Auth Required**: Yes  
**Description**: Get GST summary for period

**Query Parameters**:
- `start_date`, `end_date`

**Expected Response**:
```json
{
  "total_sales": 1000000.00,
  "total_gst": 180000.00,
  "cgst": 90000.00,
  "sgst": 90000.00,
  "igst": 0.00
}
```

---

### 67. GST Report

**Endpoint**: `GET /api/v1/gst/report`  
**Auth Required**: Yes  
**Description**: Detailed GST report

---

### 68. Create GST Invoice

**Endpoint**: `POST /api/v1/gst/invoices/{sale_id}`  
**Auth Required**: Yes  
**Description**: Create GST-compliant invoice

---

## Notifications

### 69. Create Notification

**Endpoint**: `POST /api/v1/notifications`  
**Auth Required**: Yes (Owner/Manager/Admin)  
**Description**: Create notification

**Sample Request**:
```json
{
  "title": "System Maintenance",
  "message": "System will be down for maintenance",
  "type": "info",
  "target_user_id": null
}
```

**Testing Steps**:
1. `target_user_id` = null for shop-wide
2. Or specific user UUID
3. Types: info, warning, error, success

---

### 70. List Notifications

**Endpoint**: `GET /api/v1/notifications`  
**Auth Required**: Yes  
**Description**: Get user's notifications

**Query Parameters**:
- `skip`, `limit`
- `unread_only`: Boolean

**Expected Response**:
```json
{
  "notifications": [...],
  "total": 25,
  "unread_count": 5,
  "skip": 0,
  "limit": 100
}
```

---

### 71. Mark Notifications Read

**Endpoint**: `POST /api/v1/notifications/mark-read`  
**Auth Required**: Yes  
**Description**: Mark specific notifications as read

**Sample Request**:
```json
{
  "notification_ids": ["uuid1", "uuid2", "uuid3"]
}
```

---

### 72. Mark All Read

**Endpoint**: `POST /api/v1/notifications/mark-all-read`  
**Auth Required**: Yes  
**Description**: Mark all notifications as read

---

### 73. Delete Notification

**Endpoint**: `DELETE /api/v1/notifications/{notification_id}`  
**Auth Required**: Yes  

---

## Employees

### 74-80. Employee Management

**Endpoints**:
- `POST /api/v1/employees` - Create employee
- `GET /api/v1/employees` - List employees
- `GET /api/v1/employees/{id}` - Get employee
- `PATCH /api/v1/employees/{id}` - Update employee
- `POST /api/v1/employees/attendance` - Record attendance
- `PATCH /api/v1/employees/attendance/{id}` - Update attendance
- `GET /api/v1/employees/{id}/performance` - Get performance

**Sample Create Employee**:
```json
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "phone": "+91-9876543210",
  "role": "staff",
  "salary": 30000.00,
  "joining_date": "2025-01-01"
}
```

---

## Reports & Analytics

### 81. Comprehensive Reports

**Endpoint**: `GET /api/v1/reports`  
**Auth Required**: Yes  
**Description**: Get comprehensive business reports

**Query Parameters**:
- `start_date`, `end_date`

**Expected Response**:
```json
{
  "summary": {
    "total_sales": 1000000,
    "total_profit": 200000,
    "total_orders": 500
  },
  "sales": {...},
  "inventory": {...},
  "employees": {...}
}
```

---

### 82. Export Report Excel

**Endpoint**: `GET /api/v1/reports/export/excel`  
**Auth Required**: Yes  
**Description**: Export report as Excel

**Query Parameters**:
- `start_date`, `end_date`

**Testing Steps**:
1. Returns Excel file (.xlsx)
2. Multiple sheets (Summary, Sales, etc.)
3. Styled headers

---

### 83. Export Report CSV

**Endpoint**: `GET /api/v1/reports/export/csv`  
**Auth Required**: Yes  
**Description**: Export report as CSV

**Query Parameters**:
- `report_type`: sales, products, inventory
- `start_date`, `end_date`

**Example**:
```
GET /api/v1/reports/export/csv?report_type=sales&start_date=2025-12-01
```

---

### 84-86. Other Report Endpoints

- `GET /api/v1/ai-analytics` - AI insights
- `POST /api/v1/ai-analytics/forecast` - Demand forecast
- `GET /api/v1/profitability` - Profitability analysis

---

## Search

### 87. Global Search

**Endpoint**: `GET /api/v1/search/global`  
**Auth Required**: Yes  
**Description**: Search across all entities

**Query Parameters**:
- `q`: Search query (min 2 chars)
- `limit`: Results per category (default: 10)

**Example**:
```
GET /api/v1/search/global?q=iphone&limit=5
```

**Expected Response**:
```json
{
  "query": "iphone",
  "results": {
    "products": [...],
    "customers": [],
    "suppliers": [],
    "sales": [...]
  },
  "total": 15
}
```

---

### 88. Advanced Sales Search

**Endpoint**: `GET /api/v1/search/advanced/sales`  
**Auth Required**: Yes  
**Description**: Advanced sales filtering

**Query Parameters**:
- `invoice_no`, `payment_type`, `status`
- `min_amount`, `max_amount`
- `start_date`, `end_date`

---

## Dashboard

### 89. Dashboard

**Endpoint**: `GET /api/v1/dashboard`  
**Auth Required**: Yes  
**Description**: Get dashboard KPIs and metrics

**Expected Response**:
```json
{
  "today_sales": 50000,
  "today_orders": 25,
  "low_stock_count": 12,
  "pending_orders": 5,
  "trends": {...},
  "top_products": [...],
  "alerts": [...]
}
```

---

## Complete Testing Workflow

### 1. Initial Setup

```bash
# Register a new user
POST /api/v1/auth/register
{
  "name": "Test User",
  "email": "test@example.com",
  "password": "Test123!",
  "shop_name": "Test Shop",
  "role": "owner"
}

# Login
POST /api/v1/auth/login/json
{
  "email": "test@example.com",
  "password": "Test123!"
}

# Save the access_token from response
```

### 2. Setup Shop Data

```bash
# Create categories
POST /api/v1/categories (with auth token)

# Create products
POST /api/v1/products (with auth token)

# Create customers
POST /api/v1/customers (with auth token)
```

### 3. Process Sales

```bash
# Create a sale
POST /api/v1/sales (with auth token)

# Generate invoice
POST /api/v1/invoices/{sale_id} (with auth token)

# View reports
GET /api/v1/reports?start_date=2025-12-01 (with auth token)
```

### 4. Test Advanced Features

```bash
# Setup 2FA
POST /api/v1/auth/2fa/setup
POST /api/v1/auth/2fa/enable

# Global search
GET /api/v1/search/global?q=product

# Export data
GET /api/v1/products/export/csv
GET /api/v1/reports/export/excel
```

---

## Common HTTP Status Codes

- **200 OK**: Successful GET/PATCH requests
- **201 Created**: Successful POST requests
- **204 No Content**: Successful DELETE requests
- **400 Bad Request**: Invalid input data
- **401 Unauthorized**: Missing or invalid auth token
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource not found
- **422 Unprocessable Entity**: Validation errors
- **500 Internal Server Error**: Server error

---

## Tips for Testing

1. **Use Swagger UI**: http://localhost:8000/docs for interactive testing
2. **Save tokens**: Store access tokens for subsequent requests
3. **Test permissions**: Try endpoints with different user roles
4. **Test edge cases**: Empty strings, large numbers, null values
5. **Test pagination**: Try different skip/limit values
6. **Test search**: Try partial matches, special characters
7. **Test filters**: Combine multiple filters
8. **Test dates**: Different date ranges and formats
9. **Test file uploads**: CSV import with various data
10. **Monitor logs**: Check server logs for detailed errors

---

## Postman Collection

Create a Postman collection with:
1. Environment variables for base_url and access_token
2. Pre-request scripts to auto-set tokens
3. Test scripts to validate responses
4. Organized folders by feature

---

**Happy Testing! 🚀**

Total API Endpoints: **89**  
Feature Completion: **100%**

