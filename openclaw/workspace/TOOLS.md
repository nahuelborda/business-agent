# TOOLS.md - API & Tool Notes

## Backend API

**Base URL:** `http://backend:3000`

### Products

```bash
# List all active products
curl -s http://backend:3000/api/products?active=true

# Get single product
curl -s http://backend:3000/api/products/1

# Update stock (add 10 units)
curl -X PATCH http://backend:3000/api/products/1/stock \
  -H "Content-Type: application/json" \
  -d '{"change": 10, "reason": "restock"}'

# Reduce stock (sold 3 units - use negative)
curl -X PATCH http://backend:3000/api/products/1/stock \
  -H "Content-Type: application/json" \
  -d '{"change": -3, "reason": "manual sale"}'
```

### Customers

```bash
# Get or create customer by phone
curl -X POST http://backend:3000/api/customers/by-phone \
  -H "Content-Type: application/json" \
  -d '{"phone": "+543541610545", "name": "John Doe"}'

# Get customer by ID
curl -s http://backend:3000/api/customers/1
```

### Orders

```bash
# Create order
curl -X POST http://backend:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": 1,
    "items": [
      {"product_id": 1, "quantity": 2},
      {"product_id": 3, "quantity": 1}
    ],
    "shipping_address": "123 Main St, Buenos Aires",
    "payment_method": "transfer",
    "notes": "Deliver after 3pm"
  }'

# Get order details
curl -s http://backend:3000/api/orders/1

# Update order status
curl -X PATCH http://backend:3000/api/orders/1/status \
  -H "Content-Type: application/json" \
  -d '{"status": "confirmed"}'

# List orders (with filters)
curl -s "http://backend:3000/api/orders?status=pending&limit=10"
```

**Valid order statuses:**
- `pending` - New order, awaiting payment
- `confirmed` - Payment received
- `preparing` - Being packed/prepared
- `shipped` - Out for delivery
- `delivered` - Completed
- `cancelled` - Cancelled

### Analytics

```bash
# Get business stats
curl -s http://backend:3000/api/stats
```

Returns:
```json
{
  "total_products": 15,
  "total_customers": 42,
  "total_orders": 128,
  "total_revenue": 54320.50,
  "pending_orders": 5
}
```

## Common Patterns

### Customer Places Order (Full Flow)

```bash
# 1. Find/create customer
CUSTOMER=$(curl -s -X POST http://backend:3000/api/customers/by-phone \
  -H "Content-Type: application/json" \
  -d '{"phone": "+543541610545", "name": "Test User"}')

CUSTOMER_ID=$(echo $CUSTOMER | jq -r '.id')

# 2. List products
curl -s http://backend:3000/api/products?active=true | jq -r '.[] | "\(.id): \(.name) - $\(.price) (\(.stock) in stock)"'

# 3. Create order
curl -X POST http://backend:3000/api/orders \
  -H "Content-Type: application/json" \
  -d "{
    \"customer_id\": $CUSTOMER_ID,
    \"items\": [{\"product_id\": 1, \"quantity\": 1}],
    \"shipping_address\": \"123 Street\",
    \"payment_method\": \"transfer\"
  }"
```

### Check Low Stock Products

```bash
curl -s http://backend:3000/api/products | jq -r '.[] | select(.stock < 10) | "\(.name): \(.stock) left"'
```

## Canvas Dashboard Path

Save HTML dashboards to:
```
/root/.openclaw/canvas/main/index.html
```

Owner accesses at: `http://localhost:18790/__openclaw__/canvas/main/`

## Notes

- API returns JSON, pipe through `jq` for parsing
- Stock updates are transactional (automatic inventory logging)
- Order creation automatically reduces product stock
- All timestamps are UTC

---

Add your own shortcuts and discoveries here.
