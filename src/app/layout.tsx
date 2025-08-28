import './globals.css'
import Link from 'next/link'
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="bg-white border-b">
          <div className="container py-4 flex items-center justify-between">
            <Link href="/" className="text-xl font-semibold">JSON Form POC</Link>
            <nav className="flex items-center gap-4">
              <Link className="link" href="/templates/new">New Template</Link>
            </nav>
          </div>
        </header>
        <main className="container py-6">{children}</main>
      </body>
    </html>
  )
}
