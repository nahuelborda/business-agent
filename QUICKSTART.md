# Quick Start Guide

Get the business agent running in 5 minutes.

## Prerequisites

You already have:
- ✅ Docker & Docker Compose
- ✅ mejores server (where this will run)
- ✅ Anthropic API key

## Step 1: Clone & Configure

```bash
cd ~/clawd/repos
# Already cloned, so just cd into it
cd business-agent

# Create .env file
cp .env.example .env
nano .env
# Add your ANTHROPIC_API_KEY
```

## Step 2: Start Services

```bash
# Build and start all containers
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

Expected output:
```
business-postgres    ... Up (healthy)
business-backend     ... Up (healthy)
business-openclaw    ... Up
```

## Step 3: Link WhatsApp (Optional)

If you have an eSIM/second number ready:

```bash
# Enter OpenClaw container
docker-compose exec openclaw sh

# Inside container
openclaw whatsapp link
# Scan QR code with WhatsApp Business on your phone

# Exit container
exit
```

## Step 4: Test the API

```bash
# Check backend health
curl http://localhost:3000/health

# List products
curl http://localhost:3000/api/products | jq

# Get stats
curl http://localhost:3000/api/stats | jq
```

## Step 5: Access Dashboard

Open in browser:
```
http://localhost:18790/__openclaw__/canvas/main/
```

You should see the dashboard template. To populate it with real data, message the agent and ask it to "generate dashboard" or "show stats".

## Step 6: Test Agent Interaction

Once WhatsApp is linked, message the business number:
- "Hi" → Agent introduces itself
- "Show products" → Lists catalog
- "I want to order the laptop" → Initiates order flow

Or test via OpenClaw chat:
```bash
docker-compose exec openclaw openclaw chat
# Type messages to interact with agent
```

## Architecture Overview

```
Port 18790 (OpenClaw) ─┐
                       ├─► business-network
Port 3000 (API) ───────┤
                       │
Port 5432 (Postgres) ──┘
```

**Data Flow:**
1. Customer messages via WhatsApp
2. OpenClaw receives message
3. Agent calls Backend API (http://backend:3000)
4. Backend queries Postgres
5. Agent replies to customer

## Common Commands

```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f openclaw
docker-compose logs -f backend

# Restart services
docker-compose restart

# Stop all
docker-compose down

# Stop and remove volumes (fresh start)
docker-compose down -v

# Rebuild after code changes
docker-compose up -d --build

# Shell into containers
docker-compose exec openclaw sh
docker-compose exec backend sh
docker-compose exec postgres psql -U business -d business_db
```

## Database Access

```bash
# Connect to Postgres
docker-compose exec postgres psql -U business -d business_db

# Inside psql:
\dt                    # List tables
SELECT * FROM products;
SELECT * FROM orders;
\q                     # Exit
```

## Troubleshooting

### OpenClaw not connecting to backend
```bash
# Test network connectivity
docker-compose exec openclaw wget -O- http://backend:3000/health
```

### Backend not connecting to database
```bash
# Check postgres is healthy
docker-compose ps postgres

# View backend logs
docker-compose logs backend
```

### WhatsApp QR not showing
```bash
# Make sure OpenClaw is fully started
docker-compose logs openclaw | grep -i whatsapp

# Restart OpenClaw
docker-compose restart openclaw
```

### Port already in use
```bash
# Check what's using the port
sudo lsof -i :18790
sudo lsof -i :3000

# Stop your main OpenClaw instance if needed (port 18789 vs 18790 - no conflict)
```

## Next Steps

1. **Customize Products**: Edit `postgres/init.sql` with your actual products
2. **Design Dashboard**: Modify `openclaw/canvas/index.html` for your brand
3. **Tune Agent**: Edit `openclaw/workspace/SOUL.md` for desired personality
4. **Add Payment Integration**: Extend backend API with Stripe/MercadoPago
5. **Deploy**: Use Tailscale to expose securely, or deploy to cloud

## URLs

- **Dashboard**: http://localhost:18790/__openclaw__/canvas/main/
- **Backend API**: http://localhost:3000
- **API Docs**: See `TOOLS.md` for all endpoints
- **GitHub**: https://github.com/nahuelborda/business-agent

## Support

Issues? Check:
1. Logs: `docker-compose logs -f`
2. Health: `docker-compose ps`
3. Network: `docker network inspect business-agent_business-network`

Still stuck? Open an issue on GitHub.

---

**Pro Tip**: Expose via Tailscale so you can access from anywhere:
```bash
# On mejores
tailscale serve --bg --https=18790 https://localhost:18790
# Access at: https://mejores.tail475792.ts.net:18790/__openclaw__/canvas/main/
```
