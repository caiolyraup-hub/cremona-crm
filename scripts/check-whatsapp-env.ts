import { existsSync, readFileSync } from 'node:fs'
import * as path from 'node:path'

function loadEnvFile(filePath: string) {
  if (!existsSync(filePath)) {
    return
  }

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

function formatStatus(value: boolean): string {
  return value ? 'OK' : 'pendente'
}

function main() {
  loadEnvFile(path.join(process.cwd(), '.env.local'))

  const hasVerifyToken = Boolean(process.env.WHATSAPP_VERIFY_TOKEN?.trim())
  const hasAppSecret = Boolean(process.env.WHATSAPP_APP_SECRET?.trim())
  const webhookBaseUrl = process.env.WEBHOOK_BASE_URL?.trim()

  console.log('WhatsApp Environment Check')
  console.log('')
  console.log(`WHATSAPP_VERIFY_TOKEN: ${formatStatus(hasVerifyToken)}`)
  console.log(`WHATSAPP_APP_SECRET: ${formatStatus(hasAppSecret)}`)
  console.log(
    `WEBHOOK_BASE_URL: ${webhookBaseUrl ? 'OK' : 'nao configurado, usando localhost'}`
  )

  if (!hasVerifyToken) {
    console.log('- WHATSAPP_VERIFY_TOKEN nao configurado.')
  }

  if (!hasAppSecret) {
    console.log(
      '- WHATSAPP_APP_SECRET nao configurado. A validacao HMAC nao funcionara em producao.'
    )
  }
}

main()
