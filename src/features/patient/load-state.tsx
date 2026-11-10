/* What a patient screen shows while its data loads from consult-api, or when
   it couldn't be loaded. With the demo store, data is there at once and these
   never show. */

import { LoaderCircle, WifiOff } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/api/client";
import { useT } from "@/lib/i18n";

export function Loading() {
  const { t } = useT();
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-16 text-[14px] text-[var(--mute)]">
      <LoaderCircle size={18} className="animate-spin" /> {t("loadingData")}
    </div>
  );
}

export function LoadFailed({ error }: { error: Error | null }) {
  const { t } = useT();
  const qc = useQueryClient();
  return (
    <div role="alert" className="grid place-items-center gap-3 rounded-(--radius-card) border border-[var(--line)] bg-[var(--white)] px-6 py-12 text-center">
      <WifiOff size={24} className="text-[var(--faint)]" />
      <p className="max-w-[420px] text-[14px] text-[var(--body)]">{error instanceof ApiError && error.status < 500 ? error.message : t("loadFailed")}</p>
      <button type="button" onClick={() => void qc.refetchQueries({ type: "active" })} className="text-[13.5px] font-semibold text-[var(--link)]">
        {t("tryAgain")}
      </button>
    </div>
  );
}

/** The API's message for a failed action when it is meant for people (4xx), else a general one. */
export function actionError(error: unknown, fallback: string): string {
  return error instanceof ApiError && error.status < 500 ? error.message : fallback;
}
