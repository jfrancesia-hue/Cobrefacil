"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { toast } from "sonner";
import { Upload, FileText, CheckCircle, AlertCircle } from "lucide-react";

interface CsvRow {
  nombre: string;
  email?: string;
  whatsapp?: string;
  phone?: string;
  deuda: string;
  vencimiento: string;
  concepto?: string;
}

interface ParsedRow {
  name: string;
  email?: string;
  whatsapp?: string;
  phone?: string;
  amount: number;
  dueDate: string;
  concept: string;
  valid: boolean;
  error?: string;
}

export default function ImportCsvPage() {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [imported, setImported] = useState(false);
  const router = useRouter();

  const handleFile = useCallback((file: File) => {
    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsed: ParsedRow[] = results.data.map((row, i) => {
          const name = row.nombre?.trim();
          const amount = parseFloat(row.deuda?.replace(",", ".").replace(/[^0-9.]/g, ""));
          const dueDate = row.vencimiento?.trim();
          const concept = row.concepto?.trim() || "Deuda importada";

          if (!name) return { name: "", amount: 0, dueDate: "", concept, valid: false, error: `Fila ${i + 2}: nombre requerido` };
          if (isNaN(amount) || amount <= 0) return { name, amount: 0, dueDate: "", concept, valid: false, error: `Fila ${i + 2}: monto inválido` };
          if (!dueDate) return { name, amount: 0, dueDate: "", concept, valid: false, error: `Fila ${i + 2}: vencimiento requerido` };

          return {
            name,
            email: row.email?.trim() || undefined,
            whatsapp: row.whatsapp?.trim() || undefined,
            phone: row.phone?.trim() || undefined,
            amount,
            dueDate,
            concept,
            valid: true,
          };
        });
        setRows(parsed);
      },
      error: () => toast.error("Error al parsear el CSV"),
    });
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  async function handleImport() {
    const valid = rows.filter((r) => r.valid);
    if (valid.length === 0) {
      toast.error("No hay filas válidas para importar");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/debtors/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows: valid }),
    });
    if (res.ok) {
      const data = await res.json();
      toast.success(`${data.created} deudores importados, ${data.debtsCreated} deudas creadas`);
      setImported(true);
      setTimeout(() => router.push("/debtors"), 1500);
    } else {
      const data = await res.json();
      toast.error(data.error ?? "Error al importar");
    }
    setLoading(false);
  }

  const validCount = rows.filter((r) => r.valid).length;
  const errorCount = rows.filter((r) => !r.valid).length;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Importar deudores desde CSV</h1>
        <p className="text-gray-500 text-sm mt-1">
          Columnas requeridas: <code className="bg-gray-100 px-1 rounded">nombre, deuda, vencimiento</code> — Opcionales:{" "}
          <code className="bg-gray-100 px-1 rounded">email, whatsapp, phone, concepto</code>
        </p>
      </div>

      {/* Template download hint */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm text-blue-800">
        <strong>Formato CSV esperado:</strong> nombre,email,whatsapp,deuda,vencimiento,concepto
        <br />
        Ejemplo: Juan Pérez,juan@mail.com,+5491112345678,15000,2026-05-01,Cuota Marzo
      </div>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-blue-400 transition-colors cursor-pointer bg-white"
        onClick={() => document.getElementById("csv-input")?.click()}
      >
        <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600 font-medium">Arrastrá tu CSV aquí o hacé clic para seleccionar</p>
        <p className="text-gray-400 text-sm mt-1">Solo archivos .csv</p>
        <input
          id="csv-input"
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
      </div>

      {/* Preview */}
      {rows.length > 0 && (
        <div className="mt-6 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-green-700 text-sm">
                <CheckCircle className="w-4 h-4" />
                <span>{validCount} válidas</span>
              </div>
              {errorCount > 0 && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errorCount} con errores</span>
                </div>
              )}
            </div>
            <button
              onClick={handleImport}
              disabled={loading || validCount === 0 || imported}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium transition-colors"
            >
              {imported ? (
                <><CheckCircle className="w-4 h-4" /> Importado</>
              ) : loading ? (
                "Importando..."
              ) : (
                <><FileText className="w-4 h-4" /> Importar {validCount} filas</>
              )}
            </button>
          </div>
          <div className="overflow-x-auto max-h-80">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 text-gray-500">Nombre</th>
                  <th className="text-left px-3 py-2 text-gray-500">Email</th>
                  <th className="text-left px-3 py-2 text-gray-500">WhatsApp</th>
                  <th className="text-right px-3 py-2 text-gray-500">Monto</th>
                  <th className="text-left px-3 py-2 text-gray-500">Vencimiento</th>
                  <th className="text-left px-3 py-2 text-gray-500">Concepto</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row, i) => (
                  <tr key={i} className={row.valid ? "" : "bg-red-50"}>
                    <td className="px-3 py-2">{row.name}</td>
                    <td className="px-3 py-2 text-gray-500">{row.email ?? "-"}</td>
                    <td className="px-3 py-2 text-gray-500">{row.whatsapp ?? "-"}</td>
                    <td className="px-3 py-2 text-right font-medium">{row.amount > 0 ? `$${row.amount.toLocaleString("es-AR")}` : "-"}</td>
                    <td className="px-3 py-2">{row.dueDate}</td>
                    <td className="px-3 py-2">{row.concept}</td>
                    <td className="px-3 py-2">
                      {!row.valid && (
                        <span className="text-red-500 text-xs">{row.error}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
