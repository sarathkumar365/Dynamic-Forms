import './globals.css'
import AppHeader from '@/components/AppHeader'
import RouteTransition from '@/components/RouteTransition'
import AppFooter from '@/components/AppFooter'
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <AppHeader />
        <main className="container py-6 flex-1">
          <RouteTransition>{children}</RouteTransition>
        </main>
        <AppFooter />
      </body>
    </html>
  )
}
