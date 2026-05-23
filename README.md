# IPTV Backend — Node.js + Express + MongoDB

## Stack
- Node.js + Express
- MongoDB + Mongoose
- JWT authentication (access + refresh tokens)
- Stripe payments + webhooks
- XUI.ONE panel API integration

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Set up environment variables
```bash
cp .env.example .env
# Edit .env with your values
```

### 3. Start MongoDB (local)
```bash
mongod --dbpath /data/db
```

### 4. Seed plans into database
```bash
npm run seed
```

### 5. Start development server
```bash
npm run dev
```

Server runs on http://localhost:5001

---

## API Endpoints

### Auth
| Method | Endpoint            | Auth | Description              |
|--------|---------------------|------|--------------------------|
| POST   | /api/auth/register  | No   | Register new user        |
| POST   | /api/auth/login     | No   | Login                    |
| POST   | /api/auth/refresh   | No   | Refresh access token     |
| POST   | /api/auth/logout    | Yes  | Logout                   |
| GET    | /api/auth/me        | Yes  | Get current user + IPTV  |

### Plans
| Method | Endpoint         | Auth | Description     |
|--------|------------------|------|-----------------|
| GET    | /api/plans       | No   | List all plans  |
| GET    | /api/plans/:id   | No   | Get plan by ID  |

### Subscriptions
| Method | Endpoint                      | Auth | Description               |
|--------|-------------------------------|------|---------------------------|
| POST   | /api/subscriptions/checkout   | Yes  | Create Stripe checkout    |
| GET    | /api/subscriptions/status     | Yes  | Get subscription + IPTV   |
| POST   | /api/subscriptions/cancel     | Yes  | Cancel subscription       |

### Webhooks
| Method | Endpoint               | Auth | Description               |
|--------|------------------------|------|---------------------------|
| POST   | /api/webhooks/stripe   | No   | Stripe payment webhook    |

---

## User Flow

1. User registers → POST /api/auth/register → gets JWT tokens
2. User selects plan → GET /api/plans
3. User initiates checkout → POST /api/subscriptions/checkout → gets Stripe URL
4. User completes payment on Stripe
5. Stripe fires webhook → POST /api/webhooks/stripe
6. Webhook handler:
   - Activates subscription in MongoDB
   - Calls XUI.ONE API to create IPTV account
   - Saves IPTV credentials to IptvAccount collection
7. App polls GET /api/subscriptions/status until iptvCredentials appear
8. App uses iptvCredentials to connect to IPTV portal

---

## Production Deployment

```bash
# On your VPS
git clone your-repo
cd iptv-backend
npm install --production
cp .env.example .env
# fill in production values

# Use PM2 to keep it running
npm install -g pm2
pm2 start src/server.js --name iptv-backend
pm2 save
pm2 startup

# Set up Stripe webhook
# In Stripe dashboard: Webhooks → Add endpoint
# URL: https://yourdomain.com/api/webhooks/stripe
# Events: checkout.session.completed, payment_intent.payment_failed
```
