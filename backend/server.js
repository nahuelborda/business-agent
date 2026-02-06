const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============== PRODUCTS ==============

// Get all products
app.get('/api/products', async (req, res) => {
  try {
    const { active, category } = req.query;
    let query = 'SELECT * FROM products WHERE 1=1';
    const params = [];

    if (active !== undefined) {
      params.push(active === 'true');
      query += ` AND active = $${params.length}`;
    }

    if (category) {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }

    query += ' ORDER BY name';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Get single product
app.get('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching product:', err);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Update product stock
app.patch('/api/products/:id/stock', async (req, res) => {
  try {
    const { id } = req.params;
    const { change, reason } = req.body;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update stock
      const result = await client.query(
        'UPDATE products SET stock = stock + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
        [change, id]
      );

      if (result.rows.length === 0) {
        throw new Error('Product not found');
      }

      // Log inventory change
      await client.query(
        'INSERT INTO inventory_history (product_id, change, reason) VALUES ($1, $2, $3)',
        [id, change, reason || 'manual adjustment']
      );

      await client.query('COMMIT');
      res.json(result.rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error updating stock:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============== CUSTOMERS ==============

// Get or create customer by phone
app.post('/api/customers/by-phone', async (req, res) => {
  try {
    const { phone, name, email } = req.body;

    // Try to find existing
    let result = await pool.query('SELECT * FROM customers WHERE phone = $1', [phone]);

    if (result.rows.length > 0) {
      return res.json(result.rows[0]);
    }

    // Create new
    result = await pool.query(
      'INSERT INTO customers (phone, name, email) VALUES ($1, $2, $3) RETURNING *',
      [phone, name, email]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error with customer:', err);
    res.status(500).json({ error: 'Failed to process customer' });
  }
});

// Get customer by ID
app.get('/api/customers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM customers WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching customer:', err);
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
});

// ============== ORDERS ==============

// Create order
app.post('/api/orders', async (req, res) => {
  try {
    const { customer_id, items, shipping_address, notes, payment_method } = req.body;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Generate order number
      const orderNumber = `ORD-${Date.now()}`;

      // Calculate total
      let total = 0;
      const orderItems = [];

      for (const item of items) {
        const productResult = await client.query('SELECT * FROM products WHERE id = $1', [item.product_id]);
        if (productResult.rows.length === 0) {
          throw new Error(`Product ${item.product_id} not found`);
        }

        const product = productResult.rows[0];
        
        if (product.stock < item.quantity) {
          throw new Error(`Insufficient stock for ${product.name}`);
        }

        const subtotal = product.price * item.quantity;
        total += subtotal;

        orderItems.push({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: product.price,
          subtotal
        });

        // Reduce stock
        await client.query(
          'UPDATE products SET stock = stock - $1 WHERE id = $2',
          [item.quantity, item.product_id]
        );
      }

      // Create order
      const orderResult = await client.query(
        `INSERT INTO orders (customer_id, order_number, total, shipping_address, notes, payment_method) 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [customer_id, orderNumber, total, shipping_address, notes, payment_method]
      );

      const order = orderResult.rows[0];

      // Create order items
      for (const item of orderItems) {
        await client.query(
          `INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal) 
           VALUES ($1, $2, $3, $4, $5)`,
          [order.id, item.product_id, item.quantity, item.unit_price, item.subtotal]
        );

        // Log inventory change
        await client.query(
          'INSERT INTO inventory_history (product_id, change, reason, reference_id) VALUES ($1, $2, $3, $4)',
          [item.product_id, -item.quantity, 'sale', order.id]
        );
      }

      await client.query('COMMIT');
      res.status(201).json(order);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error creating order:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get order by ID with items
app.get('/api/orders/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const orderResult = await pool.query('SELECT * FROM orders WHERE id = $1', [id]);
    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    const itemsResult = await pool.query(`
      SELECT oi.*, p.name as product_name
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = $1
    `, [id]);

    order.items = itemsResult.rows;
    res.json(order);
  } catch (err) {
    console.error('Error fetching order:', err);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Update order status
app.patch('/api/orders/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const result = await pool.query(
      'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating order:', err);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// Get all orders (with pagination)
app.get('/api/orders', async (req, res) => {
  try {
    const { limit = 50, offset = 0, status, customer_id } = req.query;
    
    let query = 'SELECT * FROM orders WHERE 1=1';
    const params = [];

    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }

    if (customer_id) {
      params.push(customer_id);
      query += ` AND customer_id = $${params.length}`;
    }

    params.push(limit, offset);
    query += ` ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// ============== ANALYTICS ==============

// Get basic stats
app.get('/api/stats', async (req, res) => {
  try {
    const stats = {};

    // Total products
    const productsResult = await pool.query('SELECT COUNT(*) as count FROM products WHERE active = true');
    stats.total_products = parseInt(productsResult.rows[0].count);

    // Total customers
    const customersResult = await pool.query('SELECT COUNT(*) as count FROM customers');
    stats.total_customers = parseInt(customersResult.rows[0].count);

    // Total orders
    const ordersResult = await pool.query('SELECT COUNT(*) as count FROM orders');
    stats.total_orders = parseInt(ordersResult.rows[0].count);

    // Revenue (all paid orders)
    const revenueResult = await pool.query(
      "SELECT SUM(total) as revenue FROM orders WHERE payment_status = 'paid'"
    );
    stats.total_revenue = parseFloat(revenueResult.rows[0].revenue || 0);

    // Pending orders
    const pendingResult = await pool.query("SELECT COUNT(*) as count FROM orders WHERE status = 'pending'");
    stats.pending_orders = parseInt(pendingResult.rows[0].count);

    res.json(stats);
  } catch (err) {
    console.error('Error fetching stats:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Business Agent API running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing pool...');
  await pool.end();
  process.exit(0);
});
