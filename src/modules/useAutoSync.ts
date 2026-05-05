import { useEffect } from "react";

type UseAutoSyncOptions = {
  enabled: boolean;
  paused: boolean;
  intervalMs?: number;
  onSync: () => Promise<void>;
  onSynced?: () => void;
};

export function useAutoSync({
  enabled,
  paused,
  intervalMs = 5000,
  onSync,
  onSynced,
}: UseAutoSyncOptions) {
  useEffect(() => {
    if (!enabled) return;

    const syncNow = async () => {
      if (paused) return;

      try {
        await onSync();
        onSynced?.();
      } catch (error) {
        console.error("Error sincronizando datos:", error);
      }
    };

    const syncInterval = window.setInterval(syncNow, intervalMs);

    return () => window.clearInterval(syncInterval);
  }, [enabled, paused, intervalMs, onSync, onSynced]);
}