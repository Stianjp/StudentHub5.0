import Image from "next/image";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { STUDY_CATEGORIES } from "@/components/event/study-categories";
import { getStudentCategoryLabel } from "@/lib/student-company-display";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { completeCompanyOAuthOnboarding } from "@/app/auth/onboarding/actions";
import { resolveOAuthPortalRole } from "@/lib/auth-oauth";

type PageProps = { searchParams?: Promise<{ error?: string }> };

export default async function CompanyOAuthOnboardingPage({ searchParams }: PageProps) {
  if (resolveOAuthPortalRole((await headers()).get("host"), "company") !== "company") {
    redirect("/auth/sign-in?role=company&reason=wrong-portal");
  }
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) redirect("/auth/sign-in?role=company");
  const params: { error?: string } = searchParams ? await searchParams : {};

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#140249_0%,#6D367F_52%,#FF7282_100%)] px-6 py-12">
      <Card className="mx-auto flex max-w-2xl flex-col gap-6 border border-white/70 !bg-[#140249] text-surface">
        <Image src="/brand/Logo_OSH_Gradient_whitetext.svg" alt="Oslo Student Hub" width={220} height={54} className="mx-auto h-auto" priority />
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-secondary">Company access</p>
          <h1 className="mt-2 text-2xl font-bold">Register your company</h1>
          <p className="mt-2 text-sm text-surface/75">Signed in as {user.email}. OSH must approve the request before portal access opens.</p>
        </div>
        {params.error ? <p className="rounded-xl bg-error/15 p-3 text-sm text-error">{params.error}</p> : null}
        <form action={completeCompanyOAuthOnboarding} className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-semibold">Company name<Input name="companyName" required /></label>
          <label className="text-sm font-semibold">Organisation number<Input name="orgNumber" required inputMode="numeric" pattern="[0-9]{9}" placeholder="9 digits" /></label>
          <label className="text-sm font-semibold md:col-span-2">Address<Input name="address" required /></label>
          <label className="text-sm font-semibold">Postal code<Input name="postalCode" required /></label>
          <label className="text-sm font-semibold">City<Input name="city" required /></label>
          <label className="text-sm font-semibold">Country<Input name="country" required defaultValue="Norway" /></label>
          <label className="text-sm font-semibold">Logo (optional)<input name="logo" type="file" accept="image/*" className="mt-1 block w-full rounded-2xl border border-white/20 bg-white px-4 py-3 text-sm text-[#140249]" /></label>
          <fieldset className="grid gap-2 rounded-2xl border border-white/15 p-4 md:col-span-2">
            <legend className="px-1 text-sm font-semibold">Fields of study you recruit from</legend>
            <div className="grid gap-2 sm:grid-cols-2">{STUDY_CATEGORIES.map((category) => <label key={category} className="flex items-center gap-2 text-sm"><input type="checkbox" name="recruitmentFields" value={category} />{getStudentCategoryLabel(category)}</label>)}</div>
          </fieldset>
          <Button type="submit" variant="secondary" className="md:col-span-2">Send access request</Button>
        </form>
      </Card>
    </main>
  );
}
