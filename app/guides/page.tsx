import { redirect } from "next/navigation";

export default function GuidesPage({ searchParams }: { searchParams?: { journey?: string } }) {
  const journey = searchParams?.journey;
  redirect(journey ? `/learn?journey=${encodeURIComponent(journey)}` : "/learn");
}
