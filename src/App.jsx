import { useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";
import Cropper from "react-easy-crop";
import "./App.css";
import { getCroppedImg } from "./utils/cropImage";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/predict";
const BILLETE_ASPECT = 2.11;

// ⚠️ Simple. NO es seguridad real. Solo freno básico.
const ACCESS_CODE = import.meta.env.VITE_ACCESS_CODE || "1234";
const COOLDOWN_SECONDS = Number(import.meta.env.VITE_COOLDOWN_SECONDS || 5);

export default function App() {
  const [mode, setMode] = useState("upload"); // 'upload' | 'camera'
  const [rawImage, setRawImage] = useState(null); // dataURL original
  const [croppedImage, setCroppedImage] = useState(null); // dataURL recortado
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const webcamRef = useRef(null);

  // crop states
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1.5);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  // 🔐 acceso + anti-spam
  const [accessInput, setAccessInput] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [cooldownLeft, setCooldownLeft] = useState(0);

  const onCropComplete = (_, areaPixels) => setCroppedAreaPixels(areaPixels);

  const resetAll = () => {
    setRawImage(null);
    setCroppedImage(null);
    setResult(null);
    setErrorMsg("");
    setCrop({ x: 0, y: 0 });
    setZoom(1.5);
    setCroppedAreaPixels(null);
  };

  const handleModeChange = (newMode) => {
    setMode(newMode);
    resetAll();
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
    if (!screenshot) return;

    setRawImage(screenshot);
    setCroppedImage(null);
    setResult(null);
    setErrorMsg("");
    setCrop({ x: 0, y: 0 });
    setZoom(1.5);
    setCroppedAreaPixels(null);
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

  // ✅ contador cooldown
  useEffect(() => {
    if (cooldownLeft <= 0) return;
    const t = setInterval(() => {
      setCooldownLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [cooldownLeft]);

  const handleUnlock = () => {
    if (accessInput.trim() === ACCESS_CODE) {
      setUnlocked(true);
      setErrorMsg("");
    } else {
      setUnlocked(false);
      setErrorMsg("Clave incorrecta.");
    }
  };

  const handlePredict = async () => {
    if (!unlocked) {
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
      if (!base64) throw new Error("No se pudo extraer base64 desde la imagen.");

      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_base64: base64 }),
      });

      const text = await response.text();
      let data = null;
      try {
        data = JSON.parse(text);
      } catch {
        // respuesta no-JSON
      }

      if (!response.ok) {
        const msg = data?.detail || data?.error || text || `HTTP ${response.status}`;
        throw new Error(msg);
      }

      setResult(data);
      setCooldownLeft(COOLDOWN_SECONDS); // ✅ solo si fue exitosa
    } catch (err) {
      console.error(err);
      setErrorMsg(`Error: ${err?.message || "falló la consulta"}`);
    } finally {
      setLoading(false);
    }
  };

  const renderResult = () => {
    if (!result) return null;

    const isApto = result.apto === true;
    const aptoLabel =
      result.apto === null ? "N/A" : isApto ? "APTO" : "NO APTO";

    const classApto =
      result.apto === null
        ? "result-value"
        : isApto
        ? "result-value apto"
        : "result-value no-apto";

    return (
      <div className="result-card">
        <h2>Resultado del análisis</h2>

        <p><strong>Denominación:</strong></p>
        <div className="result-value">
          {result.denominacion ?? "desconocida"}
        </div>

        <p><strong>Aptitud:</strong></p>
        <div className={classApto}>{aptoLabel}</div>

        <p><strong>Confianza:</strong></p>
        <div className="result-value">
          {typeof result.confianza === "number"
            ? (result.confianza * 100).toFixed(1) + " %"
            : "N/A"}
        </div>

        <div className="detail">{result.detalle ?? "-"}</div>

        {/* OpenAI block */}
        {result.openai && (
          <div className="detail" style={{ marginTop: 12 }}>
            <strong>OpenAI ve:</strong>
            {result.openai.ok ? (
              result.openai.data ? (
                <div style={{ marginTop: 6 }}>
                  <div><strong>Descripción:</strong> {result.openai.data.descripcion}</div>
                  <div><strong>¿Es billete?:</strong> {result.openai.data.es_billete ? "Sí" : "No"}</div>
                  <div><strong>Denominación estimada:</strong> {result.openai.data.denominacion_estimada}</div>
                  <div><strong>Motivos:</strong> {result.openai.data.motivos}</div>
                  {result.openai.mode && (
                    <div style={{ marginTop: 6, opacity: 0.8 }}>
                      <small>Modo: {result.openai.mode}</small>
                    </div>
                  )}
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
    unlocked &&
    (rawImage || croppedImage) &&
    !loading &&
    cooldownLeft === 0;

  return (
    <div className="app-container">
      <h1>Detector de billetes</h1>
      <p className="subtitle">
        Captura o sube una foto del billete, ajusta el recorte y obtén su denominación y aptitud.
      </p>

      {/* 🔐 Gate simple */}
      {!unlocked && (
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
              onKeyDown={(e) => {
                if (e.key === "Enter") handleUnlock();
              }}
            />
            <button onClick={handleUnlock}>Entrar</button>
          </div>
          <div style={{ marginTop: 10, opacity: 0.8 }}>
            <small>API: {API_URL}</small>
          </div>
        </div>
      )}

      {/* ⏳ Cooldown visible */}
      {unlocked && cooldownLeft > 0 && (
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

      {/* CROP */}
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
              onCropComplete={onCropComplete}
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

      {/* PREVIEW */}
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
            <button
              className="secondary-btn"
              onClick={() => {
                resetAll();
              }}
            >
              Limpiar
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
    </div>
  );
}
