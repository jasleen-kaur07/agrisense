import { Suspense } from "react";
import { WhyPage } from "@/features/advice/why";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense>
      <WhyPage id={id} />
    </Suspense>
  );
}
