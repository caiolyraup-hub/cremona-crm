import { NextRequest, NextResponse } from 'next/server'
import { processLuccaQueue } from '@/lib/whatsapp/lucca/worker'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    return NextResponse.json(await processLuccaQueue())
  } catch (error) {
    console.error('[lucca] falha no worker.', {
      error: error instanceof Error ? error.message.slice(0, 500) : 'Erro desconhecido',
    })
    return NextResponse.json({ error: 'lucca_worker_failed' }, { status: 500 })
  }
}
