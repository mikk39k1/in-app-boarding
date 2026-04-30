import { redirect } from "next/navigation";
import { prisma } from "@ib/db";
import { createClient } from "@/lib/supabase/server";

/**
 * Get the current user and ensure a mirror row exists in our `users` table.
 * Redirects to /login if there is no Supabase session.
 */
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  await prisma.user.upsert({
    where: { id: user.id },
    create: { id: user.id, email: user.email ?? "" },
    update: { email: user.email ?? "" },
  });

  return user;
}

export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
