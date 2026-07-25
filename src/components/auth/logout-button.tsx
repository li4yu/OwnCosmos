"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onLogout() {
    setPending(true);
    try {
      await authClient.signOut();
      router.push("/login");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onLogout}
      disabled={pending}
      className="ui-btn-ghost disabled:opacity-50"
    >
      {pending ? "退出中…" : "退出登录"}
    </button>
  );
}
