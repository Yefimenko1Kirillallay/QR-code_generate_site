# 🚀 QR Code Generator — Fullstack App (Node.js + React)

Интерактивный генератор QR-кодов с возможностью:
- 🎨 Изменять цвет и размер
- 🖼️ Добавлять логотип (из папки или свой)
- 🧠 Сохранять историю в SQLite
- 🔗 Поделиться QR-кодом или скопировать в буфер обмена
- 📱 Полностью адаптивный интерфейс

---

## 🧩 Технологии проекта

### Frontend:
- ⚛️ **React + Vite**
- 💅 **CSS3 / Flexbox / адаптивность**
- 📦 **Axios** для запросов к серверу

### Backend:
- 🧠 **Node.js + Express**
- 💾 **SQLite3** — хранение истории
- 🧱 **Canvas + QRCode + Sharp** — генерация QR с логотипом
- 🧰 **Multer** — загрузка логотипов

---

## 📁 Структура проекта

project-root/
│
├─ frontend/ # Клиент (React + Vite)
│ ├─ src/
│ ├─ dist/
│ └─ package.json
│
├─ backend/ # Сервер (Node.js + Express)
│ ├─ logos/ # Логотипы
│ ├─ db.sqlite # База данных истории
│ └─ server.js
│
├─ .gitignore
└─ README.md

---

## ⚙️ Установка и запуск

### 1️⃣ Клонируем репозиторий
git clone https://github.com/your-username/qr-generator.git
cd qr-generator

### 2️⃣ Устанавливаем зависимости
Backend
cd backend
npm install
Frontend
cd ../frontend
npm install

### 3️⃣ Запускаем проект
🖥️ Запуск backend:
cd backend
node server.js
Сервер запустится на:
http://localhost:4000

💻 Запуск frontend:
cd frontend
npm run dev
http://localhost:5173

### 4️⃣ Использование
Введи текст для генерации QR-кода.

Настрой цвет и размер.

Выбери логотип или загрузи свой.

Нажми «Сгенерировать QR».

Можно скачать, скопировать или поделиться изображением.
