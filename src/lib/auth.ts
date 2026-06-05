import { lovable } from '@/integrations/lovable'
import { supabase } from '@/integrations/supabase/client'

const USE_LOVABLE_AUTH_BRIDGE = import.meta.env.VITE_USE_LOVABLE_AUTH_BRIDGE !== 'false'

type GoogleSignInResult = {
  error?: Error
}

export function isLovableAuthBridgeEnabled() {
  return USE_LOVABLE_AUTH_BRIDGE
}

export async function signInWithGoogle(): Promise<GoogleSignInResult> {
  const redirectTo = window.location.origin
  const queryParams = {
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'openid',
      'email',
      'profile',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/contacts.readonly',
      'https://www.googleapis.com/auth/calendar.readonly',
    ].join(' '),
  }

  if (USE_LOVABLE_AUTH_BRIDGE) {
    const result = await lovable.auth.signInWithOAuth('google', {
      redirect_uri: redirectTo,
      extraParams: queryParams,
    })
    return { error: result.error ? new Error(String(result.error.message ?? result.error)) : undefined }
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      queryParams,
    },
  })

  return { error: error ?? undefined }
}

export async function getGoogleAccessToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.provider_token ?? null
}
