import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { fetchSuperAdminAuditLog } from '../api/superAdminApi';
import SuperAdminLayout from '../components/SuperAdminLayout';
import { cardClass } from '../utils/ui';

export default function SuperAdminAudit() {
    const { token } = useContext(AuthContext);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!token) return;
        fetchSuperAdminAuditLog(token, 150)
            .then(setLogs)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [token]);

    return (
        <SuperAdminLayout title="Журнал действий">
            <p className="text-sm text-gray-500 mb-4">
                Кто и когда менял статусы, роли, магазины, отзывы и промо.
            </p>
            {loading ? (
                <p className="text-gray-500">Загрузка…</p>
            ) : (
                <div className={`${cardClass} divide-y`}>
                    {logs.map((log) => (
                        <div key={log.id} className="p-4 text-sm">
                            <div className="flex flex-wrap justify-between gap-2">
                                <span className="font-medium text-gray-900">{log.message}</span>
                                <span className="text-xs text-gray-400 shrink-0">
                                    {new Date(log.createdAt).toLocaleString('ru-RU')}
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                {log.actor?.name} ({log.actor?.email}) · {log.action}
                                {log.entityId != null && ` · ${log.entityType} #${log.entityId}`}
                            </p>
                        </div>
                    ))}
                    {logs.length === 0 && (
                        <p className="text-center text-gray-500 py-8">Записей пока нет</p>
                    )}
                </div>
            )}
        </SuperAdminLayout>
    );
}
