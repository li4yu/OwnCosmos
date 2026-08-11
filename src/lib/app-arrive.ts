/** 欢迎页 / 登录成功 → /app 的进站衔接标记（sessionStorage） */
export const APP_ARRIVE_KEY = "owncosmos_arrive";

export function markAppArrive() {
  try {
    sessionStorage.setItem(APP_ARRIVE_KEY, "1");
  } catch {
    /* private mode */
  }
}

export function consumeAppArriveFlag(): boolean {
  try {
    if (sessionStorage.getItem(APP_ARRIVE_KEY) !== "1") return false;
    sessionStorage.removeItem(APP_ARRIVE_KEY);
    return true;
  } catch {
    return false;
  }
}
