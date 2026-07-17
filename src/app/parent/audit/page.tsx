import { requireParent } from "@/lib/auth";
import { db, schema } from "@/db";
import { desc, eq, getTableColumns } from "drizzle-orm";
import { Card, PageTitle } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  await requireParent();
  const rows = db
    .select({ ...getTableColumns(schema.auditLog), actorName: schema.users.name })
    .from(schema.auditLog)
    .leftJoin(schema.users, eq(schema.auditLog.actorId, schema.users.id))
    .orderBy(desc(schema.auditLog.createdAt), desc(schema.auditLog.id))
    .limit(200)
    .all();
  return (
    <div>
      <PageTitle emoji="📋" title="Audit log" sub="Every action, recorded. The bank hides nothing." />
      <div className="space-y-1.5">
        {rows.length === 0 && <Card className="text-muted text-sm font-semibold">Nothing yet.</Card>}
        {rows.map((row) => (
          <Card key={row.id} className="!p-3 text-sm flex items-baseline gap-2 flex-wrap">
            <span className="text-muted text-xs tabular-nums shrink-0">
              {new Date(row.createdAt).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <span className="font-semibold">{row.actorName ?? "system"}</span>
            <span className="font-bold text-[var(--lavender-deep)]">{row.action}</span>
            <span className="text-muted">
              {row.entity}
              {row.entityId ? ` #${row.entityId}` : ""}
            </span>
            {row.detail && (
              <code className="text-xs text-muted font-semibold break-all">{row.detail}</code>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
