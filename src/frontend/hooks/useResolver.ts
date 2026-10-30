import { invoke } from "@forge/bridge";
import { useState, useCallback } from "react";

export function useResolver<T>(key: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const call = useCallback(async (payload?: Record<string, unknown>) => {
    setLoading(true);
    setError(null);
    try {
      const result = (await invoke(key, payload ?? {})) as { success: boolean; data?: T; error?: { message: string } };
      if (result.success) {
        setData(result.data ?? null);
      } else {
        setError(result.error?.message ?? "Operation failed.");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [key]);

  return { data, loading, error, call };
}