import { useMemo, useRef, useState } from "react";
import Webcam from "react-webcam";
import "./App.css";

const API_URL = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/analyze").replace(/\/analyze$/, "/analyze-security");
const SOURCE = "https://www.billetesymonedas.cl/Seguridad/ElementosSeguridaBilletes";

const DENOMINATIONS = {
  "1000": { material: "Polímero", elements: ["Ventana transparente", "Hilo de seguridad", "Motivo coincidente", "Microtextos", "Número de serie", "Antú"] },
  "2000": { material: "Polímero", elements: ["Ventana transparente", "Hilo de seguridad", "Motivo coincidente", "Microtextos", "Número de serie", "Antú"] },
  "5000": { material: "Polímero", elements: ["Ventana transparente", "Hilo de seguridad", "Motivo coincidente", "Microtextos", "Número de serie", "Antú"] },
  "10000": { material: "Algodón", elements: ["Marca de agua", "Hilo de seguridad", "Motivo coincidente", "Microtextos", "Número de serie", "Franja 3D", "Efecto óptico variable"] },
  "20000": { material: "Algodón", elements: ["Marca de agua", "Hilo de seguridad", "Motivo coincidente", "Microtextos", "Número de serie", "Franja 3D", "Efecto óptico variable"] },
};

const BASE_STEPS = [
  { id: "normal", title: "Mire", label: "Vista frontal" },
  { id: "backlight", title: "Mire", label: "A contraluz" },
  { id: "tiltLeft", title: "Incline", label: "Ángulo izquierdo" },
  { id: "tiltRight", title: "Incline", label: "Ángulo derecho" },
];

const strip = (value) => value?.includes(",") ? value.split(",", 2)[1] : value;

export default function App() {
  const webcamRef = useRef(null);
  const [denomination, setDenomination] = useState("");
  const [stepIndex, setStepIndex] = useState(0);
  const [captures, setCaptures] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [includeUv, setIncludeUv] = useState(false);

  const bill = DENOMINATIONS[denomination];
  const steps = includeUv ? [...BASE_STEPS, { id: "uv", title: "Luz UV", label: "Captura UV" }] : BASE_STEPS;
  const observedCount = result?.elementos?.filter((item) => item.estado === "OBSERVADO").length || 0;
  const compatibilityTotal = bill ? bill.elements.length + (includeUv ? 1 : 0) : 0;
  const compatibilityPercent = compatibilityTotal ? Math.round((observedCount / compatibilityTotal) * 100) : 0;
  const thresholdMet = compatibilityPercent >= 60;
  const step = steps[stepIndex];
  const isPolymer = bill?.material === "Polímero";
  const hints = useMemo(() => ({
    normal: isPolymer
      ? "Busque ventana transparente, hilo, motivo coincidente, microtextos y número de serie."
      : "Busque marca de agua, hilo, motivo coincidente, microtextos y número de serie.",
    backlight: isPolymer
      ? "Ponga una luz detrás para observar el hilo y el motivo coincidente."
      : "Ponga una luz detrás para observar marca de agua, hilo y motivo coincidente.",
    tiltLeft: isPolymer ? "Incline a la izquierda para observar el cambio del Antú." : "Incline a la izquierda para observar franja 3D y efecto óptico.",
    tiltRight: isPolymer ? "Incline a la derecha y capture el segundo estado del Antú." : "Incline a la derecha para comparar el movimiento y cambio óptico.",
    uv: "Use una lámpara UV para observar el número y la fluorescencia. No confíe únicamente en esta comprobación.",
  }), [isPolymer]);

  const chooseBill = (value) => {
    setDenomination(value); setStepIndex(0); setCaptures({}); setResult(null); setError("");
  };

  const capture = () => {
    const image = webcamRef.current?.getScreenshot();
    if (!image) return;
    setCaptures((current) => ({ ...current, [step.id]: image }));
    setResult(null);
    if (stepIndex < steps.length - 1) setStepIndex(stepIndex + 1);
  };

  const analyze = async () => {
    setLoading(true); setError(""); setResult(null);
    try {
      const response = await fetch(API_URL, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ denomination, normal_image_base64: strip(captures.normal), backlight_image_base64: strip(captures.backlight) || null, tilt_left_image_base64: strip(captures.tiltLeft) || null, tilt_right_image_base64: strip(captures.tiltRight) || null, uv_image_base64: includeUv ? strip(captures.uv) || null : null }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.detail || `Error HTTP ${response.status}`);
      setResult(payload);
    } catch (requestError) { setError(requestError.message || "No fue posible revisar las capturas."); }
    finally { setLoading(false); }
  };

  return <main className="app">
    <header><span className="eyebrow">Lector de Billetes 3</span><h1>MIT con cámara guiada</h1><p>Seleccione la denominación. La guía cargará solamente los elementos de seguridad que corresponden a ese billete.</p></header>
    <aside><strong>No autentifica.</strong> GPT compara características visibles; no declara que un billete sea verdadero o falso.</aside>

    <section className="selector">
      <label htmlFor="bill">¿Qué billete revisará?</label>
      <select id="bill" value={denomination} onChange={(event) => chooseBill(event.target.value)}>
        <option value="">Seleccionar denominación</option>
        {Object.keys(DENOMINATIONS).map((value) => <option key={value} value={value}>${Number(value).toLocaleString("es-CL")}</option>)}
      </select>
      {bill && <span>{bill.material}</span>}
    </section>

    {bill ? <>
      <section className="elements"><h2>Presente en el billete de ${Number(denomination).toLocaleString("es-CL")}</h2><div>{bill.elements.map((item) => <span key={item}>{item}</span>)}</div></section>
      <label className="uv-option"><input type="checkbox" checked={includeUv} onChange={(event) => { setIncludeUv(event.target.checked); setStepIndex(0); setResult(null); }} /><span><strong>¿Tiene acceso a una lámpara UV?</strong><small>Opcional. Si la activa, se agregará una captura UV; si no, no afectará el porcentaje.</small></span></label>
      <section className="scanner">
        <nav>{steps.map((item, index) => <button key={item.id} className={`${index === stepIndex ? "active" : ""} ${captures[item.id] ? "done" : ""}`} onClick={() => setStepIndex(index)}><b>{index + 1}</b><span>{item.label}</span></button>)}</nav>
        <div className="camera">
          <Webcam ref={webcamRef} audio={false} screenshotFormat="image/jpeg" screenshotQuality={0.9} videoConstraints={{ facingMode: { ideal: "environment" } }} />
          <div className="shade"/><div className={`frame ${step.id}`}/>
          {step.id.startsWith("tilt") && <div className="ar-arrow">{step.id === "tiltLeft" ? "← Incline" : "Incline →"}</div>}
          {step.id === "backlight" && <div className="sun">☀</div>}
          {step.id === "uv" && <div className="uv-glow">UV</div>}
          <div className="guide"><div><strong>{step.title}</strong><span>{step.label}</span></div><p>{hints[step.id]}</p></div>
        </div>
        <button className="capture" onClick={capture}>{captures[step.id] ? "Repetir captura" : `Capturar: ${step.label}`}</button>
      </section>
      <section className="touch"><strong>Toque — comprobación manual</strong><p>{isPolymer ? "Compruebe una superficie lisa, suave y resistente." : "Compruebe papel firme, resistente y con cierta aspereza."} En todos los billetes, revise el relieve del anverso con la yema de los dedos.</p></section>
      <button className="analyze" disabled={!captures.normal || loading} onClick={analyze}>{loading ? "Comparando imágenes…" : "Buscar elementos en las capturas"}</button>
      {error && <p className="error">{error}</p>}
    </> : <section className="empty">Seleccione una denominación para iniciar la guía.</section>}

    {result && <section className="results">
      <span className="eyebrow">Resultado visual orientativo</span><h2>Elementos encontrados</h2><p>{result.resumen}</p>
      <div className={`decision ${thresholdMet ? "sufficient" : "pending"}`}><strong>{thresholdMet ? "Compatibilidad visual MIT suficiente" : "Revisión visual MIT incompleta"}</strong><p>{thresholdMet ? "Se observaron varios elementos esperados. El billete podría presentarse a una evaluación presencial de canje." : "No se observaron suficientes elementos visuales. Esto puede deberse a la captura, iluminación, deterioro o ausencia de elementos observables."}</p><span>Posibilidad de canje: no determinada por MIT. La revisión física decide y este resultado no demuestra autenticidad.</span></div>
      <div>{result.elementos.map((item) => <article key={item.nombre} className={item.estado.toLowerCase().replaceAll("_", "-")}><header><strong>{item.nombre}</strong><span>{item.estado.replaceAll("_", " ")}</span></header><p>{item.evidencia}</p></article>)}</div><small>{result.advertencia_legal}</small>
    </section>}
    <a className="source" href={SOURCE} target="_blank" rel="noreferrer">Ver elementos MIT oficiales por denominación</a>
  </main>;
}
