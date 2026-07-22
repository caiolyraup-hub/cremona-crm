import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, '') ?? 'https://cremona.app'

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'Cremona — CRM via WhatsApp para pequenos negócios',
    template: '%s | Cremona',
  },
  description:
    'Organize seus clientes, funil de vendas e follow-ups direto no WhatsApp. Feito para quem vende todo dia. Teste grátis por 14 dias.',
  keywords: ['CRM', 'WhatsApp', 'CRM WhatsApp', 'gestão de clientes', 'funil de vendas', 'follow-up'],
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: BASE_URL,
    siteName: 'Cremona',
    title: 'Cremona — CRM via WhatsApp para pequenos negócios',
    description:
      'Organize seus clientes, funil de vendas e follow-ups direto no WhatsApp. Teste grátis por 14 dias.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cremona — CRM via WhatsApp',
    description: 'Organize seus clientes e aumente suas vendas pelo WhatsApp.',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="font-sans antialiased">
        {children}
        <span className="fixed bottom-3 right-4 text-[10px] text-slate-300/40 select-none pointer-events-none">
          In Petra Ancoratus
        </span>
      </body>
    </html>
  )
}
