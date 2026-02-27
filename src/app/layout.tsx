import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/context/AuthContext'

const inter = Inter({
    variable: '--font-inter',
    subsets: ['latin'],
    display: 'swap',
})

export const metadata: Metadata = {
    title: 'BarberCloud AI',
    description: 'Sistema inteligente de gestión de citas para barberías',
    keywords: ['barbería', 'citas', 'gestión', 'IA', 'WhatsApp'],
    authors: [{ name: 'BarberCloud' }],
}

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html lang="es" className={inter.variable}>
            <body className={`${inter.variable} antialiased`}>
                <AuthProvider>
                    {children}
                </AuthProvider>
            </body>
        </html>
    )
}
