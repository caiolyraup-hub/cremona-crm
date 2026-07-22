import type { WhatsAppTemplate } from '@/types/whatsapp'

// Estes templates precisam ser criados e aprovados no Meta Business Manager antes
// de serem usados. O nome do template na Meta deve bater exatamente com o campo
// `name` abaixo. Guia de aprovação: docs/whatsapp-setup.md

export interface CremonaTemplateDefinition {
  name: string
  displayName: string
  description: string
  language: string
  exampleText: string
  variables: string[]
  buildTemplate: (params: Record<string, string>) => WhatsAppTemplate
}

export const CREMONA_TEMPLATES: Record<string, CremonaTemplateDefinition> = {
  follow_up_post_inactivity: {
    name: 'follow_up_post_inactivity',
    displayName: 'Follow-up — Lead inativo',
    description: 'Enviar quando lead não responde há mais de 48h',
    language: 'pt_BR',
    exampleText: 'Olá {{name}}, tudo bem? Queria retomar nossa conversa sobre {{subject}}.',
    variables: ['name', 'subject'],
    buildTemplate: (params) => ({
      name: 'follow_up_post_inactivity',
      language: 'pt_BR',
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: params.name ?? '' },
            { type: 'text', text: params.subject ?? '' },
          ],
        },
      ],
    }),
  },

  proposal_reminder: {
    name: 'proposal_reminder',
    displayName: 'Lembrete de proposta',
    description: 'Lembrar o cliente de uma proposta enviada sem resposta',
    language: 'pt_BR',
    exampleText:
      'Olá {{name}}, sua proposta de {{product}} ainda está disponível. Posso ajudar com alguma dúvida?',
    variables: ['name', 'product'],
    buildTemplate: (params) => ({
      name: 'proposal_reminder',
      language: 'pt_BR',
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: params.name ?? '' },
            { type: 'text', text: params.product ?? '' },
          ],
        },
      ],
    }),
  },

  reactivation: {
    name: 'reactivation',
    displayName: 'Reativação',
    description: 'Reativar cliente que sumiu',
    language: 'pt_BR',
    exampleText:
      'Oi {{name}}! Faz um tempo que não nos falamos. Tenho novidades sobre {{subject}} para você.',
    variables: ['name', 'subject'],
    buildTemplate: (params) => ({
      name: 'reactivation',
      language: 'pt_BR',
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: params.name ?? '' },
            { type: 'text', text: params.subject ?? '' },
          ],
        },
      ],
    }),
  },
}
