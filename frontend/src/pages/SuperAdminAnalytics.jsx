import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import SuperAdminLayout from '../components/SuperAdminLayout';
import {
    fetchSuperAdminAnalytics,
    downloadSuperAdminAnalyticsCsv
} from '../api/superAdminApi';
import { cardClass, btnSecondary } from '../utils/ui';

const CHART_HEIGHT = 160;

function formatChartLabel(dateStr, period) {
    if (!dateStr) return '';
    if (period === 'week') {
        const d = new Date(`${dateStr}T12:00:00`);
        return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    }
    return dateStr.slice(5);
}

function BarChart({ data, valueKey, period = 'day', colorClass = 'bg-violet-500' }) {
    if (!data?.length) {
        return <p className="text-sm text-gray-400 text-center py-16 mt-4">Нет данных за период</p>;
    }
    const values = data.map((d) => Number(d[valueKey]) || 0);
    const max = Math.max(...values, 1);
    return (
        <div className="flex items-end gap-0.5 sm:gap-1 mt-4" style={{ height: CHART_HEIGHT }}>
            {data.map((d, i) => {
                const val = values[i];
                const barHeight = val === 0 ? 0 : Math.max(4, (val / max) * CHART_HEIGHT);
                return (
                    <div key={d.date ?? i} className="flex-1 flex flex-col items-center justify-end h-full min-w-0">
                        <div
                            className={`w-full ${colorClass} rounded-t-md transition-all`}
                            style={{ height: barHeight }}
                            title={`${formatChartLabel(d.date, period)}: ${val.toLocaleString('ru-RU')}`}
                        />
                        <span className="text-[9px] text-gray-400 truncate w-full text-center mt-1 leading-tight">
                            {formatChartLabel(d.date, period)}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

function HorizontalBars({ items, valueKey = 'count', labelKey = 'label' }) {
    if (!items?.length) return <p className="text-sm text-gray-400 py-6">Нет данных</p>;
    const max = Math.max(...items.map((i) => i[valueKey]), 1);
    return (
        <ul className="space-y-3 mt-4">
            {items.map((item) => (
                <li key={item.status || item.label}>
                    <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700 truncate pr-2">{item[labelKey]}</span>
                        <span className="text-gray-500 shrink-0">{item[valueKey]}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-violet-500 rounded-full"
                            style={{ width: `${(item[valueKey] / max) * 100}%` }}
                        />
                    </div>
                </li>
            ))}
        </ul>
    );
}

function DeltaBadge({ value }) {
    if (value == null || value === 0) return null;
    const up = value > 0;
    return (
        <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                up ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}
        >
            {up ? '↑' : '↓'} {Math.abs(value)}%
        </span>
    );
}

function StatCard({ label, value, hint, delta }) {
    return (
        <div className={`${cardClass} p-4 sm:p-5`}>
            <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-gray-500">{label}</p>
                <DeltaBadge value={delta} />
            </div>
            <p className="text-xl sm:text-2xl font-bold mt-1 text-violet-600">{value}</p>
            {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
        </div>
    );
}

function InsightList({ insights }) {
    if (!insights?.length) return null;
    const styles = {
        success: 'border-green-200 bg-green-50 text-green-800',
        warning: 'border-amber-200 bg-amber-50 text-amber-900',
        info: 'border-blue-200 bg-blue-50 text-blue-900'
    };
    return (
        <ul className="space-y-3">
            {insights.map((tip, i) => (
                <li
                    key={i}
                    className={`text-sm px-4 py-3 rounded-xl border ${styles[tip.type] || styles.info}`}
                >
                    {tip.text}
                </li>
            ))}
        </ul>
    );
}

function ShopTable({ title, shops, emptyText }) {
    if (!shops?.length) {
        return (
            <div className={`${cardClass} p-5`}>
                <h3 className="font-semibold mb-2">{title}</h3>
                <p className="text-sm text-gray-400">{emptyText}</p>
            </div>
        );
    }
    return (
        <div className={`${cardClass} p-5 overflow-x-auto`}>
            <h3 className="font-semibold mb-4">{title}</h3>
            <table className="w-full text-sm">
                <thead>
                    <tr className="text-left text-gray-500 border-b">
                        <th className="pb-2 pr-4">Магазин</th>
                        <th className="pb-2 pr-4 text-right">Заказы</th>
                        <th className="pb-2 pr-4 text-right">Оборот</th>
                        <th className="pb-2 text-right">Ср. чек</th>
                    </tr>
                </thead>
                <tbody>
                    {shops.map((s) => (
                        <tr key={s.shopId} className="border-b border-gray-50 last:border-0">
                            <td className="py-2 pr-4 font-medium text-gray-800">{s.shopName}</td>
                            <td className="py-2 pr-4 text-right text-gray-600">{s.orders}</td>
                            <td className="py-2 pr-4 text-right text-violet-600 font-medium">
                                {s.revenue.toLocaleString('ru-RU')} ₽
                            </td>
                            <td className="py-2 text-right text-gray-500">
                                {s.avgCheck ? `${s.avgCheck.toLocaleString('ru-RU')} ₽` : '—'}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <p className="text-xs text-gray-400 mt-3">
                Комиссия платформы — в настройках магазина (скоро в отчётах).
            </p>
        </div>
    );
}

export default function SuperAdminAnalytics() {
    const { token } = useContext(AuthContext);
    const [period, setPeriod] = useState('day');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        if (!token) return;
        setLoading(true);
        setError(null);
        fetchSuperAdminAnalytics(token, { period })
            .then(setData)
            .catch((err) => {
                setError(err.response?.data?.error || 'Не удалось загрузить аналитику');
                setData(null);
            })
            .finally(() => setLoading(false));
    }, [token, period]);

    const handleExport = async () => {
        if (!token || exporting) return;
        setExporting(true);
        try {
            const blob = await downloadSuperAdminAnalyticsCsv(token, { period });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `platform-analytics-${data?.range?.from || 'export'}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            alert(err.response?.data?.error || 'Ошибка экспорта');
        } finally {
            setExporting(false);
        }
    };

    const s = data?.summary;
    const rangeLabel = data?.range
        ? `${data.range.from} — ${data.range.to}`
        : '30 дней';

    return (
        <SuperAdminLayout title="Аналитика платформы">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <p className="text-sm text-gray-500">
                    Сводка по всем магазинам · {rangeLabel} · сравнение с предыдущим периодом
                </p>
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => setPeriod('day')}
                        className={`${btnSecondary} px-4 py-2 text-sm ${period === 'day' ? 'ring-2 ring-violet-500' : ''}`}
                    >
                        По дням
                    </button>
                    <button
                        type="button"
                        onClick={() => setPeriod('week')}
                        className={`${btnSecondary} px-4 py-2 text-sm ${period === 'week' ? 'ring-2 ring-violet-500' : ''}`}
                    >
                        По неделям
                    </button>
                    <button
                        type="button"
                        onClick={handleExport}
                        disabled={exporting || loading}
                        className={`${btnSecondary} px-4 py-2 text-sm`}
                    >
                        {exporting ? 'Экспорт…' : 'CSV для бухгалтерии'}
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-20 text-gray-500">Загрузка…</div>
            ) : error ? (
                <div className="text-center py-20 text-red-600">{error}</div>
            ) : (
                <div className="space-y-8">
                    {data?.insights?.length > 0 && (
                        <section className={`${cardClass} p-6`}>
                            <h2 className="font-semibold text-lg mb-4">Рекомендации</h2>
                            <InsightList insights={data.insights} />
                        </section>
                    )}

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <StatCard
                            label="Оборот"
                            value={`${Number(s?.revenue || 0).toLocaleString('ru-RU')} ₽`}
                            delta={s?.revenueDelta}
                        />
                        <StatCard
                            label="Заказов"
                            value={s?.totalOrders ?? 0}
                            delta={s?.ordersDelta}
                        />
                        <StatCard
                            label="Средний чек"
                            value={`${Number(s?.avgCheck || 0).toLocaleString('ru-RU')} ₽`}
                            hint="по доставленным"
                        />
                        <StatCard
                            label="Конверсия"
                            value={`${data?.conversion?.conversionRate ?? 0}%`}
                            hint={`${data?.conversion?.buyersInPeriod ?? 0} из ${data?.conversion?.totalCustomers ?? 0} клиентов`}
                        />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <StatCard
                            label="Отмены"
                            value={`${s?.cancelRate ?? 0}%`}
                            hint={`${s?.cancelled ?? 0} заказов`}
                        />
                        <StatCard
                            label="Не дозвонились"
                            value={`${s?.noContactRate ?? 0}%`}
                            hint={`${s?.noContact ?? 0} заказов`}
                        />
                        <StatCard
                            label="Доставка"
                            value={`${s?.deliveryShare ?? 0}%`}
                            hint={`${s?.deliveryOrders ?? 0} заказов`}
                        />
                        <StatCard
                            label="Самовывоз"
                            value={s?.pickupOrders ?? 0}
                            hint="заказов"
                        />
                    </div>

                    <div className={`${cardClass} p-6`}>
                        <h2 className="font-semibold text-lg mb-1">Динамика заказов</h2>
                        <p className="text-sm text-gray-500 mb-2">Рост платформы · {period === 'week' ? '12 недель' : '30 дней'}</p>
                        <BarChart data={data?.chart} valueKey="orders" period={period} />
                    </div>

                    <div className={`${cardClass} p-6`}>
                        <h2 className="font-semibold text-lg mb-1">Оборот по времени</h2>
                        <BarChart
                            data={data?.chart}
                            valueKey="revenue"
                            period={period}
                            colorClass="bg-violet-400"
                        />
                    </div>

                    <div className="grid lg:grid-cols-2 gap-6">
                        <ShopTable title="Топ магазинов по обороту" shops={data?.shopsTop} emptyText="Нет заказов" />
                        <ShopTable
                            title="Аутсайдеры"
                            shops={data?.shopsBottom}
                            emptyText="Все магазины с заказами в топе"
                        />
                    </div>

                    <div className="grid lg:grid-cols-2 gap-6">
                        <div className={`${cardClass} p-6`}>
                            <h2 className="font-semibold text-lg">Статусы заказов</h2>
                            <HorizontalBars
                                items={data?.statusBreakdown}
                                valueKey="count"
                                labelKey="label"
                            />
                        </div>
                        <div className={`${cardClass} p-6`}>
                            <h2 className="font-semibold text-lg">Доставка vs самовывоз</h2>
                            <HorizontalBars items={data?.fulfillment} valueKey="count" labelKey="label" />
                        </div>
                    </div>
                </div>
            )}
        </SuperAdminLayout>
    );
}
