// @vitest-environment node
import { test, expect, vi, beforeEach } from "vitest";
import { SignJWT, jwtVerify } from "jose";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

const mockSet = vi.hoisted(() => vi.fn());
const mockGet = vi.hoisted(() => vi.fn());
const mockDelete = vi.hoisted(() => vi.fn());
vi.mock("next/headers", () => ({
  cookies: () => Promise.resolve({ set: mockSet, get: mockGet, delete: mockDelete }),
}));

import { createSession, getSession, deleteSession, verifySession } from "@/lib/auth";

const JWT_SECRET = new TextEncoder().encode("development-secret-key");

async function makeToken(payload: object, expiresIn: string | number = "7d") {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expiresIn)
    .setIssuedAt()
    .sign(JWT_SECRET);
}

function expiredAt() {
  return Math.floor(Date.now() / 1000) - 10;
}

beforeEach(() => {
  mockSet.mockClear();
  mockGet.mockClear();
  mockDelete.mockClear();
});

// createSession

test("createSession llama a set con el nombre de cookie correcto", async () => {
  await createSession("user-1", "test@example.com");

  expect(mockSet).toHaveBeenCalledOnce();
  const [name] = mockSet.mock.calls[0];
  expect(name).toBe("auth-token");
});

test("createSession genera un JWT válido con userId y email en el payload", async () => {
  await createSession("user-1", "test@example.com");

  const [, token] = mockSet.mock.calls[0];
  const { payload } = await jwtVerify(token, JWT_SECRET);

  expect(payload.userId).toBe("user-1");
  expect(payload.email).toBe("test@example.com");
});

test("createSession establece opciones de cookie correctas", async () => {
  await createSession("user-1", "test@example.com");

  const [, , options] = mockSet.mock.calls[0];

  expect(options.httpOnly).toBe(true);
  expect(options.sameSite).toBe("lax");
  expect(options.path).toBe("/");
});

test("createSession establece expiración aproximada de 7 días", async () => {
  const before = Date.now();
  await createSession("user-1", "test@example.com");
  const after = Date.now();

  const [, , options] = mockSet.mock.calls[0];
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  expect(options.expires.getTime()).toBeGreaterThanOrEqual(before + sevenDaysMs - 1000);
  expect(options.expires.getTime()).toBeLessThanOrEqual(after + sevenDaysMs + 1000);
});

test("createSession establece secure=false fuera de producción", async () => {
  await createSession("user-1", "test@example.com");

  const [, , options] = mockSet.mock.calls[0];
  expect(options.secure).toBe(false);
});

test("createSession establece secure=true en producción", async () => {
  vi.stubEnv("NODE_ENV", "production");

  await createSession("user-1", "test@example.com");

  const [, , options] = mockSet.mock.calls[0];
  expect(options.secure).toBe(true);

  vi.unstubAllEnvs();
});

// getSession

test("getSession devuelve null cuando no hay cookie", async () => {
  mockGet.mockReturnValue(undefined);

  const session = await getSession();

  expect(session).toBeNull();
});

test("getSession devuelve el payload cuando el token es válido", async () => {
  const token = await makeToken({ userId: "user-1", email: "test@example.com" });
  mockGet.mockReturnValue({ value: token });

  const session = await getSession();

  expect(session?.userId).toBe("user-1");
  expect(session?.email).toBe("test@example.com");
});

test("getSession devuelve null cuando el token está expirado", async () => {
  const token = await makeToken({ userId: "user-1", email: "test@example.com" }, expiredAt());
  mockGet.mockReturnValue({ value: token });

  const session = await getSession();

  expect(session).toBeNull();
});

test("getSession devuelve null cuando el token es inválido", async () => {
  mockGet.mockReturnValue({ value: "token-invalido" });

  const session = await getSession();

  expect(session).toBeNull();
});

// deleteSession

test("deleteSession elimina la cookie auth-token", async () => {
  await deleteSession();

  expect(mockDelete).toHaveBeenCalledOnce();
  expect(mockDelete).toHaveBeenCalledWith("auth-token");
});

// verifySession

test("verifySession devuelve null cuando no hay cookie en la request", async () => {
  const request = new NextRequest("http://localhost/");

  const session = await verifySession(request);

  expect(session).toBeNull();
});

test("verifySession devuelve el payload cuando el token es válido", async () => {
  const token = await makeToken({ userId: "user-1", email: "test@example.com" });
  const request = new NextRequest("http://localhost/", {
    headers: { cookie: `auth-token=${token}` },
  });

  const session = await verifySession(request);

  expect(session?.userId).toBe("user-1");
  expect(session?.email).toBe("test@example.com");
});

test("verifySession devuelve null cuando el token está expirado", async () => {
  const token = await makeToken({ userId: "user-1", email: "test@example.com" }, expiredAt());
  const request = new NextRequest("http://localhost/", {
    headers: { cookie: `auth-token=${token}` },
  });

  const session = await verifySession(request);

  expect(session).toBeNull();
});

test("verifySession devuelve null cuando el token es inválido", async () => {
  const request = new NextRequest("http://localhost/", {
    headers: { cookie: "auth-token=token-invalido" },
  });

  const session = await verifySession(request);

  expect(session).toBeNull();
});
