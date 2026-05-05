export const DEMO_COOKIE = "cobrefacil_demo";
export const DEMO_EMAIL = "demo@cobrarfacil.com";
export const DEMO_PASSWORD = "Demo1234";

export function isDemoModeEnabled(): boolean {
  if (process.env.ENABLE_DEMO_MODE === "true") return true;
  if (process.env.ENABLE_DEMO_MODE === "false") return false;
  return process.env.NODE_ENV !== "production";
}
