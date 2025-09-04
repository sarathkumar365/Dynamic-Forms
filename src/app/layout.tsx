import './globals.css'
import AppHeader from '@/components/AppHeader'
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppHeader />
        <main className="container py-6">{children}</main>
      </body>
    </html>
  )
}
