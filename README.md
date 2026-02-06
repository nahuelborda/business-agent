# Business Agent

AI-powered business automation agent built with OpenClaw.

## What It Does

- **Customer Communication**: Handles customer inquiries via WhatsApp
- **Inventory Management**: Updates stock levels, tracks products
- **Order Processing**: Takes orders, confirms payments, updates status
- **Catalog Management**: Updates product listings, prices, availability
- **Analytics**: Reports on sales, popular items, customer trends

## Architecture

```
┌─────────────────┐
│   WhatsApp      │ ← Customers interact here
└────────┬────────┘
         │
┌────────▼────────┐
│  OpenClaw Agent │ ← AI brain (Claude)
└────┬────────┬───┘
     │        │
     │   ┌────▼─────┐
     │   │ Backend  │ ← Business logic API
     │   │   API    │
     │   └────┬─────┘
     │        │
     │   ┌────▼─────┐
     │   │ Postgres │ ← Data storage
     │   └──────────┘
     │
┌────▼────────┐
│   Canvas    │ ← Admin dashboard UI
└─────────────┘
```

## Stack

- **OpenClaw**: Agent framework + WhatsApp integration
- **Postgres**: Database (products, orders, customers)
- **Node.js/Express**: REST API backend
- **Docker Compose**: Orchestration
- **Canvas**: Web UI for admin/demo

## Getting Started

### Prerequisites

- Docker & Docker Compose
- WhatsApp Business number (can use eSIM)
- Anthropic API key (for Claude)

### Quick Start

1. **Clone & Configure**
   ```bash
   git clone https://github.com/nahuelborda/business-agent.git
   cd business-agent
   cp .env.example .env
   # Edit .env with your API keys
   ```

2. **Start Services**
   ```bash
   docker-compose up -d
   ```

3. **Link WhatsApp**
   ```bash
   docker-compose exec openclaw openclaw whatsapp link
   # Scan QR code with WhatsApp Business
   ```

4. **Initialize Database**
   ```bash
   docker-compose exec backend npm run db:seed
   # Loads sample products
   ```

5. **Access Dashboard**
   - Open: http://localhost:18790/__openclaw__/canvas/main/
   - Admin panel for viewing orders, inventory

### Project Structure

```
business-agent/
├── docker-compose.yml       # Service orchestration
├── .env.example              # Config template
├── openclaw/
│   ├── config.json           # Agent configuration
│   ├── workspace/
│   │   ├── AGENTS.md         # Agent instructions
│   │   ├── SOUL.md           # Personality/behavior
│   │   ├── TOOLS.md          # Tool notes
│   │   └── memory/           # Agent memory
│   └── canvas/
│       └── index.html        # Dashboard UI
├── backend/
│   ├── package.json
│   ├── server.js             # Express API
│   ├── routes/
│   │   ├── products.js
│   │   ├── orders.js
│   │   └── customers.js
│   └── db/
│       ├── schema.sql
│       └── seed.sql
└── postgres/
    └── init.sql              # Database initialization
```

## Demo Business Types

This setup can demo:
- **E-commerce store** (products, orders, shipping)
- **Restaurant** (menu, reservations, orders)
- **Service business** (appointments, quotes, scheduling)
- **Retail shop** (inventory, POS, customer loyalty)

## Development

### Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f openclaw
docker-compose logs -f backend
```

### Shell Access
```bash
# OpenClaw container
docker-compose exec openclaw sh

# Backend container
docker-compose exec backend sh

# Postgres
docker-compose exec postgres psql -U business -d business_db
```

### Rebuild After Changes
```bash
docker-compose down
docker-compose up -d --build
```

## Features Roadmap

- [x] Docker infrastructure
- [x] WhatsApp integration
- [x] Postgres database
- [ ] REST API (products, orders, customers)
- [ ] Canvas admin dashboard
- [ ] Inventory management commands
- [ ] Order processing workflow
- [ ] Payment integration (Stripe/MercadoPago)
- [ ] Analytics dashboard
- [ ] Multi-language support
- [ ] Voice interface (ElevenLabs)

## License

MIT

## Author

Nahuel Borda ([@nahuelborda](https://github.com/nahuelborda))
