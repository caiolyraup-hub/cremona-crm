'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, type Variants } from 'framer-motion'
import {
  CheckCircle2,
  MessageCircle,
  Play,
  Star,
  Users,
  Zap,
  BarChart2,
  Bell,
  Tag,
  ArrowRight,
  ChevronDown,
  X,
} from 'lucide-react'
import { formatCurrency } from '@/lib/formatters'
import { STRIPE_PLANS } from '@/lib/stripe/config'
import { WhatsAppCta } from '@/components/landing/whatsapp-cta'

// ── Animation helpers ─────────────────────────────────────────────────────────

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' as const } },
}

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
}

function InView({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.15 }}
      variants={stagger}
      className={className}
    >
      {children}
    </motion.div>
  )
}

function FadeUp({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div variants={fadeUp} className={className}>
      {children}
    </motion.div>
  )
}

// ── Header ────────────────────────────────────────────────────────────────────

function Header() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-gray-100 bg-white/90 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-5">
        <span className="text-lg font-bold tracking-tight text-gray-900">Cremona</span>
        <nav className="hidden items-center gap-6 text-sm text-gray-500 sm:flex">
          <a href="#features" className="transition-colors hover:text-gray-900">Funcionalidades</a>
          <a href="#pricing" className="transition-colors hover:text-gray-900">Preços</a>
        </nav>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
          >
            Entrar
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            Começar grátis
          </Link>
        </div>
      </div>
    </header>
  )
}

// ── Hero ──────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="flex min-h-screen items-center justify-center px-5 pt-14">
      <div className="mx-auto max-w-3xl text-center">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-1.5 text-xs font-semibold text-blue-600"
        >
          <MessageCircle size={13} />
          CRM via WhatsApp para pequenos negócios
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-5 text-4xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-5xl md:text-6xl"
        >
          Nunca mais perca
          <br />
          <span className="text-blue-600">um cliente no WhatsApp</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-8 text-lg text-gray-500 sm:text-xl"
        >
          O Cremona organiza seus contatos, funil de vendas e follow-ups direto no WhatsApp.
          Feito para quem vende todo dia.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
        >
          <Link
            href="/register"
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-7 py-3.5 text-base font-semibold text-white shadow-md transition-all hover:bg-blue-700 hover:shadow-lg"
          >
            Testar 14 dias grátis <ArrowRight size={16} />
          </Link>
          <Link
            href="#pricing"
            className="rounded-xl border border-gray-200 px-7 py-3.5 text-base font-medium text-gray-600 transition-colors hover:bg-gray-50"
          >
            Ver planos
          </Link>
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-4 text-xs text-gray-400"
        >
          Sem cartão de crédito. Cancele quando quiser.
        </motion.p>
      </div>
    </section>
  )
}

// ── Problem ───────────────────────────────────────────────────────────────────

const problems = [
  {
    emoji: '😓',
    title: 'Clientes caindo no esquecimento',
    body: 'Você fala com 20 pessoas por dia e não consegue lembrar de quem precisa de retorno.',
  },
  {
    emoji: '📱',
    title: 'Histórico espalhado',
    body: 'Conversas misturadas com grupos, áudios, fotos — impossível encontrar o que precisa.',
  },
  {
    emoji: '💸',
    title: 'Vendas travadas no funil',
    body: 'Leads esfriando porque faltou um follow-up na hora certa.',
  },
]

function Problem() {
  return (
    <section className="bg-gray-50 py-20 px-5">
      <div className="mx-auto max-w-5xl">
        <InView>
          <FadeUp className="mb-12 text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-blue-600">O problema</p>
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              O WhatsApp virou sua ferramenta de vendas.
              <br className="hidden sm:block" /> Mas ele não foi feito pra isso.
            </h2>
          </FadeUp>
          <div className="grid gap-5 sm:grid-cols-3">
            {problems.map((p) => (
              <FadeUp key={p.title}>
                <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
                  <p className="mb-3 text-3xl">{p.emoji}</p>
                  <p className="mb-2 font-semibold text-gray-900">{p.title}</p>
                  <p className="text-sm text-gray-500">{p.body}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </InView>
      </div>
    </section>
  )
}

// ── Features ──────────────────────────────────────────────────────────────────

const features = [
  {
    icon: MessageCircle,
    title: 'Inbox centralizada',
    body: 'Todas as conversas do WhatsApp em um único lugar, com histórico completo de cada contato.',
    color: 'text-green-500',
    bg: 'bg-green-50',
  },
  {
    icon: BarChart2,
    title: 'Funil visual',
    body: 'Mova leads entre etapas com drag & drop. Veja exatamente onde cada negócio está travado.',
    color: 'text-blue-500',
    bg: 'bg-blue-50',
  },
  {
    icon: Bell,
    title: 'Lembretes de follow-up',
    body: 'Crie tarefas com data e hora. O Cremona te avisa antes de o cliente esfriar.',
    color: 'text-amber-500',
    bg: 'bg-amber-50',
  },
  {
    icon: Users,
    title: 'Gestão de contatos',
    body: 'Ficha completa com histórico, observações e etiquetas. Nunca esqueça um detalhe importante.',
    color: 'text-purple-500',
    bg: 'bg-purple-50',
  },
  {
    icon: Tag,
    title: 'Etiquetas personalizadas',
    body: 'Organize clientes por categoria, origem ou status. Filtre e aja sobre o grupo certo.',
    color: 'text-pink-500',
    bg: 'bg-pink-50',
  },
  {
    icon: Zap,
    title: 'Dashboard de vendas',
    body: 'Receita, conversões e atividades recentes em uma tela. Decisões mais rápidas.',
    color: 'text-indigo-500',
    bg: 'bg-indigo-50',
  },
]

function Features() {
  return (
    <section id="features" className="py-20 px-5">
      <div className="mx-auto max-w-5xl">
        <InView>
          <FadeUp className="mb-12 text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-blue-600">Funcionalidades</p>
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              Tudo que você precisa para vender mais
            </h2>
          </FadeUp>
          <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3">
            {features.map((f) => (
              <FadeUp key={f.title}>
                <div className="rounded-2xl border border-gray-100 p-6 transition-shadow hover:shadow-md">
                  <div className={`mb-4 inline-flex rounded-xl p-2.5 ${f.bg}`}>
                    <f.icon size={20} className={f.color} />
                  </div>
                  <p className="mb-1.5 font-semibold text-gray-900">{f.title}</p>
                  <p className="text-sm text-gray-500">{f.body}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </InView>
      </div>
    </section>
  )
}

// ── Demo video ────────────────────────────────────────────────────────────────

function VideoDemo() {
  const loomVideoId = process.env.NEXT_PUBLIC_LOOM_VIDEO_ID

  return (
    <section className="bg-white px-6 py-20 text-center">
      <div className="mx-auto max-w-[720px]">
        <InView>
          <FadeUp>
            <h2 className="mb-2 text-[28px] font-semibold text-gray-900">
              Veja o Cremona em 3 minutos
            </h2>
            <p className="mb-8 text-base text-gray-500">
              Do lead ao fechamento, tudo integrado ao WhatsApp.
            </p>
          </FadeUp>
          <FadeUp>
            {loomVideoId ? (
              <div className="relative h-0 overflow-hidden rounded-xl border border-gray-200 pb-[56.25%] shadow-[0_4px_24px_rgba(0,0,0,0.08)]">
                <iframe
                  src={`https://www.loom.com/embed/${loomVideoId}`}
                  className="absolute left-0 top-0 h-full w-full"
                  frameBorder="0"
                  allowFullScreen
                  title="Demo do Cremona"
                />
              </div>
            ) : (
              <div className="flex aspect-video items-center justify-center rounded-xl bg-gray-100">
                <div className="text-center">
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 shadow-sm">
                    <Play size={26} className="ml-1 fill-current" />
                  </div>
                  <p className="text-sm font-medium text-gray-400">Vídeo em breve</p>
                </div>
              </div>
            )}
          </FadeUp>
        </InView>
      </div>
    </section>
  )
}

// ── Comparison ────────────────────────────────────────────────────────────────

const comparisonRows = [
  { feature: 'Histórico de conversas', cremona: true, whatsapp: false, planilha: false },
  { feature: 'Funil de vendas visual', cremona: true, whatsapp: false, planilha: '⚠️' },
  { feature: 'Lembretes automáticos', cremona: true, whatsapp: false, planilha: false },
  { feature: 'Etiquetas e filtros', cremona: true, whatsapp: '⚠️', planilha: '⚠️' },
  { feature: 'Dashboard de receita', cremona: true, whatsapp: false, planilha: '⚠️' },
  { feature: 'Rápido de configurar', cremona: true, whatsapp: true, planilha: false },
]

type CellValue = boolean | string

function Cell({ value }: { value: CellValue }) {
  if (value === true) return <CheckCircle2 size={18} className="mx-auto text-green-500" />
  if (value === false) return <X size={16} className="mx-auto text-gray-300" />
  return <span className="text-sm">{value}</span>
}

function Comparison() {
  return (
    <section className="bg-gray-50 py-20 px-5">
      <div className="mx-auto max-w-3xl">
        <InView>
          <FadeUp className="mb-10 text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-blue-600">Por que Cremona</p>
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              Melhor que improvisar
            </h2>
          </FadeUp>
          <FadeUp>
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="py-3.5 pl-5 pr-3 text-left font-medium text-gray-500">Recurso</th>
                    <th className="px-4 py-3.5 text-center font-bold text-blue-600">Cremona</th>
                    <th className="px-4 py-3.5 text-center font-medium text-gray-500">Só WhatsApp</th>
                    <th className="px-4 py-3.5 text-center font-medium text-gray-500">Planilha</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row, i) => (
                    <tr
                      key={row.feature}
                      className={i % 2 === 0 ? '' : 'bg-gray-50/60'}
                    >
                      <td className="py-3 pl-5 pr-3 text-gray-700">{row.feature}</td>
                      <td className="px-4 py-3 text-center"><Cell value={row.cremona} /></td>
                      <td className="px-4 py-3 text-center"><Cell value={row.whatsapp} /></td>
                      <td className="px-4 py-3 text-center"><Cell value={row.planilha} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </FadeUp>
        </InView>
      </div>
    </section>
  )
}

// ── FAQ ───────────────────────────────────────────────────────────────────────

const faqItems = [
  {
    question: 'Preciso mudar meu número do WhatsApp?',
    answer: 'Não. Você conecta o seu número WhatsApp Business atual ao Cremona. Seus clientes continuam te encontrando no mesmo número.',
  },
  {
    question: 'Funciona com WhatsApp normal ou precisa ser Business?',
    answer: 'Funciona com o WhatsApp Business. Se você ainda usa o WhatsApp pessoal para vender, a migração para o Business é gratuita e leva menos de 5 minutos.',
  },
  {
    question: 'E se eu já uso o RD Station?',
    answer: 'Você pode exportar os contatos do RD Station em CSV e importar no Cremona em menos de 2 minutos. O Cremona faz tudo que o RD Station faz para pequenos negócios, com a diferença de ser integrado ao WhatsApp.',
  },
  {
    question: 'Posso cancelar quando quiser?',
    answer: 'Sim. Sem fidelidade, sem multa. Cancele quando quiser pelo próprio painel, com 1 clique.',
  },
  {
    question: 'Meus dados ficam seguros?',
    answer: 'Sim. Usamos Supabase com infraestrutura AWS e criptografia em trânsito e em repouso. Seus dados nunca são compartilhados ou vendidos.',
  },
  {
    question: 'Funciona no celular?',
    answer: 'Sim. O Cremona funciona no navegador do celular. Um app nativo está no nosso roadmap.',
  },
  {
    question: 'Quantos usuários posso ter na mesma conta?',
    answer: 'O plano atual é individual - 1 usuário por conta. Multi-usuário está no nosso roadmap para equipes maiores.',
  },
]

function Faq() {
  const [openItem, setOpenItem] = useState(0)

  return (
    <section className="bg-gray-50 px-6 py-20">
      <div className="mx-auto max-w-[640px]">
        <InView>
          <FadeUp>
            <h2 className="mb-10 text-center text-[28px] font-semibold text-gray-900">
              Dúvidas frequentes
            </h2>
          </FadeUp>
          <div className="space-y-3">
            {faqItems.map((item, index) => {
              const isOpen = openItem === index

              return (
                <FadeUp key={item.question}>
                  <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                    <button
                      type="button"
                      onClick={() => setOpenItem(isOpen ? -1 : index)}
                      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-semibold text-gray-900"
                      aria-expanded={isOpen}
                    >
                      <span>{item.question}</span>
                      <ChevronDown
                        size={18}
                        className={`shrink-0 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      />
                    </button>
                    <div
                      className={`overflow-hidden px-5 transition-[max-height,padding-bottom] duration-300 ease-out ${
                        isOpen ? 'max-h-56 pb-5' : 'max-h-0 pb-0'
                      }`}
                    >
                      <p className="text-sm leading-6 text-gray-500">{item.answer}</p>
                    </div>
                  </div>
                </FadeUp>
              )
            })}
          </div>
        </InView>
      </div>
    </section>
  )
}

// ── Pricing ───────────────────────────────────────────────────────────────────

function Pricing() {
  const starter = STRIPE_PLANS.starter
  const pro = STRIPE_PLANS.professional

  return (
    <section id="pricing" className="py-20 px-5">
      <div className="mx-auto max-w-3xl">
        <InView>
          <FadeUp className="mb-10 text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-blue-600">Preços</p>
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              Simples e sem surpresa
            </h2>
            <p className="mt-3 text-gray-500">14 dias grátis em qualquer plano. Sem cartão de crédito.</p>
          </FadeUp>
          <div className="grid gap-5 sm:grid-cols-2">
            {/* Starter */}
            <FadeUp>
              <div className="flex h-full flex-col rounded-2xl border border-gray-200 p-6">
                <p className="mb-1 font-semibold text-gray-900">{starter.name}</p>
                <p className="mb-5 text-3xl font-extrabold text-gray-900">
                  {formatCurrency(starter.amount / 100)}
                  <span className="ml-1 text-sm font-normal text-gray-400">/mês</span>
                </p>
                <ul className="mb-6 flex-1 space-y-2">
                  {starter.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle2 size={14} className="shrink-0 text-green-500" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className="block rounded-lg border border-gray-300 py-2.5 text-center text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Começar grátis
                </Link>
              </div>
            </FadeUp>

            {/* Professional */}
            <FadeUp>
              <div className="relative flex h-full flex-col rounded-2xl border-2 border-blue-500 p-6">
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full bg-blue-600 px-3 py-0.5 text-[11px] font-semibold text-white">
                  <Star size={9} /> Mais popular
                </span>
                <p className="mb-1 font-semibold text-gray-900">{pro.name}</p>
                <p className="mb-5 text-3xl font-extrabold text-gray-900">
                  {formatCurrency(pro.amount / 100)}
                  <span className="ml-1 text-sm font-normal text-gray-400">/mês</span>
                </p>
                <ul className="mb-6 flex-1 space-y-2">
                  {pro.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle2 size={14} className="shrink-0 text-blue-500" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className="block rounded-lg bg-blue-600 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-blue-700"
                >
                  Começar grátis
                </Link>
              </div>
            </FadeUp>
          </div>
        </InView>
      </div>
    </section>
  )
}

// ── Testimonials ──────────────────────────────────────────────────────────────

const testimonials = [
  {
    name: 'Ana Clara',
    role: 'Consultora de moda',
    avatar: 'AC',
    text: 'Antes eu perdia venda porque esquecia de responder. Agora tenho tudo organizado e fecho muito mais negócio.',
    stars: 5,
  },
  {
    name: 'Ricardo Gomes',
    role: 'Corretor de imóveis',
    avatar: 'RG',
    text: 'O funil visual me mostrou que 80% dos meus leads travavam na mesma etapa. Resolvi o problema em uma semana.',
    stars: 5,
  },
  {
    name: 'Fernanda Lima',
    role: 'Nutricionista',
    avatar: 'FL',
    text: 'Finalmente consigo acompanhar todas as pacientes sem perder nenhuma mensagem. O Cremona virou rotina.',
    stars: 5,
  },
]

function Testimonials() {
  return (
    <section className="bg-gray-50 py-20 px-5">
      <div className="mx-auto max-w-5xl">
        <InView>
          <FadeUp className="mb-10 text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-blue-600">Depoimentos</p>
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              Quem usa, não larga
            </h2>
          </FadeUp>
          <div className="grid gap-5 sm:grid-cols-3">
            {testimonials.map((t) => (
              <FadeUp key={t.name}>
                <div
                  className="flex h-full flex-col rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100"
                  data-testimonial="placeholder"
                >
                  <div className="mb-3 flex gap-0.5">
                    {Array.from({ length: t.stars }).map((_, i) => (
                      <Star key={i} size={13} className="fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="mb-5 flex-1 text-sm text-gray-600">&ldquo;{t.text}&rdquo;</p>
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                      {t.avatar}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                      <p className="text-xs text-gray-400">{t.role}</p>
                    </div>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
          <FadeUp>
            <p className="mt-8 text-center text-[13px] text-gray-400">
              Junte-se a empresas que já usam o Cremona
            </p>
          </FadeUp>
        </InView>
      </div>
    </section>
  )
}

// ── CTA + Footer ──────────────────────────────────────────────────────────────

function CtaFooter() {
  return (
    <>
      <section className="py-24 px-5">
        <InView className="mx-auto max-w-2xl text-center">
          <FadeUp>
            <h2 className="mb-4 text-3xl font-extrabold text-gray-900 sm:text-4xl">
              Comece a vender mais hoje
            </h2>
          </FadeUp>
          <FadeUp>
            <p className="mb-8 text-lg text-gray-500">
              14 dias grátis, sem cartão de crédito. Configure em menos de 5 minutos.
            </p>
          </FadeUp>
          <FadeUp>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-4 text-base font-semibold text-white shadow-md transition-all hover:bg-blue-700 hover:shadow-lg"
            >
              Criar conta grátis <ArrowRight size={16} />
            </Link>
          </FadeUp>
        </InView>
      </section>

      <footer className="border-t border-gray-100 py-8 px-5">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 text-xs text-gray-400 sm:flex-row">
          <span className="font-semibold text-gray-700">Cremona</span>
          <span>© {new Date().getFullYear()} Cremona. Todos os direitos reservados.</span>
          <div className="flex gap-4">
            <Link href="/login" className="transition-colors hover:text-gray-600">Entrar</Link>
            <Link href="/register" className="transition-colors hover:text-gray-600">Cadastro</Link>
          </div>
        </div>
      </footer>
    </>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const supportPhone = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? ''

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <Hero />
      <Problem />
      <Features />
      <VideoDemo />
      <Comparison />
      <Faq />
      <Pricing />
      <Testimonials />
      <CtaFooter />
      <WhatsAppCta
        phone={supportPhone}
        message="Olá! Vim pelo site do Cremona e gostaria de saber mais."
      />
    </div>
  )
}
