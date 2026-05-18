"use client";

import Link from "next/link";
import { Loader2, PlugZap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";

interface SessionGateProps {
  loading: boolean;
  error: string | null;
}

export function SessionGate({ loading, error }: SessionGateProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 text-slate-300">
          <Loader2 className="h-5 w-5 animate-spin text-cyan-200" aria-hidden="true" />
          Loading analysis session...
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium text-white">No active analysis session</p>
            <p className="mt-1 text-sm text-slate-400">{error}</p>
          </div>
          <Link href="/connect">
            <Button>
              <PlugZap className="h-4 w-4" aria-hidden="true" />
              Connect or load demo
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return null;
}

