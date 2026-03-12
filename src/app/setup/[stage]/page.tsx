"use client";

import { use } from "react";
import Link from "next/link";
import SetupTrainer, { SETUP_STAGES } from "@/components/board/SetupTrainer";

export default function SetupStagePage({
  params,
}: {
  params: Promise<{ stage: string }>;
}) {
  const { stage } = use(params);
  const idx = SETUP_STAGES.findIndex((s) => s.slug === stage);

  if (idx === -1) {
    return (
      <main className="min-h-screen p-6 max-w-2xl mx-auto text-center">
        <h1 className="text-2xl font-bold mb-4">Stage not found</h1>
        <Link href="/setup" className="text-muted hover:underline">
          Back to stages
        </Link>
      </main>
    );
  }

  const stageInfo = SETUP_STAGES[idx];
  const nextStage =
    idx < SETUP_STAGES.length - 1 ? SETUP_STAGES[idx + 1] : null;

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto">
      <Link
        href="/setup"
        className="text-sm text-muted hover:text-foreground mb-4 inline-block"
      >
        &larr; Back to stages
      </Link>
      <SetupTrainer
        stageSlug={stageInfo.slug}
        nextLabel={nextStage ? `Next: ${nextStage.label}` : "Back to Stages"}
        nextHref={nextStage ? `/setup/${nextStage.slug}` : "/setup"}
      />
    </main>
  );
}
