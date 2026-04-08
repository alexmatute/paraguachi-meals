import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const cache: Record<string, string | null> = {};

export function useSiteSetting(key: string) {
  const [value, setValue] = useState<string | null>(cache[key] ?? null);
  const [loading, setLoading] = useState(!cache[key]);

  useEffect(() => {
    if (cache[key] !== undefined) {
      setValue(cache[key]);
      setLoading(false);
      return;
    }
    supabase
      .from("site_settings")
      .select("value")
      .eq("key", key)
      .maybeSingle()
      .then(({ data }) => {
        const v = data?.value ?? null;
        cache[key] = v;
        setValue(v);
        setLoading(false);
      });
  }, [key]);

  const update = (newVal: string | null) => {
    cache[key] = newVal;
    setValue(newVal);
  };

  return { value, loading, update };
}
