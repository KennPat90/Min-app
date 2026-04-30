import Link from "next/link";
import { signupAction } from "@/app/actions/auth";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

const errorMessages: Record<string, string> = {
  invalid_email: "Indtast en gyldig email.",
  password_too_short: "Adgangskoden skal være mindst 8 tegn.",
  email_in_use: "Emailen er allerede i brug."
};

export default async function SignupPage({
  searchParams
}: {
  searchParams?: { error?: string };
}) {
  const existingUser = await getCurrentUser();
  if (existingUser) redirect("/calendar");

  const error = searchParams?.error ? errorMessages[searchParams.error] : undefined;

  return (
    <div>
      <h1>Opret bruger</h1>

      {error ? <div className="card">{error}</div> : null}

      <form action={signupAction}>
        <label>
          Email
          <input name="email" type="email" required />
        </label>

        <label>
          Adgangskode
          <input name="password" type="password" required />
        </label>

        <button className="primary" type="submit">
          Opret
        </button>
      </form>

      <p style={{ marginTop: 16 }}>
        Har du allerede en konto? <Link href="/login">Log ind</Link>
      </p>
    </div>
  );
}

