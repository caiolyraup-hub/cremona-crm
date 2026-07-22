'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useCurrencyInput } from '@/hooks/use-currency-input'
import { format, startOfWeek, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  ArrowLeftRight,
  Banknote,
  Calendar,
  ChevronDown,
  CreditCard,
  FileText,
  Trash2,
  User,
  X,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  createSaleAction,
  deleteSaleAction,
  updateSaleAction,
} from '@/app/(dashboard)/dashboard/sales/actions'
import { ContactAvatar } from '@/components/ui/contact-avatar'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import {
  getDateKey,
  getTodayDateKey,
} from '@/lib/formatters'
import { isSaleDateAllowed, normalizePaymentMethod, SALES_STATUS_LABELS } from '@/lib/sales'
import type {
  CreateSaleInput,
  SalePaymentMethod,
  SaleStatus,
  SaleWithContact,
} from '@/types/app'

interface ContactOption {
  id: string
  name: string
  phone: string | null
  company: string | null
}

interface SaleModalProps {
  mode: 'create' | 'edit'
  sale?: SaleWithContact
  workspaceId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  defaultContactId?: string
}

interface FormErrors {
  product_name?: string
  value?: string
  sale_date?: string
  payment_method?: string
  status?: string
  notes?: string
}

const EMPTY_FORM = {
  product_name: '',
  contact_id: '',
  sale_date: '',
  payment_method: 'pix' as SalePaymentMethod,
  status: 'paid' as SaleStatus,
  notes: '',
}

const PAYMENT_OPTIONS: Array<{
  value: SalePaymentMethod
  label: string
  icon: typeof Zap
}> = [
  { value: 'pix', label: 'PIX', icon: Zap },
  { value: 'card', label: 'Cartao', icon: CreditCard },
  { value: 'boleto', label: 'Boleto', icon: FileText },
  { value: 'cash', label: 'Dinheiro', icon: Banknote },
  { value: 'transfer', label: 'Transferencia', icon: ArrowLeftRight },
]

export function SaleModal({
  mode,
  sale,
  workspaceId,
  open,
  onOpenChange,
  onSuccess,
  defaultContactId,
}: SaleModalProps) {
  const [form, setForm] = useState(EMPTY_FORM)
  const { amountValue, displayValue, handleAmountChange, reset: resetAmount, setFromDecimal } = useCurrencyInput()
  const [errors, setErrors] = useState<FormErrors>({})
  const [contacts, setContacts] = useState<ContactOption[]>([])
  const [contactSearch, setContactSearch] = useState('')
  const [filteredContacts, setFilteredContacts] = useState<ContactOption[]>([])
  const [contactDropdownOpen, setContactDropdownOpen] = useState(false)
  const [selectedContact, setSelectedContact] = useState<ContactOption | null>(null)
  const [productSuggestions, setProductSuggestions] = useState<string[]>([])
  const [productSuggestionsOpen, setProductSuggestionsOpen] = useState(false)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const productRef = useRef<HTMLInputElement>(null)

  const todayKey = getTodayDateKey()
  const yesterdayKey = format(subDays(new Date(), 1), 'yyyy-MM-dd')
  const weekStartKey = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')

  useEffect(() => {
    if (!open) return

    setErrors({})
    setDeleteConfirm(false)
    setPaymentOpen(false)
    setStatusOpen(false)
    setDatePickerOpen(false)
    setProductSuggestionsOpen(false)
    setContactDropdownOpen(false)

    if (mode === 'edit' && sale) {
      const paymentMethod = normalizePaymentMethod(sale.payment_method) ?? 'pix'
      setForm({
        product_name: sale.product_name,
        contact_id: sale.contact_id ?? '',
        sale_date: getDateKey(sale.sale_date),
        payment_method: paymentMethod,
        status: (sale.status as SaleStatus) ?? 'paid',
        notes: sale.notes ?? '',
      })
      setFromDecimal(Number(sale.value ?? 0))
      setSelectedContact(
        sale.contact
          ? {
              id: sale.contact.id,
              name: sale.contact.name,
              phone: sale.contact.phone,
              company: sale.contact.company,
            }
          : null
      )
      setContactSearch(sale.contact?.name ?? '')
    } else {
      setForm({
        ...EMPTY_FORM,
        contact_id: defaultContactId ?? '',
        sale_date: todayKey,
      })
      resetAmount()
      setSelectedContact(null)
      setContactSearch('')
    }
  }, [open, mode, sale, defaultContactId, todayKey, resetAmount, setFromDecimal])

  useEffect(() => {
    if (!open) return
    const timer = setTimeout(() => productRef.current?.focus(), 60)
    return () => clearTimeout(timer)
  }, [open])

  useEffect(() => {
    if (!open) return
    let cancelled = false

    async function loadContacts() {
      const supabase = createClient()
      const { data } = await supabase
        .from('contacts')
        .select('id, name, phone, company')
        .eq('workspace_id', workspaceId)
        .is('deleted_at', null)
        .order('name')
        .limit(200)

      if (cancelled) return

      const loaded = (data ?? []) as ContactOption[]
      setContacts(loaded)
      setFilteredContacts(loaded)

      if (defaultContactId && !sale) {
        const contact = loaded.find(item => item.id === defaultContactId) ?? null
        setSelectedContact(contact)
        setContactSearch(contact?.name ?? '')
      }
    }

    loadContacts()
    return () => {
      cancelled = true
    }
  }, [open, workspaceId, defaultContactId, sale])

  useEffect(() => {
    const timer = setTimeout(() => {
      const query = contactSearch.trim().toLowerCase()
      if (!query) {
        setFilteredContacts(contacts)
        return
      }

      setFilteredContacts(
        contacts.filter(contact =>
          contact.name.toLowerCase().includes(query) ||
          (contact.company?.toLowerCase() ?? '').includes(query) ||
          (contact.phone ?? '').includes(query)
        )
      )
    }, 200)

    return () => clearTimeout(timer)
  }, [contactSearch, contacts])

  useEffect(() => {
    if (!open) return

    const query = form.product_name.trim()
    if (query.length < 2) {
      setProductSuggestions([])
      return
    }

    let cancelled = false
    const timer = setTimeout(async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('sales')
        .select('product_name')
        .eq('workspace_id', workspaceId)
        .ilike('product_name', `%${query}%`)
        .limit(8)

      if (cancelled) return

      const uniqueSuggestions = Array.from(
        new Set(
          ((data ?? []) as Array<{ product_name: string }>)
            .map(item => item.product_name)
            .filter(Boolean)
        )
      )
      setProductSuggestions(uniqueSuggestions)
      setProductSuggestionsOpen(uniqueSuggestions.length > 0)
    }, 250)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [form.product_name, open, workspaceId])

  function setField<K extends keyof typeof form>(field: K, value: (typeof form)[K]) {
    setForm(current => ({ ...current, [field]: value }))
    setErrors(current => ({ ...current, [field]: undefined }))
  }

  function handleSelectContact(contact: ContactOption | null) {
    setSelectedContact(contact)
    setField('contact_id', contact?.id ?? '')
    setContactSearch(contact?.name ?? '')
    setContactDropdownOpen(false)
  }

  function handleClose() {
    setDeleteConfirm(false)
    onOpenChange(false)
  }

  function validateForm(): boolean {
    const nextErrors: FormErrors = {}

    if (form.product_name.trim().length < 2) {
      nextErrors.product_name = 'Informe um produto ou servico com pelo menos 2 caracteres'
    }

    if (!(amountValue > 0)) {
      nextErrors.value = 'Informe um valor maior que zero'
    }

    const dateKey = getDateKey(form.sale_date)
    if (!dateKey) {
      nextErrors.sale_date = 'Informe uma data valida'
    } else if (!isSaleDateAllowed(dateKey)) {
      nextErrors.sale_date = 'A data nao pode passar de 7 dias no futuro'
    }

    if ((form.notes ?? '').length > 1000) {
      nextErrors.notes = 'Observacoes devem ter no maximo 1000 caracteres'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  function buildPayload(): CreateSaleInput {
    return {
      product_name: form.product_name.trim(),
      value: amountValue,
      contact_id: form.contact_id || undefined,
      sale_date: form.sale_date,
      payment_method: form.payment_method,
      status: form.status,
      notes: form.notes.trim() || undefined,
    }
  }

  function handleSubmit() {
    if (!validateForm()) return

    const payload = buildPayload()

    startTransition(async () => {
      if (mode === 'create') {
        const result = await createSaleAction(payload, workspaceId)
        if (result.error) {
          toast.error(result.error)
          return
        }

        toast.success('Lancamento criado com sucesso')
      } else if (sale) {
        const result = await updateSaleAction(sale.id, payload, workspaceId)
        if (result.error) {
          toast.error(result.error)
          return
        }

        toast.success('Lancamento atualizado com sucesso')
      }

      onSuccess?.()
      onOpenChange(false)
    })
  }

  function handleDelete() {
    if (!sale) return

    if (!deleteConfirm) {
      setDeleteConfirm(true)
      return
    }

    startTransition(async () => {
      const result = await deleteSaleAction(sale.id, workspaceId)
      if (result.error) {
        toast.error(result.error)
        setDeleteConfirm(false)
        return
      }

      toast.success('Lancamento excluido com sucesso')
      onSuccess?.()
      onOpenChange(false)
    })
  }

  const selectedPayment = PAYMENT_OPTIONS.find(option => option.value === form.payment_method) ?? PAYMENT_OPTIONS[0]
  const SelectedPaymentIcon = selectedPayment.icon
  const StatusBadgeClass =
    form.status === 'paid'
      ? 'bg-green-100 text-green-700'
      : form.status === 'pending'
        ? 'bg-amber-100 text-amber-700'
        : 'bg-gray-100 text-gray-500'

  return (
    <Dialog open={open} onOpenChange={nextOpen => !nextOpen && handleClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Novo lancamento' : 'Editar lancamento'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Produto/servico
            </label>
            <div className="relative">
              <input
                ref={productRef}
                value={form.product_name}
                onChange={event => {
                  setField('product_name', event.target.value)
                  setProductSuggestionsOpen(true)
                }}
                onBlur={() => setTimeout(() => setProductSuggestionsOpen(false), 150)}
                placeholder="Nome do produto ou servico"
                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none transition-colors focus:border-[#378ADD] focus:ring-1 focus:ring-[#378ADD]"
              />
              {productSuggestionsOpen && productSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-12 z-20 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
                  {productSuggestions.map(suggestion => (
                    <button
                      key={suggestion}
                      type="button"
                      onMouseDown={() => {
                        setField('product_name', suggestion)
                        setProductSuggestionsOpen(false)
                      }}
                      className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {errors.product_name && (
              <p className="mt-1 text-xs text-red-500">{errors.product_name}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Valor (R$)</label>
              <input
                value={displayValue}
                onChange={event => {
                  handleAmountChange(event.target.value)
                  setErrors(current => ({ ...current, value: undefined }))
                }}
                placeholder="R$ 0,00"
                inputMode="numeric"
                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none transition-colors focus:border-[#378ADD] focus:ring-1 focus:ring-[#378ADD]"
              />
              {errors.value && <p className="mt-1 text-xs text-red-500">{errors.value}</p>}
            </div>

            <div className="relative" onBlur={() => setTimeout(() => setDatePickerOpen(false), 150)}>
              <label className="mb-1 block text-sm font-medium text-gray-700">Data da venda</label>
              <button
                type="button"
                onClick={() => setDatePickerOpen(openState => !openState)}
                className="flex h-11 w-full items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 transition-colors hover:bg-gray-50"
              >
                <Calendar size={14} className="text-gray-400" />
                <span>{form.sale_date ? format(new Date(`${form.sale_date}T12:00:00`), "d 'de' MMM", { locale: ptBR }) : 'Selecionar data'}</span>
                <ChevronDown size={14} className="ml-auto text-gray-400" />
              </button>
              {datePickerOpen && (
                <div className="absolute left-0 top-20 z-20 w-full rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
                  <div className="mb-2 grid grid-cols-3 gap-2">
                    {[
                      { label: 'Hoje', value: todayKey },
                      { label: 'Ontem', value: yesterdayKey },
                      { label: 'Esta semana', value: weekStartKey },
                    ].map(option => (
                      <button
                        key={option.label}
                        type="button"
                        onMouseDown={() => {
                          setField('sale_date', option.value)
                          setDatePickerOpen(false)
                        }}
                        className="rounded-md bg-gray-100 px-2 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200"
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <input
                    type="date"
                    value={form.sale_date}
                    onChange={event => {
                      setField('sale_date', event.target.value)
                      setDatePickerOpen(false)
                    }}
                    className="h-10 w-full rounded-md border border-gray-200 px-3 text-sm text-gray-700 outline-none focus:border-[#378ADD]"
                  />
                </div>
              )}
              {errors.sale_date && (
                <p className="mt-1 text-xs text-red-500">{errors.sale_date}</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="relative" onBlur={() => setTimeout(() => setPaymentOpen(false), 150)}>
              <label className="mb-1 block text-sm font-medium text-gray-700">Forma de pagamento</label>
              <button
                type="button"
                onClick={() => setPaymentOpen(openState => !openState)}
                className="flex h-11 w-full items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
              >
                <SelectedPaymentIcon size={14} className="text-gray-400" />
                {selectedPayment.label}
                <ChevronDown size={14} className="ml-auto text-gray-400" />
              </button>
              {paymentOpen && (
                <div className="absolute left-0 top-20 z-20 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
                  {PAYMENT_OPTIONS.map(option => (
                    <button
                      key={option.value}
                      type="button"
                      onMouseDown={() => {
                        setField('payment_method', option.value)
                        setPaymentOpen(false)
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <option.icon size={14} className="text-gray-400" />
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative" onBlur={() => setTimeout(() => setStatusOpen(false), 150)}>
              <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
              <button
                type="button"
                onClick={() => setStatusOpen(openState => !openState)}
                className="flex h-11 w-full items-center rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
              >
                <span className={`rounded-full px-2 py-1 text-xs font-medium ${StatusBadgeClass}`}>
                  {SALES_STATUS_LABELS[form.status]}
                </span>
                <ChevronDown size={14} className="ml-auto text-gray-400" />
              </button>
              {statusOpen && (
                <div className="absolute left-0 top-20 z-20 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
                  {(['paid', 'pending', 'cancelled'] as SaleStatus[]).map(status => (
                    <button
                      key={status}
                      type="button"
                      onMouseDown={() => {
                        setField('status', status)
                        setStatusOpen(false)
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          status === 'paid'
                            ? 'bg-green-100 text-green-700'
                            : status === 'pending'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {SALES_STATUS_LABELS[status]}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div
            className="relative"
            onBlur={event => {
              if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                setContactDropdownOpen(false)
              }
            }}
          >
            <label className="mb-1 block text-sm font-medium text-gray-700">Cliente</label>
            <div className="flex h-11 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3">
              <User size={14} className="text-gray-400" />
              <input
                value={contactSearch}
                onFocus={() => setContactDropdownOpen(true)}
                onChange={event => {
                  setContactSearch(event.target.value)
                  setContactDropdownOpen(true)
                }}
                placeholder="Buscar por nome, empresa ou telefone"
                className="w-full text-sm text-gray-700 outline-none"
              />
              {selectedContact && (
                <button
                  type="button"
                  onClick={() => handleSelectContact(null)}
                  className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {contactDropdownOpen && (
              <div className="absolute left-0 right-0 top-20 z-20 max-h-56 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                <button
                  type="button"
                  onMouseDown={() => handleSelectContact(null)}
                  className="flex w-full items-center px-3 py-2 text-left text-sm text-gray-400 hover:bg-gray-50"
                >
                  Sem cliente vinculado
                </button>
                {filteredContacts.map(contact => (
                  <button
                    key={contact.id}
                    type="button"
                    onMouseDown={() => handleSelectContact(contact)}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 ${selectedContact?.id === contact.id ? 'bg-blue-50' : ''}`}
                  >
                    <ContactAvatar name={contact.name} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-sm text-gray-800">{contact.name}</p>
                      <p className="truncate text-xs text-gray-400">
                        {[contact.company, contact.phone].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Observacoes</label>
            <textarea
              value={form.notes}
              onChange={event => setField('notes', event.target.value)}
              rows={2}
              placeholder="Observacoes sobre esta venda..."
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition-colors focus:border-[#378ADD] focus:ring-1 focus:ring-[#378ADD]"
            />
            <div className="mt-1 flex items-center justify-between">
              {errors.notes ? (
                <p className="text-xs text-red-500">{errors.notes}</p>
              ) : (
                <span />
              )}
              <p className="text-xs text-gray-400">{form.notes.length} / 1000</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 border-t border-gray-100 pt-4">
          {mode === 'edit' && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending}
              className={`mr-auto flex items-center gap-1.5 text-sm ${
                deleteConfirm ? 'font-medium text-red-700' : 'text-red-500 hover:text-red-700'
              }`}
            >
              <Trash2 size={14} />
              {deleteConfirm ? 'Confirmar exclusao' : 'Excluir'}
            </button>
          )}

          <button
            type="button"
            onClick={handleClose}
            disabled={isPending}
            className="rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="rounded-md bg-[#378ADD] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2d6bb5] disabled:opacity-50"
          >
            {isPending
              ? mode === 'create'
                ? 'Salvando...'
                : 'Atualizando...'
              : 'Salvar'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
