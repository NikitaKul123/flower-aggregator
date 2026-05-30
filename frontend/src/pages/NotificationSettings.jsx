import { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { fetchNotificationSettings, saveNotificationSettings } from '../api/notificationsApi';
import { cardClass, pageTitleClass, btnPrimary, btnSecondary, labelClass, inputClass } from '../utils/ui';
import {
    getBrowserNotificationPermission,
    getBrowserPushPermissionLabel,
    isBrowserPushEnabledInApp,
    syncBrowserPushPreference,
    dispatchBrowserPushChanged
} from '../utils/browserNotify';
import {
    subscribeToWebPush,
    unsubscribeFromWebPush,
    isWebPushSupported,
    isWebPushSubscribedInApp,
    isLikelyIos,
    isStandalonePwa
} from '../utils/webPush';

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
        if (!isWebPushSupported()) {
            setBrowserMsg('Браузер не поддерживает Web Push. На iPhone: Safari → Поделиться → «На экран Домой», iOS 16.4+.');
            return;
        }

        try {
            const result = await subscribeToWebPush(token);
            refreshBrowserPermission();

            if (result.reason === 'denied') {
                setBrowserMsg(
                    'Уведомления запрещены. Разрешите в настройках сайта (замок в адресной строке) или iPhone → Уведомления.'
                );
                await savePushSetting(false);
                return;
            }
            if (result.reason === 'no-vapid') {
                setBrowserMsg('На сервере не настроены VAPID-ключи для push.');
                return;
            }
            if (!result.ok) {
                setBrowserMsg('Не удалось включить push. Попробуйте снова или установите сайт на домашний экран (iPhone).');
                return;
            }

            await savePushSetting(true);
            let msg = 'Push включены — уведомления придут даже когда сайт закрыт.';
            if (isLikelyIos() && !isStandalonePwa()) {
                msg += ' На iPhone: Safari → Поделиться → «На экран Домой», затем откройте с иконки.';
            }
            setBrowserMsg(msg);
        } catch (e) {
            console.error(e);
            setBrowserMsg('Ошибка подключения push');
        }
    };

    const handleDisablePush = async () => {
        setBrowserMsg('');
        try {
            await unsubscribeFromWebPush(token);
            await savePushSetting(false);
            refreshBrowserPermission();
            setBrowserMsg('Push отключены на этом устройстве.');
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
                            {pushEnabledInApp && isWebPushSubscribedInApp()
                                ? 'Push активны на устройстве'
                                : pushEnabledInApp
                                    ? 'Включены (нужна подписка)'
                                    : 'Выключены'}
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
                        Web Push приходит с сервера, даже если вкладка закрыта. «Разрешить push» — системный запрос и подписка устройства.
                        На iPhone надёжнее: установить на домашний экран (iOS 16.4+). Push по статусу — при «Изменение статуса», по чату — при «Сообщения в чате».
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
