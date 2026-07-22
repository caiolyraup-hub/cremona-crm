type Scenario = {
  name: string
  input: string | null
  expected: {
    isOpen: boolean
    label: string
  }
}

function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString()
}

async function main() {
  const { getWhatsAppWindowStatus, isWithinWhatsApp24hWindow } = await import(
    new URL('../lib/whatsapp/conversation-window.ts', import.meta.url).href
  )

  const scenarios: Scenario[] = [
    {
      name: 'Sem inbound',
      input: null,
      expected: {
        isOpen: false,
        label: 'Sem janela ativa',
      },
    },
    {
      name: 'Inbound recente',
      input: minutesAgo(30),
      expected: {
        isOpen: true,
        label: 'Janela aberta',
      },
    },
    {
      name: 'Inbound quase expirando',
      input: minutesAgo(23 * 60 + 30),
      expected: {
        isOpen: true,
        label: 'Janela aberta',
      },
    },
    {
      name: 'Inbound expirado',
      input: minutesAgo(25 * 60),
      expected: {
        isOpen: false,
        label: 'Janela fechada',
      },
    },
  ]

  let hasFailure = false

  for (const scenario of scenarios) {
    const windowStatus = getWhatsAppWindowStatus(scenario.input)
    const isOpen = isWithinWhatsApp24hWindow(scenario.input)
    const passed =
      windowStatus.isOpen === scenario.expected.isOpen &&
      windowStatus.label === scenario.expected.label &&
      isOpen === scenario.expected.isOpen

    console.log(`${scenario.name}: ${passed ? 'OK' : 'FAIL'}`)
    console.log(
      `  input=${scenario.input ?? 'null'} | isOpen=${windowStatus.isOpen} | label=${windowStatus.label} | minutesRemaining=${windowStatus.minutesRemaining ?? 'null'}`
    )

    if (!passed) {
      hasFailure = true
    }
  }

  if (hasFailure) {
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('Erro ao validar janela WhatsApp:', error)
  process.exit(1)
})
