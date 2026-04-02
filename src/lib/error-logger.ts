import { supabase } from "@/integrations/supabase/client";

type Severity = "error" | "warning" | "info";

interface ErrorContext {
  component?: string;
  action?: string;
  [key: string]: unknown;
}

export async function logError(
  error: unknown,
  context: ErrorContext = {},
  severity: Severity = "error"
) {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  // Always log to console
  console[severity === "info" ? "info" : severity === "warning" ? "warn" : "error"](
    `[${severity.toUpperCase()}]`,
    message,
    context
  );

  // Persist to database (best-effort, don't throw)
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("error_logs").insert({
      user_id: user?.id ?? null,
      message,
      stack: stack ?? null,
      context: context as Record<string, unknown>,
      severity,
    } as any);
  } catch {
    // Silent fail — logging should never crash the app
  }
}

export function logUploadError(error: unknown, fileName: string) {
  return logError(error, { component: "FileUpload", action: "upload", fileName });
}

export function logAuthError(error: unknown, action: string) {
  return logError(error, { component: "Auth", action });
}

export function logApiError(error: unknown, endpoint: string) {
  return logError(error, { component: "API", action: "request", endpoint });
}
