import { redirect } from "next/navigation";

export default function ReflectPeriodRedirect() {
  redirect("/app/reflect?view=period");
}
