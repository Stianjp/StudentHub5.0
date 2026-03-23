import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SectionHeader } from "@/components/ui/section-header";
import { requireRole } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { updateTemplate, deleteTemplate } from "../actions";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ templateId: string }> };

export default async function EditTemplatePage({ params }: Props) {
  await requireRole("admin");

  const { templateId } = await params;
  const supabase = createAdminSupabaseClient();
  const { data: template } = await supabase
    .from("email_templates")
    .select("*")
    .eq("id", templateId)
    .single();

  if (!template) notFound();

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        eyebrow="E-post / Maler"
        title={`Rediger: ${template.name}`}
        description="Oppdater mal. Variabler oppdateres automatisk basert på innhold."
      />

      <Card>
        <form action={updateTemplate} className="flex flex-col gap-5">
          <input type="hidden" name="id" value={template.id} />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-ink" htmlFor="name">Malnavn</label>
            <Input id="name" name="name" defaultValue={template.name} required />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-ink" htmlFor="subject">Emne</label>
            <Input id="subject" name="subject" defaultValue={template.subject} required />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-ink" htmlFor="html_body">HTML-innhold</label>
            {template.variables.length > 0 && (
              <div className="flex flex-wrap gap-1">
                <span className="text-xs text-ink/60">Variabler:</span>
                {template.variables.map((v) => (
                  <span key={v} className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-mono text-primary">
                    {`{{${v}}}`}
                  </span>
                ))}
              </div>
            )}
            <textarea
              id="html_body"
              name="html_body"
              rows={12}
              required
              defaultValue={template.html_body}
              className="rounded-xl border border-primary/20 bg-surface px-4 py-3 text-sm font-mono text-ink focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              name="is_active"
              defaultChecked={template.is_active}
              className="h-4 w-4"
            />
            <label className="text-sm font-medium text-ink" htmlFor="is_active">Aktiv</label>
          </div>

          <Button type="submit">Lagre endringer</Button>
        </form>
      </Card>

      <Card className="border border-error/20 bg-error/5">
        <p className="text-sm font-semibold text-error">Slett mal</p>
        <p className="mt-1 text-xs text-ink/70">Kan ikke angres. Sendte e-poster bevares i loggen.</p>
        <form action={deleteTemplate} className="mt-3">
          <input type="hidden" name="id" value={template.id} />
          <Button type="submit" variant="danger">Slett mal</Button>
        </form>
      </Card>
    </div>
  );
}
