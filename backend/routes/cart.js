// backend/routes/cart.js
import { Router } from 'express';
const router = Router();

// In-memory корзина (для демонстрации, на сервере)
let cart = [];

router.get('/', (req, res) => {
    res.json(cart);
});

router.post('/add', (req, res) => {
    const product = req.body;
    cart.push({ ...product, cartId: Date.now() });
    res.status(201).json({ success: true, cart });
});

router.delete('/:cartId', (req, res) => {
    const { cartId } = req.params;
    cart = cart.filter(item => item.cartId !== parseInt(cartId));
    res.json({ success: true, cart });
});

router.delete('/', (req, res) => {
    cart = [];
    res.json({ success: true, message: 'Корзина очищена' });
});

export default router;