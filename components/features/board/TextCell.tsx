"use client";

import { useEffect, useState } from "react";

export function TextCell({
  value,
  onChange,
  placeholder = "",
  type = "text",
  dataAttr,
  readOnly = false
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  placeholder?: string;
  type?: "text" | "number";
  dataAttr?: { name: string; value: string };
  readOnly?: boolean;
}) {
  const [local, setLocal] = useState(value ?? "");
  useEffect(() => setLocal(value ?? ""), [value]);

  function commit() {
    if (readOnly) return;
    const next = local.trim() === "" ? null : local;
    if (next !== value) onChange(next);
  }

  const dataProps = dataAttr ? { [`data-${dataAttr.name}`]: dataAttr.value } : {};

  return (
    <input
      type={type}
      value={local}
      readOnly={readOnly}
      onChange={(e) => {
        if (!readOnly) setLocal(e.target.value);
      }}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
      placeholder={placeholder}
      className={`w-full h-full bg-transparent border-0 outline-none text-xs px-1 ${
        readOnly ? "cursor-default text-slate-700" : ""
      }`}
      {...dataProps}
    />
  );
}

export function CheckboxCell({
  value,
  onChange,
  readOnly = false
}: {
  value: boolean;
  onChange?: (b: boolean) => void;
  readOnly?: boolean;
}) {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <input
        type="checkbox"
        checked={value}
        disabled={readOnly}
        onChange={(e) => {
          if (!readOnly && onChange) onChange(e.target.checked);
        }}
        title={readOnly ? "Set by GMS (read-only)" : undefined}
        className={`accent-brand ${readOnly ? "cursor-default opacity-80" : "cursor-pointer"}`}
      />
    </div>
  );
}
