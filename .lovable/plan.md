

# Email/Password Fallback Login

## What this does
Adds email + password sign-up and sign-in as a second auth method on the login page, below the Google button. Testers who cannot use Google OAuth can create an account with email/password instead.

## Changes

### 1. LoginPage.tsx
- Add a toggle or tab to switch between Google and email/password modes
- Email mode shows: email input, password input, submit button, and a "Sign up / Sign in" toggle
- Uses `supabase.auth.signUp()` and `supabase.auth.signInWithPassword()` directly
- Show inline validation errors (wrong password, email taken, etc.)
- Keep Google button always visible at top; email form below a divider ("or continue with email")

### 2. Enable auto-confirm for email signups
Since this is for alpha testers, email verification adds friction. Use `cloud--configure_auth` to enable auto-confirm so testers can sign in immediately after signup.

### 3. AccountPage.tsx
- No changes needed - sign out already works for any auth method

## Layout sketch

```text
+---------------------------+
|        RealDeal           |
|   Sign in to continue     |
|                           |
| [G] Continue with Google  |
|                           |
|  ------- or -------       |
|                           |
|  Email  [____________]    |
|  Password [__________]    |
|                           |
|  [  Sign in  ]            |
|  Don't have an account?   |
|  Sign up                  |
|                           |
|  Try demo mode            |
+---------------------------+
```

## Files modified
- `src/components/auth/LoginPage.tsx` - add email/password form
- Auth config - enable auto-confirm for alpha

