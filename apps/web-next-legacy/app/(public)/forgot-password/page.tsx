import { Suspense } from "react";
import { ForgotForm } from "@/features/auth/forms";

export const metadata = { title: "Reset password" };

export default function Page() {
  return (
    <div className="mx-auto max-w-md">
      <Suspense>
        <ForgotForm />
      </Suspense>
    </div>
  );
}
