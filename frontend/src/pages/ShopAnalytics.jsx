import { useContext, useEffect, useState } from "react";

import { Link } from "react-router-dom";

import { AuthContext } from "../context/AuthContext";

import ShopAuthGate from "../components/ShopAuthGate";

import { fetchShopAnalytics } from "../api/shopAdminApi";

import { cardClass, pageTitleClass, btnSecondary } from "../utils/ui";

const CHART_HEIGHT = 160;

function formatChartLabel(dateStr, period) {
  if (!dateStr) return "";

  if (period === "week") {
    const d = new Date(`${dateStr}T12:00:00`);

    return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  }

  return dateStr.slice(5);
}

function BarChart({
  data,
  valueKey,
  labelKey = "date",
  period = "day",
  colorClass = "bg-pink-500",
}) {
  if (!data?.length) {
    return (
      <p className="text-sm text-gray-400 text-center py-16 mt-4">
        Нет данных за период
      </p>
    );
  }

  const values = data.map((d) => Number(d[valueKey]) || 0);

  const max = Math.max(...values, 1);

  return (
    <div
      className="flex items-end gap-0.5 sm:gap-1 mt-4"
      style={{ height: CHART_HEIGHT }}
    >
      {data.map((d, i) => {
        const val = values[i];

        const barHeight =
          val === 0 ? 0 : Math.max(4, (val / max) * CHART_HEIGHT);

        return (
          <div
            key={d[labelKey] ?? i}
            className="flex-1 flex flex-col items-center justify-end h-full min-w-0"
          >
            <div
              className={`w-full ${colorClass} rounded-t-md transition-all`}
              style={{ height: barHeight }}
              title={`${formatChartLabel(d[labelKey], period)}: ${val.toLocaleString("ru-RU")}`}
            />

            <span className="text-[9px] text-gray-400 truncate w-full text-center mt-1 leading-tight">
              {formatChartLabel(d[labelKey], period)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function HorizontalBars({
  items,
  valueKey = "count",
  labelKey = "label",
  max: maxOverride,
}) {
  if (!items?.length) {
    return <p className="text-sm text-gray-400 py-6">Нет данных</p>;
  }

  const max = maxOverride ?? Math.max(...items.map((i) => i[valueKey]), 1);

  return (
    <ul className="space-y-3 mt-4">
      {items.map((item) => (
        <li key={item.status || item.category || item.label}>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-700 truncate pr-2">
              {item[labelKey]}
            </span>

            <span className="text-gray-500 shrink-0">
              {typeof item[valueKey] === "number" && valueKey === "revenue"
                ? `${item[valueKey].toLocaleString("ru-RU")} ₽`
                : item[valueKey]}
            </span>
          </div>

          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-pink-500 rounded-full transition-all"
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
        up ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
      }`}
    >
      {up ? "↑" : "↓"} {Math.abs(value)}%
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

      <p className="text-xl sm:text-2xl font-bold mt-1 text-pink-600">
        {value}
      </p>

      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

function InsightList({ insights }) {
  if (!insights?.length) return null;

  const styles = {
    success: "border-green-200 bg-green-50 text-green-800",

    warning: "border-amber-200 bg-amber-50 text-amber-900",

    info: "border-blue-200 bg-blue-50 text-blue-900",
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

function Stars({ rating }) {
  const full = Math.round(rating);

  return (
    <span className="text-amber-500" aria-label={`${rating} из 5`}>
      {"★".repeat(full)}

      <span className="text-gray-300">{"★".repeat(5 - full)}</span>
    </span>
  );
}

function ShopAnalytics() {
  const { token } = useContext(AuthContext);

  const [period, setPeriod] = useState("day");

  const [data, setData] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) return;

    setLoading(true);

    setError(null);

    fetchShopAnalytics(token, period)
      .then(setData)

      .catch((err) => {
        console.error(err);

        setError(err.response?.data?.error || "Не удалось загрузить аналитику");

        setData(null);
      })

      .finally(() => setLoading(false));
  }, [token, period]);

  const s = data?.summary;

  const windowLabel = data?.windowDays === 84 ? "12 недель" : "30 дней";

  return (
    <ShopAuthGate>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className={pageTitleClass}>📊 Аналитика</h1>

            <p className="text-sm text-gray-500 mt-1">
              Сводка за последние {windowLabel} · сравнение с предыдущим
              периодом
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPeriod("day")}
              className={`${btnSecondary} px-4 py-2 text-sm ${period === "day" ? "ring-2 ring-pink-500" : ""}`}
            >
              По дням
            </button>

            <button
              type="button"
              onClick={() => setPeriod("week")}
              className={`${btnSecondary} px-4 py-2 text-sm ${period === "week" ? "ring-2 ring-pink-500" : ""}`}
            >
              По неделям
            </button>

            <Link
              to="/shop/dashboard"
              className="text-pink-600 hover:underline text-sm self-center"
            >
              ← Дашборд
            </Link>
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
                <h2 className="font-semibold text-lg mb-4">💡 Рекомендации</h2>

                <InsightList insights={data.insights} />
              </section>
            )}

            <section>
              <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
                Продажи
              </h2>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <StatCard
                  label="Выручка"
                  value={`${(s?.revenue || 0).toLocaleString("ru-RU")} ₽`}
                  delta={s?.revenueChange}
                  hint={`Скидки: ${(s?.discountTotal || 0).toLocaleString("ru-RU")} ₽`}
                />

                <StatCard
                  label="Заказов"
                  value={s?.totalOrders ?? 0}
                  delta={s?.ordersChange}
                />

                <StatCard
                  label="Средний чек"
                  value={`${(s?.avgCheck || 0).toLocaleString("ru-RU")} ₽`}
                />

                <StatCard
                  label="Доставлено"
                  value={s?.deliveredOrders ?? 0}
                  hint={`Отмен: ${s?.cancelledOrders ?? 0} (${s?.cancelRate ?? 0}%)`}
                />
              </div>
            </section>

            <section>
              <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
                Клиенты и качество
              </h2>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <StatCard
                  label="Покупателей"
                  value={s?.uniqueCustomers ?? 0}
                  hint={`Повторных: ${s?.repeatCustomers ?? 0} (${s?.repeatRate ?? 0}%)`}
                />

                <StatCard
                  label="Конверсия в работу"
                  value={`${s?.conversion ?? 0}%`}
                  hint="Не отменённые и не только «новые»"
                />

                <StatCard
                  label="Оценка магазина"
                  value={s?.avgRating != null ? `${s.avgRating} / 5` : "—"}
                  hint={
                    s?.reviewCount
                      ? `${s.reviewCount} отзыв(ов)`
                      : "Пока нет отзывов"
                  }
                />

                <StatCard
                  label="Промокоды"
                  value={`${s?.promoUsageRate ?? 0}%`}
                  hint={`${s?.promoOrders ?? 0} заказ(ов) со скидкой`}
                />
              </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className={`${cardClass} p-6`}>
                <h3 className="font-semibold">Заказы по времени</h3>

                <BarChart
                  data={data?.chart || []}
                  valueKey="orders"
                  period={period}
                />
              </div>

              <div className={`${cardClass} p-6`}>
                <h3 className="font-semibold">Выручка (₽)</h3>

                <BarChart
                  data={data?.chart || []}
                  valueKey="revenue"
                  period={period}
                  colorClass="bg-rose-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className={`${cardClass} p-6`}>
                <h3 className="font-semibold">Пиковые часы заказов</h3>

                <p className="text-xs text-gray-400 mt-1">
                  Когда клиенты чаще всего оформляют заказ
                </p>

                <BarChart
                  data={(data?.hourly || []).map((h) => ({
                    date: `${String(h.hour).padStart(2, "0")}:00`,

                    orders: h.orders,
                  }))}
                  valueKey="orders"
                  labelKey="date"
                  period="day"
                  colorClass="bg-violet-500"
                />
              </div>

              <div className={`${cardClass} p-6`}>
                <h3 className="font-semibold">Статусы заказов</h3>

                <HorizontalBars
                  items={data?.statusBreakdown || []}
                  valueKey="count"
                  labelKey="label"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className={`${cardClass} p-6`}>
                <h3 className="font-semibold">Способ получения</h3>

                <div className="mt-6 space-y-4">
                  {[
                    {
                      label: "🚚 Доставка",
                      count: s?.deliveryCount ?? 0,
                      color: "bg-pink-500",
                    },

                    {
                      label: "🏪 Самовывоз",
                      count: s?.pickupCount ?? 0,
                      color: "bg-rose-400",
                    },
                  ].map((row) => {
                    const total =
                      (s?.deliveryCount ?? 0) + (s?.pickupCount ?? 0) || 1;

                    const pct = Math.round((row.count / total) * 100);

                    return (
                      <div key={row.label}>
                        <div className="flex justify-between text-sm mb-1">
                          <span>{row.label}</span>

                          <span className="text-gray-500">
                            {row.count} ({pct}%)
                          </span>
                        </div>

                        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${row.color} rounded-full`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className={`${cardClass} p-6`}>
                <h3 className="font-semibold">Категории по выручке</h3>

                <HorizontalBars
                  items={(data?.categories || []).map((c) => ({
                    category: c.category,
                    label: c.category,
                    revenue: c.revenue,
                  }))}
                  valueKey="revenue"
                  labelKey="label"
                />

                <p className="text-xs text-gray-400 mt-4">
                  Помогает понять, какие направления приносят больше денег
                </p>
              </div>
            </div>

            <div className={`${cardClass} p-6 overflow-x-auto`}>
              <h3 className="font-semibold mb-4">Топ товаров</h3>

              {(data?.topProducts?.length ?? 0) === 0 ? (
                <p className="text-sm text-gray-400">
                  За период нет продаж по позициям
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                      <th className="pb-2 font-medium">Товар</th>

                      <th className="pb-2 font-medium text-right">Шт.</th>

                      <th className="pb-2 font-medium text-right">Выручка</th>
                    </tr>
                  </thead>

                  <tbody>
                    {data.topProducts.map((p, i) => (
                      <tr
                        key={p.productId || p.name}
                        className="border-b border-gray-50 last:border-0"
                      >
                        <td className="py-3 pr-4">
                          <span className="text-gray-400 mr-2">{i + 1}.</span>

                          {p.name}
                        </td>

                        <td className="py-3 text-right text-gray-600">
                          {p.quantity}
                        </td>

                        <td className="py-3 text-right font-medium text-pink-600">
                          {p.revenue.toLocaleString("ru-RU")} ₽
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className={`${cardClass} p-6`}>
                <h3 className="font-semibold">❤️ В избранном</h3>

                <p className="text-xs text-gray-400 mt-1">Интерес до покупки</p>

                {(data?.wishlistTop?.length ?? 0) === 0 ? (
                  <p className="text-sm text-gray-400 mt-4">
                    Пока никто не добавил товары
                  </p>
                ) : (
                  <ul className="mt-4 space-y-2">
                    {data.wishlistTop.map((w) => (
                      <li
                        key={w.productId}
                        className="flex justify-between text-sm"
                      >
                        <span className="truncate pr-2">{w.name}</span>

                        <span className="text-pink-600 shrink-0">
                          {w.count}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className={`${cardClass} p-6`}>
                <h3 className="font-semibold">🔔 Ждут поступления</h3>

                <p className="text-xs text-gray-400 mt-1">
                  Подписки на «нет в наличии»
                </p>

                {(data?.stockAlertsTop?.length ?? 0) === 0 ? (
                  <p className="text-sm text-gray-400 mt-4">
                    Нет активных подписок
                  </p>
                ) : (
                  <ul className="mt-4 space-y-2">
                    {data.stockAlertsTop.map((a) => (
                      <li
                        key={a.productId}
                        className="flex justify-between text-sm"
                      >
                        <span className="truncate pr-2">{a.name}</span>

                        <span className="text-amber-600 shrink-0">
                          {a.waiting} чел.
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className={`${cardClass} p-6`}>
                <h3 className="font-semibold">📦 Склад</h3>

                <p className="text-sm text-gray-600 mt-3">
                  Нет в наличии: <strong>{s?.outOfStockCount ?? 0}</strong>
                </p>

                {(data?.lowStock?.length ?? 0) > 0 ? (
                  <ul className="mt-4 space-y-2">
                    {data.lowStock.map((p) => (
                      <li
                        key={p.id}
                        className="flex justify-between text-sm text-amber-800"
                      >
                        <span className="truncate pr-2">{p.name}</span>

                        <span className="shrink-0">ост. {p.stock}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-400 mt-4">
                    Критически мало позиций нет
                  </p>
                )}

                <Link
                  to="/shop/products"
                  className="inline-block mt-4 text-sm text-pink-600 hover:underline"
                >
                  Управление товарами →
                </Link>
              </div>
            </div>

            {(data?.reviews?.length ?? 0) > 0 && (
              <section className={`${cardClass} p-6`}>
                <h3 className="font-semibold mb-4">Последние отзывы</h3>

                <ul className="space-y-4">
                  {data.reviews.map((r, i) => (
                    <li
                      key={i}
                      className="border-b border-gray-50 last:border-0 pb-4 last:pb-0"
                    >
                      <div className="flex items-center gap-2">
                        <Stars rating={r.rating} />

                        <span className="text-xs text-gray-400">
                          {new Date(r.createdAt).toLocaleDateString("ru-RU")}
                        </span>
                      </div>

                      {r.text && (
                        <p className="text-sm text-gray-700 mt-2">{r.text}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </div>
    </ShopAuthGate>
  );
}

export default ShopAnalytics;
