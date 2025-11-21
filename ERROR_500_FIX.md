# Fix for 500 Internal Server Error

## Problem
When trying to register, the server was returning a 500 error with an HTML page instead of JSON, causing:
```
SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
```

## Root Cause
**Missing `JWT_SECRET` environment variable**

The server was crashing when trying to create JWT tokens because `process.env.JWT_SECRET` was undefined. The JWT library requires a secret key to sign tokens.

## Fixes Applied

### 1. Added JWT_SECRET to .env
**File:** `.env`

Added:
```env
JWT_SECRET=propfirm-super-secret-jwt-key-change-in-production-2024
```

**Why this matters:**
- JWT tokens require a secret key for signing
- Without it, the `createToken()` function crashes
- This caused the entire API route to fail with 500 error
- Next.js returns HTML error pages for uncaught errors

### 2. Enhanced Error Handling in Auth Routes
**Files:** `app/api/auth/register/route.ts`, `app/api/auth/login/route.ts`

Added try-catch blocks around JWT token creation:
```typescript
try {
  token = await createToken(user.id)
  console.log('JWT token created successfully')
} catch (tokenError) {
  console.error('Error creating JWT token:', tokenError)
  return NextResponse.json(
    { error: 'Failed to create authentication token', details: ... },
    { status: 500 }
  )
}
```

**Benefits:**
- Prevents server crashes
- Returns proper JSON error responses
- Detailed error logging
- User-friendly error messages

### 3. Improved Frontend Error Handling
**Files:** `app/(auth)/register/page.tsx`, `app/(auth)/login/page.tsx`

Added JSON parsing error handling:
```typescript
let data
try {
  data = await res.json()
} catch (jsonError) {
  console.error('Failed to parse response as JSON:', jsonError)
  throw new Error('Server error. Please check console and try again.')
}
```

**Benefits:**
- Catches HTML error pages
- Shows helpful error message
- Prevents cryptic JSON parsing errors
- Directs user to check console

## How JWT Authentication Works

1. **Registration/Login:**
   - User submits credentials
   - Server verifies credentials
   - Server creates JWT token using `JWT_SECRET`
   - Token stored in httpOnly cookie

2. **JWT Token Structure:**
   ```
   Header.Payload.Signature
   ```
   - Header: Algorithm (HS256)
   - Payload: User ID, expiration (7 days)
   - Signature: Signed with JWT_SECRET

3. **Token Verification:**
   - Middleware reads token from cookie
   - Verifies signature using same JWT_SECRET
   - Extracts user ID from payload
   - Allows/denies access to protected routes

## Testing

### Test Registration
1. Go to http://localhost:3000/register
2. Fill in:
   - Name: Test User
   - Email: test@example.com
   - Password: password123
3. Click Register
4. **Expected:** Success, redirect to dashboard

### Check Server Logs
You should see:
```
=== REGISTER API CALLED ===
Supabase URL: https://...
Has Anon Key: true
Has Service Role: false
Attempting to create new user: { email: '...', name: '...' }
User created successfully: { id: '...', ... }
Creating JWT token for user: ...
JWT token created successfully
```

### If Still Getting Errors

Check these in order:

1. **Environment Variable Loaded:**
   ```bash
   # In your terminal, restart dev server:
   npm run dev
   ```

2. **Test Supabase Connection:**
   ```
   Visit: http://localhost:3000/api/test-supabase
   Should return: {"success": true, ...}
   ```

3. **Check Server Logs:**
   - Look for "JWT token created successfully"
   - If you see JWT errors, the .env might not be loaded

4. **Clear Next.js Cache:**
   ```bash
   rm -rf .next
   npm run build
   npm run dev
   ```

## Security Notes

⚠️ **Important for Production:**

1. Change `JWT_SECRET` to a strong random value:
   ```bash
   # Generate a secure secret:
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. Never commit `.env` file to git

3. Use environment variables in production:
   - Vercel: Project Settings → Environment Variables
   - Heroku: Config Vars
   - AWS: Parameter Store or Secrets Manager

4. Rotate JWT_SECRET periodically

## What Changed

| Component | Before | After |
|-----------|--------|-------|
| `.env` | Missing JWT_SECRET | ✅ JWT_SECRET added |
| Register API | Could crash | ✅ Graceful error handling |
| Login API | Could crash | ✅ Graceful error handling |
| Frontend | Generic error | ✅ Specific error messages |
| Error Response | HTML page (500) | ✅ JSON error object |

## Files Modified

1. `.env` - Added JWT_SECRET
2. `app/api/auth/register/route.ts` - JWT error handling
3. `app/api/auth/login/route.ts` - JWT error handling
4. `app/(auth)/register/page.tsx` - JSON parse error handling
5. `app/(auth)/login/page.tsx` - JSON parse error handling

## Summary

✅ **Root cause:** Missing JWT_SECRET environment variable
✅ **Solution:** Added JWT_SECRET to .env file
✅ **Enhancement:** Better error handling throughout auth flow
✅ **Result:** Registration and login now work correctly

The 500 error should now be completely resolved!
