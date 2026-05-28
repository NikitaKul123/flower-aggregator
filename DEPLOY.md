# Деплой Flower Aggregator на Render (бесплатный тариф)

Стек: **React** (frontend) + **Node/Express** (backend) + **PostgreSQL** (Prisma).

## Что понадобится

1. Аккаунт [GitHub](https://github.com)
2. Аккаунт [Render](https://render.com) (можно войти через GitHub)
3. ~15–20 минут на первый деплой

> **Важно:** на бесплатном Render сервисы «засыпают» без трафика (первый запрос может идти 30–60 сек). Загруженные картинки в `backend/uploads/` при перезапуске **пропадают** — для продакшена позже лучше S3/Cloudinary.

---

## Шаг 1. Залить код на GitHub

В PowerShell из корня проекта:

```powershell
cd C:\Users\egor_\IdeaProjects\flower-aggregator

git add .
git status
git commit -m "Prepare flower-aggregator for Render deployment"
```

На GitHub: **New repository** → имя `flower-aggregator` → **без** README (репозиторий пустой).

Подставьте свой логин:

```powershell
git remote add origin https://github.com/ВАШ_ЛОГИН/flower-aggregator.git
git branch -M main
git push -u origin main
```

---

## Шаг 2. Деплой через Blueprint на Render

1. [dashboard.render.com](https://dashboard.render.com) → **New** → **Blueprint**
2. Подключите GitHub и выберите репозиторий `flower-aggregator`
3. Render прочитает `render.yaml` и создаст:
   - **flower-db** — PostgreSQL
   - **flower-api** — backend
   - **flower-web** — frontend (статика)
4. Нажмите **Apply**

Переменные `REACT_APP_API_URL`, `CORS_ORIGIN` и `APP_URL` подставятся автоматически из URL сервисов.

---

## Шаг 3. Начальные данные (опционально)

После успешного деплоя API, в Render откройте **flower-api** → **Shell** и выполните:

```bash
node prisma/seed.js
```

(если в проекте есть seed с тестовыми магазинами/товарами)

---

## Шаг 4. Проверка

| Сервис      | URL (пример)                          |
|-------------|----------------------------------------|
| Сайт        | `https://flower-web.onrender.com`      |
| API         | `https://flower-api.onrender.com`      |
| Health      | `https://flower-api.onrender.com/` → «работает» |

Откройте сайт, зарегистрируйте клиента или магазин.

---

## Локальная разработка (как раньше)

**Backend** (`backend/.env` по образцу `.env.example`):

```env
DATABASE_URL="postgresql://..."
JWT_SECRET="dev-secret"
```

```powershell
cd backend
npm install
npx prisma migrate deploy
npm run dev
```

**Frontend**:

```powershell
cd frontend
npm install
npm start
```

По умолчанию фронт ходит на `http://localhost:5000`.

---

## Ручная настройка (без Blueprint)

Если Blueprint не подходит, создайте вручную:

### PostgreSQL

- **New** → **PostgreSQL** → имя `flower-db`
- Скопируйте **Internal Database URL**

### Backend (Web Service)

| Поле          | Значение                                      |
|---------------|-----------------------------------------------|
| Root Directory| `backend`                                     |
| Build Command | `npm install && npm run build`                |
| Start Command | `npm start`                                   |

Environment:

| Key           | Value                                      |
|---------------|--------------------------------------------|
| `DATABASE_URL`| из PostgreSQL                              |
| `JWT_SECRET`  | длинная случайная строка                   |
| `NODE_ENV`    | `production`                               |
| `CORS_ORIGIN` | URL фронта, напр. `https://flower-web.onrender.com` |
| `APP_URL`     | тот же URL фронта                          |

### Frontend (Static Site)

| Поле          | Значение                    |
|---------------|-----------------------------|
| Root Directory| `frontend`                  |
| Build Command | `npm install && npm run build` |
| Publish Dir   | `build`                     |

Environment:

| Key                 | Value                          |
|---------------------|--------------------------------|
| `REACT_APP_API_URL` | URL API, напр. `https://flower-api.onrender.com` |

**Redirects:** добавьте rewrite `/*` → `/index.html` (для React Router).

---

## Push-уведомления и SMTP

На хостинге без HTTPS localhost push могут вести себя иначе. Для писем задайте в **flower-api** переменные `SMTP_*` из `backend/.env.example`.

---

## Обновление после изменений в коде

```powershell
git add .
git commit -m "Описание изменений"
git push
```

Render пересоберёт сервисы автоматически.
