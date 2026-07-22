function requireEnv(key: string): string {
  const value = process.env[key]
  if (!value) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Variavel de ambiente obrigatoria nao configurada: ${key}`)
    }
    console.warn(`[env] ${key} nao configurada`)
    return ''
  }
  return value
}

// Lazy getters — o valor só é lido quando env.X é acessado (runtime), não no import.
// Isso evita que o Next.js jogue erro durante o build quando vars não estão no .env.local.
export const env = {
  get supabase() {
    return {
      url: requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
      anonKey: requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    }
  },
  get whatsapp() {
    return {
      verifyToken: requireEnv('WHATSAPP_VERIFY_TOKEN'),
      appSecret: process.env.WHATSAPP_APP_SECRET ?? '',
    }
  },
  get stripe() {
    return {
      secretKey: requireEnv('STRIPE_SECRET_KEY'),
      publishableKey: requireEnv('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'),
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
    }
  },
  get app() {
    return {
      url: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
    }
  },
}
