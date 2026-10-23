import { Suspense } from "react";
import { ResetForm } from "@/features/auth/forms";

export const metadata = { title: "Choose a new password" };

export default function Page() {
  return (
    <div className="mx-auto max-w-md">
      <Suspense>
        <ResetForm />
      </Suspense>
    </div>
  );
}
