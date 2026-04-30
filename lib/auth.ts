import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export async function getCurrentUser() {
  const token = cookies().get("session")?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true }
  });

  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    // Session expired: clean up so next request doesn't re-check.
    await prisma.session.deleteMany({ where: { token } });
    return null;
  }

  return session.user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

