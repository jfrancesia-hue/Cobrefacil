"use client";

import { Company, User } from "@prisma/client";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { LogOut, Bell } from "lucide-react";

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
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-500">Plan</span>
        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
          {company.plan}
        </span>
      </div>
      <div className="flex items-center gap-4">
        <button className="text-gray-400 hover:text-gray-600">
          <Bell className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
            {user.name?.charAt(0).toUpperCase() ?? "U"}
          </div>
          <span className="text-sm text-gray-700 hidden md:block">
            {user.name ?? user.email}
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="text-gray-400 hover:text-red-500 transition-colors"
          title="Cerrar sesión"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
