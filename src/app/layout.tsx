import './globals.css'
import AppHeader from '@/components/AppHeader'
import RouteTransition from '@/components/RouteTransition'
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppHeader />
        <main className="container py-6">
          <RouteTransition>{children}</RouteTransition>
        </main>
      </body>
    </html>
  )
}
