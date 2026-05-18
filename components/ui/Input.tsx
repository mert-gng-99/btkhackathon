"use client";

import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
}

export function Input({ className, label, hint, id, ...props }: InputProps) {
  const inputId = id ?? props.name ?? label.toLowerCase().replace(/\s+/g, "-");

  return (
    <label htmlFor={inputId} className="block">
      <span className="tl-label">{label}</span>
      <input id={inputId} className={cn("tl-input", className)} {...props} />
      {hint ? <span className="tl-hint">{hint}</span> : null}
    </label>
  );
}
