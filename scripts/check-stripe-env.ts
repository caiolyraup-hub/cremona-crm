import { existsSync, readFileSync } from 'node:fs'
import * as path from 'node:path'

function loadEnvFile(filePath: string) {
  if (!existsSync(filePath)) return

  const content = readFileSync(filePath, 'utf8')

  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/)
    if (!match) continue

    const key = match[1].trim()
    let value = match[2].trim()

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    if (!process.env[key]) {
      process.env[key] = value
    }
  }
}

function ok(label: string, value: boolean): string {
  return `${value ? '[OK]' : '[X] '} ${label}`
}

function main() {
  loadEnvFile(path.join(process.cwd(), '.env.local'))

  const secretKey = Boolean(process.env.STRIPE_SECRET_KEY?.trim())
  const publishableKey = Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim())
  const webhookSecret = Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim())
  const appUrl = Boolean(process.env.NEXT_PUBLIC_APP_URL?.trim())
  const priceStarter = Boolean(process.env.STRIPE_PRICE_STARTER?.trim())
  const priceProfessional = Boolean(process.env.STRIPE_PRICE_PROFESSIONAL?.trim())

  const allOk = secretKey && publishableKey && webhookSecret && appUrl && priceStarter && priceProfessional

  console.log('')
  console.log('Stripe Environment Check')
  console.log('========================')
  console.log('')
  console.log(ok('STRIPE_SECRET_KEY', secretKey))
  console.log(ok('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', publishableKey))
  console.log(ok('STRIPE_WEBHOOK_SECRET', webhookSecret))
  console.log(ok('NEXT_PUBLIC_APP_URL', appUrl))
  console.log(ok('STRIPE_PRICE_STARTER', priceStarter))
  console.log(ok('STRIPE_PRICE_PROFESSIONAL', priceProfessional))
  console.log('')

  if (!secretKey) {
    console.log('- STRIPE_SECRET_KEY: obtenha em Stripe Dashboard → Developers → API keys')
  }
  if (!publishableKey) {
    console.log('- NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: chave publica no mesmo local')
  }
  if (!webhookSecret) {
    console.log('- STRIPE_WEBHOOK_SECRET: rode "stripe listen --forward-to localhost:3000/api/stripe/webhook" e copie o whsec_...')
  }
  if (!appUrl) {
    console.log('- NEXT_PUBLIC_APP_URL: ex: http://localhost:3000 para dev, https://sua-app.vercel.app para prod')
  }
  if (!priceStarter) {
    console.log('- STRIPE_PRICE_STARTER: crie o produto Cremona Starter no Stripe e copie o Price ID')
  }
  if (!priceProfessional) {
    console.log('- STRIPE_PRICE_PROFESSIONAL: crie o produto Cremona Profissional no Stripe e copie o Price ID')
  }

  if (allOk) {
    console.log('Stripe pronto para uso.')
  } else {
    console.log('Configure as variaveis acima e rode novamente.')
  }

  console.log('')
}

main()
