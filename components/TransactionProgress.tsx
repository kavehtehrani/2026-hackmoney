"use client";

import { getChainDisplayName, type TransactionStep, type TransactionProgress as TransactionProgressType } from "@/lib/lifi";
import { ChainIcon } from "@/components/TokenIcon";

interface TransactionProgressProps {
  progress: TransactionProgressType;
}

function StepIcon({ step }: { step: TransactionStep }) {
  if (step.status === "completed") {
    return (
      <div className="h-6 w-6 rounded-full bg-green-500 flex items-center justify-center">
        <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
    );
  }

  if (step.status === "failed") {
    return (
      <div className="h-6 w-6 rounded-full bg-destructive flex items-center justify-center">
        <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
    );
  }

  if (step.status === "executing") {
    return (
      <div className="h-6 w-6 rounded-full border-2 border-primary flex items-center justify-center">
        <div className="h-3 w-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (step.status === "action_required") {
    return (
      <div className="h-6 w-6 rounded-full bg-amber-500 flex items-center justify-center animate-pulse">
        <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
    );
  }

  // Pending
  return (
    <div className="h-6 w-6 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center">
      <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
    </div>
  );
}

function StepTypeLabel({ type }: { type: TransactionStep["type"] }) {
  const labels: Record<TransactionStep["type"], { text: string; className: string }> = {
    approval: { text: "Approval", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
    swap: { text: "Swap", className: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
    bridge: { text: "Bridge", className: "bg-orange-500/10 text-orange-600 dark:text-orange-400" },
    transfer: { text: "Transfer", className: "bg-green-500/10 text-green-600 dark:text-green-400" },
  };

  const { text, className } = labels[type];

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {text}
    </span>
  );
}

function TransactionStepItem({
  step,
  isLast,
}: {
  step: TransactionStep;
  isLast: boolean;
}) {
  return (
    <div className="flex gap-3">
      {/* Timeline */}
      <div className="flex flex-col items-center">
        <StepIcon step={step} />
        {!isLast && (
          <div
            className={`w-0.5 flex-1 mt-1 ${
              step.status === "completed" ? "bg-green-500" : "bg-muted-foreground/20"
            }`}
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 pb-4 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <StepTypeLabel type={step.type} />
          <span className="text-sm font-medium">{step.toolName}</span>
        </div>

        {/* Chain info */}
        {(step.fromChainId || step.toChainId) && (
          <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
            {step.fromChainId && (
              <span className="flex items-center gap-1">
                <ChainIcon chainId={step.fromChainId} size={12} />
                {getChainDisplayName(step.fromChainId)}
              </span>
            )}
            {step.fromChainId && step.toChainId && step.fromChainId !== step.toChainId && (
              <>
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                <span className="flex items-center gap-1">
                  <ChainIcon chainId={step.toChainId} size={12} />
                  {getChainDisplayName(step.toChainId)}
                </span>
              </>
            )}
          </div>
        )}

        {/* Status message */}
        {step.status === "action_required" && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
            Check your wallet for action
          </p>
        )}
        {step.message && step.status !== "completed" && (
          <p className="text-xs text-muted-foreground mt-1 truncate">{step.message}</p>
        )}

        {/* Transaction link */}
        {step.txLink && (
          <a
            href={step.txLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
          >
            {step.txHash ? `${step.txHash.slice(0, 8)}...${step.txHash.slice(-6)}` : "View transaction"}
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        )}
      </div>
    </div>
  );
}

export function TransactionProgress({ progress }: TransactionProgressProps) {
  if (progress.steps.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <div className="h-4 w-4 rounded-full border-2 border-muted-foreground border-t-transparent animate-spin" />
        Preparing transaction...
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {progress.steps.map((step, index) => (
        <TransactionStepItem
          key={step.id}
          step={step}
          isLast={index === progress.steps.length - 1}
        />
      ))}

      {progress.isComplete && !progress.isFailed && (
        <div className="flex items-center gap-2 mt-2 p-2 rounded-lg bg-green-500/10 text-green-600 dark:text-green-400">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm font-medium">Transaction complete</span>
        </div>
      )}

      {progress.isFailed && (
        <div className="flex items-center gap-2 mt-2 p-2 rounded-lg bg-destructive/10 text-destructive">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm font-medium">Transaction failed</span>
        </div>
      )}
    </div>
  );
}
