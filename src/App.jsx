/**
 * APLICACIÓN DE CONTEO DE INVENTARIO
 * Sistema para conteo por bloques de 10 artículos
 * Con integración a Google Sheets
 * 
 * PARA USAR EN PRODUCCIÓN:
 * 1. Reemplazar GOOGLE_SHEETS_API_URL con la URL real de tu Apps Script
 * 2. Reemplazar ARTICLES_CSV_URL con la URL de tu Google Sheet publicada como CSV
 */

import { useState, useEffect, useCallback, useRef } from "react";

// ============================================================
// CONFIGURACIÓN - Modificar estos valores en producción
// ============================================================
const CONFIG = {
  GOOGLE_SHEETS_API_URL: "https://script.google.com/macros/s/AKfycbzCUCuchkvtMuSZrmR-UX1qLPkcUkQf8HJ3ngkxRLQueGIS_scQj3J9jgctADyDL2Lh/exec",
  ARTICLES_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSiuIXn5WDm8bSD6T4p4Q8cjh8ZJcnodQIJz9Kwx7YnIddzTFmui-tTmGZZmzuvZ9H7trkrH8MXohrg/pub?output=csv",
  BLOCK_SIZE: 10,
};

// ============================================================
// DATOS DE DEMO (se usan si no hay CSV configurado)
// ============================================================
const DEMO_ARTICLES = [
  { codigo_articulo: "GRI-001", descripcion: "Grifería monocomando lavatorio cromada", clase: "GRIFERIA", subclase: "LAVATORIO", grupo: "MONOCOMANDO" },
  { codigo_articulo: "GRI-002", descripcion: "Grifería monocomando ducha cromada", clase: "GRIFERIA", subclase: "DUCHA", grupo: "MONOCOMANDO" },
  { codigo_articulo: "GRI-003", descripcion: "Grifería bicomando lavatorio cromada", clase: "GRIFERIA", subclase: "LAVATORIO", grupo: "BICOMANDO" },
  { codigo_articulo: "GRI-004", descripcion: "Mezcladora monocomando cocina cuello alto", clase: "GRIFERIA", subclase: "COCINA", grupo: "MONOCOMANDO" },
  { codigo_articulo: "GRI-005", descripcion: "Grifería monocomando lavatorio dorada", clase: "GRIFERIA", subclase: "LAVATORIO", grupo: "MONOCOMANDO" },
  { codigo_articulo: "GRI-006", descripcion: "Grifería bicomando ducha cromada", clase: "GRIFERIA", subclase: "DUCHA", grupo: "BICOMANDO" },
  { codigo_articulo: "GRI-007", descripcion: "Mezcladora bicomando cocina", clase: "GRIFERIA", subclase: "COCINA", grupo: "BICOMANDO" },
  { codigo_articulo: "GRI-008", descripcion: "Grifería monocomando lavatorio negra mate", clase: "GRIFERIA", subclase: "LAVATORIO", grupo: "MONOCOMANDO" },
  { codigo_articulo: "GRI-009", descripcion: "Ducha teléfono flexible 1.50m", clase: "GRIFERIA", subclase: "DUCHA", grupo: "ACCESORIOS" },
  { codigo_articulo: "GRI-010", descripcion: "Grifería monocomando bañera cromada", clase: "GRIFERIA", subclase: "BAÑERA", grupo: "MONOCOMANDO" },
  { codigo_articulo: "GRI-011", descripcion: "Mezcladora monocomando cocina cuello bajo", clase: "GRIFERIA", subclase: "COCINA", grupo: "MONOCOMANDO" },
  { codigo_articulo: "GRI-012", descripcion: "Grifería bicomando lavatorio dorada", clase: "GRIFERIA", subclase: "LAVATORIO", grupo: "BICOMANDO" },
  { codigo_articulo: "LOZ-001", descripcion: "Inodoro de piso salida horizontal blanco", clase: "LOZA", subclase: "INODORO", grupo: "PISO" },
  { codigo_articulo: "LOZ-002", descripcion: "Inodoro de pared suspendido blanco", clase: "LOZA", subclase: "INODORO", grupo: "SUSPENDIDO" },
  { codigo_articulo: "LOZ-003", descripcion: "Lavatorio de empotrar 50x40 blanco", clase: "LOZA", subclase: "LAVATORIO", grupo: "EMPOTRAR" },
  { codigo_articulo: "LOZ-004", descripcion: "Lavatorio de colgar 55x45 blanco", clase: "LOZA", subclase: "LAVATORIO", grupo: "COLGAR" },
  { codigo_articulo: "LOZ-005", descripcion: "Bidet de piso salida horizontal blanco", clase: "LOZA", subclase: "BIDET", grupo: "PISO" },
  { codigo_articulo: "LOZ-006", descripcion: "Tapa y asiento para inodoro soft close", clase: "LOZA", subclase: "INODORO", grupo: "ACCESORIOS" },
  { codigo_articulo: "LOZ-007", descripcion: "Lavatorio sobremesada oval 55x35 blanco", clase: "LOZA", subclase: "LAVATORIO", grupo: "SOBREMESADA" },
  { codigo_articulo: "LOZ-008", descripcion: "Bañera de embutir acrílica 150x70", clase: "LOZA", subclase: "BAÑERA", grupo: "EMBUTIR" },
  { codigo_articulo: "TUB-001", descripcion: "Caño de PVC presión 1/2\" x 3m", clase: "TUBERIAS", subclase: "PVC", grupo: "PRESION" },
  { codigo_articulo: "TUB-002", descripcion: "Caño de PVC desagüe 4\" x 3m", clase: "TUBERIAS", subclase: "PVC", grupo: "DESAGUE" },
  { codigo_articulo: "TUB-003", descripcion: "Caño de cobre 3/4\" x 3m", clase: "TUBERIAS", subclase: "COBRE", grupo: "PRESION" },
  { codigo_articulo: "TUB-004", descripcion: "Caño multicapa 20mm x 5m", clase: "TUBERIAS", subclase: "MULTICAPA", grupo: "PRESION" },
  { codigo_articulo: "TUB-005", descripcion: "Caño corrugado flexible 3/4\" x 1m", clase: "TUBERIAS", subclase: "FLEXIBLE", grupo: "CORRUGADO" },
  { codigo_articulo: "FIT-001", descripcion: "Codo PVC presión 1/2\" 90°", clase: "FITINGS", subclase: "PVC", grupo: "CODOS" },
  { codigo_articulo: "FIT-002", descripcion: "Tee PVC presión 1/2\"", clase: "FITINGS", subclase: "PVC", grupo: "TEES" },
  { codigo_articulo: "FIT-003", descripcion: "Unión doble PVC presión 1/2\"", clase: "FITINGS", subclase: "PVC", grupo: "UNIONES" },
  { codigo_articulo: "REP-001", descripcion: "Cartucho cerámico 35mm universal", clase: "REPUESTOS", subclase: "GRIFERIA", grupo: "CARTUCHOS" },
  { codigo_articulo: "REP-002", descripcion: "Kit gomas para grifería bicomando", clase: "REPUESTOS", subclase: "GRIFERIA", grupo: "GOMAS" },
  { codigo_articulo: "REP-003", descripcion: "Flotante para cisterna completo", clase: "REPUESTOS", subclase: "CISTERNA", grupo: "FLOTANTES" },
  { codigo_articulo: "REP-004", descripcion: "Válvula de descarga para cisterna", clase: "REPUESTOS", subclase: "CISTERNA", grupo: "VALVULAS" },
];

// ============================================================
// UTILIDADES
// ============================================================
function parseCSV(text) {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, "").toLowerCase().replace(/ /g, "_"));
  return lines.slice(1).map(line => {
    const vals = line.split(",").map(v => v.trim().replace(/^"|"$/g, ""));
    const obj = {};
    headers.forEach((h, i) => { obj[h] = vals[i] || ""; });
    return obj;
  }).filter(r => r.codigo_articulo);
}

function getUnique(arr, key) {
  return [...new Set(arr.map(a => a[key]).filter(Boolean))].sort();
}

function formatDateTime() {
  const now = new Date();
  return {
    fecha: now.toLocaleDateString("es-AR"),
    hora: now.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }),
  };
}

function saveToLocalStorage(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
}

function loadFromLocalStorage(key) {
  try { const d = localStorage.getItem(key); return d ? JSON.parse(d) : null; } catch { return null; }
}

// ============================================================
// ESTILOS GLOBALES
// ============================================================
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@500&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body, #root {
    font-family: 'IBM Plex Sans', sans-serif;
    background: #0f1117;
    color: #e8e6e0;
    min-height: 100vh;
  }

  .app-wrapper {
    min-height: 100vh;
    background: #0f1117;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0 0 3rem;
  }

  .app-header {
    width: 100%;
    background: #151820;
    border-bottom: 1px solid #2a2e3d;
    padding: 0.875rem 1.5rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    position: sticky;
    top: 0;
    z-index: 100;
  }

  .app-logo {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 13px;
    font-weight: 500;
    color: #4a9eff;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .app-title {
    font-size: 14px;
    font-weight: 500;
    color: #a8a4a0;
  }

  .header-spacer { flex: 1; }

  .badge {
    font-size: 11px;
    font-weight: 600;
    padding: 3px 10px;
    border-radius: 3px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .badge-blue { background: #1a2d4a; color: #4a9eff; border: 1px solid #2a4a7a; }
  .badge-green { background: #1a3a24; color: #4adf8a; border: 1px solid #2a5a3a; }
  .badge-amber { background: #3a2a0a; color: #f0a830; border: 1px solid #5a3a0a; }
  .badge-red { background: #3a1a1a; color: #f06060; border: 1px solid #5a2a2a; }

  .main-card {
    width: 100%;
    max-width: 760px;
    margin: 2rem 1rem 0;
    background: #151820;
    border: 1px solid #2a2e3d;
    border-radius: 6px;
    overflow: hidden;
  }

  .card-header {
    padding: 1.25rem 1.5rem;
    border-bottom: 1px solid #2a2e3d;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .card-header-icon {
    width: 32px;
    height: 32px;
    background: #1a2d4a;
    border: 1px solid #2a4a7a;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    color: #4a9eff;
    flex-shrink: 0;
  }

  .card-header-title {
    font-size: 15px;
    font-weight: 600;
    color: #e8e6e0;
  }

  .card-header-sub {
    font-size: 12px;
    color: #686460;
    margin-top: 2px;
  }

  .card-body { padding: 1.5rem; }

  /* Formulario de inicio */
  .form-group { margin-bottom: 1.25rem; }
  .form-label {
    display: block;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #686460;
    margin-bottom: 6px;
  }
  .form-input, .form-select {
    width: 100%;
    background: #0f1117;
    border: 1px solid #2a2e3d;
    border-radius: 4px;
    padding: 0.65rem 0.875rem;
    font-family: 'IBM Plex Sans', sans-serif;
    font-size: 14px;
    color: #e8e6e0;
    outline: none;
    transition: border-color 0.15s;
    -webkit-appearance: none;
    appearance: none;
  }
  .form-input:focus, .form-select:focus { border-color: #4a9eff; }
  .form-input::placeholder { color: #484440; }
  .form-select { cursor: pointer; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23686460' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; padding-right: 2rem; }
  .form-select option { background: #151820; }
  .form-select:disabled { opacity: 0.4; cursor: not-allowed; }

  .form-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; }
  @media (max-width: 600px) { .form-row { grid-template-columns: 1fr; } }

  /* Botones */
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 0.7rem 1.5rem;
    font-family: 'IBM Plex Sans', sans-serif;
    font-size: 14px;
    font-weight: 600;
    border-radius: 4px;
    border: none;
    cursor: pointer;
    transition: opacity 0.15s, transform 0.1s;
    letter-spacing: 0.02em;
  }
  .btn:active { transform: scale(0.98); }
  .btn:disabled { opacity: 0.35; cursor: not-allowed; transform: none; }

  .btn-primary { background: #4a9eff; color: #0a1825; }
  .btn-primary:hover:not(:disabled) { background: #6aafff; }
  .btn-success { background: #1e7a40; color: #d0f5e0; border: 1px solid #2aaa56; }
  .btn-success:hover:not(:disabled) { background: #2aaa56; }
  .btn-ghost { background: transparent; color: #686460; border: 1px solid #2a2e3d; }
  .btn-ghost:hover:not(:disabled) { background: #1a1e2a; color: #a8a4a0; }
  .btn-danger { background: transparent; color: #f06060; border: 1px solid #5a2a2a; }
  .btn-danger:hover:not(:disabled) { background: #3a1a1a; }
  .btn-full { width: 100%; }

  .btn-row {
    display: flex;
    gap: 0.75rem;
    margin-top: 1.5rem;
    flex-wrap: wrap;
  }

  /* Tabla de artículos */
  .articles-table { width: 100%; border-collapse: collapse; }
  .articles-table th {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #484440;
    padding: 0.5rem 0.75rem;
    text-align: left;
    border-bottom: 1px solid #2a2e3d;
    white-space: nowrap;
  }
  .articles-table td {
    padding: 0.625rem 0.75rem;
    border-bottom: 1px solid #1e2230;
    font-size: 13px;
    vertical-align: middle;
  }
  .articles-table tr:last-child td { border-bottom: none; }
  .articles-table tr:hover td { background: #1a1e2a; }

  .td-code {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    color: #4a9eff;
    white-space: nowrap;
  }
  .td-desc { color: #c8c4c0; max-width: 220px; }
  .td-desc-text { 
    overflow: hidden; 
    text-overflow: ellipsis; 
    white-space: nowrap; 
    max-width: 220px; 
    display: block;
  }

  .stock-input {
    width: 90px;
    background: #0f1117;
    border: 1px solid #2a2e3d;
    border-radius: 3px;
    padding: 5px 8px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 13px;
    color: #e8e6e0;
    text-align: right;
    outline: none;
    transition: border-color 0.15s;
  }
  .stock-input:focus { border-color: #4a9eff; }
  .stock-input.has-value { border-color: #2a5a3a; color: #4adf8a; }
  .stock-input.error { border-color: #f06060; }

  .stock-display {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 13px;
    color: #4adf8a;
    background: #1a3a24;
    border: 1px solid #2a5a3a;
    border-radius: 3px;
    padding: 5px 8px;
    min-width: 70px;
    text-align: right;
    display: inline-block;
  }

  .diff-positive { color: #f06060; font-family: 'IBM Plex Mono', monospace; font-size: 13px; font-weight: 600; }
  .diff-negative { color: #f0a830; font-family: 'IBM Plex Mono', monospace; font-size: 13px; font-weight: 600; }
  .diff-zero { color: #484440; font-family: 'IBM Plex Mono', monospace; font-size: 13px; }

  /* Progreso */
  .progress-bar-wrapper {
    background: #0f1117;
    border: 1px solid #2a2e3d;
    border-radius: 3px;
    height: 6px;
    overflow: hidden;
    margin-bottom: 0.5rem;
  }
  .progress-bar-fill {
    height: 100%;
    background: #4a9eff;
    border-radius: 3px;
    transition: width 0.4s ease;
  }
  .progress-label {
    font-size: 11px;
    color: #484440;
    display: flex;
    justify-content: space-between;
  }

  /* Alertas */
  .alert {
    padding: 0.75rem 1rem;
    border-radius: 4px;
    font-size: 13px;
    margin-bottom: 1rem;
    display: flex;
    align-items: flex-start;
    gap: 10px;
  }
  .alert-error { background: #2a1010; border: 1px solid #5a2020; color: #f08080; }
  .alert-success { background: #102a18; border: 1px solid #205a30; color: #80d890; }
  .alert-info { background: #101a2a; border: 1px solid #1a3a5a; color: #80b8f0; }
  .alert-warning { background: #2a1e08; border: 1px solid #5a3a10; color: #f0c870; }
  .alert-icon { font-size: 16px; flex-shrink: 0; margin-top: 1px; }

  /* Spinner */
  .spinner {
    width: 20px;
    height: 20px;
    border: 2px solid #2a2e3d;
    border-top-color: #4a9eff;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    flex-shrink: 0;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* Resumen final */
  .summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
  }
  .summary-card {
    background: #0f1117;
    border: 1px solid #2a2e3d;
    border-radius: 4px;
    padding: 1rem;
  }
  .summary-value {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 28px;
    font-weight: 500;
    display: block;
    margin-bottom: 4px;
  }
  .summary-label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #484440;
  }

  /* Paso del flujo */
  .step-indicator {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 1.25rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #1e2230;
  }
  .step-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #2a2e3d;
    flex-shrink: 0;
  }
  .step-dot.active { background: #4a9eff; }
  .step-dot.done { background: #2aaa56; }
  .step-text { font-size: 12px; color: #686460; }

  /* Filters display */
  .filter-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 1rem;
  }
  .filter-chip {
    font-size: 11px;
    padding: 3px 10px;
    background: #1a1e2a;
    border: 1px solid #2a2e3d;
    border-radius: 3px;
    color: #a8a4a0;
  }
  .filter-chip span { color: #4a9eff; font-weight: 600; }

  .table-wrapper { overflow-x: auto; }

  @media (max-width: 500px) {
    .main-card { margin: 1rem 0.5rem 0; }
    .card-body { padding: 1rem; }
    .stock-input { width: 75px; }
    .td-desc-text { max-width: 140px; }
    .form-row { grid-template-columns: 1fr; }
  }
`;

// ============================================================
// HOOK: Carga de artículos
// ============================================================
function useArticles() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      if (CONFIG.ARTICLES_CSV_URL) {
        try {
          const res = await fetch(CONFIG.ARTICLES_CSV_URL);
          const text = await res.text();
          const parsed = parseCSV(text);
          if (parsed.length > 0) {
            setArticles(parsed);
            setLoading(false);
            return;
          }
        } catch {
          setError("No se pudo cargar el CSV. Usando datos de demo.");
        }
      }
      // Fallback a demo
      setArticles(DEMO_ARTICLES);
      setLoading(false);
    }
    load();
  }, []);

  return { articles, loading, error };
}

// ============================================================
// COMPONENTE: Pantalla de inicio / login
// ============================================================
function StartScreen({ onStart, savedSession }) {
  const [usuario, setUsuario] = useState("");
  const [error, setError] = useState("");

  function handleStart() {
    if (!usuario.trim()) {
      setError("Ingresá tu nombre de usuario para continuar.");
      return;
    }
    onStart(usuario.trim());
  }

  return (
    <div className="main-card">
      <div className="card-header">
        <div className="card-header-icon">📋</div>
        <div>
          <div className="card-header-title">Sistema de Conteo de Inventario</div>
          <div className="card-header-sub">Artículos de instalaciones sanitarias</div>
        </div>
      </div>
      <div className="card-body">
        {savedSession && (
          <div className="alert alert-warning">
            <span className="alert-icon">⚠️</span>
            <div>
              <strong>Sesión anterior detectada</strong><br />
              Hay un conteo en progreso de {savedSession.usuario}. Iniciá sesión con el mismo usuario para retomarlo, o presioná "Nuevo conteo" para descartarlo.
            </div>
          </div>
        )}
        <div className="form-group">
          <label className="form-label">Nombre de usuario</label>
          <input
            className="form-input"
            type="text"
            placeholder="Ej: Juan Pérez"
            value={usuario}
            onChange={e => { setUsuario(e.target.value); setError(""); }}
            onKeyDown={e => e.key === "Enter" && handleStart()}
            autoFocus
          />
          {error && <div style={{ color: "#f06060", fontSize: 12, marginTop: 6 }}>{error}</div>}
        </div>
        <button className="btn btn-primary btn-full" onClick={handleStart}>
          Ingresar al sistema →
        </button>
      </div>
    </div>
  );
}

// ============================================================
// COMPONENTE: Selección de filtros
// ============================================================
function FilterScreen({ articles, usuario, savedSession, onSelect, onReset }) {
  const [clase, setClase] = useState("");
  const [subclase, setSubclase] = useState("");
  const [grupo, setGrupo] = useState("");

  const clases = getUnique(articles, "clase");
  const subclases = clase ? getUnique(articles.filter(a => a.clase === clase), "subclase") : [];
  const grupos = (clase && subclase) ? getUnique(articles.filter(a => a.clase === clase && a.subclase === subclase), "grupo") : [];

  const filtered = articles.filter(a =>
    (!clase || a.clase === clase) &&
    (!subclase || a.subclase === subclase) &&
    (!grupo || a.grupo === grupo)
  );

  const canStart = clase && subclase && grupo;

  // Si hay sesión guardada y coincide, ofrecer retomar
  const canResume = savedSession && savedSession.usuario === usuario;

  function handleStart() {
    if (!canStart) return;
    onSelect({ clase, subclase, grupo, articulos: filtered });
  }

  return (
    <div className="main-card">
      <div className="card-header">
        <div className="card-header-icon">🔍</div>
        <div>
          <div className="card-header-title">Selección de artículos</div>
          <div className="card-header-sub">Usuario: <strong style={{ color: "#4a9eff" }}>{usuario}</strong></div>
        </div>
      </div>
      <div className="card-body">
        {canResume && (
          <div className="alert alert-info" style={{ marginBottom: "1.25rem" }}>
            <span className="alert-icon">💾</span>
            <div>
              <strong>Conteo en progreso</strong> — {savedSession.clase} / {savedSession.subclase} / {savedSession.grupo}<br />
              Bloque {savedSession.currentBlock + 1} de {Math.ceil(savedSession.total / CONFIG.BLOCK_SIZE)}
              <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                <button className="btn btn-success" style={{ fontSize: 12, padding: "5px 14px" }} onClick={() => onSelect(null, true)}>
                  Retomar conteo →
                </button>
                <button className="btn btn-ghost" style={{ fontSize: 12, padding: "5px 14px" }} onClick={onReset}>
                  Descartar y nuevo
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Clase</label>
            <select className="form-select" value={clase} onChange={e => { setClase(e.target.value); setSubclase(""); setGrupo(""); }}>
              <option value="">— Seleccioná —</option>
              {clases.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Subclase</label>
            <select className="form-select" value={subclase} onChange={e => { setSubclase(e.target.value); setGrupo(""); }} disabled={!clase}>
              <option value="">— Seleccioná —</option>
              {subclases.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Grupo</label>
            <select className="form-select" value={grupo} onChange={e => setGrupo(e.target.value)} disabled={!subclase}>
              <option value="">— Seleccioná —</option>
              {grupos.map(g => <option key={g}>{g}</option>)}
            </select>
          </div>
        </div>

        {canStart && (
          <div className="alert alert-info" style={{ marginBottom: "1rem" }}>
            <span className="alert-icon">ℹ️</span>
            <span><strong>{filtered.length} artículos</strong> encontrados → se dividirán en <strong>{Math.ceil(filtered.length / CONFIG.BLOCK_SIZE)} bloques</strong> de {CONFIG.BLOCK_SIZE}</span>
          </div>
        )}

        <button className="btn btn-primary btn-full" disabled={!canStart} onClick={handleStart}>
          Iniciar conteo →
        </button>
      </div>
    </div>
  );
}

// ============================================================
// COMPONENTE: Paso 1 - Cargar Stock Sistema
// ============================================================
function StockSistemaStep({ block, blockIndex, totalBlocks, articulos, onNext, onAbort }) {
  const [stocks, setStocks] = useState(() => {
    const init = {};
    articulos.forEach(a => { init[a.codigo_articulo] = ""; });
    return init;
  });
  const [errors, setErrors] = useState({});

  function setStock(code, val) {
    setStocks(s => ({ ...s, [code]: val }));
    setErrors(e => { const n = { ...e }; delete n[code]; return n; });
  }

  function validateAndNext() {
    const errs = {};
    articulos.forEach(a => {
      const v = stocks[a.codigo_articulo];
      if (v === "" || v === null || v === undefined) {
        errs[a.codigo_articulo] = true;
      } else if (isNaN(parseFloat(v))) {
        errs[a.codigo_articulo] = true;
      }
    });
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    const result = {};
    articulos.forEach(a => { result[a.codigo_articulo] = parseFloat(stocks[a.codigo_articulo]); });
    onNext(result);
  }

  return (
    <div className="main-card">
      <div className="card-header">
        <div className="card-header-icon">📊</div>
        <div>
          <div className="card-header-title">Paso 1 — Stock según sistema</div>
          <div className="card-header-sub">Ingresá el stock que figura en el sistema para cada artículo</div>
        </div>
        <div style={{ marginLeft: "auto" }}>
          <span className="badge badge-blue">Bloque {blockIndex + 1}/{totalBlocks}</span>
        </div>
      </div>
      <div className="card-body">
        <div className="step-indicator">
          <div className="step-dot active" />
          <div className="step-text">Stock sistema</div>
          <div style={{ width: 24, height: 1, background: "#2a2e3d" }} />
          <div className="step-dot" />
          <div className="step-text">Stock real</div>
          <div style={{ width: 24, height: 1, background: "#2a2e3d" }} />
          <div className="step-dot" />
          <div className="step-text">Guardar</div>
        </div>

        {Object.keys(errors).length > 0 && (
          <div className="alert alert-error">
            <span className="alert-icon">⛔</span>
            Completá todos los stocks antes de continuar. Los campos en rojo son obligatorios.
          </div>
        )}

        <div className="table-wrapper">
          <table className="articles-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Código</th>
                <th>Descripción</th>
                <th>Stock sistema</th>
              </tr>
            </thead>
            <tbody>
              {articulos.map((art, idx) => (
                <tr key={art.codigo_articulo}>
                  <td style={{ color: "#484440", fontSize: 12, width: 30 }}>{blockIndex * CONFIG.BLOCK_SIZE + idx + 1}</td>
                  <td className="td-code">{art.codigo_articulo}</td>
                  <td className="td-desc"><span className="td-desc-text" title={art.descripcion}>{art.descripcion}</span></td>
                  <td>
                    <input
                      className={`stock-input ${errors[art.codigo_articulo] ? "error" : stocks[art.codigo_articulo] !== "" ? "has-value" : ""}`}
                      type="number"
                      step="any"
                      min="0"
                      placeholder="0"
                      value={stocks[art.codigo_articulo]}
                      onChange={e => setStock(art.codigo_articulo, e.target.value)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="btn-row">
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={validateAndNext}>
            Siguiente — cargar stock real →
          </button>
          <button className="btn btn-danger" onClick={onAbort}>
            Cancelar conteo
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// COMPONENTE: Paso 2 - Cargar Stock Real
// ============================================================
function StockRealStep({ block, blockIndex, totalBlocks, articulos, stockSistema, onSave, onBack, saving }) {
  const [stocks, setStocks] = useState(() => {
    const init = {};
    articulos.forEach(a => { init[a.codigo_articulo] = ""; });
    return init;
  });
  const [errors, setErrors] = useState({});

  function setStock(code, val) {
    setStocks(s => ({ ...s, [code]: val }));
    setErrors(e => { const n = { ...e }; delete n[code]; return n; });
  }

  function validateAndSave() {
    const errs = {};
    articulos.forEach(a => {
      const v = stocks[a.codigo_articulo];
      if (v === "" || v === null || v === undefined) {
        errs[a.codigo_articulo] = true;
      } else if (isNaN(parseFloat(v))) {
        errs[a.codigo_articulo] = true;
      }
    });
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    const result = {};
    articulos.forEach(a => { result[a.codigo_articulo] = parseFloat(stocks[a.codigo_articulo]); });
    onSave(result);
  }

  return (
    <div className="main-card">
      <div className="card-header">
        <div className="card-header-icon">🔢</div>
        <div>
          <div className="card-header-title">Paso 2 — Stock real contado</div>
          <div className="card-header-sub">Ingresá el stock que contaste físicamente en el depósito</div>
        </div>
        <div style={{ marginLeft: "auto" }}>
          <span className="badge badge-amber">Bloque {blockIndex + 1}/{totalBlocks}</span>
        </div>
      </div>
      <div className="card-body">
        <div className="step-indicator">
          <div className="step-dot done" />
          <div className="step-text" style={{ color: "#4adf8a" }}>Stock sistema ✓</div>
          <div style={{ width: 24, height: 1, background: "#2a5a3a" }} />
          <div className="step-dot active" />
          <div className="step-text">Stock real</div>
          <div style={{ width: 24, height: 1, background: "#2a2e3d" }} />
          <div className="step-dot" />
          <div className="step-text">Guardar</div>
        </div>

        {Object.keys(errors).length > 0 && (
          <div className="alert alert-error">
            <span className="alert-icon">⛔</span>
            Completá todos los stocks reales antes de guardar.
          </div>
        )}

        <div className="table-wrapper">
          <table className="articles-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Código</th>
                <th>Descripción</th>
                <th>Stk. sistema</th>
                <th>Stock real</th>
                <th>Dif.</th>
              </tr>
            </thead>
            <tbody>
              {articulos.map((art, idx) => {
                const sis = stockSistema[art.codigo_articulo] ?? 0;
                const real = stocks[art.codigo_articulo] !== "" && !isNaN(parseFloat(stocks[art.codigo_articulo]))
                  ? parseFloat(stocks[art.codigo_articulo]) : null;
                const diff = real !== null ? real - sis : null;
                return (
                  <tr key={art.codigo_articulo}>
                    <td style={{ color: "#484440", fontSize: 12, width: 30 }}>{blockIndex * CONFIG.BLOCK_SIZE + idx + 1}</td>
                    <td className="td-code">{art.codigo_articulo}</td>
                    <td className="td-desc"><span className="td-desc-text" title={art.descripcion}>{art.descripcion}</span></td>
                    <td><span className="stock-display">{sis}</span></td>
                    <td>
                      <input
                        className={`stock-input ${errors[art.codigo_articulo] ? "error" : stocks[art.codigo_articulo] !== "" ? "has-value" : ""}`}
                        type="number"
                        step="any"
                        min="0"
                        placeholder="0"
                        value={stocks[art.codigo_articulo]}
                        onChange={e => setStock(art.codigo_articulo, e.target.value)}
                      />
                    </td>
                    <td>
                      {diff !== null ? (
                        diff > 0 ? <span className="diff-positive">+{diff}</span>
                          : diff < 0 ? <span className="diff-negative">{diff}</span>
                          : <span className="diff-zero">0</span>
                      ) : <span style={{ color: "#2a2e3d" }}>—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="btn-row">
          {saving ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
              <div className="spinner" />
              <span style={{ color: "#686460", fontSize: 13 }}>Guardando en Google Sheets...</span>
            </div>
          ) : (
            <button className="btn btn-success" style={{ flex: 1 }} onClick={validateAndSave}>
              💾 Guardar bloque y continuar →
            </button>
          )}
          <button className="btn btn-ghost" onClick={onBack} disabled={saving}>
            ← Volver
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// COMPONENTE: Pantalla final
// ============================================================
function FinalScreen({ stats, onRestart }) {
  return (
    <div className="main-card">
      <div className="card-header">
        <div className="card-header-icon">✅</div>
        <div>
          <div className="card-header-title">Conteo finalizado</div>
          <div className="card-header-sub">Todos los artículos han sido contados y registrados</div>
        </div>
        <div style={{ marginLeft: "auto" }}>
          <span className="badge badge-green">Completado</span>
        </div>
      </div>
      <div className="card-body">
        <div className="alert alert-success" style={{ marginBottom: "1.5rem" }}>
          <span className="alert-icon">✅</span>
          <span>Los datos fueron guardados correctamente en Google Sheets.</span>
        </div>

        <div className="summary-grid">
          <div className="summary-card">
            <span className="summary-value" style={{ color: "#4a9eff" }}>{stats.total}</span>
            <span className="summary-label">Total artículos</span>
          </div>
          <div className="summary-card">
            <span className="summary-value" style={{ color: "#4adf8a" }}>{stats.sinDif}</span>
            <span className="summary-label">Sin diferencia</span>
          </div>
          <div className="summary-card">
            <span className="summary-value" style={{ color: "#f06060" }}>{stats.positivas}</span>
            <span className="summary-label">Dif. positivas</span>
          </div>
          <div className="summary-card">
            <span className="summary-value" style={{ color: "#f0a830" }}>{stats.negativas}</span>
            <span className="summary-label">Dif. negativas</span>
          </div>
          <div className="summary-card">
            <span className="summary-value" style={{ color: stats.netaDif > 0 ? "#f06060" : stats.netaDif < 0 ? "#f0a830" : "#484440" }}>
              {stats.netaDif > 0 ? "+" : ""}{stats.netaDif}
            </span>
            <span className="summary-label">Diferencia neta</span>
          </div>
        </div>

        <button className="btn btn-primary btn-full" onClick={onRestart}>
          Iniciar nuevo conteo →
        </button>
      </div>
    </div>
  );
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function InventarioApp() {
  const { articles, loading, error: loadError } = useArticles();

  // Estado global de la sesión
  const [screen, setScreen] = useState("start"); // start | filter | step1 | step2 | done
  const [usuario, setUsuario] = useState("");
  const [selection, setSelection] = useState(null); // { clase, subclase, grupo, articulos }
  const [currentBlock, setCurrentBlock] = useState(0);
  const [stockSistema, setStockSistema] = useState(null);
  const [savedRecords, setSavedRecords] = useState([]); // todos los registros guardados
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const savedRef = useRef(false); // anti-doble-clic

  // Sesión guardada
  const savedSession = loadFromLocalStorage("inventario_session");

  // Persistir sesión
  useEffect(() => {
    if (screen !== "start" && screen !== "done" && selection) {
      saveToLocalStorage("inventario_session", {
        usuario,
        clase: selection.clase,
        subclase: selection.subclase,
        grupo: selection.grupo,
        total: selection.articulos.length,
        currentBlock,
        step: screen,
      });
    }
  }, [screen, usuario, selection, currentBlock]);

  function handleStart(user) {
    setUsuario(user);
    setScreen("filter");
  }

  function handleSelect(sel, resume = false) {
    if (resume && savedSession) {
      // Reconstruir selección desde artículos filtrados
      const arts = articles.filter(a =>
        a.clase === savedSession.clase &&
        a.subclase === savedSession.subclase &&
        a.grupo === savedSession.grupo
      );
      setSelection({ ...savedSession, articulos: arts });
      setCurrentBlock(savedSession.currentBlock);
      setScreen(savedSession.step || "step1");
      return;
    }
    setSelection(sel);
    setCurrentBlock(0);
    setScreen("step1");
  }

  function handleReset() {
    localStorage.removeItem("inventario_session");
    setScreen("filter");
    setCurrentBlock(0);
    setSelection(null);
    setSavedRecords([]);
    setSaveError(null);
    setSaveSuccess(false);
    savedRef.current = false;
  }

  function handleStep1Next(stocks) {
    setStockSistema(stocks);
    setScreen("step2");
  }

  function handleStep2Back() {
    setScreen("step1");
  }

  async function handleSave(stockReal) {
    if (savedRef.current) return; // anti-doble clic
    savedRef.current = true;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    const { fecha, hora } = formatDateTime();
    const blocksTotal = Math.ceil(selection.articulos.length / CONFIG.BLOCK_SIZE);
    const blockArticulos = selection.articulos.slice(
      currentBlock * CONFIG.BLOCK_SIZE,
      (currentBlock + 1) * CONFIG.BLOCK_SIZE
    );

    const rows = blockArticulos.map(art => ({
      fecha,
      hora,
      usuario,
      clase: selection.clase,
      subclase: selection.subclase,
      grupo: selection.grupo,
      numero_bloque: currentBlock + 1,
      codigo_articulo: art.codigo_articulo,
      descripcion: art.descripcion,
      stock_sistema: stockSistema[art.codigo_articulo],
      stock_real: stockReal[art.codigo_articulo],
      diferencia: stockReal[art.codigo_articulo] - stockSistema[art.codigo_articulo],
    }));

    // Guardar en Google Sheets
    try {
      if (CONFIG.GOOGLE_SHEETS_API_URL && CONFIG.GOOGLE_SHEETS_API_URL !== "https://script.google.com/macros/s/TU_SCRIPT_ID/exec") {
        const response = await fetch(CONFIG.GOOGLE_SHEETS_API_URL, {
          method: "POST",
          mode: "no-cors", // Google Apps Script requiere no-cors
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows }),
        });
      } else {
        // MODO DEMO: simular guardado
        await new Promise(r => setTimeout(r, 1200));
        console.log("📊 [DEMO] Registros que se guardarían:", rows);
      }
    } catch (err) {
      setSaving(false);
      setSaveError("Error al conectar con Google Sheets. Verificá tu conexión.");
      savedRef.current = false;
      return;
    }

    // Actualizar estado local
    const allRecords = [...savedRecords, ...rows];
    setSavedRecords(allRecords);
    setSaving(false);
    setSaveSuccess(true);

    const nextBlock = currentBlock + 1;
    if (nextBlock >= blocksTotal) {
      // Calcular estadísticas finales
      const stats = {
        total: allRecords.length,
        sinDif: allRecords.filter(r => r.diferencia === 0).length,
        positivas: allRecords.filter(r => r.diferencia > 0).length,
        negativas: allRecords.filter(r => r.diferencia < 0).length,
        netaDif: allRecords.reduce((sum, r) => sum + r.diferencia, 0),
      };
      // Limpiar sesión
      localStorage.removeItem("inventario_session");
      setScreen("done");
      setSelection(prev => ({ ...prev, finalStats: stats }));
    } else {
      setCurrentBlock(nextBlock);
      setScreen("step1");
      setStockSistema(null);
      savedRef.current = false;
    }
  }

  // Bloque actual de artículos
  const blockArticulos = selection
    ? selection.articulos.slice(currentBlock * CONFIG.BLOCK_SIZE, (currentBlock + 1) * CONFIG.BLOCK_SIZE)
    : [];
  const totalBlocks = selection ? Math.ceil(selection.articulos.length / CONFIG.BLOCK_SIZE) : 0;
  const progressPct = selection && totalBlocks > 0 ? Math.round((currentBlock / totalBlocks) * 100) : 0;

  return (
    <>
      <style>{styles}</style>
      <div className="app-wrapper">
        {/* Header */}
        <header className="app-header">
          <span className="app-logo">INV</span>
          <span className="app-title">Sistema de Inventario</span>
          <span className="header-spacer" />
          {usuario && <span className="badge badge-blue">👤 {usuario}</span>}
          {screen !== "start" && screen !== "filter" && selection && (
            <span className="badge badge-amber">{selection.clase} / {selection.subclase}</span>
          )}
        </header>

        {/* Barra de progreso (solo durante conteo) */}
        {(screen === "step1" || screen === "step2") && selection && (
          <div style={{ width: "100%", maxWidth: 760, margin: "1rem 1rem 0", padding: "0 0.5rem" }}>
            <div className="progress-bar-wrapper">
              <div className="progress-bar-fill" style={{ width: `${progressPct}%` }} />
            </div>
            <div className="progress-label">
              <span>Bloque {currentBlock + 1} de {totalBlocks}</span>
              <span>{savedRecords.length} artículos guardados</span>
            </div>
          </div>
        )}

        {/* Mensaje de éxito al guardar */}
        {saveSuccess && screen === "step1" && (
          <div style={{ width: "100%", maxWidth: 760, margin: "0.5rem 1rem 0", padding: "0 0.5rem" }}>
            <div className="alert alert-success">
              <span className="alert-icon">✅</span>
              Bloque {currentBlock} guardado correctamente. Continuando con el siguiente bloque.
            </div>
          </div>
        )}

        {saveError && (
          <div style={{ width: "100%", maxWidth: 760, margin: "0.5rem 1rem 0", padding: "0 0.5rem" }}>
            <div className="alert alert-error">
              <span className="alert-icon">⛔</span>
              {saveError}
            </div>
          </div>
        )}

        {/* Pantallas */}
        {loading ? (
          <div className="main-card">
            <div className="card-body" style={{ display: "flex", alignItems: "center", gap: 12, padding: "2rem 1.5rem" }}>
              <div className="spinner" />
              <span style={{ color: "#686460" }}>Cargando base de artículos...</span>
            </div>
          </div>
        ) : (
          <>
            {screen === "start" && (
              <StartScreen onStart={handleStart} savedSession={savedSession} />
            )}

            {screen === "filter" && (
              <FilterScreen
                articles={articles}
                usuario={usuario}
                savedSession={savedSession?.usuario === usuario ? savedSession : null}
                onSelect={handleSelect}
                onReset={handleReset}
              />
            )}

            {screen === "step1" && selection && (
              <StockSistemaStep
                block={currentBlock}
                blockIndex={currentBlock}
                totalBlocks={totalBlocks}
                articulos={blockArticulos}
                onNext={handleStep1Next}
                onAbort={handleReset}
              />
            )}

            {screen === "step2" && selection && stockSistema && (
              <StockRealStep
                block={currentBlock}
                blockIndex={currentBlock}
                totalBlocks={totalBlocks}
                articulos={blockArticulos}
                stockSistema={stockSistema}
                onSave={handleSave}
                onBack={handleStep2Back}
                saving={saving}
              />
            )}

            {screen === "done" && selection?.finalStats && (
              <FinalScreen stats={selection.finalStats} onRestart={handleReset} />
            )}
          </>
        )}

        {/* Demo notice */}
        {!CONFIG.ARTICLES_CSV_URL && screen !== "start" && (
          <div style={{ width: "100%", maxWidth: 760, margin: "1rem 1rem 0", padding: "0 0.5rem" }}>
            <div className="alert alert-warning">
              <span className="alert-icon">⚙️</span>
              <span><strong>Modo demo</strong> — usando artículos de ejemplo. Configurá <code>ARTICLES_CSV_URL</code> y <code>GOOGLE_SHEETS_API_URL</code> para producción.</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
