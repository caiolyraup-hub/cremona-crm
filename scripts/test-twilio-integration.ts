import twilio from 'twilio'

function requireValue(key: string): string {
  const value = process.env[key]?.trim()
  if (!value) throw new Error(`${key} nao configurada.`)
  return value
}

function mask(value: string): string {
  if (value.startsWith('whatsapp:+') && value.length > 10) {
    return `${value.slice(0, 13)}******${value.slice(-4)}`
  }
  if (value.length <= 8) return '***'
  return `${value.slice(0, 4)}***${value.slice(-4)}`
}

async function main() {
  const accountSid = requireValue('TWILIO_ACCOUNT_SID')
  const apiKeySid = requireValue('TWILIO_API_KEY_SID')
  const apiKeySecret = requireValue('TWILIO_API_KEY_SECRET')
  const from = requireValue('TWILIO_WHATSAPP_FROM')
  const to = requireValue('TWILIO_TEST_TO')
  const statusCallback = requireValue('TWILIO_STATUS_CALLBACK_URL')
  const contentSid = process.env.TWILIO_CONTENT_SID_NEW_LEAD?.trim()
  const shouldSend = process.env.TWILIO_CONFIRM_SEND === 'yes'

  console.log('Twilio dry-run')
  console.log(`from=${mask(from)} to=${mask(to)} account=${mask(accountSid)} apiKey=${mask(apiKeySid)}`)
  console.log(`statusCallback=${statusCallback}`)

  if (!shouldSend) {
    console.log('Nenhuma mensagem enviada. Defina TWILIO_CONFIRM_SEND=yes para envio real.')
    return
  }

  const client = twilio(apiKeySid, apiKeySecret, { accountSid })
  const textResult = await client.messages.create({
    from,
    to,
    body: 'Teste Cremona CRM via Twilio.',
    statusCallback,
  })
  console.log(`Texto enviado: ${textResult.sid}`)

  if (contentSid) {
    const templateResult = await client.messages.create({
      from,
      to,
      contentSid,
      contentVariables: JSON.stringify({ 1: 'Teste' }),
      statusCallback,
    })
    console.log(`Template enviado: ${templateResult.sid}`)
  } else {
    console.log('TWILIO_CONTENT_SID_NEW_LEAD ausente; template nao enviado.')
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Erro desconhecido no teste Twilio.')
  process.exit(1)
})
