"use client";

import { Company, User } from "@/generated/prisma/client";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { LogOut, Bell, Sparkles } from "lucide-react";

export default function Header({
  user,
  company,
}: {
  user: User;
  company: Company;
}) {
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    await fetch("/api/demo/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white/95 px-6 backdrop-blur">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-slate-500">Plan</span>
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
          <Sparkles className="h-3 w-3" />
          {company.plan}
        </span>
      </div>
      <div className="flex items-center gap-4">
        <button className="text-slate-400 transition-colors hover:text-slate-700" title="Notificaciones">
          <Bell className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-950 text-xs font-bold text-white">
            {user.name?.charAt(0).toUpperCase() ?? "U"}
          </div>
          <span className="hidden text-sm text-slate-700 md:block">
            {user.name ?? user.email}
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="text-slate-400 transition-colors hover:text-red-500"
          title="Cerrar sesión"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
