import { NotAvailable } from "@/features/insights/not-available";

export const metadata = { title: "Crop Prediction" };

export default function Page() {
  return <NotAvailable topic="prediction" />;
}
