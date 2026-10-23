import { Suspense } from "react";
import { RegisterForm } from "@/features/auth/forms";

export const metadata = { title: "Create account" };

export default function Page() {
  return (
    <div className="mx-auto max-w-md">
      <Suspense>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
