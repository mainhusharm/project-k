# How to Fix the 500 Error - Step by Step

## 🚨 IMPORTANT: Restart Your Dev Server!

The `.env` file was updated with `JWT_SECRET`. **You MUST restart the dev server:**

```bash
# In your terminal where dev server is running:
# 1. Press Ctrl+C to stop it
# 2. Then run:
npm run dev
```

**Why?** Environment variables are loaded when the server starts. Changes to `.env` require a restart!

---

## What Was Changed

### 1. Added JWT_SECRET to .env ⭐
```env
JWT_SECRET=propfirm-super-secret-jwt-key-change-in-production-2024
```

### 2. Rewrote Register Endpoint
- Now has error handling at EVERY step
- Logs show EXACTLY where it fails
- Always returns JSON (never HTML)
- Validates environment first

---

## How to Debug

### Step 1: Open Two Windows

**Window 1: Terminal** (where `npm run dev` runs)
- You'll see server logs here

**Window 2: Browser** (with DevTools open - press F12)
- You'll see frontend errors here

### Step 2: Try Registration

Go to: `http://localhost:3000/register`

Fill in:
- Name: `Test User`
- Email: `test@example.com`
- Password: `password123`

Click "Register"

### Step 3: Watch Terminal Logs

You should see something like this:

```
=== REGISTER API ROUTE ENTRY ===
Environment check passed
Supabase URL: https://0ec90b57d6e95fcbda19832f.supabase.co
Has Anon Key: true
Has Service Role: false
Request body parsed: { email: 'test@example.com', name: 'Test User' }
Schema validation passed
Supabase client created
Password hashed successfully
Checking for existing user...
Existing user check complete: false
Inserting new user...
User created successfully: { id: '...', email: '...' }
Creating JWT token for user: ...
JWT token created successfully
Setting authentication cookie
Registration successful!
```

### Step 4: Find Where It Stops

**The logs stop at a certain point?** That's your problem!

| Stops After | Problem | Solution |
|-------------|---------|----------|
| "REGISTER API ROUTE ENTRY" | Route not reached | Check middleware |
| "Missing NEXT_PUBLIC_SUPABASE_URL" | .env not loaded | Restart dev server |
| "Environment check passed" | Request parsing failed | Check request format |
| "Schema validation passed" | Supabase client failed | Check .env values |
| "Password hashed successfully" | Database query failed | Check Supabase connection |
| "Inserting new user..." | Insert failed | Check RLS policies |
| "User created successfully" | JWT creation failed | Check JWT_SECRET loaded |

---

## Common Issues

### Issue #1: JWT_SECRET Not Loaded

**Symptom:**
- Logs stop at "Creating JWT token"
- Or no logs at all

**Fix:**
```bash
# Stop server (Ctrl+C)
# Verify .env has JWT_SECRET:
cat .env | grep JWT_SECRET

# Should output:
# JWT_SECRET=propfirm-super-secret-jwt-key-change-in-production-2024

# Start server again:
npm run dev
```

### Issue #2: Supabase Connection Failed

**Symptom:**
- Logs show "Failed to create Supabase client"
- Or "Database error"

**Fix:**
```bash
# Test connection:
curl http://localhost:3000/api/test-supabase

# Should return:
# {"success":true,...}
```

### Issue #3: RLS Policies Blocking

**Symptom:**
- Logs show "Error inserting user"
- Error code: "42501" or "permission denied"

**Fix:**
Check migrations exist:
```bash
ls -la supabase/migrations/ | grep allow_user
```

Should see:
- `allow_user_registration.sql`
- `allow_user_login.sql`

---

## Quick Test

### Test 1: Check Environment Variables

```bash
cat .env
```

Should show:
```
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
JWT_SECRET=propfirm-super-secret-jwt-key-change-in-production-2024
```

### Test 2: Check Supabase Connection

Visit: `http://localhost:3000/api/test-supabase`

Should show:
```json
{
  "success": true,
  "message": "Supabase connection working"
}
```

### Test 3: Check Server is Running

```bash
curl http://localhost:3000
```

Should return HTML (not error)

---

## What to Look For

### ✅ Good Signs (Working):
```
Terminal:
  ✅ "=== REGISTER API ROUTE ENTRY ==="
  ✅ "Environment check passed"
  ✅ "Supabase client created"
  ✅ "User created successfully"
  ✅ "JWT token created successfully"
  ✅ "Registration successful!"

Browser Console:
  ✅ "Registration successful"
  ✅ No red errors
  ✅ Redirects to /dashboard

Browser:
  ✅ Form disappears
  ✅ Dashboard loads
  ✅ No error messages
```

### ❌ Bad Signs (Broken):
```
Terminal:
  ❌ No logs at all → Route not reached
  ❌ "Missing NEXT_PUBLIC_SUPABASE_URL" → .env not loaded
  ❌ "UNHANDLED ERROR" → Something crashed
  ❌ Logs stop mid-way → That step failed

Browser Console:
  ❌ "Failed to parse response as JSON" → Server crashed
  ❌ "Server error. Please check console" → Server sent HTML
  ❌ "500 Internal Server Error" → Uncaught exception

Browser:
  ❌ Error message shows
  ❌ Form stays visible
  ❌ No redirect
```

---

## Step-by-Step Checklist

Work through this in order:

1. [ ] Stop dev server (Ctrl+C)
2. [ ] Check `.env` exists: `ls -la .env`
3. [ ] Check `.env` has JWT_SECRET: `cat .env | grep JWT_SECRET`
4. [ ] Start dev server: `npm run dev`
5. [ ] Wait for server to fully start
6. [ ] Test Supabase: visit `http://localhost:3000/api/test-supabase`
7. [ ] Open browser DevTools (F12)
8. [ ] Open terminal logs side-by-side
9. [ ] Try registration
10. [ ] Watch BOTH terminal and browser console
11. [ ] Find where it fails
12. [ ] Fix that specific issue

---

## Still Not Working?

If you've done all the above and it still fails:

1. **Copy the terminal logs** - Everything from "REGISTER API ROUTE ENTRY" to the error
2. **Copy the browser console** - All errors shown
3. **Tell me which step it stops at**

The new error handling will tell us EXACTLY what's wrong!

---

## Remember!

🔴 **MOST COMMON MISTAKE:** Not restarting dev server after changing `.env`

✅ **SOLUTION:** Always restart: `Ctrl+C` then `npm run dev`

---

**The register endpoint now has bulletproof error handling. If something fails, the logs will tell you exactly what and why!**
