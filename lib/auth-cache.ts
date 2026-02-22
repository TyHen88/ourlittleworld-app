import { createClient } from "@/utils/supabase/server";
import { cache } from "react";
import type { User } from "@supabase/supabase-js";

export const getCachedUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) return null;
  return user;
});

export const getCachedUserOrThrow = cache(async (): Promise<User> => {
  const user = await getCachedUser();
  if (!user) throw new Error("Not authenticated");
  return user;
});
