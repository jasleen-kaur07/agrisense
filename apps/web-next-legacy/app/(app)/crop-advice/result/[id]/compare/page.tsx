import { Suspense } from "react";
import { ComparePage } from "@/features/advice/compare";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense>
      <ComparePage id={id} />
    </Suspense>
  );
}
