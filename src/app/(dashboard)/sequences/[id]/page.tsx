import { getCompanyOrRedirect } from "@/lib/get-company";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import SequenceEditor from "@/components/sequences/sequence-editor";

export default async function SequenceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { company } = await getCompanyOrRedirect();

  const sequence = await prisma.collectionSequence.findFirst({
    where: { id, companyId: company.id },
    include: { steps: { orderBy: { sortOrder: "asc" } } },
  });

  if (!sequence) notFound();

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/sequences" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{sequence.name}</h1>
          <p className="text-gray-500 text-sm">Editor de pasos</p>
        </div>
      </div>
      <SequenceEditor sequence={sequence} steps={sequence.steps} />
    </div>
  );
}
