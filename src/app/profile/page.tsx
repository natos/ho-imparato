import { Splash } from "@/components/Splash";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Profile } from "@/components/Profile";

export default function ProfilePage() {
  return (
    <Suspense fallback={<Splash />}>
      <Gate />
    </Suspense>
  );
}

async function Gate() {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  return <Profile user={user} />;
}
