import { Suspense } from "react";
import { Analyse } from "@/features/advice/analyse";

export const metadata = { title: "Preparing your crop guide" };

export default function Page() {
  return (
    <Suspense>
      <Analyse />
    </Suspense>
  );
}
