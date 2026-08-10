"use client";

import { useParams } from "next/navigation";
import { ReflectReportGlass } from "@/components/reflect/reflect-mirror";

export default function ReflectReportDetailPage() {
  const params = useParams<{ id: string }>();
  return <ReflectReportGlass reportId={params.id} />;
}
