import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    // Создаём магазины
    const shop1 = await prisma.shop.upsert({
        where: { id: 1 },
        update: {},
        create: {
            id: 1,
            name: "Цветочный Рай",
            address: "ул. Ленина, 45",
            phone: "+7 (999) 123-45-67",
            rating: 4.8,
            deliveryTime: "45-60 мин",
        },
    });

    const shop2 = await prisma.shop.upsert({
        where: { id: 2 },
        update: {},
        create: {
            id: 2,
            name: "Bloom House",
            address: "пр. Мира, 112",
            phone: "+7 (999) 765-43-21",
            rating: 4.6,
            deliveryTime: "30-50 мин",
        },
    });

    const shop3 = await prisma.shop.upsert({
        where: { id: 3 },
        update: {},
        create: {
            id: 3,
            name: "Розовая Фантазия",
            address: "ул. Пушкина, 78",
            phone: "+7 (999) 111-22-33",
            rating: 4.9,
            deliveryTime: "60-90 мин",
        },
    });

    console.log('✅ Магазины созданы');

    // Добавляем товары (можно расширить)
    await prisma.product.createMany({
        data: [
            {
                name: "Букет из 25 красных роз",
                price: 3490,
                description: "Классический роскошный букет из 25 красных роз.",
                image: "https://picsum.photos/id/1015/800/800",
                images: ["https://picsum.photos/id/1015/800/800", "https://picsum.photos/id/1016/800/800"],
                category: "Розы",
                shopId: 1
            },
            {
                name: "Нежные тюльпаны микс",
                price: 1890,
                description: "Яркий весенний букет.",
                image: "https://picsum.photos/id/201/800/800",
                images: ["https://picsum.photos/id/201/800/800", "https://picsum.photos/id/202/800/800"],
                category: "Тюльпаны",
                shopId: 1
            },
            {
                name: "Монблан",
                price: 4590,
                description: "Премиальный букет с пионами.",
                image: "https://picsum.photos/id/133/800/800",
                images: ["https://picsum.photos/id/133/800/800", "https://picsum.photos/id/251/800/800"],
                category: "Премиум",
                shopId: 2
            }
        ],
        skipDuplicates: true,
    });

    console.log('✅ Товары добавлены');
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());