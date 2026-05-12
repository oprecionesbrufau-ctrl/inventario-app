/**
 * APLICACIÓN DE CONTEO DE INVENTARIO v2
 * Cambios respecto a v1:
 * - Fix parseCSV: maneja comillas dobles dentro de campos
 * - Pausar y retomar conteo en cualquier momento (localStorage robusto)
 * - Click en descripción abre búsqueda en portal web de Brufau
 * - Checkbox TARJETA KANBAN por artículo
 * - Columna "tarjeta" registrada en Google Sheets
 */

import { useState, useEffect, useRef } from "react";

// ============================================================
// CONFIGURACIÓN — Modificar estos valores
// ============================================================
const CONFIG = {
  GOOGLE_SHEETS_API_URL: "https://script.google.com/macros/s/AKfycbyc1qID5geDXRJEZeFmI14Kf18vudtW6PGx2nTZDMBhqyDTI1cR98CTBii1F7sdgHiQJw/exec",
  ARTICLES_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSiuIXn5WDm8bSD6T4p4Q8cjh8ZJcnodQIJz9Kwx7YnIddzTFmui-tTmGZZmzuvZ9H7trkrH8MXohrg/pub?output=csv",
  BLOCK_SIZE: 10,
  PORTAL_SEARCH_URL: "https://www.brufausanitarios.com.ar/search/?q=",
};

// ============================================================
// DATOS DE DEMO
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
  { codigo_articulo: "REP-001", descripcion: "Cartucho cerámico 35mm universal", clase: "REPUESTOS", subclase: "GRIFERIA", grupo: "CARTUCHOS" },
  { codigo_articulo: "REP-002", descripcion: "Kit gomas para grifería bicomando", clase: "REPUESTOS", subclase: "GRIFERIA", grupo: "GOMAS" },
  { codigo_articulo: "REP-003", descripcion: "Flotante para cisterna completo", clase: "REPUESTOS", subclase: "CISTERNA", grupo: "FLOTANTES" },
  { codigo_articulo: "REP-004", descripcion: "Válvula de descarga para cisterna", clase: "REPUESTOS", subclase: "CISTERNA", grupo: "VALVULAS" },
];

// ============================================================
// UTILIDADES
// ============================================================

// Parser CSV robusto — maneja comillas dobles dentro de campos
// Ej: "LLUVIA BIDET BRONCE CON MANG.3/8"" @" se parsea correctamente
function parseCSV(text) {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];

  function parseLine(line) {
    const vals = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"' && !inQuotes) {
        inQuotes = true;
      } else if (ch === '"' && inQuotes && line[i + 1] === '"') {
        current += '"'; i++;
      } else if (ch === '"' && inQuotes) {
        inQuotes = false;
      } else if (ch === ',' && !inQuotes) {
        vals.push(current.trim()); current = "";
      } else {
        current += ch;
      }
    }
    vals.push(current.trim());
    return vals;
  }

  const headers = parseLine(lines[0]).map(h =>
    h.replace(/^"|"$/g, "").toLowerCase().replace(/ /g, "_").trim()
  );

  return lines.slice(1).map(line => {
    const vals = parseLine(line);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (vals[i] || "").replace(/^"|"$/g, ""); });
    return obj;
  }).filter(r => r.codigo_articulo && r.codigo_articulo.trim() !== "");
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

// localStorage — claves con versión para evitar conflictos con v1
const LS_SESSION = "inventario_session_v2";
const LS_RECORDS = "inventario_records_v2";

function saveSession(data) { try { localStorage.setItem(LS_SESSION, JSON.stringify(data)); } catch {} }
function loadSession() { try { const d = localStorage.getItem(LS_SESSION); return d ? JSON.parse(d) : null; } catch { return null; } }
function saveRecords(data) { try { localStorage.setItem(LS_RECORDS, JSON.stringify(data)); } catch {} }
function loadRecords() { try { const d = localStorage.getItem(LS_RECORDS); return d ? JSON.parse(d) : []; } catch { return []; } }
function clearSession() { try { localStorage.removeItem(LS_SESSION); localStorage.removeItem(LS_RECORDS); } catch {} }

// ============================================================
// ESTILOS
// ============================================================
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@500&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body, #root { font-family: 'IBM Plex Sans', sans-serif; background: #0f1117; color: #e8e6e0; min-height: 100vh; }
  .app-wrapper { min-height: 100vh; background: #0f1117; display: flex; flex-direction: column; align-items: center; padding: 0 0 3rem; }
  .app-header { width: 100%; background: #151820; border-bottom: 1px solid #2a2e3d; padding: 0.875rem 1.5rem; display: flex; align-items: center; gap: 1rem; position: sticky; top: 0; z-index: 100; }
  .app-logo { font-family: 'IBM Plex Mono', monospace; font-size: 13px; font-weight: 500; color: #4a9eff; letter-spacing: 0.05em; text-transform: uppercase; }
  .app-title { font-size: 14px; font-weight: 500; color: #a8a4a0; }
  .header-spacer { flex: 1; }
  .badge { font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 3px; letter-spacing: 0.04em; text-transform: uppercase; }
  .badge-blue { background: #1a2d4a; color: #4a9eff; border: 1px solid #2a4a7a; }
  .badge-green { background: #1a3a24; color: #4adf8a; border: 1px solid #2a5a3a; }
  .badge-amber { background: #3a2a0a; color: #f0a830; border: 1px solid #5a3a0a; }
  .main-card { width: 100%; max-width: 820px; margin: 2rem 1rem 0; background: #151820; border: 1px solid #2a2e3d; border-radius: 6px; overflow: hidden; }
  .card-header { padding: 1.25rem 1.5rem; border-bottom: 1px solid #2a2e3d; display: flex; align-items: center; gap: 12px; }
  .card-header-icon { width: 32px; height: 32px; background: #1a2d4a; border: 1px solid #2a4a7a; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 16px; color: #4a9eff; flex-shrink: 0; }
  .card-header-title { font-size: 15px; font-weight: 600; color: #e8e6e0; }
  .card-header-sub { font-size: 12px; color: #686460; margin-top: 2px; }
  .card-body { padding: 1.5rem; }
  .form-group { margin-bottom: 1.25rem; }
  .form-label { display: block; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: #686460; margin-bottom: 6px; }
  .form-input, .form-select { width: 100%; background: #0f1117; border: 1px solid #2a2e3d; border-radius: 4px; padding: 0.65rem 0.875rem; font-family: 'IBM Plex Sans', sans-serif; font-size: 14px; color: #e8e6e0; outline: none; transition: border-color 0.15s; -webkit-appearance: none; appearance: none; }
  .form-input:focus, .form-select:focus { border-color: #4a9eff; }
  .form-input::placeholder { color: #484440; }
  .form-select { cursor: pointer; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23686460' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; padding-right: 2rem; }
  .form-select option { background: #151820; }
  .form-select:disabled { opacity: 0.4; cursor: not-allowed; }
  .form-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; }
  @media (max-width: 600px) { .form-row { grid-template-columns: 1fr; } }
  .btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 0.7rem 1.5rem; font-family: 'IBM Plex Sans', sans-serif; font-size: 14px; font-weight: 600; border-radius: 4px; border: none; cursor: pointer; transition: opacity 0.15s, transform 0.1s; letter-spacing: 0.02em; }
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
  .btn-warning { background: #3a2a0a; color: #f0c870; border: 1px solid #5a3a0a; }
  .btn-warning:hover:not(:disabled) { background: #5a3a0a; }
  .btn-full { width: 100%; }
  .btn-row { display: flex; gap: 0.75rem; margin-top: 1.5rem; flex-wrap: wrap; }
  .articles-table { width: 100%; border-collapse: collapse; }
  .articles-table th { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: #484440; padding: 0.5rem 0.75rem; text-align: left; border-bottom: 1px solid #2a2e3d; white-space: nowrap; }
  .articles-table td { padding: 0.625rem 0.75rem; border-bottom: 1px solid #1e2230; font-size: 13px; vertical-align: middle; }
  .articles-table tr:last-child td { border-bottom: none; }
  .articles-table tr:hover td { background: #1a1e2a; }
  .td-code { font-family: 'IBM Plex Mono', monospace; font-size: 12px; color: #4a9eff; white-space: nowrap; }
  .desc-link { color: #c8c4c0; text-decoration: none; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 200px; display: block; transition: color 0.15s; }
  .desc-link:hover { color: #4a9eff; text-decoration: underline; }
  .stock-input { width: 85px; background: #0f1117; border: 1px solid #2a2e3d; border-radius: 3px; padding: 5px 8px; font-family: 'IBM Plex Mono', monospace; font-size: 13px; color: #e8e6e0; text-align: right; outline: none; transition: border-color 0.15s; }
  .stock-input:focus { border-color: #4a9eff; }
  .stock-input.has-value { border-color: #2a5a3a; color: #4adf8a; }
  .stock-input.error { border-color: #f06060; }
  .stock-display { font-family: 'IBM Plex Mono', monospace; font-size: 13px; color: #4adf8a; background: #1a3a24; border: 1px solid #2a5a3a; border-radius: 3px; padding: 5px 8px; min-width: 70px; text-align: right; display: inline-block; }
  .diff-positive { color: #f06060; font-family: 'IBM Plex Mono', monospace; font-size: 13px; font-weight: 600; }
  .diff-negative { color: #f0a830; font-family: 'IBM Plex Mono', monospace; font-size: 13px; font-weight: 600; }
  .diff-zero { color: #484440; font-family: 'IBM Plex Mono', monospace; font-size: 13px; }
  .tarjeta-cell { text-align: center; }
  .tarjeta-checkbox { width: 18px; height: 18px; accent-color: #4adf8a; cursor: pointer; }
  .tarjeta-si { color: #4adf8a; font-size: 11px; font-weight: 600; display: block; margin-top: 1px; }
  .tarjeta-no { color: #484440; font-size: 11px; display: block; margin-top: 1px; }
  .progress-bar-wrapper { background: #0f1117; border: 1px solid #2a2e3d; border-radius: 3px; height: 6px; overflow: hidden; margin-bottom: 0.5rem; }
  .progress-bar-fill { height: 100%; background: #4a9eff; border-radius: 3px; transition: width 0.4s ease; }
  .progress-label { font-size: 11px; color: #484440; display: flex; justify-content: space-between; }
  .alert { padding: 0.75rem 1rem; border-radius: 4px; font-size: 13px; margin-bottom: 1rem; display: flex; align-items: flex-start; gap: 10px; }
  .alert-error { background: #2a1010; border: 1px solid #5a2020; color: #f08080; }
  .alert-success { background: #102a18; border: 1px solid #205a30; color: #80d890; }
  .alert-info { background: #101a2a; border: 1px solid #1a3a5a; color: #80b8f0; }
  .alert-warning { background: #2a1e08; border: 1px solid #5a3a10; color: #f0c870; }
  .alert-icon { font-size: 16px; flex-shrink: 0; margin-top: 1px; }
  .spinner { width: 20px; height: 20px; border: 2px solid #2a2e3d; border-top-color: #4a9eff; border-radius: 50%; animation: spin 0.7s linear infinite; flex-shrink: 0; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
  .summary-card { background: #0f1117; border: 1px solid #2a2e3d; border-radius: 4px; padding: 1rem; }
  .summary-value { font-family: 'IBM Plex Mono', monospace; font-size: 28px; font-weight: 500; display: block; margin-bottom: 4px; }
  .summary-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #484440; }
  .step-indicator { display: flex; align-items: center; gap: 8px; margin-bottom: 1.25rem; padding-bottom: 1rem; border-bottom: 1px solid #1e2230; }
  .step-dot { width: 8px; height: 8px; border-radius: 50%; background: #2a2e3d; flex-shrink: 0; }
  .step-dot.active { background: #4a9eff; }
  .step-dot.done { background: #2aaa56; }
  .step-text { font-size: 12px; color: #686460; }
  .table-wrapper { overflow-x: auto; }
  @media (max-width: 500px) { .main-card { margin: 1rem 0.5rem 0; } .card-body { padding: 1rem; } .stock-input { width: 68px; } .desc-link { max-width: 110px; } .form-row { grid-template-columns: 1fr; } }
`;

// ============================================================
// HOOK: Carga de artículos
// ============================================================
function useArticles() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (CONFIG.ARTICLES_CSV_URL) {
        try {
          const res = await fetch(CONFIG.ARTICLES_CSV_URL);
          const text = await res.text();
          const parsed = parseCSV(text);
          if (parsed.length > 0) { setArticles(parsed); setLoading(false); return; }
        } catch {}
      }
      setArticles(DEMO_ARTICLES);
      setLoading(false);
    }
    load();
  }, []);

  return { articles, loading };
}

// ============================================================
// PANTALLA: Inicio
// ============================================================
function StartScreen({ onStart }) {
  const [usuario, setUsuario] = useState("");
  const [error, setError] = useState("");
  const session = loadSession();

  function handleStart() {
    if (!usuario.trim()) { setError("Ingresá tu nombre de usuario."); return; }
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
        {session && (
          <div className="alert alert-warning">
            <span className="alert-icon">💾</span>
            <div>
              <strong>Hay un conteo interrumpido guardado</strong><br />
              Usuario: {session.usuario} — {session.clase} / {session.subclase} / {session.grupo}, bloque {session.currentBlock + 1}<br />
              <span style={{ fontSize: 12, color: "#a89060" }}>Ingresá con el mismo usuario para retomarlo.</span>
            </div>
          </div>
        )}
        <div className="form-group">
          <label className="form-label">Nombre de usuario</label>
          <input
            className="form-input" type="text" placeholder="Ej: Juan Pérez"
            value={usuario}
            onChange={e => { setUsuario(e.target.value); setError(""); }}
            onKeyDown={e => e.key === "Enter" && handleStart()}
            autoFocus
          />
          {error && <div style={{ color: "#f06060", fontSize: 12, marginTop: 6 }}>{error}</div>}
        </div>
        <button className="btn btn-primary btn-full" onClick={handleStart}>Ingresar →</button>
      </div>
    </div>
  );
}

// ============================================================
// PANTALLA: Filtros
// ============================================================
function FilterScreen({ articles, usuario, onSelect, onResume, onDiscardAndNew }) {
  const [clase, setClase] = useState("");
  const [subclase, setSubclase] = useState("");
  const [grupo, setGrupo] = useState("");

  const session = loadSession();
  const canResume = session && session.usuario === usuario;

  const clases = getUnique(articles, "clase");
  const subclases = clase ? getUnique(articles.filter(a => a.clase === clase), "subclase") : [];
  const grupos = (clase && subclase) ? getUnique(articles.filter(a => a.clase === clase && a.subclase === subclase), "grupo") : [];
  const filtered = articles.filter(a => (!clase || a.clase === clase) && (!subclase || a.subclase === subclase) && (!grupo || a.grupo === grupo));
  const canStart = clase && subclase && grupo;

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
            <span className="alert-icon">⏸️</span>
            <div>
              <strong>Conteo interrumpido encontrado</strong><br />
              {session.clase} / {session.subclase} / {session.grupo} — Bloque {session.currentBlock + 1} de {Math.ceil(session.total / CONFIG.BLOCK_SIZE)} — {session.recordsCount} artículos ya guardados
              <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="btn btn-success" style={{ fontSize: 12, padding: "5px 14px" }} onClick={onResume}>▶ Retomar conteo</button>
                <button className="btn btn-ghost" style={{ fontSize: 12, padding: "5px 14px" }} onClick={onDiscardAndNew}>Descartar y empezar nuevo</button>
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
            <span><strong>{filtered.length} artículos</strong> → <strong>{Math.ceil(filtered.length / CONFIG.BLOCK_SIZE)} bloques</strong> de {CONFIG.BLOCK_SIZE}</span>
          </div>
        )}
        <button className="btn btn-primary btn-full" disabled={!canStart}
          onClick={() => onSelect({ clase, subclase, grupo, articulos: filtered })}>
          Iniciar conteo →
        </button>
      </div>
    </div>
  );
}

// ============================================================
// PANTALLA: Paso 1 — Stock Sistema
// ============================================================
function StockSistemaStep({ blockIndex, totalBlocks, articulos, onNext, onPause, onAbort }) {
  const [stocks, setStocks] = useState(() => { const i = {}; articulos.forEach(a => { i[a.codigo_articulo] = ""; }); return i; });
  const [tarjetas, setTarjetas] = useState(() => { const i = {}; articulos.forEach(a => { i[a.codigo_articulo] = false; }); return i; });
  const [errors, setErrors] = useState({});

  function setStock(code, val) { setStocks(s => ({ ...s, [code]: val })); setErrors(e => { const n = { ...e }; delete n[code]; return n; }); }
  function toggleTarjeta(code) { setTarjetas(t => ({ ...t, [code]: !t[code] })); }

  function validateAndNext() {
    const errs = {};
    articulos.forEach(a => { const v = stocks[a.codigo_articulo]; if (v === "" || isNaN(parseFloat(v))) errs[a.codigo_articulo] = true; });
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    const result = {}; articulos.forEach(a => { result[a.codigo_articulo] = parseFloat(stocks[a.codigo_articulo]); });
    onNext(result, tarjetas);
  }

  return (
    <div className="main-card">
      <div className="card-header">
        <div className="card-header-icon">📊</div>
        <div>
          <div className="card-header-title">Paso 1 — Stock según sistema</div>
          <div className="card-header-sub">Ingresá el stock del sistema y marcá si el artículo tiene tarjeta KANBAN</div>
        </div>
        <div style={{ marginLeft: "auto" }}><span className="badge badge-blue">Bloque {blockIndex + 1}/{totalBlocks}</span></div>
      </div>
      <div className="card-body">
        <div className="step-indicator">
          <div className="step-dot active" /><span className="step-text">Stock sistema</span>
          <div style={{ width: 24, height: 1, background: "#2a2e3d" }} />
          <div className="step-dot" /><span className="step-text">Stock real</span>
          <div style={{ width: 24, height: 1, background: "#2a2e3d" }} />
          <div className="step-dot" /><span className="step-text">Guardar</span>
        </div>
        {Object.keys(errors).length > 0 && (
          <div className="alert alert-error"><span className="alert-icon">⛔</span>Completá todos los stocks antes de continuar.</div>
        )}
        <div className="table-wrapper">
          <table className="articles-table">
            <thead>
              <tr>
                <th>#</th><th>Código</th><th>Descripción</th><th>Stock sistema</th><th style={{ textAlign: "center" }}>Tarjeta</th>
              </tr>
            </thead>
            <tbody>
              {articulos.map((art, idx) => (
                <tr key={art.codigo_articulo}>
                  <td style={{ color: "#484440", fontSize: 12, width: 28 }}>{blockIndex * CONFIG.BLOCK_SIZE + idx + 1}</td>
                  <td className="td-code">{art.codigo_articulo}</td>
                  <td>
                    <a className="desc-link"
                      href={`${CONFIG.PORTAL_SEARCH_URL}${encodeURIComponent(art.codigo_articulo)}`}
                      target="_blank" rel="noopener noreferrer"
                      title={`Buscar ${art.codigo_articulo} en brufausanitarios.com.ar`}>
                      {art.descripcion}
                    </a>
                  </td>
                  <td>
                    <input className={`stock-input ${errors[art.codigo_articulo] ? "error" : stocks[art.codigo_articulo] !== "" ? "has-value" : ""}`}
                      type="number" step="any" min="0" placeholder="0"
                      value={stocks[art.codigo_articulo]}
                      onChange={e => setStock(art.codigo_articulo, e.target.value)} />
                  </td>
                  <td className="tarjeta-cell">
                    <input type="checkbox" className="tarjeta-checkbox"
                      checked={tarjetas[art.codigo_articulo]}
                      onChange={() => toggleTarjeta(art.codigo_articulo)} />
                    <span className={tarjetas[art.codigo_articulo] ? "tarjeta-si" : "tarjeta-no"}>
                      {tarjetas[art.codigo_articulo] ? "SÍ" : "NO"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="btn-row">
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={validateAndNext}>Siguiente — cargar stock real →</button>
          <button className="btn btn-warning" onClick={onPause}>⏸ Pausar</button>
          <button className="btn btn-danger" onClick={onAbort}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PANTALLA: Paso 2 — Stock Real
// ============================================================
function StockRealStep({ blockIndex, totalBlocks, articulos, stockSistema, tarjetas, onSave, onBack, saving }) {
  const [stocks, setStocks] = useState(() => { const i = {}; articulos.forEach(a => { i[a.codigo_articulo] = ""; }); return i; });
  const [errors, setErrors] = useState({});

  function setStock(code, val) { setStocks(s => ({ ...s, [code]: val })); setErrors(e => { const n = { ...e }; delete n[code]; return n; }); }

  function validateAndSave() {
    const errs = {};
    articulos.forEach(a => { const v = stocks[a.codigo_articulo]; if (v === "" || isNaN(parseFloat(v))) errs[a.codigo_articulo] = true; });
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    const result = {}; articulos.forEach(a => { result[a.codigo_articulo] = parseFloat(stocks[a.codigo_articulo]); });
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
        <div style={{ marginLeft: "auto" }}><span className="badge badge-amber">Bloque {blockIndex + 1}/{totalBlocks}</span></div>
      </div>
      <div className="card-body">
        <div className="step-indicator">
          <div className="step-dot done" /><span className="step-text" style={{ color: "#4adf8a" }}>Sistema ✓</span>
          <div style={{ width: 24, height: 1, background: "#2a5a3a" }} />
          <div className="step-dot active" /><span className="step-text">Stock real</span>
          <div style={{ width: 24, height: 1, background: "#2a2e3d" }} />
          <div className="step-dot" /><span className="step-text">Guardar</span>
        </div>
        {Object.keys(errors).length > 0 && (
          <div className="alert alert-error"><span className="alert-icon">⛔</span>Completá todos los stocks reales antes de guardar.</div>
        )}
        <div className="table-wrapper">
          <table className="articles-table">
            <thead>
              <tr>
                <th>#</th><th>Código</th><th>Descripción</th><th>Stk.sis.</th><th>Stock real</th><th>Dif.</th><th style={{ textAlign: "center" }}>Tarjeta</th>
              </tr>
            </thead>
            <tbody>
              {articulos.map((art, idx) => {
                const sis = stockSistema[art.codigo_articulo] ?? 0;
                const rv = stocks[art.codigo_articulo];
                const real = (rv !== "" && !isNaN(parseFloat(rv))) ? parseFloat(rv) : null;
                const diff = real !== null ? real - sis : null;
                const tieneTarjeta = tarjetas && tarjetas[art.codigo_articulo];
                return (
                  <tr key={art.codigo_articulo}>
                    <td style={{ color: "#484440", fontSize: 12, width: 28 }}>{blockIndex * CONFIG.BLOCK_SIZE + idx + 1}</td>
                    <td className="td-code">{art.codigo_articulo}</td>
                    <td>
                      <a className="desc-link"
                        href={`${CONFIG.PORTAL_SEARCH_URL}${encodeURIComponent(art.codigo_articulo)}`}
                        target="_blank" rel="noopener noreferrer">
                        {art.descripcion}
                      </a>
                    </td>
                    <td><span className="stock-display">{sis}</span></td>
                    <td>
                      <input className={`stock-input ${errors[art.codigo_articulo] ? "error" : rv !== "" ? "has-value" : ""}`}
                        type="number" step="any" min="0" placeholder="0"
                        value={rv} onChange={e => setStock(art.codigo_articulo, e.target.value)} />
                    </td>
                    <td>
                      {diff !== null
                        ? diff > 0 ? <span className="diff-positive">+{diff}</span>
                          : diff < 0 ? <span className="diff-negative">{diff}</span>
                          : <span className="diff-zero">0</span>
                        : <span style={{ color: "#2a2e3d" }}>—</span>}
                    </td>
                    <td className="tarjeta-cell">
                      <span className={tieneTarjeta ? "tarjeta-si" : "tarjeta-no"}>{tieneTarjeta ? "✓ SÍ" : "NO"}</span>
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
            <button className="btn btn-success" style={{ flex: 1 }} onClick={validateAndSave}>💾 Guardar bloque y continuar →</button>
          )}
          <button className="btn btn-ghost" onClick={onBack} disabled={saving}>← Volver</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PANTALLA: Pausado
// ============================================================
function PauseScreen({ onResume, onDiscard }) {
  const session = loadSession();
  return (
    <div className="main-card">
      <div className="card-header">
        <div className="card-header-icon">⏸️</div>
        <div>
          <div className="card-header-title">Conteo pausado</div>
          <div className="card-header-sub">El progreso está guardado — podés cerrar el navegador y retomarlo cuando quieras</div>
        </div>
      </div>
      <div className="card-body">
        {session && (
          <div className="alert alert-info" style={{ marginBottom: "1.5rem" }}>
            <span className="alert-icon">💾</span>
            <div>
              <strong>Progreso guardado:</strong><br />
              Usuario: {session.usuario}<br />
              {session.clase} / {session.subclase} / {session.grupo}<br />
              Bloque {session.currentBlock + 1} de {Math.ceil(session.total / CONFIG.BLOCK_SIZE)} — {session.recordsCount} artículos ya registrados en Sheets
            </div>
          </div>
        )}
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <button className="btn btn-success" style={{ flex: 1 }} onClick={onResume}>▶ Retomar conteo</button>
          <button className="btn btn-danger" onClick={onDiscard}>Descartar conteo</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PANTALLA: Final
// ============================================================
function FinalScreen({ stats, onRestart }) {
  const nd = stats.netaDif || 0;
  return (
    <div className="main-card">
      <div className="card-header">
        <div className="card-header-icon">✅</div>
        <div>
          <div className="card-header-title">Conteo finalizado</div>
          <div className="card-header-sub">Todos los artículos contados y registrados en Google Sheets</div>
        </div>
        <div style={{ marginLeft: "auto" }}><span className="badge badge-green">Completado</span></div>
      </div>
      <div className="card-body">
        <div className="alert alert-success" style={{ marginBottom: "1.5rem" }}>
          <span className="alert-icon">✅</span> Datos guardados correctamente en Google Sheets.
        </div>
        <div className="summary-grid">
          <div className="summary-card"><span className="summary-value" style={{ color: "#4a9eff" }}>{stats.total}</span><span className="summary-label">Total artículos</span></div>
          <div className="summary-card"><span className="summary-value" style={{ color: "#4adf8a" }}>{stats.sinDif}</span><span className="summary-label">Sin diferencia</span></div>
          <div className="summary-card"><span className="summary-value" style={{ color: "#f06060" }}>{stats.positivas}</span><span className="summary-label">Dif. positivas</span></div>
          <div className="summary-card"><span className="summary-value" style={{ color: "#f0a830" }}>{stats.negativas}</span><span className="summary-label">Dif. negativas</span></div>
          <div className="summary-card">
            <span className="summary-value" style={{ color: nd > 0 ? "#f06060" : nd < 0 ? "#f0a830" : "#484440" }}>{nd > 0 ? "+" : ""}{nd}</span>
            <span className="summary-label">Diferencia neta</span>
          </div>
          <div className="summary-card"><span className="summary-value" style={{ color: "#4adf8a" }}>{stats.conTarjeta}</span><span className="summary-label">Con tarjeta KANBAN</span></div>
        </div>
        <button className="btn btn-primary btn-full" onClick={onRestart}>Iniciar nuevo conteo →</button>
      </div>
    </div>
  );
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function InventarioApp() {
  const { articles, loading } = useArticles();

  const [screen, setScreen] = useState("start");
  const [usuario, setUsuario] = useState("");
  const [selection, setSelection] = useState(null);
  const [currentBlock, setCurrentBlock] = useState(0);
  const [stockSistema, setStockSistema] = useState(null);
  const [tarjetasBloque, setTarjetasBloque] = useState(null);
  const [savedRecords, setSavedRecords] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [finalStats, setFinalStats] = useState(null);
  const savedRef = useRef(false);

  // Persistir sesión automáticamente en cada cambio relevante
  useEffect(() => {
    if (selection && (screen === "step1" || screen === "step2" || screen === "paused")) {
      saveSession({
        usuario, clase: selection.clase, subclase: selection.subclase, grupo: selection.grupo,
        total: selection.articulos.length, currentBlock, step: screen, recordsCount: savedRecords.length,
      });
      saveRecords(savedRecords);
    }
  }, [screen, currentBlock, savedRecords, selection, usuario]);

  function handleStart(user) { setUsuario(user); setScreen("filter"); }

  function handleSelect(sel) {
    setSelection(sel); setCurrentBlock(0); setSavedRecords([]);
    setScreen("step1"); savedRef.current = false;
  }

  function handleResume() {
    const session = loadSession();
    const records = loadRecords();
    if (!session) return;
    const arts = articles.filter(a => a.clase === session.clase && a.subclase === session.subclase && a.grupo === session.grupo);
    setSelection({ clase: session.clase, subclase: session.subclase, grupo: session.grupo, articulos: arts });
    setCurrentBlock(session.currentBlock);
    setSavedRecords(records);
    setScreen("step1");
    savedRef.current = false;
  }

  function handleDiscardAndNew() {
    clearSession();
    setScreen("filter"); setSelection(null); setCurrentBlock(0);
    setSavedRecords([]); setStockSistema(null); setTarjetasBloque(null);
    savedRef.current = false;
  }

  function handlePause() { setScreen("paused"); }

  function handleAbort() {
    if (window.confirm("¿Cancelar el conteo? Se perderá el progreso no guardado del bloque actual.")) {
      clearSession();
      setScreen("filter"); setSelection(null); setCurrentBlock(0);
      setSavedRecords([]); setStockSistema(null); setTarjetasBloque(null);
      savedRef.current = false;
    }
  }

  function handleStep1Next(stocks, tarjetas) { setStockSistema(stocks); setTarjetasBloque(tarjetas); setScreen("step2"); }
  function handleStep2Back() { setScreen("step1"); }

  async function handleSave(stockReal) {
    if (savedRef.current) return;
    savedRef.current = true;
    setSaving(true); setSaveError(null); setSaveSuccess(false);

    const { fecha, hora } = formatDateTime();
    const blocksTotal = Math.ceil(selection.articulos.length / CONFIG.BLOCK_SIZE);
    const blockArticulos = selection.articulos.slice(currentBlock * CONFIG.BLOCK_SIZE, (currentBlock + 1) * CONFIG.BLOCK_SIZE);

    const rows = blockArticulos.map(art => ({
      fecha, hora, usuario,
      clase: selection.clase, subclase: selection.subclase, grupo: selection.grupo,
      numero_bloque: currentBlock + 1,
      codigo_articulo: art.codigo_articulo,
      descripcion: art.descripcion,
      stock_sistema: stockSistema[art.codigo_articulo],
      stock_real: stockReal[art.codigo_articulo],
      diferencia: stockReal[art.codigo_articulo] - stockSistema[art.codigo_articulo],
      tarjeta: tarjetasBloque && tarjetasBloque[art.codigo_articulo] ? "SÍ" : "NO",
    }));

    try {
      if (CONFIG.GOOGLE_SHEETS_API_URL && !CONFIG.GOOGLE_SHEETS_API_URL.includes("TU_SCRIPT_ID")) {
        await fetch(CONFIG.GOOGLE_SHEETS_API_URL, {
          method: "POST", mode: "no-cors",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows }),
        });
      } else {
        await new Promise(r => setTimeout(r, 800));
        console.log("📊 [DEMO] Registros:", rows);
      }
    } catch {
      setSaving(false); setSaveError("Error al conectar con Google Sheets. Verificá tu conexión."); savedRef.current = false; return;
    }

    const allRecords = [...savedRecords, ...rows];
    setSavedRecords(allRecords); setSaving(false); setSaveSuccess(true);

    const nextBlock = currentBlock + 1;
    if (nextBlock >= blocksTotal) {
      const stats = {
        total: allRecords.length,
        sinDif: allRecords.filter(r => r.diferencia === 0).length,
        positivas: allRecords.filter(r => r.diferencia > 0).length,
        negativas: allRecords.filter(r => r.diferencia < 0).length,
        netaDif: Math.round(allRecords.reduce((s, r) => s + r.diferencia, 0) * 100) / 100,
        conTarjeta: allRecords.filter(r => r.tarjeta === "SÍ").length,
      };
      clearSession(); setFinalStats(stats); setScreen("done");
    } else {
      setCurrentBlock(nextBlock); setScreen("step1");
      setStockSistema(null); setTarjetasBloque(null); savedRef.current = false;
    }
  }

  const blockArticulos = selection ? selection.articulos.slice(currentBlock * CONFIG.BLOCK_SIZE, (currentBlock + 1) * CONFIG.BLOCK_SIZE) : [];
  const totalBlocks = selection ? Math.ceil(selection.articulos.length / CONFIG.BLOCK_SIZE) : 0;
  const progressPct = selection && totalBlocks > 0 ? Math.round((currentBlock / totalBlocks) * 100) : 0;

  return (
    <>
      <style>{styles}</style>
      <div className="app-wrapper">
        <header className="app-header">
          <span className="app-logo">INV</span>
          <span className="app-title">Sistema de Inventario</span>
          <span className="header-spacer" />
          {usuario && <span className="badge badge-blue">👤 {usuario}</span>}
          {(screen === "step1" || screen === "step2") && selection && (
            <span className="badge badge-amber" style={{ marginLeft: 6 }}>{selection.clase} / {selection.subclase} / {selection.grupo}</span>
          )}
        </header>

        {(screen === "step1" || screen === "step2") && selection && (
          <div style={{ width: "100%", maxWidth: 820, margin: "1rem 1rem 0", padding: "0 0.5rem" }}>
            <div className="progress-bar-wrapper"><div className="progress-bar-fill" style={{ width: `${progressPct}%` }} /></div>
            <div className="progress-label">
              <span>Bloque {currentBlock + 1} de {totalBlocks}</span>
              <span>{savedRecords.length} artículos ya guardados</span>
            </div>
          </div>
        )}

        {saveSuccess && screen === "step1" && (
          <div style={{ width: "100%", maxWidth: 820, margin: "0.5rem 1rem 0", padding: "0 0.5rem" }}>
            <div className="alert alert-success"><span className="alert-icon">✅</span>Bloque {currentBlock} guardado. Continuando con el siguiente.</div>
          </div>
        )}
        {saveError && (
          <div style={{ width: "100%", maxWidth: 820, margin: "0.5rem 1rem 0", padding: "0 0.5rem" }}>
            <div className="alert alert-error"><span className="alert-icon">⛔</span>{saveError}</div>
          </div>
        )}

        {loading ? (
          <div className="main-card">
            <div className="card-body" style={{ display: "flex", alignItems: "center", gap: 12, padding: "2rem 1.5rem" }}>
              <div className="spinner" /><span style={{ color: "#686460" }}>Cargando base de artículos...</span>
            </div>
          </div>
        ) : (
          <>
            {screen === "start" && <StartScreen onStart={handleStart} />}
            {screen === "filter" && <FilterScreen articles={articles} usuario={usuario} onSelect={handleSelect} onResume={handleResume} onDiscardAndNew={handleDiscardAndNew} />}
            {screen === "step1" && selection && <StockSistemaStep blockIndex={currentBlock} totalBlocks={totalBlocks} articulos={blockArticulos} onNext={handleStep1Next} onPause={handlePause} onAbort={handleAbort} />}
            {screen === "step2" && selection && stockSistema && <StockRealStep blockIndex={currentBlock} totalBlocks={totalBlocks} articulos={blockArticulos} stockSistema={stockSistema} tarjetas={tarjetasBloque} onSave={handleSave} onBack={handleStep2Back} saving={saving} />}
            {screen === "paused" && <PauseScreen onResume={handleResume} onDiscard={handleDiscardAndNew} />}
            {screen === "done" && finalStats && <FinalScreen stats={finalStats} onRestart={handleDiscardAndNew} />}
          </>
        )}

        {!CONFIG.ARTICLES_CSV_URL && screen !== "start" && (
          <div style={{ width: "100%", maxWidth: 820, margin: "1rem 1rem 0", padding: "0 0.5rem" }}>
            <div className="alert alert-warning"><span className="alert-icon">⚙️</span><span><strong>Modo demo</strong> — Configurá <code>ARTICLES_CSV_URL</code> y <code>GOOGLE_SHEETS_API_URL</code> en el CONFIG.</span></div>
          </div>
        )}
      </div>
    </>
  );
}
