# 💸 SplitMate — Telegram Mini App

> Split expenses with friends inside Telegram. No app downloads. No friction.

---

## What You'll Need Before Starting

- A computer with [Node.js 20+](https://nodejs.org) installed
- A Telegram account
- A [Supabase](https://supabase.com) account (free)
- A [Railway](https://railway.app) account (free tier works)
- A [Vercel](https://vercel.com) account (free)
- About **45 minutes** of your time

---

## Step 1 — Create Your Telegram Bot

1. Open Telegram and search for **@BotFather**
2. Send the message `/newbot`
3. BotFather will ask for a **name** → type `SplitMate`
4. BotFather will ask for a **username** → type something like `SplitMateExpenseBot`
   - It must end in `bot` and be unique
5. BotFather will reply with your **Bot Token** — it looks like:
   ```
   1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
   ```
   **Copy this and save it somewhere safe. You'll need it in Step 4.**

6. Still in BotFather, send `/mybots` → select your bot → **Bot Settings** → **Menu Button** → **Configure menu button**
   - Set the URL to your frontend URL (you'll get this in Step 3 — come back here)
   - Set the button text to `💸 Open SplitMate`

7. Send `/mybots` → your bot → **Bot Settings** → **Allow Groups** → Enable

---

## Step 2 — Set Up the Database (Supabase)

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Click **New Project** → choose a name like `splitmate` → set a strong password → click Create
3. Wait ~2 minutes for the project to spin up
4. In the left sidebar click **SQL Editor**
5. Click **New Query**
6. Copy the entire contents of `backend/src/db/schema.sql` and paste it into the editor
7. Click **Run** — you should see "Success. No rows returned"
8. Now go to **Project Settings** (gear icon) → **Database** → scroll to **Connection string**
9. Select **URI** and copy the full string — it looks like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxx.supabase.co:5432/postgres
   ```
   **Replace `[YOUR-PASSWORD]` with the password you set in step 2.**

---

## Step 3 — Deploy the Frontend (Vercel)

1. In your terminal, navigate to the `frontend` folder:
   ```bash
   cd splitmate/frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Install the Vercel CLI:
   ```bash
   npm install -g vercel
   ```

4. Deploy:
   ```bash
   vercel --prod
   ```
   - Follow the prompts: link to existing project? **No** → project name: `splitmate` → directory: `./`
   - When asked about environment variables, skip for now

5. Vercel will give you a URL like `https://splitmate-abc123.vercel.app`
   **Copy this URL — it's your `MINI_APP_URL`**

6. Set the frontend environment variable in Vercel:
   ```bash
   vercel env add VITE_API_URL
   ```
   When prompted, enter your backend Railway URL (you'll get this in Step 4 — set it after)

---

## Step 4 — Deploy the Backend (Railway)

1. Go to [railway.app](https://railway.app) and sign in with GitHub

2. Click **New Project** → **Deploy from GitHub repo**
   - Connect your GitHub and push the `splitmate/backend` folder as a repo, OR
   - Use **Deploy from local** with the Railway CLI

3. **Using Railway CLI (recommended):**
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli

   # Login
   railway login

   # Navigate to backend
   cd splitmate/backend

   # Initialize and deploy
   railway init
   railway up
   ```

4. Railway will give you a URL like `https://splitmate-production.railway.app`
   **This is your `APP_URL`**

5. Set environment variables in Railway dashboard:
   - Go to your Railway project → **Variables** tab
   - Add each variable from `.env.example`:

   | Variable | Value |
   |---|---|
   | `BOT_TOKEN` | Your token from BotFather (Step 1) |
   | `BOT_SECRET` | Run `openssl rand -hex 16` in terminal and paste result |
   | `APP_URL` | Your Railway URL, e.g. `https://splitmate.railway.app` |
   | `MINI_APP_URL` | Your Vercel URL from Step 3 |
   | `DATABASE_URL` | Your Supabase connection string from Step 2 |
   | `NODE_ENV` | `production` |
   | `PORT` | `3000` |
   | `PRO_MONTHLY_STARS` | `500` |
   | `TON_FEE_PERCENT` | `0.5` |

6. After setting variables, Railway will auto-redeploy. Check logs to confirm:
   ```
   ✅ Webhook set: https://your-app.railway.app/webhook/your-secret
   🚀 SplitMate backend running on port 3000
   ```

---

## Step 5 — Connect Bot to Mini App

1. Go back to **@BotFather** on Telegram
2. Send `/mybots` → select your bot → **Bot Settings** → **Menu Button** → **Configure menu button**
3. Enter your Vercel URL: `https://splitmate-abc123.vercel.app`
4. Set button text: `💸 Open SplitMate`

5. Enable payments (for Stars):
   - In BotFather send `/mybots` → your bot → **Payments**
   - Select **Telegram Stars** — this is free and built into Telegram

---

## Step 6 — Test Everything

1. Open Telegram, search for your bot username
2. Send `/start` — you should see the welcome message with a **💸 Open SplitMate** button
3. Tap the button — the Mini App should open
4. Create a test group, add an expense, check balances
5. Test the upgrade flow: tap **⭐ Pro** in the bottom nav → **Pay with Stars**
   - In test mode you won't be charged — Telegram has a test payment system

---

## Step 7 — Enable Test Payments (Optional but Recommended)

To test Stars payments without spending real Stars:

1. In BotFather send `/mybots` → your bot → **Payments** → **Telegram Stars** → **Test Mode**
2. Now when you test the payment flow, it uses test Stars

---

## Project Structure

```
splitmate/
├── backend/
│   ├── src/
│   │   ├── config/index.js          # Environment config
│   │   ├── db/
│   │   │   ├── client.js            # PostgreSQL connection pool
│   │   │   └── schema.sql           # Database schema (run once)
│   │   ├── services/
│   │   │   ├── userService.js       # User CRUD + Pro subscription
│   │   │   ├── groupService.js      # Group creation + membership
│   │   │   ├── expenseService.js    # Expense logic + debt math
│   │   │   ├── currencyService.js   # FX rates
│   │   │   └── paymentService.js    # Stars payment handling ⭐
│   │   ├── middleware/
│   │   │   └── auth.js              # Telegram initData validation
│   │   ├── api/
│   │   │   ├── groups.js            # Group REST endpoints
│   │   │   ├── expenses.js          # Expense REST endpoints
│   │   │   └── payments.js          # Payment endpoints
│   │   ├── bot/
│   │   │   ├── commands.js          # Bot commands + payment handlers
│   │   │   └── reminders.js         # Automated debt reminders
│   │   └── index.js                 # Server entry point
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── main.jsx                 # App entry + Telegram SDK init
│   │   ├── App.jsx                  # Root component + routing
│   │   ├── index.css                # All styles
│   │   ├── pages/
│   │   │   ├── GroupList.jsx        # Home screen
│   │   │   ├── GroupDetail.jsx      # Expenses + balances
│   │   │   ├── AddExpense.jsx       # Add expense form
│   │   │   ├── SettleUp.jsx         # Settle a debt
│   │   │   ├── ProUpgrade.jsx       # ⭐ Monetization screen
│   │   │   ├── CreateGroup.jsx      # New group form
│   │   │   └── JoinGroup.jsx        # Join via invite code
│   │   ├── components/
│   │   │   ├── BottomNav.jsx
│   │   │   ├── LoadingScreen.jsx
│   │   │   └── Toast.jsx
│   │   ├── store/appStore.js        # Zustand global state
│   │   └── utils/api.js             # API client
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── .env.example                     # Copy to .env and fill in values
└── README.md
```

---

## How the Stars Payment Flow Works

This is important to understand for debugging:

```
1. User taps "Pay 500 Stars" in Mini App
        ↓
2. Frontend calls POST /api/payments/invoice
        ↓
3. Backend sends a Stars invoice to the user's Telegram chat
        ↓
4. User sees the invoice in chat, taps "Pay"
        ↓
5. Telegram sends pre_checkout_query to your webhook
        ↓
6. Your bot MUST respond within 10 seconds (answerPreCheckoutQuery)
        ↓
7. Telegram charges the Stars from the user's wallet
        ↓
8. Telegram sends successful_payment message to your webhook
        ↓
9. Your bot activates Pro for the user (activateProSubscription)
        ↓
10. User receives confirmation message in chat ✅
```

**If Pro is not activating:** Check Railway logs for webhook errors. The most common issue is the `BOT_SECRET` not matching between your `.env` and the webhook URL.

---

## Local Development

```bash
# Terminal 1 — Backend
cd splitmate/backend
cp ../.env.example .env      # Fill in your values
npm install
npm run dev                   # Starts on http://localhost:3000

# Terminal 2 — Frontend
cd splitmate/frontend
cp ../.env.example .env       # Set VITE_API_URL=http://localhost:3000
npm install
npm run dev                   # Starts on http://localhost:5173
```

> **Note:** For bot webhooks to work locally, use [ngrok](https://ngrok.com):
> ```bash
> ngrok http 3000
> # Copy the https URL and set it as APP_URL in your .env
> ```

---

## Common Issues & Fixes

| Problem | Fix |
|---|---|
| Bot doesn't respond | Check `BOT_TOKEN` is correct in Railway env vars |
| Mini App shows blank screen | Check `VITE_API_URL` in Vercel env vars points to Railway |
| Auth error (401) | Your `MINI_APP_URL` must exactly match what BotFather has set |
| DB connection failed | Check `DATABASE_URL` — make sure password has no special chars that need escaping |
| Stars payment not activating Pro | Check Railway logs for `successful_payment` webhook hitting your server |
| "Invalid initData" error | Make sure `BOT_TOKEN` matches the bot whose Mini App is being opened |

---

## Revenue Tracking

Once live, monitor your earnings in:
- **Telegram Stars:** @BotFather → `/mybots` → your bot → **Payments** → **Statistics**
- **Database:** `SELECT COUNT(*), SUM(stars_amount) FROM star_payments;`

---

Built with ❤️ using Node.js, Fastify, Telegraf, React, Vite, and Supabase.
