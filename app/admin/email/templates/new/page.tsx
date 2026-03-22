import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SectionHeader } from "@/components/ui/section-header";
import { requireRole } from "@/lib/auth";
import { createTemplate } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewTemplatePage() {
  await requireRole("admin");

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        eyebrow="E-post / Maler"
        title="Ny e-postmal"
        description="Bruk {{variabelNavn}} i emne og innhold for dynamisk personalisering."
      />

      <Card>
        <form action={createTemplate} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-ink" htmlFor="name">Malnavn</label>
            <Input id="name" name="name" placeholder="f.eks. Velkomstmail bedrift" required />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-ink" htmlFor="subject">Emne</label>
            <Input id="subject" name="subject" placeholder="f.eks. Velkommen til {{eventName}}" required />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-ink" htmlFor="html_body">HTML-innhold</label>
            <p className="text-xs text-ink/60">
              Bruk <code className="bg-surface rounded px-1">{"{{variabelNavn}}"}</code> for å sette inn dynamiske verdier, f.eks. <code className="bg-surface rounded px-1">{"{{firstName}}"}</code>, <code className="bg-surface rounded px-1">{"{{companyName}}"}</code>.
            </p>
            <textarea
              id="html_body"
              name="html_body"
              rows={12}
              required
              className="rounded-xl border border-primary/20 bg-surface px-4 py-3 text-sm font-mono text-ink focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="<p>Hei {{firstName}},</p><p>Velkommen til {{eventName}}!</p>"
            />
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="is_active" name="is_active" defaultChecked className="h-4 w-4" />
            <label className="text-sm font-medium text-ink" htmlFor="is_active">Aktiv</label>
          </div>

          <div className="flex gap-3">
            <Button type="submit">Opprett mal</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
