import { Phone, Mail, Building2, Briefcase } from 'lucide-react'
import type { ContactWithStage, SaleWithContact } from '@/types/app'
import type { Tables } from '@/types/database'
import {
  formatPhone,
  formatRelativeDate,
  formatFullDate,
} from '@/lib/formatters'
import { ContactAvatar } from '@/components/ui/contact-avatar'
import { ContactTags } from './contact-tags'
import { ContactCardTasks } from './contact-card-tasks'
import { ContactCardSales } from './contact-card-sales'

interface ContactCardProps {
  contact: ContactWithStage
  tasks: Tables<'tasks'>[]
  sales: SaleWithContact[]
  workspaceId: string
  onEdit?: () => void
  onRefresh: () => void
  availableTags?: string[]
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="border-t border-gray-100 pb-4 pt-4">
      <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
        {title}
      </p>
      {children}
    </div>
  )
}

function InfoRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ElementType
  label: string
  value: string | null
  href?: string
}) {
  const content = (
    <div className="flex min-w-0 items-center gap-3 py-1.5">
      <Icon size={14} className="shrink-0 text-gray-400" />
      <span className="w-20 shrink-0 text-xs text-gray-400">{label}</span>
      {value ? (
        <span
          className={`truncate text-sm text-gray-700 ${href ? 'text-[#378ADD] hover:underline' : ''}`}
        >
          {value}
        </span>
      ) : (
        <span className="text-sm text-gray-300">Não informado</span>
      )}
    </div>
  )

  if (href && value) {
    return (
      <a href={href} className="block">
        {content}
      </a>
    )
  }
  return content
}

export function ContactCard({
  contact,
  tasks,
  sales,
  workspaceId,
  onEdit,
  onRefresh,
  availableTags = [],
}: ContactCardProps) {
  const customFields = (contact.custom_fields ?? {}) as Record<
    string,
    string | number | boolean | null
  >
  const customEntries = Object.entries(customFields).filter(
    ([, v]) => v !== null && v !== ''
  )

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      {/* Header */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <ContactAvatar name={contact.name} size="lg" />
            <div className="min-w-0">
              <h2 className="text-[18px] font-medium leading-tight text-gray-900">
                {contact.name}
              </h2>
              {contact.company && (
                <p className="mt-0.5 text-sm text-gray-500">{contact.company}</p>
              )}
              {contact.position && (
                <p className="text-sm text-gray-400">{contact.position}</p>
              )}
              {contact.pipeline_stage && (
                <span
                  className="mt-2 inline-block rounded-md px-2 py-0.5 text-xs font-medium"
                  style={{
                    backgroundColor: contact.pipeline_stage.color + '20',
                    color: contact.pipeline_stage.color,
                  }}
                >
                  {contact.pipeline_stage.name}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={onEdit}
            className="shrink-0 rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
          >
            Editar
          </button>
        </div>
      </div>

      <div className="px-5 pb-5">
        {/* Contact info */}
        <Section title="Informações">
          <div className="divide-y divide-gray-50">
            <InfoRow
              icon={Phone}
              label="Telefone"
              value={contact.phone ? formatPhone(contact.phone) : null}
              href={contact.phone ? `tel:${contact.phone}` : undefined}
            />
            <InfoRow
              icon={Mail}
              label="E-mail"
              value={contact.email}
              href={contact.email ? `mailto:${contact.email}` : undefined}
            />
            <InfoRow icon={Building2} label="Empresa" value={contact.company} />
            <InfoRow icon={Briefcase} label="Cargo" value={contact.position} />
          </div>
        </Section>

        {/* Tags — inline editable */}
        <Section title="Etiquetas">
          <ContactTags
            contactId={contact.id}
            workspaceId={workspaceId}
            tags={contact.tags ?? []}
            availableTags={availableTags}
          />
        </Section>

        {/* Tasks */}
        <div className="border-t border-gray-100 pb-4 pt-4">
          <ContactCardTasks
            tasks={tasks}
            contactId={contact.id}
            contactName={contact.name}
            workspaceId={workspaceId}
          />
        </div>

        <div className="border-t border-gray-100 pb-4 pt-4">
          <ContactCardSales
            sales={sales}
            contactId={contact.id}
            workspaceId={workspaceId}
            onRefresh={onRefresh}
          />
        </div>

        {/* Custom fields */}
        {customEntries.length > 0 && (
          <Section title="Campos personalizados">
            <dl className="space-y-1.5">
              {customEntries.map(([key, value]) => (
                <div key={key} className="flex gap-2">
                  <dt className="text-xs text-gray-400">{key}:</dt>
                  <dd className="text-sm text-gray-700">{String(value)}</dd>
                </div>
              ))}
            </dl>
          </Section>
        )}

        {customEntries.length === 0 && (
          <Section title="Campos personalizados">
            <button className="text-xs text-gray-400 transition-colors hover:text-[#378ADD]">
              + Adicionar campo
            </button>
          </Section>
        )}

        {/* Footer */}
        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs text-gray-400">
            Criado em {formatFullDate(contact.created_at)}
          </p>
          <p className="text-xs text-gray-400">
            Atualizado {formatRelativeDate(contact.updated_at)}
          </p>
        </div>
      </div>
    </div>
  )
}
