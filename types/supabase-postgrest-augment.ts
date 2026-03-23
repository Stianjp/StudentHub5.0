// @ts-nocheck
import "@supabase/postgrest-js";

declare module "@supabase/postgrest-js" {
  interface PostgrestFilterBuilder<
    ClientOptions extends ClientServerOptions,
    Schema extends GenericSchema,
    Row extends Record<string, unknown>,
    Result,
    RelationName = unknown,
    Relationships = unknown,
    Method = unknown,
  > {
    eq(column: string, value: unknown): this;
  }

  interface PostgrestQueryBuilder<
    ClientOptions extends ClientServerOptions,
    Schema extends GenericSchema,
    Relation extends GenericTable | GenericView,
    RelationName = unknown,
    Relationships = Relation extends { Relationships: infer R } ? R : unknown,
  > {
    insert(values: Record<string, unknown> | Array<Record<string, unknown>>, options?: { count?: "exact" | "planned" | "estimated"; defaultToNull?: boolean }): any;
    upsert(
      values: Record<string, unknown> | Array<Record<string, unknown>>,
      options?: {
        onConflict?: string;
        ignoreDuplicates?: boolean;
        count?: "exact" | "planned" | "estimated";
        defaultToNull?: boolean;
      },
    ): any;
    update(values: Record<string, unknown>, options?: { count?: "exact" | "planned" | "estimated" }): any;
  }
}

export {};
