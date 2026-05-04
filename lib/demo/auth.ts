"use client";

import { initialsFromName } from "@/lib/utils";

const KEY = "geocon-demo-auth-v1";

export interface DemoSession {
  email: string;
  name: string;
  initials: string;
  signedInAt: string;
}

export function getDemoSession(): DemoSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DemoSession;
  } catch {
    return null;
  }
}

export function setDemoSession(name: string, email: string): DemoSession {
  const session: DemoSession = {
    email,
    name,
    initials: initialsFromName(name),
    signedInAt: new Date().toISOString()
  };
  window.localStorage.setItem(KEY, JSON.stringify(session));
  return session;
}

export function clearDemoSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}
