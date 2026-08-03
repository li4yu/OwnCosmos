/** 从 Better Auth 客户端 error 抽出可读文案 */
export function authErrorMessage(
  error: { message?: string | null; code?: string | null; statusText?: string } | null | undefined,
  fallback: string,
): string {
  if (!error) return fallback;
  const msg = (error.message || error.statusText || "").trim();
  if (msg) return msg;
  if (error.code) return `${fallback}（${error.code}）`;
  return fallback;
}

export function isAlreadyRegisteredError(error: {
  message?: string | null;
  code?: string | null;
} | null | undefined): boolean {
  if (!error) return false;
  const blob = `${error.code || ""} ${error.message || ""}`;
  return /USER_ALREADY_EXISTS|exist|已存在|already|registered/i.test(blob);
}
