import type { Tables } from './database'

export type WorkspaceClient = Omit<Tables<'workspaces'>, 'whatsapp_token'> & {
  has_whatsapp_token: boolean
}

export type Pipeline = Tables<'pipelines'>

export type WorkspaceWithStages = WorkspaceClient & {
  pipeline_stages: Tables<'pipeline_stages'>[]
  pipelines: Pipeline[]
}

export type ContactWithStage = Tables<'contacts'> & {
  pipeline_stage: Tables<'pipeline_stages'> | null
}

export type DealWithContact = Tables<'deals'> & {
  contact: Tables<'contacts'>
}

export type TaskWithContact = Tables<'tasks'> & {
  contact: {
    id: string
    name: string
    phone: string | null
    company: string | null
  } | null
}

export interface CreateTaskInput {
  title: string
  contact_id?: string
  priority: 'high' | 'medium' | 'low'
  due_date?: string
  description?: string
}

export type ActivityWithUser = Tables<'activities'> & {
  user: {
    id: string
    email: string
    user_metadata: { full_name?: string }
  } | null
}

export type SaleStatus = 'paid' | 'pending' | 'cancelled'

export type SaleStatusFilter = 'all' | SaleStatus

export type SalePaymentMethod =
  | 'pix'
  | 'card'
  | 'boleto'
  | 'cash'
  | 'transfer'

export type SalesView = 'list' | 'report'

export type SalesPeriod = 'this_week' | 'this_month' | 'last_3_months' | 'custom'

export type SaleWithContact = Tables<'sales'> & {
  contact: {
    id: string
    name: string
    phone: string | null
    company: string | null
  } | null
}

export interface CreateSaleInput {
  product_name: string
  value: number
  contact_id?: string
  sale_date: string
  payment_method: SalePaymentMethod
  status: SaleStatus
  notes?: string
}

export interface SalesSummary {
  totalPaid: number
  totalPending: number
  totalCancelled: number
  averageTicket: number
  count: number
  topProducts: Array<{
    name: string
    count: number
    total: number
  }>
  weeklyData: Array<{
    week: string
    total: number
    count: number
  }>
}

export interface CreateContactInput {
  name: string
  phone: string
  email: string
  company: string
  position: string
  tags: string[]
  pipeline_stage_id: string
}

export interface UpdateContactInput extends CreateContactInput {
  id: string
}

export interface ContactFormErrors {
  name?: string
  phone?: string
  email?: string
  general?: string
}

export interface KanbanContact {
  id: string
  name: string
  phone: string | null
  company: string | null
  tags: string[]
  pipeline_stage_id: string | null
  deal_value: number | null
  open_task_count: number
  sales_count: number
}

export interface WeeklyKPIs {
  revenue: number
  revenuePrev: number
  newLeads: number
  newLeadsPrev: number
  conversions: number
  conversionsPrev: number
  conversionRate: number
  tasksCompleted: number
  tasksCompletedPrev: number
}

export interface WeeklyChartData {
  weekStart: string
  weekLabel: string
  weekRangeLabel: string
  revenue: number
  leads: number
  conversions: number
}

export interface FunnelStage {
  stageId: string
  stageName: string
  stageColor: string
  position: number
  count: number
  conversionRate: number
}

export type DashboardActivity = Tables<'activities'> & {
  contact: { id: string; name: string } | null
}

export type TemplateVariable = {
  index: number
  label: string
  default: string
  value?: string
}

export type WhatsAppTemplateStatus = 'pending' | 'approved' | 'rejected'

export type AutomationTriggerType = 'stage_enter' | 'stage_exit' | 'contact_created' | 'task_overdue'
export type AutomationActionType =
  | 'send_whatsapp_text'
  | 'send_whatsapp_template'
  | 'send_whatsapp_media'
  | 'create_task'
export type AutomationLogStatus = 'success' | 'failed' | 'skipped'

export type AutomationTriggerConfig =
  | { stage_id: string }
  | Record<string, never>

export type AutomationActionConfig =
  | { message: string }
  | { template_key: string; params: Record<string, string> }
  | {
      media_url: string
      media_type: 'image' | 'document' | 'audio' | 'video'
      filename: string
      caption?: string
    }
  | { title: string; priority: 'high' | 'medium' | 'low'; days_offset: number }

export type Automation = {
  id: string
  workspace_id: string
  name: string
  trigger_type: AutomationTriggerType
  trigger_config: Record<string, string>
  action_type: AutomationActionType
  action_config: Record<string, string>
  active: boolean
  delay_minutes: number
  run_count: number
  last_run_at: string | null
  created_at: string
  updated_at: string
}

export type AutomationLog = {
  id: string
  workspace_id: string
  automation_id: string
  contact_id: string | null
  status: AutomationLogStatus
  error_message: string | null
  executed_at: string
}

export type AutomationWithStats = Automation & {
  log_count: number
  success_count: number
  week_success_count: number
  last_log: AutomationLog | null
}

export type MessageDirection = 'inbound' | 'outbound'

export type MessageStatus =
  | 'received'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed'

export type InboxMessage = Tables<'messages'> & {
  direction: MessageDirection
  status: MessageStatus | string
}

export type InboxConversation = {
  contactId: string
  contactName: string
  contactPhone: string | null
  contactCompany?: string | null
  contactEmail?: string | null
  contactTags?: string[]
  lastMessage: string
  lastMessageAt: string
  lastMessageDirection: MessageDirection
  unreadCount: number
}
