import { redirect } from "next/navigation";

export default function ReflectDualRedirect() {
  redirect("/app/reflect?view=dual");
}
