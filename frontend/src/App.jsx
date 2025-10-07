import { useState, useEffect } from "react";
import "./App.css";

export default function App() {
  const [text, setText] = useState("");
  const [color, setColor] = useState("#000");
  const [format, setFormat] = useState("png");
  const [size, setSize] = useState(256);
  const [qrCode, setQrCode] = useState(null);

  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  const [logo, setLogo] = useState("none");   // "none" для квадратика «Нет»
  const [customLogo, setCustomLogo] = useState(null);

  const logosModules = import.meta.glob("/src/logos/*.{png,jpg,jpeg,svg}", { eager: true, query: "?url", import: "default" });
  const defaultLogos = ["none", ...Object.values(logosModules)];

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const res = await fetch("http://localhost:4000/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include"
      });
      if (!res.ok) throw new Error("Ошибка загрузки истории");
      const data = await res.json();
      setHistory(data);
    } catch (err) { console.error(err); }
  };

  const handleLogoUpload = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      setCustomLogo(ev.target.result);
      setLogo(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  const generateQR = async () => {
    if (!text.trim()) return alert("Введите текст!");
    try {
      const res = await fetch("http://localhost:4000/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text, color, format, size, logo: logo === "none" ? null : logo })
      });
      if (!res.ok) throw new Error("Ошибка генерации QR");
      const data = await res.json();
      setQrCode(data.base64);
      await loadHistory();
    } catch (err) { console.error(err); }
  };

  const clearHistory = async () => {
    await fetch("http://localhost:4000/api/clear-history", { method: "POST", credentials: "include" });
    setHistory([]);
    setShowHistory(false);
  };

  const shareQR = async () => {
    if (!qrCode) return alert("Сначала сгенерируйте QR-код!");
    try {
      const res = await fetch(qrCode);
      const blob = await res.blob();
      const file = new File([blob], "qrcode.png", { type: blob.type });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "QR-код", text: "Мой QR-код" });
      } else if (navigator.clipboard) {
        await navigator.clipboard.write([new ClipboardItem({ [file.type]: file })]);
        alert("QR-код скопирован в буфер обмена!");
      } else {
        alert("Ваш браузер не поддерживает копирование изображения напрямую.");
      }
    } catch (err) {
      console.error(err);
      alert("Ошибка при копировании/шаринге QR-кода.");
    }
  };

  return (
    <div className="container">
      <div className="qr-box">
        <h1>Генератор QR-кодов</h1>
        <textarea placeholder="Введите текст" value={text} onChange={e => setText(e.target.value)} />

        <div className="row">
          <div>
            <label>Цвет:</label>
            <input type="color" value={color} onChange={e => setColor(e.target.value)} />
          </div>
          <div>
            <label>Формат:</label>
            <select value={format} onChange={e => setFormat(e.target.value)}>
              <option value="png">PNG</option>
              <option value="svg">SVG</option>
            </select>
          </div>
          <div>
            <label>Размер: {size}px</label>
            <input type="range" min={64} max={1024} value={size} onChange={e => setSize(+e.target.value)} />
          </div>
        </div>

        <div className="row">
          <div className="logo-picker">
            <label>Логотип:</label>
            <div className="logos">
              {defaultLogos.map(l => (
                <div
                  key={l}
                  className={`logo-item ${logo === l ? "selected" : ""}`}
                  onClick={() => setLogo(l)}
                >
                  {l === "none" ? <span>Нет</span> : <img src={l} alt="logo" />}
                </div>
              ))}
            </div>
            <label className="upload-btn">
              Загрузить файл
              <input type="file" accept="image/*" onChange={handleLogoUpload} />
            </label>
          </div>
        </div>

        <div className="row center">
          <button onClick={generateQR}>Сгенерировать QR</button>
          <button onClick={() => { if (!qrCode) return; const a = document.createElement("a"); a.href = qrCode; a.download = `qrcode.${format}`; a.click(); }}>Скачать</button>
          <button onClick={shareQR}>Поделиться</button>
        </div>

        {qrCode && <div className="qr-preview"><img src={qrCode} alt="QR" /></div>}

        <div className="row center">
          <button onClick={() => setShowHistory(!showHistory)}>
            {showHistory ? "Скрыть историю" : "Показать историю"}
          </button>
          <button onClick={clearHistory}>Очистить историю</button>
        </div>

        {showHistory && history.length > 0 && (
          <div className="history-table table-container">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Дата</th>
                  <th>Текст</th>
                  <th>Цвет</th>
                  <th>Формат</th>
                  <th>Логотип</th>
                  <th>Действие</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item, idx) => {
                  const params = JSON.parse(item.params || "{}");
                  return (
                    <tr key={item.id}>
                      <td>{idx + 1}</td>
                      <td>{item.date}</td>
                      <td>{item.text}</td>
                      <td>{params.color || "#000"}</td>
                      <td>{params.format || "png"}</td>
                      <td>{params.logo && params.logo !== "none" ? <img src={params.logo} width={32} /> : "-"}</td>
                      <td>
                        <button onClick={async () => {
                          const res = await fetch("http://localhost:4000/api/generate", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            credentials: "include",
                            body: JSON.stringify({
                              text: item.text,
                              color: params.color,
                              size: params.size,
                              logo: params.logo === "none" ? null : params.logo
                            })
                          });
                          if (!res.ok) return alert("Ошибка генерации QR");
                          const data = await res.json();
                          setQrCode(data.base64);
                        }}>Посмотреть</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
