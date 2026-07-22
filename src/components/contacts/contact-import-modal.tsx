'use client'

import { useState, useRef, useCallback } from 'react'
import { FileUp, X, Check, AlertTriangle, Download, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import Papa from 'papaparse'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'

interface ContactImportModalProps {
  workspaceId: string
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface ParsedRow {
  name: string
  phone: string
  email: string
  company: string
  position: string
  tags: string[]
  error?: string
}

type Step = 1 | 2 | 3

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function validateRow(raw: Record<string, string>): ParsedRow {
  const name = (raw['nome'] ?? raw['name'] ?? '').trim()
  const phone = (raw['telefone'] ?? raw['phone'] ?? '').trim()
  const email = (raw['email'] ?? '').trim()
  const company = (raw['empresa'] ?? raw['company'] ?? '').trim()
  const position = (raw['cargo'] ?? raw['position'] ?? '').trim()
  const tagsRaw = (raw['etiquetas'] ?? raw['tags'] ?? raw['labels'] ?? '').trim()
  const tags = tagsRaw
    ? tagsRaw.split(';').map(t => t.trim()).filter(Boolean)
    : []

  if (!name || name.length < 2) {
    return { name, phone, email, company, position, tags, error: 'Nome obrigatório ou muito curto' }
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { name, phone, email, company, position, tags, error: 'E-mail inválido' }
  }
  if (phone && phone.replace(/\D/g, '').length > 0 && phone.replace(/\D/g, '').length < 10) {
    return { name, phone, email, company, position, tags, error: 'Telefone inválido' }
  }
  return { name, phone, email, company, position, tags }
}

function downloadTemplate() {
  const rows = [
    'nome,telefone,email,empresa,cargo,etiquetas',
    'João Silva,11999887766,joao@empresa.com,Empresa ABC,Gerente,cliente;vip',
    'Maria Santos,11988776655,maria@loja.com,Loja XYZ,Diretora,lead;quente',
  ]
  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'modelo_contatos.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export function ContactImportModal({
  workspaceId,
  isOpen,
  onClose,
  onSuccess,
}: ContactImportModalProps) {
  const [step, setStep] = useState<Step>(1)
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [progress, setProgress] = useState(0)
  const [processedCount, setProcessedCount] = useState(0)
  const [importedCount, setImportedCount] = useState(0)
  const [failedRows, setFailedRows] = useState<ParsedRow[]>([])
  const [isImporting, setIsImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function reset() {
    setStep(1)
    setFile(null)
    setIsDragging(false)
    setRows([])
    setProgress(0)
    setProcessedCount(0)
    setImportedCount(0)
    setFailedRows([])
    setIsImporting(false)
  }

  function handleClose() {
    if (isImporting) return
    reset()
    onClose()
  }

  function handleFile(f: File) {
    if (!f.name.endsWith('.csv')) {
      toast.error('Selecione um arquivo .csv')
      return
    }
    setFile(f)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [])

  function parseAndGoToStep2() {
    if (!file) return
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h: string) => h.trim().toLowerCase(),
      complete: result => {
        const parsed = result.data.map(validateRow)
        setRows(parsed)
        setStep(2)
      },
      error: () => toast.error('Erro ao ler o arquivo CSV'),
    })
  }

  async function runImport() {
    const validRows = rows.filter(r => !r.error)
    if (validRows.length === 0) return

    setIsImporting(true)
    setStep(3)

    const supabase = createClient()
    const batchSize = 10
    let success = 0
    const failed: ParsedRow[] = []

    for (let i = 0; i < validRows.length; i += batchSize) {
      const batch = validRows.slice(i, i + batchSize)
      const results = await Promise.all(
        batch.map(async row => {
          const phone = row.phone ? row.phone.replace(/\D/g, '') : null
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error } = await (supabase as any).from('contacts').insert({
            workspace_id: workspaceId,
            name: row.name,
            phone: phone || null,
            email: row.email || null,
            company: row.company || null,
            position: row.position || null,
            tags: row.tags,
          })
          return error ? row : null
        })
      )

      results.forEach((failedRow, idx) => {
        if (failedRow) {
          failed.push(batch[idx])
        } else {
          success++
        }
      })

      const currentProcessed = i + batch.length
      setProcessedCount(currentProcessed)
      setProgress(Math.round((currentProcessed / validRows.length) * 100))
    }

    setImportedCount(success)
    setFailedRows(failed)
    setIsImporting(false)
  }

  function downloadFailedCsv() {
    const header = 'nome,telefone,email,empresa,cargo,etiquetas,erro'
    const rows_csv = failedRows.map(r =>
      [r.name, r.phone, r.email, r.company, r.position, r.tags.join(';'), r.error ?? 'Erro na importação']
        .map(v => `"${(v ?? '').replace(/"/g, '""')}"`)
        .join(',')
    )
    const blob = new Blob([[header, ...rows_csv].join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'contatos_com_erro.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const validCount = rows.filter(r => !r.error).length
  const invalidCount = rows.filter(r => r.error).length
  const previewRows = rows.slice(0, 5)

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && handleClose()}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>
            {step === 1 && 'Importar contatos via CSV'}
            {step === 2 && 'Revisar importação'}
            {step === 3 && 'Importação concluída'}
          </DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 text-xs text-gray-400">
          {(['Upload', 'Revisão', 'Resultado'] as const).map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold ${
                  step === i + 1
                    ? 'bg-[#378ADD] text-white'
                    : step > i + 1
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                {step > i + 1 ? <Check size={10} /> : i + 1}
              </span>
              <span className={step === i + 1 ? 'text-gray-700 font-medium' : ''}>{label}</span>
              {i < 2 && <div className="h-px w-6 bg-gray-200" />}
            </div>
          ))}
        </div>

        {/* ---- STEP 1 ---- */}
        {step === 1 && (
          <div className="space-y-4 py-2">
            <div
              onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => !file && fileInputRef.current?.click()}
              className={`flex h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed transition-colors ${
                isDragging
                  ? 'border-[#378ADD] bg-blue-50'
                  : file
                  ? 'cursor-default border-green-300 bg-green-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              {file ? (
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                    <Check size={20} className="text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{file.name}</p>
                    <p className="text-xs text-gray-400">{formatBytes(file.size)}</p>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); setFile(null) }}
                    className="ml-2 flex h-6 w-6 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <>
                  <FileUp size={48} className="text-gray-300" />
                  <p className="text-sm text-gray-500">Arraste seu arquivo CSV aqui</p>
                  <p className="text-xs text-gray-400">ou clique para selecionar</p>
                </>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0]
                if (f) handleFile(f)
                e.target.value = ''
              }}
            />

            <button
              onClick={downloadTemplate}
              className="flex items-center gap-1.5 text-xs text-[#378ADD] hover:underline"
            >
              <Download size={13} />
              Baixar modelo CSV
            </button>

            <div className="flex justify-end">
              <button
                onClick={parseAndGoToStep2}
                disabled={!file}
                className="rounded-md bg-[#378ADD] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2d6bb5] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Próximo
              </button>
            </div>
          </div>
        )}

        {/* ---- STEP 2 ---- */}
        {step === 2 && (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-4">
              <div className="rounded-md bg-blue-50 px-3 py-1.5 text-sm text-[#378ADD]">
                <span className="font-semibold">{validCount}</span> contatos encontrados
              </div>
              {invalidCount > 0 && (
                <div className="flex items-center gap-1.5 rounded-md bg-amber-50 px-3 py-1.5 text-sm text-amber-700">
                  <AlertTriangle size={14} />
                  <span><span className="font-semibold">{invalidCount}</span> linhas com problema serão ignoradas</span>
                </div>
              )}
            </div>

            <div className="overflow-hidden rounded-md border border-gray-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    {['Nome', 'Telefone', 'E-mail', 'Empresa', 'Etiquetas'].map(col => (
                      <th
                        key={col}
                        className="px-3 py-2 text-left text-xs font-medium text-gray-500"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, i) => (
                    <tr
                      key={i}
                      className={`border-b border-gray-100 last:border-0 ${
                        row.error ? 'bg-red-50' : ''
                      }`}
                    >
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          {row.error && (
                            <span title={row.error}>
                              <AlertTriangle size={13} className="shrink-0 text-red-400" />
                            </span>
                          )}
                          <span className={row.error ? 'text-red-700' : 'text-gray-800'}>
                            {row.name || <span className="text-gray-300">—</span>}
                          </span>
                        </div>
                        {row.error && (
                          <p className="mt-0.5 text-[11px] text-red-400">{row.error}</p>
                        )}
                      </td>
                      <td className="px-3 py-2 text-gray-600">{row.phone || <span className="text-gray-300">—</span>}</td>
                      <td className="max-w-[140px] truncate px-3 py-2 text-gray-600">{row.email || <span className="text-gray-300">—</span>}</td>
                      <td className="px-3 py-2 text-gray-600">{row.company || <span className="text-gray-300">—</span>}</td>
                      <td className="px-3 py-2">
                        {row.tags.length > 0 ? (
                          <span className="text-xs text-gray-500">{row.tags.join(', ')}</span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 5 && (
                <p className="px-3 py-2 text-xs text-gray-400">
                  ...e mais {rows.length - 5} contatos
                </p>
              )}
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Voltar
              </button>
              <button
                onClick={runImport}
                disabled={validCount === 0}
                className="rounded-md bg-[#378ADD] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2d6bb5] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Importar {validCount} contato{validCount !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        )}

        {/* ---- STEP 3 ---- */}
        {step === 3 && (
          <div className="py-4 text-center">
            {isImporting ? (
              <div className="space-y-4">
                <Loader2 size={40} className="mx-auto animate-spin text-[#378ADD]" />
                <p className="text-sm text-gray-600">
                  Importando {processedCount} de {validCount}...
                </p>
                <div className="mx-auto h-2 w-64 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-[#378ADD] transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                  <Check size={32} className="text-green-600" />
                </div>
                <div>
                  <p className="text-lg font-medium text-gray-900">
                    {importedCount} contato{importedCount !== 1 ? 's' : ''} importado{importedCount !== 1 ? 's' : ''} com sucesso
                  </p>
                  {failedRows.length > 0 && (
                    <p className="mt-1 text-sm text-amber-600">
                      {failedRows.length} contato{failedRows.length !== 1 ? 's' : ''} não {failedRows.length !== 1 ? 'foram' : 'foi'} importado{failedRows.length !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
                {failedRows.length > 0 && (
                  <button
                    onClick={downloadFailedCsv}
                    className="flex items-center gap-1.5 mx-auto text-xs text-[#378ADD] hover:underline"
                  >
                    <Download size={13} />
                    Baixar CSV com erros
                  </button>
                )}
                <button
                  onClick={() => {
                    onSuccess()
                    reset()
                    onClose()
                  }}
                  className="rounded-md bg-[#378ADD] px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2d6bb5]"
                >
                  Fechar
                </button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
