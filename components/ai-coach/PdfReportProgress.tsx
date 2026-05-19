"use client";

import {
  AlertTriangle,
  CheckCircle2,
  DatabaseZap,
  FileText,
  Layers,
  ScanLine,
  ShieldCheck,
  Wrench
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { useT } from "@/lib/i18n";

interface PdfReportProgressProps {
  step: number; // 0-based
  loading: boolean;
  doneMessage: string | null;
  error: string | null;
}

type IconCmp = ComponentType<SVGProps<SVGSVGElement>>;

const STAGE_ICONS: IconCmp[] = [DatabaseZap, FileText, ShieldCheck, Wrench, Layers];

export function PdfReportProgress({ step, loading, doneMessage, error }: PdfReportProgressProps) {
  const t = useT();
  const flow = t.aiCoach.chat.reportFlow;
  const totalStages = flow.stages.length;
  const validatorIndex = 2;
  const totalClaims = flow.sampleClaims.length;

  const isError = !!error;
  const isDone = !loading && !error && !!doneMessage;

  // verified count: when on validator step (active), animate verified via CSS via index.
  // when past validator, all are verified.
  const verifiedCount = step > validatorIndex ? totalClaims : step === validatorIndex ? Math.min(step, totalClaims) : 0;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pdf-report-card"
      data-state={isError ? "error" : isDone ? "done" : loading ? "loading" : "idle"}
    >
      <div className="pdf-report-head">
        <div className="pdf-report-head-text">
          <p className="tl-label-mono pdf-report-eyebrow">
            <span className="pdf-report-pulse" aria-hidden />
            {isError
              ? flow.validatorBadge
              : isDone
                ? flow.done
                : `${Math.min(step + 1, totalStages)} / ${totalStages}`}
          </p>
          <h3 className="pdf-report-title">{flow.title}</h3>
          <p className="pdf-report-sub">{flow.sub}</p>
        </div>
        {(isDone || isError) && (
          <span
            className={`pdf-report-result ${isError ? "is-error" : "is-done"}`}
            aria-hidden
          >
            {isError ? <AlertTriangle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
          </span>
        )}
      </div>

      <ol className="pdf-report-track" aria-label={flow.title}>
        {flow.stages.map((stage, i) => {
          const Icon = STAGE_ICONS[i] ?? FileText;
          const completed = i < step || isDone;
          const active = !isDone && !isError && i === step;
          const isValidator = i === validatorIndex;
          return (
            <li
              key={stage.title}
              className={[
                "pdf-report-step",
                completed ? "is-completed" : "",
                active ? "is-active" : "",
                isValidator ? "is-validator" : ""
              ].filter(Boolean).join(" ")}
            >
              <div className="pdf-report-step-node" aria-hidden>
                {completed ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
                {active && <span className="pdf-report-step-ring" />}
              </div>
              <div className="pdf-report-step-text">
                <span className="pdf-report-step-title">{stage.title}</span>
                <span className="pdf-report-step-sub">{stage.sub}</span>
              </div>
            </li>
          );
        })}
      </ol>

      {/* Validator hero panel: shown while the validator stage is active or after */}
      {(loading && step >= validatorIndex - 0) || (isDone) ? (
        <div className={`pdf-report-validator ${step === validatorIndex && loading ? "is-scanning" : ""} ${isDone ? "is-done" : ""}`}>
          <div className="pdf-report-validator-head">
            <span className="pdf-report-validator-badge">
              <ScanLine className="h-3.5 w-3.5" aria-hidden />
              {flow.validatorBadge}
            </span>
            <span className="pdf-report-validator-counter tl-mono">
              {flow.claimsCounter(isDone ? totalClaims : verifiedCount, totalClaims)}
            </span>
          </div>

          <div className="pdf-report-validator-doc" aria-hidden>
            <div className="pdf-report-validator-scan" />
            <ul className="pdf-report-validator-claims">
              {flow.sampleClaims.map((claim, i) => (
                <li
                  key={claim}
                  className={`pdf-report-validator-claim ${isDone ? "is-verified" : ""}`}
                  style={{ animationDelay: `${0.35 + i * 0.32}s` }}
                >
                  <span className="pdf-report-validator-claim-dot" />
                  <span className="pdf-report-validator-claim-text">{claim}</span>
                  <span className="pdf-report-validator-claim-check">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span className="sr-only">{flow.claimVerified}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {isError && (
        <p className="pdf-report-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
