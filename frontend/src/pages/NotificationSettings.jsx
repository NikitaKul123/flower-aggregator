import { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { fetchNotificationSettings, saveNotificationSettings } from '../api/notificationsApi';
import { cardClass, pageTitleClass, btnPrimary, btnSecondary, labelClass, inputClass } from '../utils/ui';
import {
    requestBrowserNotificationPermission,
    getBrowserNotificationPermission,
    getBrowserPushPermissionLabel,
    isBrowserPushEnabledInApp,
    syncBrowserPushPreference,
    dispatchBrowserPushChanged
} from '../utils/browserNotify';

function NotificationSettings() {
    const { token, user } = useContext(AuthContext);
    const isShop = user?.role === 'SHOP_ADMIN';
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState('');
    const [browserMsg, setBrowserMsg] = useState('');
    const [browserPermission, setBrowserPermission] = useState(() => getBrowserNotificationPermission());
    const [pushEnabledInApp, setPushEnabledInApp] = useState(() => isBrowserPushEnabledInApp());

    const refreshBrowserPermission = () => {
        setBrowserPermission(getBrowserNotificationPermission());
    };

    useEffect(() => {
        if (!token) return;
        fetchNotificationSettings(token)
            .then(s => {
                setSettings(s);
                if (s.enableBrowserPush === false) {
                    syncBrowserPushPreference(false);
                } else if (s.enableBrowserPush === true) {
                    syncBrowserPushPreference(true);
                }
                setPushEnabledInApp(isBrowserPushEnabledInApp());
            })
            .finally(() => setLoading(false));
    }, [token]);

    useEffect(() => {
        refreshBrowserPermission();
        const onVis = () => refreshBrowserPermission();
        window.addEventListener('focus', onVis);
        return () => window.removeEventListener('focus', onVis);
    }, []);

    const toggle = (key) => {
        setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const applyPushEnabled = (enableBrowserPush) => {
        setSettings(prev => ({ ...prev, enableBrowserPush }));
        syncBrowserPushPreference(enableBrowserPush);
        setPushEnabledInApp(enableBrowserPush !== false);
        dispatchBrowserPushChanged(enableBrowserPush);
    };

    const savePushSetting = async (enableBrowserPush) => {
        applyPushEnabled(enableBrowserPush);
        try {
            const saved = await saveNotificationSettings(token, { enableBrowserPush });
            setSettings(prev => ({
                ...prev,
                ...saved,
                enableBrowserPush: saved.enableBrowserPush ?? enableBrowserPush
            }));
            if (saved.enableBrowserPush === false) {
                syncBrowserPushPreference(false);
            } else if (saved.enableBrowserPush === true) {
                syncBrowserPushPreference(true);
            }
        } catch (e) {
            console.error(e);
            throw e;
        }
    };

    const handleAllowPush = async () => {
        setBrowserMsg('');
        const permission = await requestBrowserNotificationPermission();
        refreshBrowserPermission();

        if (permission === 'unsupported') {
            setBrowserMsg('Браузер не поддерживает уведомления');
            return;
        }
        if (permission === 'denied') {
            setBrowserMsg(
                'Браузер отклонил уведомления. Разрешите их в настройках сайта (иконка замка в адресной строке → Уведомления).'
            );
            await savePushSetting(false);
            return;
        }
        if (permission === 'granted') {
            await savePushSetting(true);
            setBrowserMsg('Push включены: статус заказа и сообщения в чате');
            return;
        }
        setBrowserMsg('Разрешение не получено');
    };

    const handleDisablePush = async () => {
        setBrowserMsg('');
        try {
            await savePushSetting(false);
            setBrowserMsg(
                'Push отключены в приложении. Чтобы сбросить разрешение браузера: настройки сайта → Уведомления → Запретить.'
            );
        } catch {
            setBrowserMsg('Не удалось сохранить настройку');
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setMsg('');
        try {
            const saved = await saveNotificationSettings(token, settings);
            setSettings(saved);
            setMsg('Сохранено');
        } catch {
            setMsg('Ошибка сохранения');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="text-center py-20 text-gray-500">Загрузка...</div>;
    }

    return (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                <h1 className={pageTitleClass}>Настройки уведомлений</h1>
                <Link
                    to={isShop ? '/shop/notifications' : '/notifications'}
                    className="text-pink-600 hover:underline text-sm"
                >
                    ← К уведомлениям
                </Link>
            </div>

            <div className={`${cardClass} p-5 sm:p-8 space-y-6`}>
                <section>
                    <h2 className="font-semibold text-lg mb-4">События</h2>
                    <div className="space-y-3">
                        {[
                            ...(isShop
                                ? [
                                    { key: 'enableOrder', label: 'Новые заказы' },
                                    { key: 'enableChat', label: 'Сообщения в чате' },
                                    { key: 'enableStatus', label: 'Изменение статуса заказа' }
                                ]
                                : [
                                    { key: 'enableOrder', label: 'Заказы' },
                                    { key: 'enableChat', label: 'Сообщения в чате' },
                                    { key: 'enableStatus', label: 'Статус заказа' },
                                    { key: 'enableStock', label: 'Товар снова в наличии' },
                                    { key: 'enableShop', label: 'Новинки в магазинах (подписка)' }
                                ])
                        ].map(({ key, label }) => (
                            <label key={key} className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={!!settings[key]}
                                    onChange={() => toggle(key)}
                                />
                                <span>{label}</span>
                            </label>
                        ))}
                    </div>
                </section>

                <section>
                    <h2 className="font-semibold text-lg mb-4">Push в браузере</h2>
                    <p className="text-sm text-gray-600 mb-1">
                        Статус браузера: <strong>{getBrowserPushPermissionLabel(browserPermission)}</strong>
                    </p>
                    <p className="text-sm text-gray-600 mb-3">
                        В приложении:{' '}
                        <strong>
                            {pushEnabledInApp ? 'Включены' : 'Выключены'}
                        </strong>
                    </p>
                    <div className="flex flex-wrap gap-2 mb-3">
                        <button
                            type="button"
                            className={`${btnSecondary} px-4 py-2 text-sm`}
                            onClick={handleAllowPush}
                        >
                            Разрешить push
                        </button>
                        <button
                            type="button"
                            className={`${btnSecondary} px-4 py-2 text-sm border-red-200 text-red-700 hover:bg-red-50`}
                            onClick={handleDisablePush}
                        >
                            Запретить push
                        </button>
                    </div>
                    <p className="text-xs text-gray-500">
                        «Разрешить push» открывает системный запрос браузера (если вы ещё не отвечали).
                        Push по статусу — при «Изменение статуса», по чату — при «Сообщения в чате».
                        В открытом чате push не показывается.
                    </p>
                    {browserMsg && <p className="text-sm text-gray-600 mt-2">{browserMsg}</p>}
                </section>

                {!isShop && (
                    <section>
                        <h2 className="font-semibold text-lg mb-4">Email</h2>
                        <label className="flex items-center gap-3 cursor-pointer mb-3">
                            <input
                                type="checkbox"
                                checked={settings.enableEmail !== false}
                                onChange={() => toggle('enableEmail')}
                            />
                            <span>Email при смене статуса заказа</span>
                        </label>
                        <p className="text-sm text-gray-500">
                            Письмо дублирует уведомление в приложении. Для отправки настройте SMTP на сервере.
                        </p>
                    </section>
                )}

                <section>
                    <h2 className="font-semibold text-lg mb-4">Звук и режим</h2>
                    <label className="flex items-center gap-3 cursor-pointer mb-4">
                        <input
                            type="checkbox"
                            checked={!!settings.soundEnabled}
                            onChange={() => toggle('soundEnabled')}
                        />
                        <span>Звук при новом уведомлении</span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer mb-4">
                        <input
                            type="checkbox"
                            checked={!!settings.doNotDisturb}
                            onChange={() => toggle('doNotDisturb')}
                        />
                        <span>Не беспокоить</span>
                    </label>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>С</label>
                            <input
                                type="time"
                                value={settings.dndFrom || '22:00'}
                                onChange={(e) => setSettings({ ...settings, dndFrom: e.target.value })}
                                className={inputClass()}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>До</label>
                            <input
                                type="time"
                                value={settings.dndTo || '08:00'}
                                onChange={(e) => setSettings({ ...settings, dndTo: e.target.value })}
                                className={inputClass()}
                            />
                        </div>
                    </div>
                </section>

                <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className={`${btnPrimary} w-full py-3`}
                >
                    {saving ? 'Сохранение...' : 'Сохранить'}
                </button>

                {msg && <p className="text-center text-sm text-green-600">{msg}</p>}
            </div>
        </div>
    );
}

export default NotificationSettings;
