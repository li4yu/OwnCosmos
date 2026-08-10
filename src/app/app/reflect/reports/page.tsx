import { redirect } from "next/navigation";

export default function ReflectReportsRedirect() {
  redirect("/app/reflect?view=traces");
}
