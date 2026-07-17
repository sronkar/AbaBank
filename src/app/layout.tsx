import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { currentUser } from "@/lib/auth";
import { logout } from "@/actions/auth";
import { pendingRequests } from "@/lib/ledger";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AbaBank",
  description: "The family bank — parents are the bank, kids are the customers",
};

const kidLinks = [
  { href: "/", label: "🏠 Home" },
  { href: "/money", label: "💵 Money" },
  { href: "/savings", label: "🏦 Savings" },
  { href: "/invest", label: "📈 Invest" },
  { href: "/goals", label: "🎯 Goals" },
];

async function Nav() {
  const user = await currentUser();
  if (!user) return null;
  const pendingCount = user.role === "parent" ? pendingRequests().length : 0;
  const parentLinks = [
    { href: "/", label: "🏠 Home" },
    { href: "/parent/approvals", label: `✅ Approvals${pendingCount ? ` (${pendingCount})` : ""}` },
    { href: "/parent/kids", label: "👧 Kids" },
    { href: "/parent/audit", label: "📋 Audit" },
    { href: "/parent/settings", label: "⚙️ Settings" },
  ];
  const links = user.role === "parent" ? parentLinks : kidLinks;
  return (
    <header className="sticky top-0 z-10 bg-white/90 dark:bg-slate-950/90 backdrop-blur border-b border-slate-200 dark:border-slate-800">
      <div className="mx-auto max-w-4xl px-4 py-3 flex items-center gap-3 flex-wrap">
        <Link href="/" className="font-black text-lg text-indigo-600 dark:text-indigo-400">
          🏛️ AbaBank
        </Link>
        <nav className="flex gap-1 flex-wrap text-sm">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-lg px-2.5 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <form action={logout} className="ml-auto flex items-center gap-2 text-sm">
          <span className="text-slate-500 dark:text-slate-400">{user.name}</span>
          <button className="rounded-lg px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700">
            Log out
          </button>
        </form>
      </div>
    </header>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Nav />
        <main className="mx-auto w-full max-w-4xl px-4 py-6 flex-1">{children}</main>
      </body>
    </html>
  );
}
