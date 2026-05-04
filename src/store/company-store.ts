import { create } from "zustand";
import { Company } from "@/generated/prisma/client";

interface CompanyStore {
  company: Company | null;
  setCompany: (company: Company) => void;
}

export const useCompanyStore = create<CompanyStore>((set) => ({
  company: null,
  setCompany: (company) => set({ company }),
}));
