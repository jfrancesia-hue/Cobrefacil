"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Company } from "@/generated/prisma/client";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  FileText,
  Layers,
  Megaphone,
  MessageSquare,
  CreditCard,
  BarChart3,
  Settings,
  Zap,
  Bot,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/debtors", label: "Deudores", icon: Users },
  { href: "/debts", label: "Deudas", icon: FileText },
  { href: "/sequences", label: "Secuencias", icon: Layers },
  { href: "/campaigns", label: "Campañas", icon: Megaphone },
  { href: "/messages", label: "Mensajes", icon: MessageSquare },
  { href: "/conversations", label: "Agente IA", icon: Bot },
  { href: "/payments", label: "Pagos", icon: CreditCard },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

export default function Sidebar({ company }: { company: Company }) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 flex-col border-r border-slate-200 bg-slate-950 text-white">
      <div className="border-b border-white/10 p-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20">
            <Zap className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">CobrarFácil</p>
            <p className="max-w-[140px] truncate text-xs text-slate-400">
              {company.name}
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-white text-slate-950"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            pathname.startsWith("/settings")
              ? "bg-white text-slate-950"
              : "text-slate-300 hover:bg-white/10 hover:text-white"
          )}
        >
          <Settings className="h-4 w-4" />
          Configuración
        </Link>
      </div>
    </aside>
  );
}
