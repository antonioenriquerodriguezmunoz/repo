import { test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ToolInvocationBadge, getLabel } from "../ToolInvocationBadge";
import type { ToolInvocation } from "ai";

function makeInvocation(
  toolName: string,
  args: Record<string, unknown>,
  state: "call" | "partial-call" | "result"
): ToolInvocation {
  if (state === "result") {
    return { toolCallId: "id", toolName, args, state, result: "ok" } as ToolInvocation;
  }
  return { toolCallId: "id", toolName, args, state } as ToolInvocation;
}

// getLabel unit tests

test("getLabel: str_replace_editor create — en progreso", () => {
  expect(getLabel("str_replace_editor", { command: "create", path: "/App.jsx" }, false)).toBe("Creando /App.jsx");
});

test("getLabel: str_replace_editor create — completado", () => {
  expect(getLabel("str_replace_editor", { command: "create", path: "/App.jsx" }, true)).toBe("/App.jsx creado");
});

test("getLabel: str_replace_editor str_replace — en progreso", () => {
  expect(getLabel("str_replace_editor", { command: "str_replace", path: "/App.jsx" }, false)).toBe("Editando /App.jsx");
});

test("getLabel: str_replace_editor str_replace — completado", () => {
  expect(getLabel("str_replace_editor", { command: "str_replace", path: "/App.jsx" }, true)).toBe("/App.jsx editado");
});

test("getLabel: str_replace_editor insert — en progreso", () => {
  expect(getLabel("str_replace_editor", { command: "insert", path: "/App.jsx" }, false)).toBe("Editando /App.jsx");
});

test("getLabel: str_replace_editor insert — completado", () => {
  expect(getLabel("str_replace_editor", { command: "insert", path: "/App.jsx" }, true)).toBe("/App.jsx editado");
});

test("getLabel: str_replace_editor view — en progreso", () => {
  expect(getLabel("str_replace_editor", { command: "view", path: "/App.jsx" }, false)).toBe("Leyendo /App.jsx");
});

test("getLabel: str_replace_editor view — completado", () => {
  expect(getLabel("str_replace_editor", { command: "view", path: "/App.jsx" }, true)).toBe("/App.jsx leído");
});

test("getLabel: str_replace_editor undo_edit — en progreso", () => {
  expect(getLabel("str_replace_editor", { command: "undo_edit", path: "/App.jsx" }, false)).toBe("Deshaciendo cambios en /App.jsx");
});

test("getLabel: str_replace_editor undo_edit — completado", () => {
  expect(getLabel("str_replace_editor", { command: "undo_edit", path: "/App.jsx" }, true)).toBe("Cambios deshecho en /App.jsx");
});

test("getLabel: file_manager rename — en progreso", () => {
  expect(getLabel("file_manager", { command: "rename", path: "/old.jsx" }, false)).toBe("Renombrando /old.jsx");
});

test("getLabel: file_manager rename — completado", () => {
  expect(getLabel("file_manager", { command: "rename", path: "/old.jsx" }, true)).toBe("/old.jsx renombrado");
});

test("getLabel: file_manager delete — en progreso", () => {
  expect(getLabel("file_manager", { command: "delete", path: "/old.jsx" }, false)).toBe("Eliminando /old.jsx");
});

test("getLabel: file_manager delete — completado", () => {
  expect(getLabel("file_manager", { command: "delete", path: "/old.jsx" }, true)).toBe("/old.jsx eliminado");
});

test("getLabel: fallback — en progreso", () => {
  expect(getLabel("unknown_tool", {}, false)).toBe("Procesando...");
});

test("getLabel: fallback — completado", () => {
  expect(getLabel("unknown_tool", {}, true)).toBe("Listo");
});

// Component render tests

test("ToolInvocationBadge: estado call muestra spinner (no punto verde)", () => {
  const inv = makeInvocation("str_replace_editor", { command: "create", path: "/App.jsx" }, "call");
  const { container } = render(<ToolInvocationBadge toolInvocation={inv} />);
  expect(screen.getByText("Creando /App.jsx")).toBeDefined();
  expect(container.querySelector(".bg-emerald-500")).toBeNull();
  expect(container.querySelector(".animate-spin")).toBeDefined();
});

test("ToolInvocationBadge: estado partial-call muestra spinner (no punto verde)", () => {
  const inv = makeInvocation("str_replace_editor", { command: "create", path: "/App.jsx" }, "partial-call");
  const { container } = render(<ToolInvocationBadge toolInvocation={inv} />);
  expect(container.querySelector(".animate-spin")).toBeDefined();
  expect(container.querySelector(".bg-emerald-500")).toBeNull();
});

test("ToolInvocationBadge: estado result muestra punto verde (no spinner)", () => {
  const inv = makeInvocation("str_replace_editor", { command: "create", path: "/App.jsx" }, "result");
  const { container } = render(<ToolInvocationBadge toolInvocation={inv} />);
  expect(screen.getByText("/App.jsx creado")).toBeDefined();
  expect(container.querySelector(".bg-emerald-500")).toBeDefined();
  expect(container.querySelector(".animate-spin")).toBeNull();
});

test("ToolInvocationBadge: fallback desconocido en progreso", () => {
  const inv = makeInvocation("unknown_tool", {}, "call");
  render(<ToolInvocationBadge toolInvocation={inv} />);
  expect(screen.getByText("Procesando...")).toBeDefined();
});

test("ToolInvocationBadge: fallback desconocido completado", () => {
  const inv = makeInvocation("unknown_tool", {}, "result");
  render(<ToolInvocationBadge toolInvocation={inv} />);
  expect(screen.getByText("Listo")).toBeDefined();
});
