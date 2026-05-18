"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  children: ReactNode;
}

export function Button({ className, variant = "primary", children, ...props }: ButtonProps) {
  const variantClass = {
    primary: "tl-btn tl-btn-primary",
    secondary: "tl-btn tl-btn-secondary",
    ghost: "tl-btn tl-btn-ghost",
    danger: "tl-btn tl-btn-danger"
  }[variant];

  return (
    <button className={cn(variantClass, className)} {...props}>
      {children}
    </button>
  );
}
