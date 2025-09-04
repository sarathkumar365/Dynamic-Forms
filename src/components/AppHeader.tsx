"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AppHeader() {
  const pathname = usePathname();
  const showImport = pathname === "/"; // only show on homepage
  return (
    <header className="bg-white border-b">
      <div className="container py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          {/* Logo: place your file at /public/logo (e.g., logo.png) */}
          <img src="/logo.png" alt="Logo" className="h-6 w-auto" />
          <span className="text-xl font-semibold">2Creative Forms</span>
        </Link>
        <nav className="flex items-center gap-2">
          <Link className="btn" href="/templates/new">+ New Form</Link>
          {showImport && (
            <Link className="btn" href="/templates/new?import=1">Import JSON</Link>
          )}
        </nav>
      </div>
    </header>
  );
}
