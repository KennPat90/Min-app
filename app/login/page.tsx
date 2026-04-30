import Link from "next/link";
import { loginAction } from "@/app/actions/auth";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

const errorMessages: Record<string, string> = {
  invalid_credentials: "Forkert email eller adgangskode."
};

export default async function LoginPage({
  searchParams
}: {
  searchParams?: { error?: string };
}) {
  const existingUser = await getCurrentUser();
  if (existingUser) {
    redirect("/calendar");
  }

  const error = searchParams?.error ? errorMessages[searchParams.error] : undefined;

  return (
    <div>
      <h1>Log ind</h1>

      {error ? <div className="card">{error}</div> : null}

      <form action={loginAction}>
        <label>
          Email
          <input name="email" type="email" required />
        </label>

        <label>
          Adgangskode
          <input name="password" type="password" required />
        </label>

        <button className="primary" type="submit">
          Log ind
        </button>
      </form>

      <p style={{ marginTop: 16 }}>
        Har du ikke en konto? <Link href="/signup">Opret bruger</Link>
      </p>
    </div>
  );
}

