import type { Client, Deal, Item } from "./types";

export function uid(): string {
  return (
    (typeof crypto !== "undefined" && crypto.randomUUID && crypto.randomUUID()) ||
    Math.random().toString(36).slice(2)
  );
}

export function fmtWon(n: number | string | null | undefined): string {
  return "₩" + (Number(n) || 0).toLocaleString("ko-KR");
}

export function parseWon(s: string | number): number {
  return Number(String(s).replace(/[^0-9.-]/g, "")) || 0;
}

export function mdy(s: string | null | undefined): string {
  if (!s) return "";
  const d = new Date(s + "T00:00");
  return d.getMonth() + 1 + "/" + d.getDate();
}

export function mondayOf(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const w = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - w);
  return x;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function ymd(d: Date): string {
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}

export function isSameDay(a: Date, b: Date): boolean {
  return ymd(a) === ymd(b);
}

export function currentQuarter(): string {
  const d = new Date();
  return d.getFullYear() + "-" + (Math.floor(d.getMonth() / 3) + 1) + "Q";
}

export function quarterList(): string[] {
  const out: string[] = [];
  for (let y = 2025; y <= 2026; y++)
    for (let q = 1; q <= 4; q++) out.push(y + "-" + q + "Q");
  return out;
}

export function clientName(clients: Client[], id: string | null): string {
  const c = clients.find((x) => x.id === id);
  return c ? c.name : "";
}

export function itemName(it: Item, deals: Deal[], clients: Client[]): string {
  const d = deals.find((x) => x.id === it.deal_id);
  const cn = d ? clientName(clients, d.client_id) : "";
  const parts: string[] = [];
  if (cn) parts.push("[" + cn + "]");
  if (it.date) parts.push(mdy(it.date));
  if (it.channel) parts.push(it.channel);
  return parts.join(" ") || "(미입력)";
}
