# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Initial setup (install deps, generate Prisma client, run migrations)
npm run setup

# Development server (Turbopack)
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Run a single test file
npx vitest src/components/__tests__/some-file.test.tsx

# Lint
npm run lint

# Reset database
npm run db:reset
```

A `.env` file with `ANTHROPIC_API_KEY=your-key` is optional. Without it, a `MockLanguageModel` generates static demo components.

## Code Style

No escribas comentarios en el código salvo que la lógica no sea evidente por sí misma.

## Architecture

UIGEN is an AI-powered React component generator with live preview. The user describes a component in chat; Claude responds with tool calls that modify a **virtual file system** (in-memory, no disk writes); the result is transformed to browser-runnable JS and rendered in an iframe.

### Data Flow

```
User message → /api/chat (streaming) → Claude tool calls (str_replace_editor, file_manager)
                                              ↓
                                  VirtualFileSystem updated (in memory)
                                              ↓
                           Babel JSX transform + ES Module import map
                                              ↓
                                   iframe srcdoc updated (live preview)
                                              ↓
                           (authenticated) → Prisma project persistence
```

### Key Modules

**`src/lib/file-system.ts`** — `VirtualFileSystem` class. All file operations (create, read, update, delete, rename, str_replace) live here. The Map-based tree serializes to JSON for DB storage and API transmission. Paths always start with `/`; parent directories are auto-created.

**`src/lib/contexts/file-system-context.tsx`** — React context that holds the `VirtualFileSystem` instance and processes AI tool call results (`str_replace_editor`, `file_manager`). Triggers UI refresh via a `refreshTrigger` counter.

**`src/lib/contexts/chat-context.tsx`** — Wraps Vercel AI SDK's `useChat` hook. Sends messages plus the serialized file system to `/api/chat`. Routes tool call callbacks to the file system context.

**`src/app/api/chat/route.ts`** — Streaming POST endpoint. Reconstructs the VirtualFileSystem from the request body, builds the AI prompt with ephemeral cache control, and runs the model with up to 40 steps and two tools: `str_replace_editor` and `file_manager`. On completion, persists the project to Prisma if the user is authenticated.

**`src/lib/transform/jsx-transformer.ts`** — Babel-based JSX→JS transformation. `createImportMap()` maps `react`/`react-dom` to esm.sh CDN URLs and creates blob URLs for user files. `createPreviewHTML()` wraps everything in a self-contained HTML document with `<script type="importmap">`.

**`src/components/preview/PreviewFrame.tsx`** — Detects the entry point (`App.jsx`, `index.jsx`, etc.), calls the transformer, and sets `srcdoc` on a sandboxed iframe (`allow-scripts allow-same-origin allow-forms`).

**`src/lib/tools/`** — Zod-validated tool definitions passed to the AI SDK. `str-replace-editor` covers view/create/str_replace/insert; `file-manager` covers rename/delete.

**`src/lib/auth.ts`** — JWT sessions in HTTP-only cookies (7-day expiry, bcrypt password hashing). Middleware at `src/middleware.ts` enforces auth on protected routes.

**`src/lib/provider.ts`** — Factory that returns either the real Anthropic model or `MockLanguageModel` when no API key is present.

**`src/actions/`** — Server actions for auth (signUp, signIn, signOut) and project CRUD.

### System Prompt

`src/lib/prompts/generation.tsx` instructs Claude to:
- Use `/App.jsx` as the root component
- Style with Tailwind CSS (no hardcoded styles)
- Import local files with the `@/` alias
- Keep responses concise

### Database

El esquema y la estructura de la base de datos están definidos en `prisma/schema.prisma`. Consúltalo siempre que necesites conocer algo de la estructura de la base de datos.

SQLite via Prisma. Two models: `User` (email, hashed password) and `Project` (name, userId, messages as JSON string, data as JSON string). Run `npx prisma studio` to inspect data.

### Testing

Tests use Vitest + `@testing-library/react` with jsdom. Test files live in `src/components/__tests__/`. The vitest config (`vitest.config.mts`) resolves `@/` path aliases and uses the React plugin.
