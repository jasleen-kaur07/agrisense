import { NotAvailable } from "@/features/insights/not-available";

export const metadata = { title: "Market Value" };

export default function Page() {
  return <NotAvailable topic="market" />;
}
