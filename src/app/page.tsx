import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { getBoard } from "@/lib/board";
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
  const players = await getBoard("passato-prossimo");
  return <Home user={user} players={players} inviteCode={process.env.INVITE_CODE ?? null} />;
}

function Splash() {
  return (
    <main className="flex flex-1 items-center justify-center">
      <p className="font-display wordmark text-5xl text-[var(--brand)]">Ho imparato.</p>
    </main>
  );
}
