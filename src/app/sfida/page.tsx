import { Splash } from "@/components/Splash";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getWeekly, weeklyStatus } from "@/lib/weekly";
import { DEFAULT_TOPIC } from "@/topics";
import { Round } from "@/components/Round";

export default function SfidaPage() {
  return (
    <Suspense fallback={<Splash />}>
      <Gate />
    </Suspense>
  );
}

async function Gate() {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  const [{ week, questions }, status] = await Promise.all([getWeekly(DEFAULT_TOPIC), weeklyStatus(user.id, DEFAULT_TOPIC)]);
  return <Round topicId={DEFAULT_TOPIC} mode="sfida" preset={questions} week={week} alreadyPlayed={status.played} />;
}
