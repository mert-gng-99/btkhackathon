import { Suspense } from "react";
import { auth, signIn } from "@/auth";
import { redirect } from "next/navigation";
import { LoginCard } from "@/components/auth/LoginCard";

export const metadata = {
  title: "Sign in — 2BMTRADE",
};

async function googleSignIn(formData: FormData) {
  "use server";
  const callbackUrl = (formData.get("callbackUrl") as string | null) ?? "/dashboard";
  await signIn("google", { redirectTo: callbackUrl });
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;
  const callbackUrl = params.callbackUrl ?? "/dashboard";

  if (session?.user) {
    redirect(callbackUrl);
  }

  return (
    <Suspense>
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-12">
        <LoginCard action={googleSignIn} callbackUrl={callbackUrl} />
      </div>
    </Suspense>
  );
}
