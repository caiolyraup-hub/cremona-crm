// ============================================================
// Cremona — Módulo de Assinaturas
// Tipos TypeScript derivados do schema do banco
// ============================================================

// --- Enums -------------------------------------------------

export type BillingCycle    = 'monthly' | 'quarterly' | 'annual'
export type BillingType     = 'PIX' | 'BOLETO' | 'CREDIT_CARD'
export type SubscriberStatus = 'active' | 'past_due' | 'paused' | 'canceled'
export type PaymentStatus   = 'pending' | 'confirmed' | 'received' | 'overdue' | 'refunded'
export type PaymentSource   = 'asaas_webhook' | 'manual'
export type AppointmentStatus = 'scheduled' | 'completed' | 'no_show' | 'canceled'
export type AppointmentSource = 'panel'
export type GoogleSyncOperation = 'create' | 'update' | 'cancel'
export type GoogleSyncStatus = 'pending' | 'failed' | 'succeeded'

// --- plans -------------------------------------------------

export interface Plan {
  id:                string
  workspace_id:      string
  name:              string
  price_cents:       number
  billing_cycle:     BillingCycle
  usage_limit:       number | null
  included_services: unknown[]
  active:            boolean
  created_at:        string
}

export interface PlanInsert {
  workspace_id:      string
  name:              string
  price_cents:       number
  billing_cycle:     BillingCycle
  usage_limit?:      number | null
  included_services?: unknown[]
  active?:           boolean
}

export type PlanUpdate = Partial<Omit<PlanInsert, 'workspace_id'>>

// --- subscribers -------------------------------------------

export interface Subscriber {
  id:                 string
  workspace_id:       string
  contact_id:         string
  asaas_customer_id:  string | null
  owner_barber_id:    string | null   // barbeiro dono da carteira
  status:             SubscriberStatus
  started_at:         string
  canceled_at:        string | null
  created_at:         string
}

export interface SubscriberInsert {
  workspace_id:        string
  contact_id:          string
  asaas_customer_id?:  string | null
  owner_barber_id?:    string | null
  status?:             SubscriberStatus
  started_at?:         string
  canceled_at?:        string | null
}

export interface SubscriberUpdate {
  asaas_customer_id?: string | null
  owner_barber_id?:   string | null
  status?:            SubscriberStatus
  canceled_at?:       string | null
}

// --- subscriptions -----------------------------------------

export interface Subscription {
  id:                          string
  workspace_id:                string
  subscriber_id:               string
  plan_id:                     string
  current_period_start:        string   // date (ISO)
  current_period_end:          string   // date (ISO)
  next_due_date:               string   // date (ISO)
  billing_type:                BillingType
  asaas_subscription_id:       string | null
  sold_by_barber_id:           string | null   // barbeiro que fechou a venda
  usage_count_current_period:  number
  created_at:                  string
}

export interface SubscriptionInsert {
  workspace_id:                string
  subscriber_id:               string
  plan_id:                     string
  current_period_start:        string
  current_period_end:          string
  next_due_date:               string
  billing_type:                BillingType
  asaas_subscription_id?:      string | null
  sold_by_barber_id?:          string | null
  usage_count_current_period?: number
}

export type SubscriptionUpdate = Partial<Omit<SubscriptionInsert, 'workspace_id' | 'subscriber_id'>>

// --- payments ----------------------------------------------

export interface Payment {
  id:               string
  workspace_id:     string
  subscription_id:  string
  asaas_payment_id: string
  amount_cents:     number
  status:           PaymentStatus
  billing_type:     BillingType
  paid_at:          string | null
  due_date:         string   // date (ISO)
  reference_period: string | null   // date (ISO)
  source:           PaymentSource
  created_at:       string
}

export interface PaymentInsert {
  workspace_id:      string
  subscription_id:   string
  asaas_payment_id:  string
  amount_cents:      number
  status?:           PaymentStatus
  billing_type:      BillingType
  paid_at?:          string | null
  due_date:          string
  reference_period?: string | null
  source?:           PaymentSource
}

export interface PaymentUpdate {
  status?:           PaymentStatus
  paid_at?:          string | null
  reference_period?: string | null
}

// --- barbers -----------------------------------------------

export interface Barber {
  id:                 string
  workspace_id:       string
  name:               string
  active:             boolean
  google_calendar_id: string | null
  created_at:         string
}

export interface BarberInsert {
  workspace_id:        string
  name:                string
  active?:             boolean
  google_calendar_id?: string | null
}

export type BarberUpdate = Partial<Omit<BarberInsert, 'workspace_id'>>

// --- appointments ------------------------------------------

export interface Appointment {
  id:              string
  workspace_id:    string
  barber_id:       string
  contact_id:      string
  subscriber_id:   string | null   // null = cliente avulso
  service:         string
  starts_at:       string
  ends_at:         string
  status:          AppointmentStatus
  source:          AppointmentSource
  google_event_id: string | null
  created_at:      string
}

export interface AppointmentInsert {
  workspace_id:     string
  barber_id:        string
  contact_id:       string
  subscriber_id?:   string | null
  service:          string
  starts_at:        string
  ends_at:          string
  status?:          AppointmentStatus
  source?:          AppointmentSource
  google_event_id?: string | null
}

export type AppointmentUpdate = Partial<Omit<AppointmentInsert, 'workspace_id'>>

export interface AppointmentWithCustomerKind extends Appointment {
  customer_kind: 'subscriber' | 'walk_in'
}

// --- Google Calendar sync logs -----------------------------

export interface AppointmentGoogleSyncLog {
  id:             string
  workspace_id:   string
  appointment_id: string
  barber_id:      string | null
  operation:      GoogleSyncOperation
  status:         GoogleSyncStatus
  error_message:  string | null
  payload:        Record<string, unknown>
  retry_count:    number
  next_retry_at:  string | null
  processed_at:   string | null
  created_at:     string
}

export interface AppointmentGoogleSyncLogInsert {
  workspace_id:    string
  appointment_id:  string
  barber_id?:      string | null
  operation:       GoogleSyncOperation
  status?:         GoogleSyncStatus
  error_message?:  string | null
  payload?:        Record<string, unknown>
  retry_count?:    number
  next_retry_at?:  string | null
  processed_at?:   string | null
}

export type AppointmentGoogleSyncLogUpdate =
  Partial<Omit<AppointmentGoogleSyncLogInsert, 'workspace_id' | 'appointment_id' | 'operation'>>

// --- Database extension (para supabase-js tipado) ----------
// Mesclar com o Database gerado pelo `supabase gen types typescript`

export interface SubscriptionsSchema {
  plans:         { Row: Plan;         Insert: PlanInsert;         Update: PlanUpdate }
  subscribers:   { Row: Subscriber;   Insert: SubscriberInsert;   Update: SubscriberUpdate }
  subscriptions: { Row: Subscription; Insert: SubscriptionInsert; Update: SubscriptionUpdate }
  payments:      { Row: Payment;      Insert: PaymentInsert;      Update: PaymentUpdate }
  barbers:       { Row: Barber;       Insert: BarberInsert;       Update: BarberUpdate }
  appointments:  { Row: Appointment;  Insert: AppointmentInsert;  Update: AppointmentUpdate }
  appointment_google_sync_logs: {
    Row: AppointmentGoogleSyncLog
    Insert: AppointmentGoogleSyncLogInsert
    Update: AppointmentGoogleSyncLogUpdate
  }
}
