import { db, schema } from "@/db";

export function audit(
  actorId: number | null,
  action: string,
  entity: string,
  entityId: number | null,
  detail?: unknown
) {
  db.insert(schema.auditLog)
    .values({
      actorId,
      action,
      entity,
      entityId,
      detail: detail === undefined ? null : JSON.stringify(detail),
      createdAt: Date.now(),
    })
    .run();
}
