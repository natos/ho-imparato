import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { dueQuestions } from "@/lib/review";
import { DEFAULT_TOPIC } from "@/topics";
import { Round } from "@/components/Round";

export default function RipassoPage() {
  return (
    <Suspense fallback={null}>
      <Gate />
    </Suspense>
  );
}

async function Gate() {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  const questions = await dueQuestions(user.id, DEFAULT_TOPIC, 10);
  if (questions.length === 0) {
    return (
      <main className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center gap-4 px-4 text-center">
        <h1 className="font-display text-4xl">Tutto ripassato!</h1>
        <p className="text-[var(--muted)]">Nothing is due right now. Play a stop and the things you miss will come back here.</p>
        <Link href="/" className="btn btn-primary">
          Torna alla mappa
        </Link>
      </main>
    );
  }
  return <Round topicId={DEFAULT_TOPIC} mode="ripasso" preset={questions} />;
}
