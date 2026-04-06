"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Company } from "@prisma/client";
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
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
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
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm">CobrarFácil</p>
            <p className="text-xs text-gray-500 truncate max-w-[140px]">{company.name}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Settings */}
      <div className="p-4 border-t border-gray-200">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
            pathname.startsWith("/settings")
              ? "bg-blue-50 text-blue-700"
              : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
          )}
        >
          <Settings className="w-4 h-4" />
          Configuración
        </Link>
      </div>
    </aside>
  );
}
