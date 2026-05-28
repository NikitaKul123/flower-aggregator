// backend/data.js
export const shops = [
    {
        id: 1,
        name: "Цветочный Рай",
        address: "ул. Ленина, 45",
        phone: "+7 (999) 123-45-67",
        rating: 4.8,
        deliveryTime: "45-60 мин"
    },
    {
        id: 2,
        name: "Bloom House",
        address: "пр. Мира, 112",
        phone: "+7 (999) 765-43-21",
        rating: 4.6,
        deliveryTime: "30-50 мин"
    },
    {
        id: 3,
        name: "Розовая ФантазияЯ",
        address: "ул. Пушкина, 78",
        phone: "+7 (999) 111-22-33",
        rating: 4.9,
        deliveryTime: "60-90 мин"
    }
];

export const products = [
    {
        id: 101,
        shopId: 1,
        name: "Букет из 25 красных роз",
        price: 3490,
        category: "Розы",
        image: "https://picsum.photos/id/1015/800/800",
        images: [
            "https://picsum.photos/id/1015/800/800",
            "https://picsum.photos/id/1016/800/800",
            "https://picsum.photos/id/1018/800/800"
        ],
        description: "Классический роскошный букет из 25 крупных красных роз."
    },
    {
        id: 102,
        shopId: 1,
        name: "Нежные тюльпаны микс",
        price: 1890,
        category: "Тюльпаны",
        image: "https://picsum.photos/id/201/800/800",
        images: [
            "https://picsum.photos/id/201/800/800",
            "https://picsum.photos/id/202/800/800",
            "https://picsum.photos/id/203/800/800"
        ],
        description: "Яркий весенний букет из разноцветных тюльпанов."
    },
    {
        id: 103,
        shopId: 1,
        name: "Пионы и ранункулюсы",
        price: 4290,
        category: "Премиум",
        image: "https://picsum.photos/id/133/800/800",
        images: [
            "https://picsum.photos/id/133/800/800",
            "https://picsum.photos/id/134/800/800",
            "https://picsum.photos/id/180/800/800"
        ],
        description: "Нежный и очень объёмный букет с пионами и ранункулюсами."
    },
    {
        id: 201,
        shopId: 2,
        name: "Монблан",
        price: 4590,
        category: "Премиум",
        image: "https://picsum.photos/id/251/800/800",
        images: [
            "https://picsum.photos/id/251/800/800",
            "https://picsum.photos/id/252/800/800",
            "https://picsum.photos/id/253/800/800"
        ],
        description: "Премиальный букет с белыми пионами, эустомой и гипсофилой."
    },
    {
        id: 202,
        shopId: 2,
        name: "Коробка счастья",
        price: 3290,
        category: "В коробке",
        image: "https://picsum.photos/id/180/800/800",
        images: [
            "https://picsum.photos/id/180/800/800",
            "https://picsum.photos/id/181/800/800",
            "https://picsum.photos/id/182/800/800"
        ],
        description: "Стильная подарочная коробка с розами и декоративными элементами."
    },
    {
        id: 301,
        shopId: 3,
        name: "Лавандовое поле",
        price: 2790,
        category: "Сухоцветы",
        image: "https://picsum.photos/id/312/800/800",
        images: [
            "https://picsum.photos/id/312/800/800",
            "https://picsum.photos/id/313/800/800",
            "https://picsum.photos/id/314/800/800"
        ],
        description: "Нежный букет с лавандой, эвкалиптом и хлопком."
    },
    {
        id: 302,
        shopId: 3,
        name: "Букет из 51 розы",
        price: 5890,
        category: "Розы",
        image: "https://picsum.photos/id/1015/800/800",
        images: [
            "https://picsum.photos/id/1015/800/800",
            "https://picsum.photos/id/1016/800/800",
            "https://picsum.photos/id/1017/800/800",
            "https://picsum.photos/id/1018/800/800"
        ],
        description: "Большой роскошный букет из 51 розы — идеальный подарок."
    },
    {
        id: 303,
        shopId: 3,
        name: "Орхидеи и розы",
        price: 4990,
        category: "Премиум",
        image: "https://picsum.photos/id/401/800/800",
        images: [
            "https://picsum.photos/id/401/800/800",
            "https://picsum.photos/id/402/800/800",
            "https://picsum.photos/id/403/800/800"
        ],
        description: "Элегантная композиция с белыми орхидеями и розами."
    },
    {
        id: 401,
        shopId: 2,
        name: "Солнечная поляна",
        price: 2590,
        category: "Микс",
        image: "https://picsum.photos/id/670/800/800",
        images: [
            "https://picsum.photos/id/670/800/800",
            "https://picsum.photos/id/671/800/800",
            "https://picsum.photos/id/672/800/800"
        ],
        description: "Яркий и позитивный букет с герберами, хризантемами и альстромерией."
    }
];