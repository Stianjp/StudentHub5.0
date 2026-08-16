import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { requireRole } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export default async function EmailTemplatesPage() {
  await requireRole("admin");

  const supabase = createAdminSupabaseClient();
  const { data: templates, error } = await supabase
    .from("email_templates")
    .select("*")
    .order("name");
  const typedTemplates = (templates ?? []) as Array<{
    id: string;
    name: string;
    subject: string;
    attachment_name: string | null;
    variables: string[];
    is_active: boolean;
  }>;

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        eyebrow="E-post"
        title="E-postmaler"
        description="Opprett og rediger maler med variabelsubstitusjon ({{variabelNavn}})."
        actions={
          <Link href="/admin/email/templates/new">
            <Button>+ Ny mal</Button>
          </Link>
        }
      />

      {error ? (
        <Card className="border border-warning/30 bg-warning/10 text-sm">
          <p className="font-semibold text-primary">Feil ved lasting av maler</p>
          <p className="mt-2">{error.message}</p>
        </Card>
      ) : typedTemplates.length === 0 ? (
        <Card className="text-sm text-ink/70">
          <p>Ingen maler opprettet ennå.</p>
          <p className="mt-1">
            <Link href="/admin/email/templates/new" className="text-primary underline">
              Opprett din første mal
            </Link>
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {typedTemplates.map((template) => (
            <Card key={template.id} className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-primary">{template.name}</span>
                  <Badge variant={template.is_active ? "success" : "default"}>
                    {template.is_active ? "Aktiv" : "Inaktiv"}
                  </Badge>
                </div>
                <p className="text-sm text-ink/70">{template.subject}</p>
                {template.attachment_name ? (
                  <p className="text-xs font-semibold text-[#D46839]">Vedlegg: {template.attachment_name}</p>
                ) : null}
                {template.variables.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {template.variables.map((v) => (
                      <span
                        key={v}
                        className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-mono text-primary"
                      >
                        {`{{${v}}}`}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex w-full shrink-0 gap-2 md:w-auto">
                <Link className="w-full md:w-auto" href={`/admin/email/templates/${template.id}`}>
                  <Button className="w-full md:w-auto" variant="ghost">Rediger</Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
