"use client";

import { ToolInvocation } from "ai";
import { Loader2 } from "lucide-react";

interface ToolInvocationBadgeProps {
  toolInvocation: ToolInvocation;
}

export function getLabel(
  toolName: string,
  args: Record<string, unknown>,
  done: boolean
): string {
  const path = (args?.path as string) ?? "";

  if (toolName === "str_replace_editor") {
    const command = args?.command as string;
    switch (command) {
      case "create":
        return done ? `${path} creado` : `Creando ${path}`;
      case "str_replace":
      case "insert":
        return done ? `${path} editado` : `Editando ${path}`;
      case "view":
        return done ? `${path} leído` : `Leyendo ${path}`;
      case "undo_edit":
        return done
          ? `Cambios deshecho en ${path}`
          : `Deshaciendo cambios en ${path}`;
    }
  }

  if (toolName === "file_manager") {
    const command = args?.command as string;
    switch (command) {
      case "rename":
        return done ? `${path} renombrado` : `Renombrando ${path}`;
      case "delete":
        return done ? `${path} eliminado` : `Eliminando ${path}`;
    }
  }

  return done ? "Listo" : "Procesando...";
}

export function ToolInvocationBadge({ toolInvocation }: ToolInvocationBadgeProps) {
  const done =
    toolInvocation.state === "result" &&
    (toolInvocation as { result?: unknown }).result !== undefined;

  const label = getLabel(toolInvocation.toolName, toolInvocation.args ?? {}, done);

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200">
      {done ? (
        <>
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-neutral-700">{label}</span>
        </>
      ) : (
        <>
          <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
          <span className="text-neutral-700">{label}</span>
        </>
      )}
    </div>
  );
}
