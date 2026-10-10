import { Suspense } from "react";
import { ActionPlanPage } from "@/features/advice/action-plan";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense>
      <ActionPlanPage id={id} />
    </Suspense>
  );
}
