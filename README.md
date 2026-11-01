# Inventory and Data Management System

A RESTful inventory API built for Assignment 3 with Node.js, Express, Mongoose, MongoDB, and dotenv.

## Requirements

- Node.js 18 or newer
- MongoDB running locally, or a MongoDB connection URI

## Setup

```bash
npm install
```

Copy `.env.example` to `.env`, then set `MONGODB_URI` to your MongoDB connection string. Start the API with:

```bash
npm run dev
```

The default address is `http://localhost:5000`. `GET /health` reports whether the HTTP server is responding; the application starts only after MongoDB connects.

## Product fields

| Field | Type | Rules |
| --- | --- | --- |
| `name` | string | Required, 2–120 characters |
| `sku` | string | Required, unique, stored uppercase |
| `category` | string | Required |
| `price` | number | Required, non-negative |
| `quantity` | integer | Required, non-negative |
| `reorderLevel` | integer | Non-negative, defaults to `10` |
| `supplier` | string | Optional |

Responses include a computed `stockValue` (`price × quantity`). Low stock means `quantity <= reorderLevel`.

## API

All product routes use `/api/products` and accept/return JSON.

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/api/products` | Create a product |
| `GET` | `/api/products` | List, filter, sort, and paginate products |
| `GET` | `/api/products/:id` | Get one product |
| `PUT` | `/api/products/:id` | Update one or more product fields |
| `PATCH` | `/api/products/:id/stock` | Restock or record a sale |
| `DELETE` | `/api/products/:id` | Delete a product |
| `GET` | `/api/products/low-stock` | List products at or below their reorder level |
| `GET` | `/api/products/summary` | Aggregate inventory totals by category |

### Create a product

```http
POST /api/products
Content-Type: application/json
```

```json
{
  "name": "Gel Pen Pack of 15",
  "sku": "STNY-PN-713",
  "category": "Stationery",
  "price": 120,
  "quantity": 40,
  "reorderLevel": 20,
  "supplier": "Cello Pens"
}
```

### List and filter products

`GET /api/products?page=1&limit=10&category=Stationery&search=pen&minPrice=50&maxPrice=500&supplier=Cello&lowStock=true&sortBy=price&order=desc`

Every query parameter is optional. `search` matches name, SKU, category, or supplier. Supported `sortBy` fields are `name`, `sku`, `category`, `price`, `quantity`, `reorderLevel`, `createdAt`, and `updatedAt`. `order` is `asc` or `desc`; `limit` is capped at 100. The response includes `total`, `page`, `totalPages`, `count`, and `products`.

### Adjust stock

`change` is a non-zero integer: positive numbers add stock; negative numbers record a sale. The operation is atomic and rejects sales that would make stock negative.

```http
PATCH /api/products/PRODUCT_ID/stock
Content-Type: application/json
```

```json
{ "change": -3 }
```

### Reports

`GET /api/products/low-stock` returns `{ "count", "lowStockItems" }`. `GET /api/products/summary` returns `{ "categories", "summary" }`, where each category row includes `totalItems`, `totalQuantity`, `totalStockValue`, and `avgPrice`.

## Error responses

Errors use `{ "error": "..." }`. Invalid input returns `400`, missing products return `404`, duplicate SKUs and insufficient stock return `409`, and unexpected server errors return `500`.
