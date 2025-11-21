# Authentication Debug Guide

## Current Status

The authentication system has been updated with:
1. Enhanced error logging in auth routes
2. Better error messages on frontend
3. Fallback to anon key when service role key is missing
4. Test endpoint to verify Supabase connection

## Debugging Steps

### 1. Test Supabase Connection

Visit: `http://localhost:3000/api/test-supabase`

Expected response (success):
```json
{
  "success": true,
  "message": "Supabase connection working",
  "hasServiceRole": false,
  "url": "https://0ec90b57d6e95fcbda19832f.supabase.co"
}
```

If this fails, check:
- `.env` file exists and has correct Supabase URL and anon key
- Supabase database is accessible
- Network connection is working

### 2. Check Browser Console

When trying to register/login, open browser DevTools (F12) and check:

**Console Tab:**
- Look for error messages from the auth pages
- Check for "Registration failed:" or "Login failed:" logs
- Note any specific error codes or messages

**Network Tab:**
- Find the `/api/auth/register` or `/api/auth/login` request
- Check Response tab for detailed error message
- Status should be 401, 400, or 500 with error details

### 3. Check Server Logs

In your terminal where `npm run dev` is running, look for:
- "=== REGISTER API CALLED ===" or "=== LOGIN API CALLED ==="
- Supabase connection info (URL, keys available)
- Database query errors
- Detailed error objects

### 4. Common Issues and Solutions

#### Issue: 401 Unauthorized
**Cause:** RLS policies blocking access

**Solution:** The policies should already be set up correctly. Check:
```bash
# Verify migrations ran
ls -la supabase/migrations/
```

You should see:
- `20251120103738_allow_user_registration.sql`
- `20251120103805_allow_user_login.sql`

#### Issue: "Database error"
**Cause:** Supabase query failing

**Check server logs for:**
- Error code (e.g., "42P01" means table doesn't exist)
- Error message with details
- Hint field for suggestions

**Common codes:**
- `42P01`: Table doesn't exist - run migrations
- `42501`: Insufficient permissions - check RLS policies
- `23505`: Unique constraint violation - email already exists

#### Issue: "Internal server error"
**Cause:** Various - check server logs

**Look for:**
- Validation errors (password too short, invalid email)
- Database connection errors
- Missing environment variables

### 5. Manual Database Check

If auth still fails, manually verify the database:

```javascript
// In browser console or test file
const { createClient } = await import('@supabase/supabase-js');
const supabase = createClient(
  'https://0ec90b57d6e95fcbda19832f.supabase.co',
  'YOUR_ANON_KEY_HERE'
);

// Test query
const { data, error } = await supabase.from('users').select('count');
console.log('Query result:', { data, error });
```

### 6. Registration Flow

**Expected flow:**
1. User submits form → Frontend sends POST to `/api/auth/register`
2. Server validates input → Checks for existing user
3. Server hashes password → Inserts into database
4. Server creates JWT token → Sets cookie
5. Frontend redirects to dashboard

**Check each step:**
- Browser console: "Registration successful"
- Server logs: "User created successfully"
- No errors in Network tab

### 7. Login Flow

**Expected flow:**
1. User submits form → Frontend sends POST to `/api/auth/login`
2. Server queries user by email → Compares password hash
3. Server creates JWT token → Sets cookie
4. Frontend redirects to dashboard

**Check each step:**
- Browser console: "Login successful"
- Server logs: "User found: true"
- No errors in Network tab

## Quick Fix Checklist

- [ ] `.env` file exists with correct values
- [ ] Database migrations have run
- [ ] Supabase connection test passes
- [ ] Browser console shows detailed errors
- [ ] Server logs show API calls
- [ ] Network tab shows request/response details

## Getting Help

If still having issues, provide:
1. Server logs from auth attempt
2. Browser console errors
3. Network tab Response for failed request
4. Output from `/api/test-supabase`

## Notes

- Service role key is optional - anon key works with RLS policies
- All auth operations now have extensive logging
- Error messages include database codes and hints
- Frontend shows detailed error messages to users
