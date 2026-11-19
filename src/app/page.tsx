import { Splash } from "@/components/Splash";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { getBoard, getMyStars } from "@/lib/board";
import { reviewCounts } from "@/lib/review";
import { weeklyStatus } from "@/lib/weekly";
import { DEFAULT_TOPIC } from "@/topics";
import { Welcome } from "@/components/Welcome";
import { Home } from "@/components/Home";

export default function Page() {
  return (
    <Suspense fallback={<Splash />}>
      <Gate />
    </Suspense>
  );
}

async function Gate() {
  const user = await getCurrentUser();
  if (!user) return <Welcome inviteRequired={Boolean(process.env.INVITE_CODE)} />;
  const [players, myStars, review, weekly] = await Promise.all([
    getBoard(DEFAULT_TOPIC),
    getMyStars(user.id, DEFAULT_TOPIC),
    reviewCounts(user.id, DEFAULT_TOPIC),
    weeklyStatus(user.id, DEFAULT_TOPIC),
  ]);
  return (
    <Home
      user={user}
      players={players}
      myStars={myStars}
      topicId={DEFAULT_TOPIC}
      inviteCode={process.env.INVITE_CODE ?? null}
      review={review}
      weekly={{ played: weekly.played, xp: weekly.xp, resetsAt: weekly.resetsAt.toISOString() }}
    />
  );
}
