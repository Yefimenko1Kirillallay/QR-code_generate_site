import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { createCanvas, loadImage } from "canvas";
import sqlite3 from "sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";
import QRCode from "qrcode";
import multer from "multer";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 4000;

const DB_PATH = path.join(__dirname, "db.sqlite");
const LOGOS_DIR = path.join(__dirname, "logos");

// Middleware
app.use(helmet());
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());
app.use("/logos", express.static(LOGOS_DIR, {
  setHeaders: res => res.setHeader("Access-Control-Allow-Origin", "http://localhost:5173")
}));

// Проверка/создание БД
if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, "");
const db = new sqlite3.Database(DB_PATH, err => {
  if (err) { console.error(err); process.exit(1); }
  db.run(`CREATE TABLE IF NOT EXISTS history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId TEXT,
    text TEXT NOT NULL,
    date TEXT NOT NULL,
    params TEXT,
    active INTEGER DEFAULT 1
  )`);
});

// Назначение userId через cookie
app.use((req, res, next) => {
  let uid = req.cookies.userId;
  if (!uid) {
    uid = uuidv4();
    res.cookie("userId", uid, { httpOnly: true, sameSite: "lax" });
  }
  req.userId = uid;
  next();
});

// Получаем список локальных логотипов
app.get("/api/logos", (req, res) => {
  fs.readdir(LOGOS_DIR, (err, files) => {
    if (err) return res.status(500).send("Ошибка чтения логотипов");
    const logos = files.filter(f => /\.(png|jpe?g|svg)$/i.test(f))
      .map(f => `http://localhost:4000/logos/${f}`);
    res.json(["none", ...logos]);
  });
});

// Загрузка логотипа
const storage = multer.diskStorage({
  destination: LOGOS_DIR,
  filename: (req, file, cb) => cb(null, file.originalname)
});
const upload = multer({ storage });
app.post("/api/upload-logo", upload.single("logo"), (req, res) => {
  if (!req.file) return res.status(400).send("Файл не загружен");
  res.json({ url: `http://localhost:4000/logos/${req.file.filename}` });
});

// Генерация QR-кода
app.post("/api/generate", async (req, res) => {
  const { text, color = "#000000", size = 256, logo } = req.body;
  if (!text || typeof text !== "string") return res.status(400).send("Некорректный текст");

  try {
    const canvas = createCanvas(size, size);
    await QRCode.toCanvas(canvas, text, { width: size, color: { dark: color, light: "#fff" } });

    if (logo && logo !== "none") {
      const ctx = canvas.getContext("2d");
      const logoSize = size * 0.2;
      let imgBuffer;

      if (logo.startsWith("data:image/svg+xml")) {
        // Конвертация Base64 SVG в PNG
        const svgBase64 = logo.split(",")[1];
        const svgBuffer = Buffer.from(svgBase64, "base64");
        imgBuffer = await sharp(svgBuffer).png().toBuffer();
      } else if (logo.startsWith("data:image/")) {
        // Base64 PNG/JPG
        const base64Data = logo.split(",")[1];
        imgBuffer = Buffer.from(base64Data, "base64");
      } else {
        // Локальные файлы из /logos
        const logoPath = path.join(LOGOS_DIR, path.basename(logo));
        if (!fs.existsSync(logoPath)) throw new Error("Логотип не найден");
        if (path.extname(logoPath).toLowerCase() === ".svg") {
          imgBuffer = await sharp(logoPath).png().toBuffer();
        } else {
          imgBuffer = fs.readFileSync(logoPath);
        }
      }

      if (imgBuffer) {
        const img = await loadImage(imgBuffer);
        ctx.drawImage(img, (size - logoSize) / 2, (size - logoSize) / 2, logoSize, logoSize);
      }
    }

    const dataUrl = canvas.toDataURL();
    const now = new Date().toISOString();
    db.run("INSERT INTO history (userId, text, date, params) VALUES (?, ?, ?, ?)",
      [req.userId, text, now, JSON.stringify({ color, size, logo })]);

    res.json({ base64: dataUrl });
  } catch (err) {
    console.error(err);
    res.status(500).send("Ошибка генерации QR");
  }
});

// История
app.post("/api/history", (req, res) => {
  db.all("SELECT * FROM history WHERE userId=? AND active=1 ORDER BY id DESC LIMIT 50",
    [req.userId], (err, rows) => {
      if (err) return res.status(500).send("Ошибка БД");
      res.json(rows);
    });
});

// Очистка истории
app.post("/api/clear-history", (req, res) => {
  db.run("UPDATE history SET active=0 WHERE userId=?", [req.userId], function (err) {
    if (err) return res.status(500).send("Ошибка очистки истории");
    res.json({ success: true, changed: this.changes });
  });
});

app.get("/health", (_, res) => res.json({ ok: true }));

app.listen(PORT, () => console.log(`🚀 Сервер запущен на http://localhost:${PORT}`));
