import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function SignupPage({
  searchParams
}: {
  searchParams?: { error?: string };
}) {
  const existingUser = await getCurrentUser();
  if (existingUser) redirect("/admin");
  void searchParams;
  redirect("/login");
}

