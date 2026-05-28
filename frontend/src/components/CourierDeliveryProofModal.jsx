import { useRef, useState } from 'react';
import { btnPink, btnSecondary } from '../utils/ui';

export default function CourierDeliveryProofModal({ orderId, onClose, onSubmit, submitting }) {
    const [photoPreview, setPhotoPreview] = useState(null);
    const [photoBase64, setPhotoBase64] = useState(null);
    const [recipientName, setRecipientName] = useState('');
    const canvasRef = useRef(null);
    const drawing = useRef(false);

    const readFile = (file) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            setPhotoPreview(reader.result);
            setPhotoBase64(reader.result);
        };
        reader.readAsDataURL(file);
    };

    const getCanvasPoint = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches?.[0];
        const clientX = touch ? touch.clientX : e.clientX;
        const clientY = touch ? touch.clientY : e.clientY;
        return {
            x: ((clientX - rect.left) / rect.width) * canvas.width,
            y: ((clientY - rect.top) / rect.height) * canvas.height
        };
    };

    const startDraw = (e) => {
        e.preventDefault();
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;
        drawing.current = true;
        const { x, y } = getCanvasPoint(e);
        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    const draw = (e) => {
        if (!drawing.current) return;
        e.preventDefault();
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx) return;
        const { x, y } = getCanvasPoint(e);
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#111827';
        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const endDraw = (e) => {
        if (e) e.preventDefault();
        drawing.current = false;
    };

    const clearSignature = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx || !canvas) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    const hasSignature = () => {
        const canvas = canvasRef.current;
        if (!canvas) return false;
        const ctx = canvas.getContext('2d');
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        for (let i = 3; i < data.length; i += 4) {
            if (data[i] > 0) return true;
        }
        return false;
    };

    const handleSubmit = () => {
        if (!photoBase64) {
            alert('Сделайте или загрузите фото доставки');
            return;
        }
        const signatureBase64 = hasSignature() ? canvasRef.current.toDataURL('image/png') : null;
        onSubmit({ photoBase64, signatureBase64, recipientName: recipientName.trim() });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 sm:p-6">
                <div className="flex justify-between items-start gap-3 mb-4">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Подтверждение доставки</h2>
                        <p className="text-sm text-gray-500 mt-1">Заказ №{orderId}</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                        aria-label="Закрыть"
                    >
                        ×
                    </button>
                </div>

                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Фото «доставлено» <span className="text-pink-600">*</span>
                </label>
                <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="block w-full text-sm text-gray-600 mb-3"
                    onChange={(e) => readFile(e.target.files?.[0])}
                />
                {photoPreview && (
                    <img
                        src={photoPreview}
                        alt="Фото доставки"
                        className="w-full max-h-40 object-cover rounded-xl border border-gray-200 mb-4"
                    />
                )}

                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Подпись получателя
                </label>
                <div className="border border-gray-200 rounded-xl overflow-hidden bg-white mb-2">
                    <canvas
                        ref={canvasRef}
                        width={400}
                        height={140}
                        className="w-full touch-none cursor-crosshair"
                        onMouseDown={startDraw}
                        onMouseMove={draw}
                        onMouseUp={endDraw}
                        onMouseLeave={endDraw}
                        onTouchStart={startDraw}
                        onTouchMove={draw}
                        onTouchEnd={endDraw}
                    />
                </div>
                <button
                    type="button"
                    onClick={clearSignature}
                    className={`${btnSecondary} text-xs px-3 py-1.5 mb-4`}
                >
                    Очистить подпись
                </button>

                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Имя получателя (необязательно)
                </label>
                <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="Как подписался на заказе"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mb-5"
                />

                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        disabled={submitting}
                        onClick={handleSubmit}
                        className={`${btnPink} flex-1 min-w-[140px] py-2.5 text-sm disabled:opacity-60`}
                    >
                        {submitting ? 'Сохранение…' : 'Подтвердить доставку'}
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className={`${btnSecondary} px-4 py-2.5 text-sm`}
                    >
                        Отмена
                    </button>
                </div>
            </div>
        </div>
    );
}
