// src/api.ts
import { BACKEND_URL } from "./config";

export type Student = { grade: string; gradeNo: number; clazz: string; classNo: number; name: string; count: number };
export type Clazz   = { className: string; grade: string; gradeNo: number; clazz: string; classNo: number; count: number };
export type Book    = { title: string; count: number };

export type Leaderboards = {
  generatedAt: string;
  studentOverall: Student[];
  studentTopByGrade: Record<number, Student[]>;
  classTop: Clazz[];
  bookTop: Book[];
};

export async function fetchLeaderboards(): Promise<Leaderboards | null> {
  const r = await fetch(BACKEND_URL, { cache: "no-store" });
  const data = await r.json();
  if (data && data.generatedAt) return data as Leaderboards;
  return null;
}

export async function refreshLeaderboards(): Promise<boolean> {
  const r = await fetch(BACKEND_URL + "?action=refresh", { cache: "no-store" });
  const j = await r.json().catch(() => null);
  return !!j?.ok;
}
