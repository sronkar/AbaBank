import type { Metadata } from "next";
import { Fredoka, Nunito } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { currentUser } from "@/lib/auth";
import { logout } from "@/actions/auth";
import { pendingRequests } from "@/lib/ledger";
import { NavLinks } from "@/components/nav-links";
import { ThemeToggle } from "@/components/theme-toggle";

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AbaBank",
  description: "The family bank — parents are the bank, kids are the customers",
};

const themeInit = `(function(){try{var t=localStorage.getItem("aba-theme");if(t!=="light"&&t!=="dark"){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.dataset.theme=t}catch(e){}})()`;

const kidLinks = [
  { href: "/", label: "🏠 Home" },
  { href: "/money", label: "💵 Money" },
  { href: "/savings", label: "🏦 Savings" },
  { href: "/invest", label: "📈 Invest" },
  { href: "/goals", label: "🎯 Goals" },
];

async function Nav() {
  const user = await currentUser();
  if (!user) {
    return (
      <div className="fixed top-4 right-4 z-20">
        <ThemeToggle />
      </div>
    );
  }
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
    <header className="sticky top-0 z-10 border-b-2 border-[var(--line)] bg-[var(--surface)]/95 backdrop-blur">
      <div className="mx-auto max-w-4xl px-4 py-3 flex items-center gap-3 flex-wrap">
        <Link
          href="/"
          className="font-display font-bold text-xl flex items-center gap-1.5 -rotate-1 hover:rotate-1 transition-transform"
        >
          <span className="text-2xl">🏛️</span>
          <span>
            Aba<span className="text-[var(--tangerine-deep)]">Bank</span>
          </span>
        </Link>
        <NavLinks links={links} />
        <div className="ml-auto flex items-center gap-2 text-sm">
          <ThemeToggle />
          <form action={logout} className="flex items-center gap-2">
            <span className="text-muted font-bold hidden sm:inline">{user.name}</span>
            <button className="pill bg-[var(--surface-2)] border-[var(--line)] !border-2">
              Log out
            </button>
          </form>
        </div>
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
      suppressHydrationWarning
      className={`${fredoka.variable} ${nunito.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        <Nav />
        <main className="mx-auto w-full max-w-4xl px-4 py-6 flex-1">{children}</main>
      </body>
    </html>
  );
}
