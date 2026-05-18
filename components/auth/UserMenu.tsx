"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { LogIn, LogOut, User } from "lucide-react";
import Image from "next/image";

export function UserMenu() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="h-9 w-9 animate-pulse rounded-full bg-white/10" aria-hidden />
    );
  }

  if (!session?.user) {
    return (
      <button
        type="button"
        onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
        className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-sm font-medium text-white/90 transition hover:bg-white/10"
      >
        <LogIn className="h-4 w-4" aria-hidden />
        <span>Sign in</span>
      </button>
    );
  }

  const name = session.user.name ?? session.user.email ?? "Account";
  const initial = (name?.[0] ?? "?").toUpperCase();

  return (
    <div className="flex items-center gap-2">
      <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/80 sm:flex">
        {session.user.image ? (
          <Image
            src={session.user.image}
            alt={name}
            width={20}
            height={20}
            className="h-5 w-5 rounded-full"
            unoptimized
          />
        ) : (
          <span className="grid h-5 w-5 place-items-center rounded-full bg-white/10 text-[10px] font-semibold">
            {initial}
          </span>
        )}
        <span className="max-w-[140px] truncate">{name}</span>
      </div>
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/" })}
        className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-sm font-medium text-white/80 transition hover:bg-white/10"
        title="Sign out"
      >
        <LogOut className="h-4 w-4" aria-hidden />
        <span className="hidden sm:inline">Sign out</span>
      </button>
    </div>
  );
}
