# Quick Start Guide

## 🚀 Start the Application

```bash
npm run dev
```

Visit: **http://localhost:3000**

---

## 📋 First Time Setup

### 1. Register an Account
- Go to: http://localhost:3000/register
- Enter:
  - **Name:** Your name
  - **Email:** your@email.com
  - **Password:** At least 6 characters
- Click "Register"
- ✅ You'll be automatically logged in and redirected to dashboard

### 2. Explore the Dashboard
Four main sections available:

**Dashboard** - Account overview and statistics
**Challenges** - Trading challenges (coming soon)
**Trading** - Advanced trading with real-time charts
**Terminal** - TradingView-powered web terminal

---

## 💡 Quick Testing

### Test Registration
```bash
# Visit in browser:
http://localhost:3000/register

# Try these credentials:
Name: Test User
Email: test@test.com
Password: password123
```

### Test Login
```bash
# Visit in browser:
http://localhost:3000/login

# Use the credentials from registration
```

### Test Supabase Connection
```bash
# Visit in browser:
http://localhost:3000/api/test-supabase

# Should see:
{
  "success": true,
  "message": "Supabase connection working"
}
```

---

## 🎯 Key Features

### Trading Page
- Real-time price charts
- Market watch with live prices
- Quick order execution
- Position management with P&L tracking
- Stop Loss / Take Profit support

### Web Terminal
- Full TradingView charts
- Multiple instrument types (Crypto, Forex, Stocks, Indices)
- Quick order panel
- Leverage trading (1x-50x)
- Real-time position updates

---

## 🔧 Troubleshooting

### If Registration Fails:
1. Open DevTools (F12)
2. Check Console for errors
3. Check Network tab for API responses
4. Look at terminal logs

### If Login Fails:
1. Make sure you registered first
2. Check email and password match
3. Check browser console for errors

### If Pages Don't Load:
1. Make sure dev server is running
2. Check for errors in terminal
3. Try refreshing the page

---

## 📖 Documentation

- **FIXES_APPLIED.md** - Complete list of bugs fixed
- **AUTH_DEBUG_GUIDE.md** - Detailed auth debugging
- **WEB_TERMINAL_GUIDE.md** - Web terminal features
- **TRADING_SETUP.md** - Trading system details

---

## ✅ What's Working

- ✅ User registration
- ✅ User login
- ✅ JWT authentication
- ✅ Dashboard access
- ✅ Trading page with charts
- ✅ Web terminal with TradingView
- ✅ Position management
- ✅ Real-time market data
- ✅ Order execution
- ✅ Demo account system

---

## 🎨 Available Pages

| Page | URL | Description |
|------|-----|-------------|
| Home | `/` | Landing page |
| Register | `/register` | Create account |
| Login | `/login` | Sign in |
| Dashboard | `/dashboard` | Account overview |
| Challenges | `/dashboard/challenges` | Trading challenges |
| Trading | `/dashboard/trading` | Advanced trading |
| Terminal | `/dashboard/terminal` | Web terminal |

---

## 🛠️ Development

### Build for Production
```bash
npm run build
```

### Run Tests
```bash
npm run test  # If tests are configured
```

### Check Types
```bash
npm run typecheck
```

---

## 📝 Environment Variables

Required in `.env`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
JWT_SECRET=your_jwt_secret
```

Optional:
```env
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

---

## 🎓 Learning Resources

### Next.js
- [Next.js Documentation](https://nextjs.org/docs)
- [App Router Guide](https://nextjs.org/docs/app)

### Supabase
- [Supabase Docs](https://supabase.com/docs)
- [RLS Policies](https://supabase.com/docs/guides/auth/row-level-security)

### Trading
- [TradingView Widgets](https://www.tradingview.com/widget/)
- [Lightweight Charts](https://tradingview.github.io/lightweight-charts/)

---

## 🚨 Common Issues

### Port Already in Use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 npm run dev
```

### Dependencies Not Installed
```bash
npm install
```

### Database Connection Error
1. Check `.env` file exists
2. Verify Supabase URL and keys
3. Test connection: http://localhost:3000/api/test-supabase

---

**Ready to trade! 📈**
