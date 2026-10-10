import { ResultPage } from "@/features/advice/result";

export const metadata = { title: "Regional Crop Guide" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ResultPage id={id} />;
}
