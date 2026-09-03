import { useMemo, useRef, useState } from "react";
import Webcam from "react-webcam";
import "./App.css";
import { exchangeCenters, nearestCity, OFFICIAL_SOURCE } from "./branches";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/analyze";
const RESULT_LABELS = {
  POTENCIALMENTE_CANJEABLE: "Potencialmente canjeable",
  POTENCIALMENTE_NO_CANJEABLE: "Potencialmente no canjeable",
  REQUIERE_REVISION_PRESENCIAL: "Requiere revisión presencial",
};

function stripDataUrl(value) {
  return value?.includes(",") ? value.split(",", 2)[1] : value;
}

function App() {
  const webcamRef = useRef(null);
  const [mode, setMode] = useState("ar");
  const [activeSide, setActiveSide] = useState("front");
  const [frontImage, setFrontImage] = useState(null);
  const [backImage, setBackImage] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [locationMessage, setLocationMessage] = useState("");

  const city = useMemo(
    () => exchangeCenters.find((entry) => entry.city === selectedCity),
    [selectedCity],
  );

  const saveImage = (dataUrl) => {
    if (!dataUrl) return;
    if (activeSide === "front") {
      setFrontImage(dataUrl);
      setActiveSide("back");
    } else {
      setBackImage(dataUrl);
    }
    setResult(null);
    setError("");
  };

  const capture = () => saveImage(webcamRef.current?.getScreenshot());

  const upload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Selecciona un archivo de imagen.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("La imagen no puede superar 8 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => saveImage(reader.result);
    reader.readAsDataURL(file);
  };

  const analyze = async () => {
    if (!frontImage) {
      setError("Captura o carga al menos el anverso del billete.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          front_image_base64: stripDataUrl(frontImage),
          back_image_base64: stripDataUrl(backImage) || null,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.detail || `Error HTTP ${response.status}`);
      setResult(payload);
    } catch (requestError) {
      setError(requestError.message || "No fue posible realizar el análisis.");
    } finally {
      setLoading(false);
    }
  };

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationMessage("Tu navegador no ofrece ubicación. Selecciona una ciudad.");
      return;
    }
    setLocationMessage("Buscando la ciudad más cercana…");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const nearest = nearestCity(coords.latitude, coords.longitude);
        setSelectedCity(nearest.city);
        setLocationMessage(`Ciudad publicada más cercana: ${nearest.city} (aprox. ${nearest.distanceKm.toFixed(0)} km).`);
      },
      () => setLocationMessage("No se pudo acceder a tu ubicación. Puedes elegir una ciudad manualmente."),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  };

  const resultClass = result?.resultado?.toLowerCase().replaceAll("_", "-") || "";

  return (
    <main className="app-shell">
      <header className="hero">
        <span className="eyebrow">Orientador visual · Chile</span>
        <h1>¿Tu billete podría ser canjeable?</h1>
        <p>Captura ambas caras y obtén una estimación visual orientativa.</p>
      </header>

      <section className="notice" aria-label="Advertencia importante">
        <strong>No autentifica ni garantiza el canje.</strong> La decisión final corresponde al Banco Central o a la entidad que revise físicamente el billete.
      </section>

      <nav className="mode-tabs" aria-label="Modo de captura">
        <button className={mode === "ar" ? "active" : ""} onClick={() => setMode("ar")}>Escáner AR</button>
        <button className={mode === "upload" ? "active" : ""} onClick={() => setMode("upload")}>Subir fotos</button>
      </nav>

      <section className="capture-card">
        <div className="side-switch">
          <button className={activeSide === "front" ? "active" : ""} onClick={() => setActiveSide("front")}>1. Anverso {frontImage && "✓"}</button>
          <button className={activeSide === "back" ? "active" : ""} onClick={() => setActiveSide("back")}>2. Reverso {backImage && "✓"}</button>
        </div>

        {mode === "ar" ? (
          <div className="camera-stage">
            <Webcam ref={webcamRef} audio={false} screenshotFormat="image/jpeg" screenshotQuality={0.9} videoConstraints={{ facingMode: { ideal: "environment" } }} />
            <div className="ar-shade" />
            <div className="bill-guide"><span>{activeSide === "front" ? "Alinea el anverso" : "Alinea el reverso"}</span></div>
            {result && <div className={`ar-result ${resultClass}`}>{RESULT_LABELS[result.resultado]}</div>}
          </div>
        ) : (
          <label className="drop-zone">
            <input type="file" accept="image/*" capture="environment" onChange={upload} />
            <strong>Seleccionar {activeSide === "front" ? "anverso" : "reverso"}</strong>
            <span>JPG, PNG o WEBP · máximo 8 MB</span>
          </label>
        )}

        {mode === "ar" && <button className="primary capture-button" onClick={capture}>Capturar {activeSide === "front" ? "anverso" : "reverso"}</button>}

        <div className="previews">
          <Preview label="Anverso" image={frontImage} onClear={() => setFrontImage(null)} />
          <Preview label="Reverso (recomendado)" image={backImage} onClear={() => setBackImage(null)} />
        </div>

        <button className="primary analyze" disabled={!frontImage || loading} onClick={analyze}>
          {loading ? "Analizando de forma segura…" : "Analizar posibilidad de canje"}
        </button>
        {error && <p className="error" role="alert">{error}</p>}
      </section>

      {result && (
        <section className={`result-card ${resultClass}`}>
          <span className="result-kicker">Estimación visual</span>
          <h2>{RESULT_LABELS[result.resultado]}</h2>
          <p className="result-reason">{result.motivo}</p>
          <div className="result-grid">
            <div><span>Denominación estimada</span><strong>${result.denominacion_estimada}</strong></div>
            <div><span>Confianza visual</span><strong>{result.confianza_visual}</strong></div>
          </div>
          {!!result.danos_visibles?.length && <div className="evidence"><h3>Daños visibles</h3><ul>{result.danos_visibles.map((item) => <li key={item}>{item}</li>)}</ul></div>}
          <p className="legal-copy">{result.advertencia_legal}</p>
        </section>
      )}

      <section className="locations">
        <span className="eyebrow">Revisión presencial</span>
        <h2>Encuentra un centro de cambio</h2>
        <p>Tu ubicación se usa solo en este navegador. No se envía al backend ni a OpenAI.</p>
        <div className="location-controls">
          <button className="primary" onClick={requestLocation}>Usar mi ubicación</button>
          <select value={selectedCity} onChange={(event) => setSelectedCity(event.target.value)}>
            <option value="">Elegir ciudad manualmente</option>
            {exchangeCenters.map((entry) => <option key={entry.city}>{entry.city}</option>)}
          </select>
        </div>
        {locationMessage && <p className="location-message">{locationMessage}</p>}
        {city && <div className="center-list">{city.centers.map(([name, address]) => (
          <article key={`${name}-${address}`}>
            <div><strong>{name}</strong><span>{address}</span></div>
            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`} target="_blank" rel="noreferrer">Abrir mapa</a>
          </article>
        ))}</div>}
        <a className="source-link" href={OFFICIAL_SOURCE} target="_blank" rel="noreferrer">Ver información oficial y confirmar disponibilidad</a>
      </section>
    </main>
  );
}

function Preview({ label, image, onClear }) {
  return <div className={`preview ${image ? "ready" : ""}`}>
    {image ? <img src={image} alt={label} /> : <span>Sin imagen</span>}
    <div><strong>{label}</strong>{image && <button onClick={onClear}>Quitar</button>}</div>
  </div>;
}

export default App;
