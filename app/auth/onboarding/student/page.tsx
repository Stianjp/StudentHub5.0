import Image from "next/image";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { STUDY_CATEGORIES } from "@/components/event/study-categories";
import { getStudentCategoryLabel } from "@/lib/student-company-display";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { completeStudentOAuthOnboarding } from "@/app/auth/onboarding/actions";
import { resolveOAuthPortalRole } from "@/lib/auth-oauth";

type PageProps = { searchParams?: Promise<{ error?: string }> };

export default async function StudentOAuthOnboardingPage({ searchParams }: PageProps) {
  if (resolveOAuthPortalRole((await headers()).get("host"), "student") !== "student") {
    redirect("/auth/sign-in?role=student&reason=wrong-portal");
  }
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) redirect("/auth/sign-in?role=student");
  const params: { error?: string } = searchParams ? await searchParams : {};
  const suggestedName = String(user.user_metadata?.full_name ?? user.user_metadata?.name ?? "");

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#140249_0%,#6D367F_52%,#FF7282_100%)] px-6 py-12">
      <Card className="mx-auto flex max-w-2xl flex-col gap-6 border border-white/70 !bg-[#140249] text-surface">
        <Image src="/brand/Logo_OSH_Gradient_whitetext.svg" alt="Oslo Student Hub" width={220} height={54} className="mx-auto h-auto" priority />
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-secondary">One last step</p>
          <h1 className="mt-2 text-2xl font-bold">Complete your student profile</h1>
          <p className="mt-2 text-sm text-surface/75">Signed in as {user.email}. These details improve your company matches.</p>
        </div>
        {params.error ? <p className="rounded-xl bg-error/15 p-3 text-sm text-error">{params.error}</p> : null}
        <form action={completeStudentOAuthOnboarding} className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-semibold">Full name<Input name="fullName" required autoComplete="name" defaultValue={suggestedName} /></label>
          <label className="text-sm font-semibold">University or educational institution<Input name="school" required placeholder="For example, NTNU" /></label>
          <label className="text-sm font-semibold">Field of study<Select name="studyProgram" required defaultValue=""><option value="">Select field of study</option>{STUDY_CATEGORIES.map((category) => <option key={category} value={category}>{getStudentCategoryLabel(category)}</option>)}</Select></label>
          <label className="text-sm font-semibold">Student type<Select name="studyLevel" required defaultValue=""><option value="">Select</option><option value="Bachelor">Bachelor</option><option value="Master">Master</option></Select></label>
          <label className="text-sm font-semibold">Year<Select name="studyYear" required defaultValue=""><option value="">Select year</option>{[1,2,3,4,5].map((year) => <option key={year} value={year}>Year {year}</option>)}</Select></label>
          <fieldset className="grid gap-2 rounded-2xl border border-white/15 p-4 md:col-span-2">
            <legend className="px-1 text-sm font-semibold">I am interested in (optional)</legend>
            <div className="grid gap-2 sm:grid-cols-2">{["Fast jobb", "Sommerjobb", "Deltidsjobb", "Internship", "Bacheloroppgave", "Masteroppgave"].map((jobType) => <label key={jobType} className="flex items-center gap-2 text-sm"><input type="checkbox" name="jobTypes" value={jobType} />{jobType}</label>)}</div>
          </fieldset>
          <Button type="submit" variant="secondary" className="md:col-span-2">Complete profile</Button>
        </form>
      </Card>
    </main>
  );
}
