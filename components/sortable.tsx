"use client";

import { useState } from "react";

export type SortState = { key: string; dir: "asc" | "desc" } | null;

export function useSort(initial: SortState = null) {
  const [sort, setSort] = useState<SortState>(initial);
  const toggle = (key: string) =>
    setSort((s) =>
      s && s.key === key
        ? s.dir === "asc"
          ? { key, dir: "desc" }
          : null
        : { key, dir: "asc" }
    );
  return { sort, toggle };
}

type Val = string | number | boolean | null | undefined;

export function sortRows<T>(
  rows: T[],
  sort: SortState,
  getVal: (row: T, key: string) => Val
): T[] {
  if (!sort) return rows;
  const { key, dir } = sort;
  const norm = (v: Val): string | number => {
    if (v == null) return "";
    if (typeof v === "boolean") return v ? 1 : 0;
    return v;
  };
  const arr = [...rows];
  arr.sort((a, b) => {
    const va = norm(getVal(a, key));
    const vb = norm(getVal(b, key));
    let cmp: number;
    if (typeof va === "number" && typeof vb === "number") cmp = va - vb;
    else cmp = String(va).localeCompare(String(vb), "ko");
    return dir === "asc" ? cmp : -cmp;
  });
  return arr;
}

export function SortTh({
  label,
  sortKey,
  sort,
  onToggle,
  width,
  align,
}: {
  label: string;
  sortKey: string;
  sort: SortState;
  onToggle: (key: string) => void;
  width?: number;
  align?: "left" | "right" | "center";
}) {
  const active = !!sort && sort.key === sortKey;
  const arrow = !active ? "↕" : sort!.dir === "asc" ? "↑" : "↓";
  return (
    <th
      className="sort-th"
      style={{ width, textAlign: align }}
      onClick={() => onToggle(sortKey)}
    >
      <span className="sort-th-inner">
        {label}
        <span className={`sort-arrow${active ? " active" : ""}`}>{arrow}</span>
      </span>
    </th>
  );
}
