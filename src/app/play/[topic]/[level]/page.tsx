import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getMyStars } from "@/lib/board";
import { isUnlocked } from "@/lib/unlock";
import { findLevel } from "@/topics";
import { Round } from "@/components/Round";

export default function PlayPage({ params }: PageProps<"/play/[topic]/[level]">) {
  return (
    <Suspense fallback={null}>
      <Gate params={params} />
    </Suspense>
  );
}

async function Gate({ params }: { params: PageProps<"/play/[topic]/[level]">["params"] }) {
  const { topic: topicId, level: levelId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/");
  const found = findLevel(topicId, levelId);
  if (!found) notFound();
  const stars = await getMyStars(user.id, found.topic.id);
  if (!isUnlocked(found.topic, found.index, stars)) redirect("/");
  return <Round topicId={found.topic.id} levelId={found.level.id} />;
}
