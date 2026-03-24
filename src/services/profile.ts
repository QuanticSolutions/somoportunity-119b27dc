import { supabase } from "@/integrations/supabase/client";

export type AppRole = "seeker" | "provider" | "admin" | "editor" | "viewer";

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: AppRole;
  country: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error || !data) return null;
  return data as unknown as Profile;
}

export async function updateProfile(
  userId: string,
  updates: Partial<Pick<Profile, "full_name" | "role" | "country" | "bio" | "avatar_url">>
) {
  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      { id: userId, ...updates },
      { onConflict: "id" }
    )
    .select()
    .single();
  if (error) throw error;
  return data as Profile;
}

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop();
  const path = `${userId}/avatar.${ext}`;

  const { error } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true });

  if (error) throw error;

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data.publicUrl;
}

export function isProfileComplete(profile: Profile | null): boolean {
  if (!profile) return false;
  // Bio may be HTML from rich text editor — check it has actual text content
  const hasBio = !!profile.bio && profile.bio !== "<p></p>" && profile.bio.replace(/<[^>]*>/g, "").trim().length > 0;
  return !!(profile.full_name && profile.country && hasBio);
}
