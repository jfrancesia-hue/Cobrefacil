import { getCompanyOrRedirect } from "@/lib/get-company";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { company, user } = await getCompanyOrRedirect();

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar company={company} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header user={user} company={company} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
