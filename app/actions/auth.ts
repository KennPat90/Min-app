"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { randomToken } from "@/lib/crypto";

function setSessionCookie(token: string, expiresAt: Date) {
  cookies().set("session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/"
  });
}

export async function signupAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !email.includes("@")) return redirect("/signup?error=invalid_email");
  if (!password || password.length < 8) return redirect("/signup?error=password_too_short");

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return redirect("/signup?error=email_in_use");

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, passwordHash }
  });

  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7 dage

  await prisma.session.create({
    data: { token, userId: user.id, expiresAt }
  });

  setSessionCookie(token, expiresAt);
  return redirect("/calendar");
}

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return redirect("/login?error=invalid_credentials");

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return redirect("/login?error=invalid_credentials");

  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7 dage

  await prisma.session.create({
    data: { token, userId: user.id, expiresAt }
  });

  setSessionCookie(token, expiresAt);
  return redirect("/calendar");
}

export async function logoutAction() {
  const token = cookies().get("session")?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { token } });
  }

  // Sæt en udløbet cookie, så den ryddes på klienten (robust ift. path-matching).
  cookies().set("session", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: new Date(0),
    path: "/"
  });
  return redirect("/login");
}

