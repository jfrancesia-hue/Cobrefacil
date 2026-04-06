"use client";

import { useState } from "react";
import { CollectionSequence, CollectionStep, StepChannel } from "@prisma/client";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import {
  GripVertical,
  Plus,
  Trash2,
  MessageSquare,
  Mail,
  Phone,
  Sparkles,
  Save,
} from "lucide-react";

const channelIcons: Record<StepChannel, React.ReactNode> = {
  WHATSAPP: <MessageSquare className="w-4 h-4 text-green-600" />,
  EMAIL: <Mail className="w-4 h-4 text-blue-600" />,
  SMS: <Phone className="w-4 h-4 text-orange-600" />,
};

const channelLabels: Record<StepChannel, string> = {
  WHATSAPP: "WhatsApp",
  EMAIL: "Email",
  SMS: "SMS",
};

interface StepWithId extends Partial<CollectionStep> {
  id: string;
  tempId?: string;
}

function SortableStep({
  step,
  onUpdate,
  onDelete,
}: {
  step: StepWithId;
  onUpdate: (id: string, data: Partial<StepWithId>) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const triggerDays = step.triggerDays ?? 0;
  const triggerLabel =
    triggerDays < 0
      ? `${Math.abs(triggerDays)} días ANTES del vencimiento`
      : triggerDays === 0
      ? "El DÍA del vencimiento"
      : `${triggerDays} días DESPUÉS del vencimiento`;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm"
    >
      <div className="flex items-start gap-3">
        <button
          {...attributes}
          {...listeners}
          className="mt-1 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="w-5 h-5" />
        </button>

        <div className="flex-1 space-y-3">
          {/* Row 1: Trigger + Channel */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Días relativos al vencimiento
              </label>
              <input
                type="number"
                value={triggerDays}
                onChange={(e) =>
                  onUpdate(step.id, { triggerDays: parseInt(e.target.value) || 0 })
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="-3 = 3 días antes"
              />
              <p className="text-xs text-gray-400 mt-0.5">{triggerLabel}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Canal</label>
              <select
                value={step.channel ?? "WHATSAPP"}
                onChange={(e) =>
                  onUpdate(step.id, { channel: e.target.value as StepChannel })
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="WHATSAPP">WhatsApp</option>
                <option value="EMAIL">Email</option>
                <option value="SMS">SMS</option>
              </select>
            </div>
          </div>

          {/* Subject (solo EMAIL) */}
          {step.channel === "EMAIL" && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Asunto</label>
              <input
                type="text"
                value={step.subject ?? ""}
                onChange={(e) => onUpdate(step.id, { subject: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Vence hoy tu pago - {concepto}"
              />
            </div>
          )}

          {/* Template */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Mensaje{" "}
              <span className="text-gray-400 font-normal">
                Variables: {"{nombre} {monto} {concepto} {link_pago} {empresa} {dias_atraso} {fecha}"}
              </span>
            </label>
            <textarea
              value={step.messageTemplate ?? ""}
              onChange={(e) => onUpdate(step.id, { messageTemplate: e.target.value })}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* IA options */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={step.useAI ?? false}
                onChange={(e) => onUpdate(step.id, { useAI: e.target.checked })}
                className="rounded"
              />
              <Sparkles className="w-3.5 h-3.5 text-purple-500" />
              Personalizar con IA
            </label>
            {step.useAI && (
              <select
                value={step.aiTone ?? "profesional"}
                onChange={(e) => onUpdate(step.id, { aiTone: e.target.value })}
                className="border border-gray-300 rounded-lg px-2 py-1 text-xs focus:outline-none"
              >
                <option value="amigable">Amigable</option>
                <option value="profesional">Profesional</option>
                <option value="urgente">Urgente</option>
                <option value="formal">Formal</option>
              </select>
            )}
          </div>
        </div>

        <button
          onClick={() => onDelete(step.id)}
          className="text-gray-300 hover:text-red-500 transition-colors mt-1"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function SequenceEditor({
  sequence,
  steps: initialSteps,
}: {
  sequence: CollectionSequence;
  steps: CollectionStep[];
}) {
  const [steps, setSteps] = useState<StepWithId[]>(initialSteps);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(sequence.name);
  const [isActive, setIsActive] = useState(sequence.isActive);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = steps.findIndex((s) => s.id === active.id);
    const newIndex = steps.findIndex((s) => s.id === over.id);
    setSteps((prev) =>
      arrayMove(prev, oldIndex, newIndex).map((s, i) => ({ ...s, sortOrder: i + 1 }))
    );
  }

  function addStep() {
    const newStep: StepWithId = {
      id: `temp-${Date.now()}`,
      tempId: `temp-${Date.now()}`,
      sortOrder: steps.length + 1,
      triggerDays: steps.length > 0 ? (steps[steps.length - 1].triggerDays ?? 0) + 3 : 0,
      channel: "WHATSAPP",
      messageTemplate: "Hola {nombre}, recordatorio de pago de {concepto} por ${monto}. Pagá acá: {link_pago}",
      useAI: false,
      onlyIfUnpaid: true,
      skipIfContacted: false,
      sequenceId: sequence.id,
    };
    setSteps((prev) => [...prev, newStep]);
  }

  function updateStep(id: string, data: Partial<StepWithId>) {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...data } : s)));
  }

  function deleteStep(id: string) {
    setSteps((prev) => prev.filter((s) => s.id !== id));
  }

  async function handleSave() {
    setSaving(true);
    const res = await fetch(`/api/sequences/${sequence.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, isActive, steps }),
    });
    if (res.ok) {
      toast.success("Secuencia guardada");
    } else {
      toast.error("Error al guardar");
    }
    setSaving(false);
  }

  return (
    <div className="space-y-4">
      {/* Header settings */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-500 mb-1">Nombre</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer mt-4">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="rounded"
          />
          Activa
        </label>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium transition-colors mt-4"
        >
          <Save className="w-4 h-4" />
          {saving ? "Guardando..." : "Guardar"}
        </button>
      </div>

      {/* Steps */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={steps.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-start gap-2">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold mt-4">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <SortableStep
                    step={step}
                    onUpdate={updateStep}
                    onDelete={deleteStep}
                  />
                </div>
              </div>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <button
        onClick={addStep}
        className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-blue-400 hover:text-blue-600 text-sm font-medium transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" />
        Agregar paso
      </button>
    </div>
  );
}
