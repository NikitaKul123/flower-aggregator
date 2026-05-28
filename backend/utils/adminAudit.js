/**
 * @param {import('@prisma/client').PrismaClient} prisma
 */
export async function logAdminAudit(prisma, {
    actorUserId,
    action,
    entityType,
    entityId = null,
    message,
    meta = null
}) {
    await prisma.adminAuditLog.create({
        data: {
            actorUserId: Number(actorUserId),
            action,
            entityType,
            entityId: entityId != null ? Number(entityId) : null,
            message: String(message || '').slice(0, 500),
            meta: meta || undefined
        }
    });
}
