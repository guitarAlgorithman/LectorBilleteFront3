import { useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";
import Cropper from "react-easy-crop";
import "./App.css";
import { getCroppedImg } from "./utils/cropImage";

// ✅ desde .env (Vite)
const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/predict";
const ACCESS_CODE = import.meta.env.VITE_ACCESS_CODE || ""; // si está vacío, no bloquea
const COOLDOWN_SECONDS = Number(import.meta.env.VITE_COOLDOWN_SECONDS || 5);

const BILLETE_ASPECT = 2.11;

function App() {
  const [mode, setMode] = useState("upload");
  const [rawImage, setRawImage] = useState(null);
  const [croppedImage, setCroppedImage] = useState(null);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const webcamRef = useRef(null);

  // crop
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1.5);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  // 🔐 acceso + anti-spam
  const [accessInput, setAccessInput] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [cooldownLeft, setCooldownLeft] = useState(0);

  const accessRequired = (ACCESS_CODE || "").trim().length > 0;

  const onCropComplete = (_, areaPixels) => {
    setCroppedAreaPixels(areaPixels);
  };

  const handleModeChange = (newMode) => {
    setMode(newMode);
    setRawImage(null);
    setCroppedImage(null);
    setResult(null);
    setErrorMsg("");
    setCrop({ x: 0, y: 0 });
    setZoom(1.5);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setResult(null);
    setErrorMsg("");
    setCroppedImage(null);

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setRawImage(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleCaptureFromCamera = () => {
    if (!webcamRef.current) return;
    const screenshot = webcamRef.current.getScreenshot();
    if (screenshot) {
      setRawImage(screenshot);
      setCroppedImage(null);
      setResult(null);
      setErrorMsg("");
      setCrop({ x: 0, y: 0 });
      setZoom(1.5);
    }
  };

  const handleApplyCrop = async () => {
    try {
      if (!rawImage || !croppedAreaPixels) {
        setErrorMsg("No hay recorte definido.");
        return;
      }
      const croppedDataUrl = await getCroppedImg(rawImage, croppedAreaPixels);
      setCroppedImage(croppedDataUrl);
      setErrorMsg("");
    } catch (err) {
      console.error(err);
      setErrorMsg("Error al aplicar el recorte.");
    }
  };

  // ✅ cooldown timer
  useEffect(() => {
    if (cooldownLeft <= 0) return;
    const t = setInterval(() => {
      setCooldownLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [cooldownLeft]);

  // ✅ si NO hay ACCESS_CODE en env, desbloquea automáticamente
  useEffect(() => {
    if (!accessRequired) setUnlocked(true);
  }, [accessRequired]);

  const handleUnlock = () => {
    if (!accessRequired) {
      setUnlocked(true);
      setErrorMsg("");
      return;
    }
    if (accessInput.trim() === ACCESS_CODE) {
      setUnlocked(true);
      setErrorMsg("");
    } else {
      setUnlocked(false);
      setErrorMsg("Clave incorrecta.");
    }
  };

  const handlePredict = async () => {
    if (accessRequired && !unlocked) {
      setErrorMsg("Ingresa la clave para analizar.");
      return;
    }

    if (cooldownLeft > 0) {
      setErrorMsg(`Espera ${cooldownLeft}s antes de volver a consultar.`);
      return;
    }

    if (!rawImage && !croppedImage) {
      setErrorMsg("Primero carga o captura una imagen.");
      return;
    }

    try {
      setLoading(true);
      setErrorMsg("");
      setResult(null);

      const dataUrl = croppedImage || rawImage;
      const base64 = dataUrl.split(",")[1];

      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_base64: base64 }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const msg =
          data?.detail ||
          data?.error ||
          `Error HTTP: ${response.status}`;
        throw new Error(msg);
      }

      setResult(data);
      setCooldownLeft(COOLDOWN_SECONDS);
    } catch (err) {
      console.error(err);
      setErrorMsg(err?.message || "Error al enviar la imagen o procesar la respuesta.");
    } finally {
      setLoading(false);
    }
  };

  const renderResult = () => {
    if (!result) return null;

    const isApto = result.apto === true;
    const classApto =
      result.apto === null
        ? "result-value"
        : isApto
        ? "result-value apto"
        : "result-value no-apto";

    const aptoLabel =
      result.apto === null ? "N/A" : isApto ? "APTO" : "NO APTO";

    return (
      <div className="result-card">
        <h2>Resultado del análisis</h2>

        <p><strong>Denominación:</strong></p>
        <div className="result-value">{result.denominacion ?? "ninguna"}</div>

        <p><strong>Aptitud (modelo):</strong></p>
        <div className={classApto}>{aptoLabel}</div>

        <p><strong>Confianza:</strong></p>
        <div className="result-value">
          {typeof result.confianza === "number"
            ? (result.confianza * 100).toFixed(1) + " %"
            : "N/A"}
        </div>

        <div className="detail">{result.detalle ?? "-"}</div>

        {/* OpenAI */}
        {result.openai && (
          <div className="detail" style={{ marginTop: 12 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <strong>OpenAI</strong>
              {result.openai.mode && (
                <span style={{ opacity: 0.8 }}>Modo: {result.openai.mode}</span>
              )}
            </div>

            {result.openai.ok ? (
              result.openai.data ? (
                <div style={{ marginTop: 6 }}>
                  <div><strong>Descripción:</strong> {result.openai.data.descripcion}</div>
                  <div><strong>¿Es billete?:</strong> {result.openai.data.es_billete ? "Sí" : "No"}</div>
                  <div><strong>Denominación estimada:</strong> {result.openai.data.denominacion_estimada}</div>
                  <div><strong>Motivos:</strong> {result.openai.data.motivos}</div>
                </div>
              ) : (
                <pre style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>
                  {result.openai.raw}
                </pre>
              )
            ) : (
              <div style={{ marginTop: 6 }}>
                {result.openai.error}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const canAnalyze =
    (!accessRequired || unlocked) &&
    rawImage &&
    !loading &&
    cooldownLeft === 0;

  return (
    <div className="app-container">
      <h1>Detector de billetes</h1>
      <p className="subtitle">
        Captura o sube una foto del billete, ajusta el recorte y obtén su
        denominación y aptitud.
      </p>

      {/* 🔐 Gate simple */}
      {accessRequired && !unlocked && (
        <div className="result-card" style={{ marginBottom: 16 }}>
          <h2>Acceso</h2>
          <p className="detail">Ingresa la clave para habilitar el análisis.</p>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="password"
              value={accessInput}
              onChange={(e) => setAccessInput(e.target.value)}
              placeholder="Clave"
              style={{ padding: 10, flex: 1, borderRadius: 8, border: "1px solid #ccc" }}
            />
            <button onClick={handleUnlock}>Entrar</button>
          </div>
        </div>
      )}

      {/* ⏳ Cooldown visible */}
      {(!accessRequired || unlocked) && cooldownLeft > 0 && (
        <div className="detail" style={{ marginBottom: 10 }}>
          ⏳ Espera {cooldownLeft}s para volver a analizar
        </div>
      )}

      <div className="mode-switch">
        <button
          className={mode === "upload" ? "mode-btn active" : "mode-btn"}
          onClick={() => handleModeChange("upload")}
        >
          Subir imagen
        </button>
        <button
          className={mode === "camera" ? "mode-btn active" : "mode-btn"}
          onClick={() => handleModeChange("camera")}
        >
          Usar cámara
        </button>
      </div>

      {mode === "upload" && (
        <div className="upload-section">
          <input type="file" accept="image/*" onChange={handleFileChange} />
        </div>
      )}

      {mode === "camera" && (
        <div className="camera-section">
          <Webcam
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            videoConstraints={{ facingMode: "environment" }}
            className="webcam-view"
          />
          <button onClick={handleCaptureFromCamera}>Capturar imagen</button>
        </div>
      )}

      {rawImage && !croppedImage && (
        <div className="crop-container">
          <h2>Ajusta el recorte del billete</h2>
          <div className="crop-wrapper">
            <Cropper
              image={rawImage}
              crop={crop}
              zoom={zoom}
              aspect={BILLETE_ASPECT}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, areaPixels) => setCroppedAreaPixels(areaPixels)}
              cropShape="rect"
              showGrid={false}
            />
          </div>
          <div className="crop-controls">
            <label>
              Zoom:
              <input
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
              />
            </label>
            <button onClick={handleApplyCrop}>Usar este recorte</button>
          </div>
        </div>
      )}

      {croppedImage && (
        <div className="preview">
          <div className="preview-header">
            <h2>Billete recortado</h2>
            <button
              className="secondary-btn"
              onClick={() => {
                setCroppedImage(null);
                setResult(null);
              }}
            >
              Ajustar recorte nuevamente
            </button>
          </div>
          <img src={croppedImage} alt="Billete recortado" />
        </div>
      )}

      <div className="actions">
        <button onClick={handlePredict} disabled={!canAnalyze}>
          {loading
            ? "Analizando..."
            : cooldownLeft > 0
            ? `Espera ${cooldownLeft}s`
            : "Analizar billete"}
        </button>
      </div>

      {errorMsg && <div className="error">{errorMsg}</div>}

      {renderResult()}

      {/* debug mínimo */}
      <div className="detail" style={{ marginTop: 16, opacity: 0.7 }}>
        API: {API_URL}
      </div>
    </div>
  );
}

export default App;
