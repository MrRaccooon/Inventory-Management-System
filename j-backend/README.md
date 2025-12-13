# Inventory Management System - Express.js Backend

This is the JavaScript/Express.js version of the Inventory Management System backend, migrated from the original Python/FastAPI implementation.

## Features

- 🔐 **Authentication & Authorization**: JWT-based auth with role-based access control
- 📦 **Product Management**: Full CRUD with stock tracking, categories, and bulk import
- 💰 **Sales Management**: Point of sale with invoice generation and GST calculations
- 📊 **Dashboard & Analytics**: Real-time metrics, trends, and AI-powered insights
- 📈 **Reports**: Sales, inventory, GST, and profitability reports with export
- 👥 **Customer & Supplier Management**: Full CRM capabilities
- 👨‍💼 **Employee Management**: Attendance tracking and performance metrics
- 🔔 **Notifications**: Real-time alerts for low stock, sales, and system events
- 🔍 **Search**: Global and advanced search across all entities

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js 4.x
- **Database**: PostgreSQL with Sequelize ORM
- **Caching/Queue**: Redis with Bull
- **Validation**: Joi
- **Authentication**: JWT (jsonwebtoken + bcryptjs)

## Project Structure

```
j-backend/
├── src/
│   ├── config/          # Configuration management
│   ├── db/              # Database connection (Sequelize)
│   ├── middleware/      # Express middleware (auth, error handling)
│   ├── models/          # Sequelize models
│   ├── routes/          # API routes
│   │   └── v1/          # Version 1 API endpoints
│   ├── services/        # Business logic services
│   ├── utils/           # Utility functions
│   ├── validators/      # Joi validation schemas
│   ├── workers/         # Background job workers (Bull)
│   ├── app.js           # Express app setup
│   └── server.js        # Server entry point
├── .env.example         # Environment variables template
├── package.json         # Dependencies and scripts
└── README.md            # This file
```

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 13+
- Redis 6+

### Installation

1. Clone the repository and navigate to the j-backend folder:
```bash
cd j-backend
```

2. Install dependencies:
```bash
npm install
```

3. Copy the environment file and configure:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start the development server:
```bash
npm run dev
```

### Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with hot reload
- `npm test` - Run tests with coverage
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues

## API Endpoints

All API endpoints are prefixed with `/api/v1/`.

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login and get tokens
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout and invalidate tokens
- `GET /auth/me` - Get current user profile

### Products
- `GET /products` - List products
- `POST /products` - Create product
- `GET /products/:id` - Get product details
- `PATCH /products/:id` - Update product
- `DELETE /products/:id` - Delete product
- `POST /products/:id/adjust-stock` - Adjust stock
- `POST /products/bulk-import` - Bulk import products

### Sales
- `GET /sales` - List sales
- `POST /sales` - Create sale
- `GET /sales/:id` - Get sale details
- `PATCH /sales/:id` - Update sale
- `POST /sales/:id/refund` - Process refund

### Categories
- `GET /categories` - List categories
- `POST /categories` - Create category
- `GET /categories/:id` - Get category
- `PATCH /categories/:id` - Update category
- `DELETE /categories/:id` - Delete category

### Customers
- `GET /customers` - List customers
- `POST /customers` - Create customer
- `GET /customers/:id` - Get customer
- `PATCH /customers/:id` - Update customer
- `DELETE /customers/:id` - Deactivate customer
- `GET /customers/:id/purchase-history` - Get purchase history

### Suppliers
- `GET /suppliers` - List suppliers
- `POST /suppliers` - Create supplier
- `GET /suppliers/:id` - Get supplier
- `PATCH /suppliers/:id` - Update supplier
- `DELETE /suppliers/:id` - Deactivate supplier

### Dashboard
- `GET /dashboard/summary` - Get dashboard summary
- `GET /dashboard/metrics` - Get detailed metrics
- `GET /dashboard/sales-chart` - Get sales chart data

### Reports
- `GET /reports/sales` - Sales report
- `GET /reports/inventory` - Inventory report
- `GET /reports/gst` - GST report
- `GET /reports/export/:type` - Export report

### GST
- `GET /gst/summary` - GST summary
- `GET /gst/hsn-summary` - HSN-wise summary
- `GET /gst/liability` - GST liability

### AI Analytics
- `GET /ai-analytics/insights` - Get AI insights
- `GET /ai-analytics/forecast/:product_id` - Product forecast
- `GET /ai-analytics/recommendations` - Get recommendations

### Employees
- `GET /employees` - List employees
- `POST /employees/:id/attendance` - Record attendance
- `GET /employees/:id/performance` - Get performance

### Profit
- `GET /profit/summary` - Profit summary
- `GET /profit/by-category` - Profit by category
- `GET /profit/by-product` - Profit by product
- `GET /profit/trends` - Profit trends

### Invoices
- `POST /invoices/:sale_id` - Create invoice
- `GET /invoices` - List invoices
- `GET /invoices/:id` - Get invoice
- `DELETE /invoices/:id` - Delete invoice

### Shops
- `GET /shops` - List shops
- `POST /shops` - Create shop
- `GET /shops/:id` - Get shop
- `PATCH /shops/:id` - Update shop
- `DELETE /shops/:id` - Delete shop

### Notifications
- `GET /notifications` - List notifications
- `POST /notifications` - Create notification
- `POST /notifications/mark-read` - Mark as read
- `POST /notifications/mark-all-read` - Mark all as read
- `DELETE /notifications/:id` - Delete notification

### Search
- `GET /search/global` - Global search
- `GET /search/advanced/products` - Advanced product search
- `GET /search/advanced/sales` - Advanced sales search

## Health Check

- `GET /health` - Returns server health status

## License

ISC

