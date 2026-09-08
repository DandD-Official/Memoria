import { redirect } from "next/navigation";

export default async function LegacyCollectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/books/${id}`);
}
