import { useState } from 'react';
import { saveOrderNotes } from '../api/shopAdminApi';
import { btnPink } from '../utils/ui';

export default function ShopOrderNotes({ token, order, onSaved }) {
    const [text, setText] = useState(order.shopNotes || '');
    const [saving, setSaving] = useState(false);

    const save = async () => {
        setSaving(true);
        try {
            const updated = await saveOrderNotes(token, order.id, text);
            onSaved?.(updated);
        } catch {
            alert('Не удалось сохранить заметку');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-amber-900 mb-2">
                Заметка по заказу (только для магазина)
            </p>
            <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                rows={3}
                placeholder="Например: позвонить за час, анонимная доставка…"
                className="w-full border border-amber-200 rounded-xl px-3 py-2 text-sm bg-white"
            />
            <button type="button" disabled={saving} onClick={save} className={`${btnPink} mt-2 px-4 py-2 text-sm`}>
                {saving ? '…' : 'Сохранить заметку'}
            </button>
        </div>
    );
}
