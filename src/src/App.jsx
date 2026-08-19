import React, { useState, useEffect, useCallback } from "react";
import { Users, ClipboardList, CalendarCheck, Plus, Trash2, ChevronLeft, Check, X, Minus, Save, LogOut, Download, Upload, BarChart3, Clock, Trophy, Timer, ClipboardPen, GripVertical, AlertTriangle, FileText, Shield } from "lucide-react";
import { hasSupabase } from "./supabaseClient.js";
import * as db from "./dataLayer.js";

// ─── Palette: campo da gioco notturno ───────────────────────────────
const C = {
  pitch: "#0B2E24",
  pitchDeep: "#071E18",
  surface: "#123A2E",
  chalk: "#F2F5EE",
  lime: "#C6F24E",
  clay: "#E8896A",
  amber: "#F2C14E",
  muted: "#7FA394",
  line: "#1E4C3D",
};

const emptyTeam = { players: [], sessions: [] };
const uid = () => Math.random().toString(36).slice(2, 9);

// Enti di tesseramento supportati
const FEDERATIONS = ["C.S.I.", "C.S.E.N.", "A.I.C.S.", "F.I.G.C."];

// ─── Root: autenticazione e instradamento per ruolo ─────────────────
export default function App() {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [teams, setTeams] = useState([]);
  const [teamId, setTeamId] = useState(null);
  const [error, setError] = useState("");

  // Se le chiavi Supabase non sono configurate, avvisa chiaramente
  if (!hasSupabase) return <ConfigMissing />;

  // segue lo stato del login
  useEffect(() => {
    let unsub = () => {};
    (async () => {
      const s = await db.getSession();
      setSession(s);
      unsub = db.onAuthChange((ns) => setSession(ns));
      setReady(true);
    })();
    return () => unsub();
  }, []);

  // quando c'è una sessione, carica profilo e squadre
  useEffect(() => {
    if (!session) { setProfile(null); setTeams([]); setTeamId(null); return; }
    (async () => {
      try {
        const p = await db.getMyProfile();
        setProfile(p);
        if (p && p.role !== "supervisore") {
          const t = await db.listTeams();
          setTeams(t);
        }
      } catch (e) { setError(e.message || String(e)); }
    })();
  }, [session]);

  const reloadTeams = useCallback(async () => {
    const t = await db.listTeams();
    setTeams(t);
  }, []);

  if (!ready) return <Splash />;

  // 1) non autenticato → login
  if (!session) return <AuthScreen onError={setError} error={error} />;
  if (!profile) return <Splash />;

  // 2) supervisore → cruscotto globale
  if (profile.role === "supervisore") {
    return <SupervisorDashboard profile={profile} onLogout={() => db.signOut()} />;
  }

  // 3) tecnico: selettore squadre o app
  const team = teams.find((t) => t.id === teamId);
  if (!team) {
    return <TeamPicker
      profile={profile}
      teams={teams}
      onOpen={(id) => setTeamId(id)}
      onLogout={() => db.signOut()}
      onCreate={async (name) => {
        const t = await db.createTeam(name);
        await reloadTeams();
        setTeamId(t.id);
      }}
      onRename={async (id, name) => { await db.renameTeam(id, name); await reloadTeams(); }}
      onRemove={async (id) => { await db.deleteTeam(id); await reloadTeams(); }}
    />;
  }
  return <TeamApp team={team} profile={profile}
    onLogout={() => db.signOut()} onSwitchTeam={() => setTeamId(null)} />;
}

// ─── Avviso: configurazione mancante ────────────────────────────────
function ConfigMissing() {
  return (
    <Shell>
      <div style={{ maxWidth: 460, margin: "0 auto", padding: "80px 24px", textAlign: "center" }}>
        <div style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: 24,
          marginBottom: 16 }}>Spogliatoio<span style={{ color: C.lime }}>.</span></div>
        <div style={{ color: C.amber, fontWeight: 600, marginBottom: 10 }}>
          Configurazione database mancante
        </div>
        <div style={{ color: C.muted, fontSize: 14, lineHeight: 1.6 }}>
          Le chiavi di collegamento al database non sono impostate. Vanno aggiunte nelle
          variabili d'ambiente di Vercel (VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY) e poi
          va rifatto il deploy.
        </div>
      </div>
    </Shell>
  );
}

// ─── Schermata di accesso (login / registrazione) ───────────────────
function AuthScreen({ onError, error }) {
  const [mode, setMode] = useState("login"); // login | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const submit = async () => {
    setBusy(true); setMsg(""); onError("");
    try {
      if (mode === "signup") {
        if (!name.trim()) throw new Error("Inserisci il tuo nome.");
        await db.signUp(email.trim(), password, name.trim());
        setMsg("Registrazione riuscita. Ora puoi accedere.");
        setMode("login");
      } else {
        await db.signIn(email.trim(), password);
      }
    } catch (e) {
      onError(traduciErrore(e));
    } finally { setBusy(false); }
  };

  return (
    <Shell>
      <div style={{ maxWidth: 400, margin: "0 auto", padding: "64px 20px" }}>
        <div style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: 30,
          letterSpacing: "-0.02em", textAlign: "center" }}>
          Spogliatoio<span style={{ color: C.lime }}>.</span>
        </div>
        <div style={{ color: C.muted, fontSize: 14, textAlign: "center", marginTop: 8,
          marginBottom: 32 }}>
          {mode === "login" ? "Accedi al tuo account" : "Crea il tuo account"}
        </div>

        <div style={cardWrap}>
          {mode === "signup" && (
            <input value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Nome e cognome" style={{ ...inp, marginBottom: 10 }} />
          )}
          <input value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="Email" type="email" autoComplete="email"
            style={{ ...inp, marginBottom: 10 }} />
          <input value={password} onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Password" type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            style={{ ...inp, marginBottom: 14 }} />
          <button onClick={submit} disabled={busy}
            style={{ ...primaryBtn, width: "100%", justifyContent: "center" }}>
            {busy ? "Attendere…" : (mode === "login" ? "Accedi" : "Registrati")}
          </button>
          {msg && <div style={{ color: C.lime, fontSize: 13, marginTop: 12,
            textAlign: "center" }}>{msg}</div>}
          {error && <div style={{ color: C.clay, fontSize: 13, marginTop: 12,
            textAlign: "center" }}>{error}</div>}
        </div>

        <div style={{ textAlign: "center", marginTop: 18 }}>
          <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); onError(""); setMsg(""); }}
            style={{ background: "transparent", color: C.muted, fontSize: 13, fontWeight: 600 }}>
            {mode === "login" ? "Non hai un account? Registrati" : "Hai già un account? Accedi"}
          </button>
        </div>
      </div>
    </Shell>
  );
}

function traduciErrore(e) {
  const m = (e && e.message ? e.message : String(e)).toLowerCase();
  if (m.includes("invalid login")) return "Email o password non corretti.";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "Questa email è già registrata. Prova ad accedere.";
  if (m.includes("password")) return "La password deve avere almeno 6 caratteri.";
  if (m.includes("email")) return "Controlla l'indirizzo email.";
  return e && e.message ? e.message : "Si è verificato un errore. Riprova.";
}

// ─── Selettore squadre ──────────────────────────────────────────────
function TeamPicker({ profile, teams, onOpen, onCreate, onRename, onRemove, onLogout }) {
  const [name, setName] = useState("");
  const coachName = (profile && profile.full_name) || "";

  return (
    <Shell>
      <div style={{ maxWidth: 460, margin: "0 auto", padding: "48px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: 32 }}>
          <div>
            <div style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: 24,
              letterSpacing: "-0.02em" }}>
              Spogliatoio<span style={{ color: C.lime }}>.</span>
            </div>
            <div style={{ color: C.muted, fontSize: 13, marginTop: 5 }}>Mister {coachName}</div>
          </div>
          <button onClick={onLogout} style={{ ...backBtn, marginBottom: 0, padding: "8px 10px",
            border: `1px solid ${C.line}`, borderRadius: 10 }}>
            <LogOut size={16} /> Esci
          </button>
        </div>

        <SectionTitle>Le tue squadre {teams.length > 0 && `· ${teams.length}`}</SectionTitle>
        {teams.length === 0 ? (
          <div style={{ ...cardWrap, textAlign: "center", color: C.muted, fontSize: 14,
            padding: "26px 20px" }}>
            Nessuna squadra ancora. Crea la prima qui sotto — es. Under 15, Prima Squadra.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10, marginBottom: 24 }}>
            {teams.map((t) => (
              <div key={t.id} style={{ display: "flex", gap: 8 }}>
                <button onClick={() => onOpen(t.id)} style={{ ...rowCard, flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ ...jersey, background: C.lime, color: C.pitchDeep, fontSize: 18 }}>
                      {t.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 16 }}>{t.name}</div>
                  </div>
                  <ChevronLeft size={18} style={{ transform: "rotate(180deg)", color: C.muted }} />
                </button>
                <button onClick={() => {
                  const n = window.prompt("Rinomina squadra", t.name);
                  if (n && n.trim()) onRename(t.id, n.trim());
                }} style={{ ...dangerBtn, color: C.muted }}>✎</button>
                <button onClick={() => {
                  if (window.confirm(`Eliminare "${t.name}" e tutti i suoi dati?`)) onRemove(t.id);
                }} style={dangerBtn}><Trash2 size={16} /></button>
              </div>
            ))}
          </div>
        )}

        <SectionTitle>Nuova squadra</SectionTitle>
        <div style={{ display: "flex", gap: 10 }}>
          <input value={name} onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) { onCreate(name); setName(""); } }}
            placeholder="Es. Under 15, Prima Squadra" style={inp} />
          <button onClick={() => { if (name.trim()) { onCreate(name); setName(""); } }}
            style={primaryBtn}><Plus size={18} strokeWidth={2.5} /></button>
        </div>
      </div>
    </Shell>
  );
}

// ─── App di squadra ─────────────────────────────────────────────────
function TeamApp({ team, profile, onLogout, onSwitchTeam }) {
  const [state, setState] = useState(emptyTeam);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState("rosa");
  const [openPlayer, setOpenPlayer] = useState(null);
  const coach = { name: (profile && profile.full_name) || "" };

  useEffect(() => {
    let alive = true;
    setLoaded(false);
    setOpenPlayer(null);
    (async () => {
      try {
        const data = await db.loadTeamData(team.id);
        if (alive) setState(data);
      } catch (e) { if (alive) setState(emptyTeam); console.error(e); }
      if (alive) setLoaded(true);
    })();
    return () => { alive = false; };
  }, [team.id]);

  // persist riceve il nuovo stato completo; calcola le differenze e le scrive sul db,
  // poi ricarica dal db per avere gli id reali generati dal database.
  const persist = useCallback(async (next) => {
    const prev = state;
    setState(next); // aggiornamento ottimistico immediato per la UI
    try {
      // --- ATLETI ---
      const prevP = new Map((prev.players || []).map((p) => [p.id, p]));
      const nextP = new Map((next.players || []).map((p) => [p.id, p]));
      for (const p of next.players || []) {
        if (!prevP.has(p.id)) {
          // nuovo (id temporaneo generato dall'app): crea e sostituisci id
          const created = await db.addPlayer(team.id, p);
          setState((s) => ({ ...s,
            players: s.players.map((x) => x.id === p.id ? created : x) }));
        } else if (JSON.stringify(prevP.get(p.id)) !== JSON.stringify(p)) {
          await db.updatePlayer(team.id, p);
        }
      }
      for (const p of prev.players || [])
        if (!nextP.has(p.id)) await db.removePlayer(p.id);

      // --- SEDUTE ---
      const prevS = new Map((prev.sessions || []).map((s) => [s.id, s]));
      const nextS = new Map((next.sessions || []).map((s) => [s.id, s]));
      for (const s of next.sessions || []) {
        if (!prevS.has(s.id)) {
          const created = await db.addSession(team.id, s);
          setState((st) => ({ ...st,
            sessions: st.sessions.map((x) => x.id === s.id ? created : x) }));
        } else if (JSON.stringify(prevS.get(s.id)) !== JSON.stringify(s)) {
          await db.updateSession(team.id, s);
        }
      }
      for (const s of prev.sessions || [])
        if (!nextS.has(s.id)) await db.removeSession(s.id);
    } catch (e) {
      console.error("Salvataggio non riuscito", e);
      alert("Salvataggio non riuscito. Controlla la connessione e riprova.");
    }
  }, [state, team.id]);

  if (!loaded) return <Splash />;

  const player = openPlayer ? state.players.find((p) => p.id === openPlayer) : null;

  return (
    <Shell>
      <Header coach={coach} team={team} players={state.players.length}
        sessions={state.sessions.length} onLogout={onLogout} onSwitchTeam={onSwitchTeam} />
      <main style={{ maxWidth: 760, margin: "0 auto", padding: "0 16px 96px" }}>
        {player ? (
          <PlayerSheet player={player} sessions={state.sessions}
            onBack={() => setOpenPlayer(null)}
            onSave={(patch) => persist({ ...state,
              players: state.players.map((p) => p.id === player.id ? { ...p, ...patch } : p) })}
            onDelete={() => {
              persist({ ...state, players: state.players.filter((p) => p.id !== player.id) });
              setOpenPlayer(null);
            }} />
        ) : tab === "rosa" ? (
          <Rosa state={state} persist={persist} onOpen={setOpenPlayer} />
        ) : tab === "presenze" ? (
          <Presenze state={state} persist={persist} team={team} />
        ) : (
          <Statistiche state={state} coach={coach} team={team} onOpen={(id) => setOpenPlayer(id)} />
        )}
      </main>
      {!player && <TabBar tab={tab} setTab={setTab} />}
    </Shell>
  );
}

// ─── Cruscotto supervisore (sola lettura, vede tutto) ───────────────
function SupervisorDashboard({ profile, onLogout }) {
  const [loaded, setLoaded] = useState(false);
  const [all, setAll] = useState(null);
  const [openTeam, setOpenTeam] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try { setAll(await db.loadEverything()); }
      catch (e) { setErr(e.message || String(e)); }
      setLoaded(true);
    })();
  }, []);

  if (!loaded) return <Splash />;
  if (err) return (
    <Shell><div style={{ maxWidth: 500, margin: "0 auto", padding: 40, color: C.clay }}>
      Errore nel caricamento: {err}</div></Shell>
  );

  const { teams, players, sessions, profiles } = all;
  const playersByTeam = (tid) => players.filter((p) => {
    const raw = all.rawPlayers.find((r) => r.id === p.id);
    return raw && raw.team_id === tid;
  });
  const sessionsByTeam = (tid) => sessions.filter((s) => {
    const raw = all.rawSessions.find((r) => r.id === s.id);
    return raw && raw.team_id === tid;
  });
  const coachName = (ownerId) => {
    const pr = profiles.find((p) => p.id === ownerId);
    return pr ? pr.full_name : "—";
  };

  // vista dettaglio squadra (sola lettura)
  if (openTeam) {
    const t = teams.find((x) => x.id === openTeam);
    const tp = playersByTeam(openTeam);
    const ts = sessionsByTeam(openTeam);
    return (
      <Shell>
        <SupHeader title={t ? t.name : "Squadra"} subtitle={`Mister ${coachName(t?.owner)}`}
          onBack={() => setOpenTeam(null)} onLogout={onLogout} />
        <main style={{ maxWidth: 760, margin: "0 auto", padding: "20px 16px 60px" }}>
          <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
            <MiniStat n={tp.length} l="Atleti" accent={C.lime} />
            <MiniStat n={ts.filter((s) => s.type === "allenamento").length} l="Allenam." accent={C.chalk} />
            <MiniStat n={ts.filter((s) => s.type === "partita").length} l="Partite" accent={C.clay} />
          </div>

          <SectionTitle>Rosa</SectionTitle>
          {tp.length === 0 ? (
            <Empty icon={<Users size={24} />} text="Nessun atleta in questa squadra." />
          ) : (
            <div style={{ display: "grid", gap: 8, marginBottom: 24 }}>
              {tp.map((p) => {
                const st = playerStats(p.id, ts);
                const m = statusMeta(p.status);
                return (
                  <div key={p.id} style={{ ...rowCard, cursor: "default" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                      <div style={{ ...jersey, width: 34, height: 34, fontSize: 13 }}>{p.number || "–"}</div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 15 }}>{p.name}</div>
                        <div style={{ color: C.muted, fontSize: 12, display: "flex",
                          alignItems: "center", gap: 6 }}>
                          {(p.status && p.status !== "disponibile") && (
                            <span style={{ width: 7, height: 7, borderRadius: "50%",
                              background: m.color }} />
                          )}
                          {p.role || "—"}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 800,
                        color: C.lime, fontSize: 16 }}>{st.rate}%</div>
                      <div style={miniLabel}>presenze</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </Shell>
    );
  }

  // vista elenco squadre
  return (
    <Shell>
      <SupHeader title="Supervisione" subtitle={profile.full_name}
        onLogout={onLogout} icon={<Shield size={18} color={C.lime} />} />
      <main style={{ maxWidth: 760, margin: "0 auto", padding: "20px 16px 60px" }}>
        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          <MiniStat n={profiles.filter((p) => p.role === "tecnico").length} l="Tecnici" accent={C.chalk} />
          <MiniStat n={teams.length} l="Squadre" accent={C.lime} />
          <MiniStat n={players.length} l="Atleti" accent={C.amber} />
        </div>

        <SectionTitle>Tutte le squadre</SectionTitle>
        {teams.length === 0 ? (
          <Empty icon={<Users size={26} />} text="Nessuna squadra creata dai tecnici, per ora." />
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {teams.map((t) => {
              const tp = playersByTeam(t.id);
              const ts = sessionsByTeam(t.id);
              return (
                <button key={t.id} onClick={() => setOpenTeam(t.id)} style={rowCard}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                    <div style={{ ...jersey, background: C.lime, color: C.pitchDeep, fontSize: 16 }}>
                      {t.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ textAlign: "left", minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 16 }}>{t.name}</div>
                      <div style={{ color: C.muted, fontSize: 13 }}>Mister {coachName(t.owner)}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 800,
                      color: C.lime, fontSize: 16 }}>{tp.length}</div>
                    <div style={miniLabel}>atleti</div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>
    </Shell>
  );
}

function SupHeader({ title, subtitle, onBack, onLogout, icon }) {
  return (
    <header style={{ background: C.pitch, borderBottom: `1px solid ${C.line}`, padding: "18px 16px" }}>
      <div style={{ maxWidth: 760, margin: "0 auto", display: "flex",
        alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          {onBack && (
            <button onClick={onBack} style={{ background: "transparent", padding: 0 }}>
              <ChevronLeft size={22} color={C.muted} />
            </button>
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: 20,
              letterSpacing: "-0.02em", display: "flex", alignItems: "center", gap: 8 }}>
              {icon}{title}
            </div>
            {subtitle && <div style={{ color: C.muted, fontSize: 12, marginTop: 3 }}>{subtitle}</div>}
          </div>
        </div>
        <button onClick={onLogout} style={{ ...backBtn, marginBottom: 0, padding: "8px 10px",
          border: `1px solid ${C.line}`, borderRadius: 10, flexShrink: 0 }}>
          <LogOut size={16} /> Esci
        </button>
      </div>
    </header>
  );
}

// ─── Header ─────────────────────────────────────────────────────────
function Header({ coach, team, players, sessions, onLogout, onSwitchTeam }) {
  return (
    <header style={{ background: C.pitch, borderBottom: `1px solid ${C.line}`, padding: "18px 16px" }}>
      <div style={{ maxWidth: 760, margin: "0 auto", display: "flex",
        alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <button onClick={onSwitchTeam} style={{ background: "transparent", textAlign: "left",
          padding: 0, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <ChevronLeft size={18} color={C.muted} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: 20,
                letterSpacing: "-0.02em", lineHeight: 1.1, whiteSpace: "nowrap",
                overflow: "hidden", textOverflow: "ellipsis" }}>{team.name}</div>
              <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>
                Mister {coach.name} · {players} atleti · {sessions} sedute
              </div>
            </div>
          </div>
        </button>
        <button onClick={onLogout} style={{ ...backBtn, marginBottom: 0, padding: "8px 10px",
          border: `1px solid ${C.line}`, borderRadius: 10, flexShrink: 0 }}>
          <LogOut size={16} /> Esci
        </button>
      </div>
    </header>
  );
}

// ─── Rosa ───────────────────────────────────────────────────────────
function Rosa({ state, persist, onOpen }) {
  const [name, setName] = useState("");
  const [num, setNum] = useState("");
  const [role, setRole] = useState("");

  const add = () => {
    if (!name.trim()) return;
    persist({ ...state, players: [...state.players, {
      id: uid(), name: name.trim(), number: num.trim(), role: role.trim(),
      birth: "", foot: "", height: "", weight: "", shoe: "",
      cardNumbers: {}, federations: [], idDocument: "",
      status: "disponibile", statusNote: "", returnDate: "",
      notes: "", strengths: "", goals: "",
    }] });
    setName(""); setNum(""); setRole("");
  };

  const attendanceFor = (pid) => {
    const total = state.sessions.length;
    if (!total) return null;
    const present = state.sessions.filter((s) => s.records[pid] === "presente").length;
    return Math.round((present / total) * 100);
  };

  return (
    <div style={{ paddingTop: 20 }}>
      <AbsenceAlert alerts={absenceAlerts(state.players, state.sessions)} onOpen={onOpen} />
      <SectionTitle>Aggiungi atleta</SectionTitle>
      <div style={cardWrap}>
        <input value={name} onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Nome e cognome" style={inp} />
        <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
          <input value={num} onChange={(e) => setNum(e.target.value)}
            placeholder="N°" style={{ ...inp, width: 70 }} />
          <input value={role} onChange={(e) => setRole(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="Ruolo" style={{ ...inp, flex: 1 }} />
          <button onClick={add} style={primaryBtn}>
            <Plus size={18} strokeWidth={2.5} /> Aggiungi
          </button>
        </div>
      </div>

      <SectionTitle>Rosa {state.players.length > 0 && `· ${state.players.length}`}</SectionTitle>
      {state.players.length === 0 ? (
        <Empty icon={<Users size={26} />} text="Nessun atleta ancora. Aggiungi il primo qui sopra per costruire la rosa." />
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {state.players.map((p) => {
            const att = attendanceFor(p.id);
            const wa = weeklyAbsences(p.id, state.sessions);
            const flagged = wa > ABSENCE_ALERT_THRESHOLD;
            return (
              <button key={p.id} onClick={() => onOpen(p.id)}
                style={{ ...rowCard, borderColor: flagged ? C.clay : C.line }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={jersey}>{p.number || "–"}</div>
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontWeight: 600, fontSize: 16, display: "flex",
                      alignItems: "center", gap: 7 }}>
                      {p.name}
                      {flagged && <AlertTriangle size={14} color={C.clay} />}
                    </div>
                    <div style={{ color: C.muted, fontSize: 13, display: "flex",
                      alignItems: "center", gap: 6 }}>
                      {(p.status && p.status !== "disponibile") && (
                        <span title={statusMeta(p.status).label} style={{ width: 8, height: 8,
                          borderRadius: "50%", background: statusMeta(p.status).color,
                          flexShrink: 0 }} />
                      )}
                      {p.role || "Ruolo non impostato"}
                    </div>
                  </div>
                </div>
                {att !== null && (
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 800,
                      color: att >= 75 ? C.lime : att >= 50 ? C.amber : C.clay, fontSize: 17 }}>{att}%</div>
                    <div style={miniLabel}>presenze</div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Scheda tecnica ─────────────────────────────────────────────────
function PlayerSheet({ player, sessions, onBack, onSave, onDelete }) {
  const [f, setF] = useState(() => {
    // compatibilità con vecchi dati
    const base = { ...player };
    if (!Array.isArray(base.federations)) {
      base.federations = base.federation ? [base.federation] : [];
    }
    if (!base.cardNumbers || typeof base.cardNumbers !== "object") {
      base.cardNumbers = {};
      // se esisteva un numero unico, lo assegno al primo ente (o lo tengo a parte)
      if (base.cardNumber) {
        if (base.federations.length > 0) base.cardNumbers[base.federations[0]] = base.cardNumber;
        else base.cardNumbers["_"] = base.cardNumber;
      }
    }
    return base;
  });
  const [dirty, setDirty] = useState(false);
  const set = (k, v) => { setF((p) => ({ ...p, [k]: v })); setDirty(true); };
  const save = () => { onSave(f); setDirty(false); };

  const st = playerStats(player.id, sessions);

  return (
    <div style={{ paddingTop: 16 }}>
      <button onClick={onBack} style={backBtn}><ChevronLeft size={18} /> Indietro</button>

      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 22 }}>
        <div style={{ ...jersey, width: 56, height: 56, fontSize: 22 }}>{f.number || "–"}</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: 24,
            letterSpacing: "-0.02em" }}>{f.name}</div>
          <div style={{ color: C.muted, fontSize: 14 }}>{f.role || "Ruolo non impostato"}</div>
          {(f.status && f.status !== "disponibile") && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 8,
              background: `${statusMeta(f.status).color}22`,
              border: `1px solid ${statusMeta(f.status).color}`, borderRadius: 8,
              padding: "3px 10px" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%",
                background: statusMeta(f.status).color }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: statusMeta(f.status).color }}>
                {statusMeta(f.status).label}
                {f.returnDate ? ` · rientro ${f.returnDate}` : ""}
              </span>
            </div>
          )}
        </div>
      </div>

      {sessions.length > 0 && (
        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          <MiniStat n={`${st.rate}%`} l="Presenze" accent={C.lime} />
          <MiniStat n={st.present} l="Presente" accent={C.chalk} />
          <MiniStat n={st.absent} l="Assente" accent={C.clay} />
        </div>
      )}
      {st.matches > 0 && (
        <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
          <MiniStat n={st.callups} l="Convocazioni" accent={C.amber} />
          <MiniStat n={st.minutes} l="Minuti" accent={C.chalk} />
          <MiniStat n={st.avgMin} l="Media min" accent={C.lime} />
        </div>
      )}

      <SectionTitle>Anagrafica</SectionTitle>
      <div style={cardWrap}>
        <Field label="N° maglia" value={f.number} onChange={(v) => set("number", v)} />
        <Field label="Ruolo" value={f.role} onChange={(v) => set("role", v)} />
        <Field label="Nato il" value={f.birth} onChange={(v) => set("birth", v)} placeholder="gg/mm/aaaa" />
        <Field label="Piede" value={f.foot} onChange={(v) => set("foot", v)} placeholder="dx / sx / ambi" />
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <Field label="Altezza (cm)" value={f.height} onChange={(v) => set("height", v)}
              placeholder="es. 172" />
          </div>
          <div style={{ flex: 1 }}>
            <Field label="Peso (kg)" value={f.weight} onChange={(v) => set("weight", v)}
              placeholder="es. 65" />
          </div>
          <div style={{ flex: 1 }}>
            <Field label="Scarpe (n°)" value={f.shoe} onChange={(v) => set("shoe", v)}
              placeholder="es. 42" />
          </div>
        </div>
        <Field label="N° documento d'identità" value={f.idDocument}
          onChange={(v) => set("idDocument", v)}
          placeholder="Carta d'identità / passaporto" />
        <label style={{ display: "block" }}>
          <div style={fieldLabel}>Enti di tesseramento (uno o più)</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {FEDERATIONS.map((fed) => {
              const list = f.federations || [];
              const active = list.includes(fed);
              return (
                <button key={fed}
                  onClick={() => set("federations", active
                    ? list.filter((x) => x !== fed)
                    : [...list, fed])}
                  style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 12px",
                    borderRadius: 10, fontWeight: 600, fontSize: 13,
                    background: active ? C.lime : "transparent",
                    color: active ? C.pitchDeep : C.chalk,
                    border: `1px solid ${active ? C.lime : C.line}`, transition: "all .15s" }}>
                  <span style={{ width: 16, height: 16, borderRadius: 5, flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: active ? C.pitchDeep : "transparent",
                    border: `1px solid ${active ? C.pitchDeep : C.muted}` }}>
                    {active && <Check size={12} strokeWidth={3} color={C.lime} />}
                  </span>
                  {fed}
                </button>
              );
            })}
          </div>
        </label>

        {(f.federations || []).length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={fieldLabel}>N° tessera per ente</div>
            <div style={{ display: "grid", gap: 8 }}>
              {(f.federations || []).map((fed) => (
                <div key={fed} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 74, flexShrink: 0, fontSize: 13, fontWeight: 600,
                    color: C.lime }}>{fed}</span>
                  <input
                    value={(f.cardNumbers && f.cardNumbers[fed]) || ""}
                    onChange={(e) => set("cardNumbers",
                      { ...(f.cardNumbers || {}), [fed]: e.target.value })}
                    placeholder="Numero di tessera"
                    style={{ ...inp, flex: 1 }} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <SectionTitle>Disponibilità</SectionTitle>
      <div style={cardWrap}>
        <div style={{ display: "flex", gap: 8, marginBottom: (f.status && f.status !== "disponibile") ? 14 : 0 }}>
          {[
            { k: "disponibile", label: "Disponibile", color: C.lime },
            { k: "recupero", label: "In recupero", color: C.amber },
            { k: "infortunato", label: "Infortunato", color: C.clay },
          ].map((o) => {
            const active = (f.status || "disponibile") === o.k;
            return (
              <button key={o.k} onClick={() => set("status", o.k)}
                style={{ flex: 1, padding: "10px 6px", borderRadius: 10, fontWeight: 600,
                  fontSize: 13, background: active ? o.color : "transparent",
                  color: active ? C.pitchDeep : C.chalk,
                  border: `1px solid ${active ? o.color : C.line}`, transition: "all .15s" }}>
                {o.label}
              </button>
            );
          })}
        </div>
        {f.status && f.status !== "disponibile" && (
          <>
            <Field label="Rientro previsto" value={f.returnDate}
              onChange={(v) => set("returnDate", v)} placeholder="gg/mm/aaaa" />
            <Area label="Nota (tipo di infortunio, terapia…)" value={f.statusNote}
              onChange={(v) => set("statusNote", v)}
              placeholder="Es. distorsione caviglia dx, fisioterapia in corso" />
          </>
        )}
      </div>

      <SectionTitle>Scheda tecnica</SectionTitle>
      <div style={cardWrap}>
        <Area label="Punti di forza" value={f.strengths} onChange={(v) => set("strengths", v)}
          placeholder="Velocità sul lato debole, lettura difensiva…" />
        <Area label="Obiettivi di crescita" value={f.goals} onChange={(v) => set("goals", v)}
          placeholder="Migliorare il primo controllo, gestione del ritmo…" />
        <Area label="Note del tecnico" value={f.notes} onChange={(v) => set("notes", v)}
          placeholder="Osservazioni, infortuni, comportamento…" />
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        <button onClick={save} disabled={!dirty}
          style={{ ...primaryBtn, flex: 1, justifyContent: "center", opacity: dirty ? 1 : 0.45 }}>
          <Save size={17} /> {dirty ? "Salva modifiche" : "Salvato"}
        </button>
        <button onClick={onDelete} style={dangerBtn}><Trash2 size={17} /></button>
      </div>
    </div>
  );
}

// ─── Presenze ───────────────────────────────────────────────────────
function Presenze({ state, persist, team }) {
  const [type, setType] = useState("allenamento");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [open, setOpen] = useState(null);

  const create = () => {
    if (state.players.length === 0) return;
    const s = { id: uid(), type, date, opponent: "", records: {}, minutes: {},
      plan: { objective: "", notes: "", drills: [] } };
    persist({ ...state, sessions: [s, ...state.sessions] });
    setOpen(s.id);
  };

  const session = open ? state.sessions.find((s) => s.id === open) : null;
  const setRecord = (sid, pid, val) => persist({ ...state, sessions: state.sessions.map((s) =>
    s.id === sid ? { ...s, records: { ...s.records, [pid]: val } } : s) });
  const setMinutes = (sid, pid, val) => persist({ ...state, sessions: state.sessions.map((s) =>
    s.id === sid ? { ...s, minutes: { ...s.minutes, [pid]: val } } : s) });
  const patchSession = (sid, patch) => persist({ ...state, sessions: state.sessions.map((s) =>
    s.id === sid ? { ...s, ...patch } : s) });
  const removeSession = (sid) => { persist({ ...state,
    sessions: state.sessions.filter((s) => s.id !== sid) }); setOpen(null); };

  if (session) {
    return <SessionDetail session={session} players={state.players} team={team}
      onBack={() => setOpen(null)} onRecord={setRecord} onMinutes={setMinutes}
      onPatch={patchSession} onDelete={removeSession} />;
  }

  return (
    <div style={{ paddingTop: 20 }}>
      <SectionTitle>Nuova seduta</SectionTitle>
      <div style={cardWrap}>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {["allenamento", "partita"].map((t) => (
            <button key={t} onClick={() => setType(t)}
              style={{ flex: 1, padding: "10px", borderRadius: 10, fontWeight: 600, fontSize: 14,
                background: type === t ? C.lime : "transparent",
                color: type === t ? C.pitchDeep : C.chalk,
                border: `1px solid ${type === t ? C.lime : C.line}`,
                textTransform: "capitalize", transition: "all .15s" }}>{t}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            style={{ ...inp, flex: 1, colorScheme: "dark" }} />
          <button onClick={create} disabled={state.players.length === 0}
            style={{ ...primaryBtn, opacity: state.players.length === 0 ? 0.45 : 1 }}>
            <Plus size={18} strokeWidth={2.5} /> Apri
          </button>
        </div>
        {state.players.length === 0 && (
          <div style={{ color: C.amber, fontSize: 12, marginTop: 10 }}>
            Aggiungi almeno un atleta nella Rosa prima di registrare le presenze.
          </div>
        )}
      </div>

      <SectionTitle>Storico</SectionTitle>
      {state.sessions.length === 0 ? (
        <Empty icon={<CalendarCheck size={26} />} text="Nessuna seduta registrata. Crea la prima qui sopra." />
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {state.sessions.map((s) => {
            const marked = Object.keys(s.records).length;
            const pres = Object.values(s.records).filter((v) => v === "presente").length;
            const hasPlan = s.plan && (s.plan.objective || (s.plan.drills || []).length > 0);
            return (
              <button key={s.id} onClick={() => setOpen(s.id)} style={rowCard}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ ...jersey, background: s.type === "partita" ? C.clay : C.line,
                    color: s.type === "partita" ? C.pitchDeep : C.chalk, fontSize: 12,
                    fontFamily: "'Inter', sans-serif", fontWeight: 700 }}>
                    {s.type === "partita" ? "GARA" : "ALL"}
                  </div>
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontWeight: 600, fontSize: 15, display: "flex",
                      alignItems: "center", gap: 7 }}>
                      {fmtDate(s.date)}
                      {hasPlan && <ClipboardPen size={13} color={C.lime} />}
                    </div>
                    <div style={{ color: C.muted, fontSize: 13 }}>
                      {s.type === "partita" && s.opponent ? `vs ${s.opponent}` : `${marked} registrati`}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 800,
                    color: C.lime, fontSize: 17 }}>{pres}</div>
                  <div style={miniLabel}>presenti</div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Distinta di gara ───────────────────────────────────────────────
// Numero di tessera dell'atleta: per l'ente-gara se indicato, altrimenti sintesi
function playerFeds(p) {
  return p.federations || (p.federation ? [p.federation] : []);
}
function cardFor(p, gameFed) {
  const cn = p.cardNumbers || {};
  if (gameFed) return cn[gameFed] || "";
  // nessun ente-gara: se c'è un solo numero mostralo, altrimenti elenca "ENTE: num"
  const feds = playerFeds(p);
  const entries = feds.filter((fed) => cn[fed]).map((fed) => `${fed}: ${cn[fed]}`);
  if (entries.length === 0) return cn["_"] || "";
  if (entries.length === 1) return cn[feds.find((fed) => cn[fed])];
  return entries.join(" · ");
}

function DistintaModal({ session, players, team, onClose }) {
  // pre-seleziona i convocati (segnati "presente")
  const [selected, setSelected] = useState(() => {
    const init = {};
    players.forEach((p) => { if (session.records[p.id] === "presente") init[p.id] = true; });
    return init;
  });
  const [gameFed, setGameFed] = useState(""); // ente della gara (opzionale)
  const toggle = (id) => setSelected((s) => ({ ...s, [id]: !s[id] }));
  const chosen = players.filter((p) => selected[p.id]);

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
      display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: C.pitch,
        borderTop: `1px solid ${C.line}`, borderRadius: "18px 18px 0 0", width: "100%",
        maxWidth: 760, maxHeight: "85vh", display: "flex", flexDirection: "column",
        padding: "20px 16px calc(16px + env(safe-area-inset-bottom))" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: 14 }}>
          <div style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: 19 }}>
            Distinta gara
          </div>
          <button onClick={onClose} style={{ ...tinyBtn, width: 34, height: 34 }}><X size={17} /></button>
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={fieldLabel}>Ente della gara (opzionale)</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            <button onClick={() => setGameFed("")}
              style={{ padding: "7px 11px", borderRadius: 9, fontWeight: 600, fontSize: 12,
                background: gameFed === "" ? C.lime : "transparent",
                color: gameFed === "" ? C.pitchDeep : C.chalk,
                border: `1px solid ${gameFed === "" ? C.lime : C.line}` }}>
              Tutti
            </button>
            {FEDERATIONS.map((fed) => (
              <button key={fed} onClick={() => setGameFed(fed)}
                style={{ padding: "7px 11px", borderRadius: 9, fontWeight: 600, fontSize: 12,
                  background: gameFed === fed ? C.lime : "transparent",
                  color: gameFed === fed ? C.pitchDeep : C.chalk,
                  border: `1px solid ${gameFed === fed ? C.lime : C.line}` }}>
                {fed}
              </button>
            ))}
          </div>
        </div>

        <div style={{ color: C.muted, fontSize: 13, marginBottom: 14 }}>
          Seleziona i convocati. {gameFed
            ? `Chi non è tesserato ${gameFed} è segnalato in rosso.`
            : "Verranno inclusi nome, n° maglia, tessera ed enti."}
        </div>

        <div style={{ overflowY: "auto", flex: 1, display: "grid", gap: 8, marginBottom: 14 }}>
          {players.map((p) => {
            const on = !!selected[p.id];
            const injured = p.status && p.status !== "disponibile";
            const feds = p.federations || (p.federation ? [p.federation] : []);
            const notInFed = gameFed && on && !feds.includes(gameFed);
            return (
              <button key={p.id} onClick={() => toggle(p.id)}
                style={{ display: "flex", alignItems: "center", gap: 12, background: C.surface,
                  border: `1px solid ${notInFed ? C.clay : (on ? C.lime : C.line)}`, borderRadius: 11,
                  padding: "10px 12px", width: "100%", textAlign: "left" }}>
                <span style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: on ? C.lime : "transparent",
                  border: `1px solid ${on ? C.lime : C.muted}` }}>
                  {on && <Check size={15} strokeWidth={3} color={C.pitchDeep} />}
                </span>
                <span style={{ ...jersey, width: 30, height: 30, fontSize: 12 }}>{p.number || "–"}</span>
                <span style={{ minWidth: 0, flex: 1 }}>
                  <span style={{ fontWeight: 600, fontSize: 14, display: "block",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {p.name}</span>
                  <span style={{ color: notInFed ? C.clay : C.muted, fontSize: 12 }}>
                    {cardFor(p, gameFed) ? `Tessera ${cardFor(p, gameFed)}` : "Tessera —"}
                    {feds.length ? ` · ${feds.join(", ")}` : " · nessun ente"}
                    {notInFed ? ` · non ${gameFed}` : ""}
                  </span>
                </span>
                {injured && <AlertTriangle size={15} color={C.clay} />}
              </button>
            );
          })}
        </div>

        <button onClick={() => generateDistinta(session, chosen, team, gameFed)}
          disabled={chosen.length === 0}
          style={{ ...primaryBtn, width: "100%", justifyContent: "center",
            opacity: chosen.length === 0 ? 0.45 : 1 }}>
          <FileText size={17} /> Stampa distinta ({chosen.length})
        </button>
      </div>
    </div>
  );
}

function generateDistinta(session, chosen, team, gameFed) {
  const esc = (s) => String(s ?? "").replace(/[&<>]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  // ente da mostrare per l'atleta: se c'è un ente-gara e l'atleta lo ha, mostra quello;
  // altrimenti l'elenco dei suoi enti
  const fedCell = (p) => {
    const feds = p.federations || (p.federation ? [p.federation] : []);
    if (gameFed) return feds.includes(gameFed) ? gameFed : "—";
    return feds.join(", ");
  };
  const rows = chosen.map((p, i) => `<tr>
    <td class="c">${i + 1}</td>
    <td class="c">${esc(p.number)}</td>
    <td>${esc(p.name)}</td>
    <td class="c">${esc(p.birth)}</td>
    <td class="c">${esc(cardFor(p, gameFed))}</td>
    <td class="c">${esc(fedCell(p))}</td>
    <td class="c">${esc(p.idDocument)}</td>
    <td></td>
  </tr>`).join("");
  const blanks = Math.max(0, 18 - chosen.length);
  const emptyRows = Array.from({ length: blanks }).map((_, i) => `<tr>
    <td class="c">${chosen.length + i + 1}</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>
  </tr>`).join("");

  const html = `<!doctype html><html><head><meta charset="utf-8">
  <title>Distinta ${esc(team?.name)}</title>
  <style>
    body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;padding:26px;color:#0B2E24}
    h1{font-size:20px;margin:0}
    .head{display:flex;justify-content:space-between;align-items:flex-end;
      border-bottom:2px solid #0B2E24;padding-bottom:10px;margin-bottom:6px}
    .meta{font-size:13px;color:#333;margin:10px 0 16px;line-height:1.7}
    .meta b{color:#0B2E24}
    table{border-collapse:collapse;width:100%;font-size:12px;margin-top:6px}
    th,td{border:1px solid #b9ccc3;padding:6px 8px}
    th{background:#0B2E24;color:#fff;font-weight:600;text-align:left}
    td.c,th.c{text-align:center}
    .sign{display:flex;justify-content:space-between;margin-top:34px;font-size:13px}
    .sign div{width:45%;border-top:1px solid #333;padding-top:6px;text-align:center;color:#333}
    @media print{body{padding:0}}
  </style></head><body>
    <div class="head">
      <div>
        <h1>Distinta di gara</h1>
        <div style="font-size:14px;margin-top:4px">${esc(team?.name) || ""}</div>
      </div>
      <div style="text-align:right;font-size:13px">
        <div><b>Data:</b> ${fmtShort(session.date)}</div>
        ${session.opponent ? `<div><b>Avversario:</b> ${esc(session.opponent)}</div>` : ""}
        ${gameFed ? `<div><b>Ente:</b> ${esc(gameFed)}</div>` : ""}
      </div>
    </div>
    <div class="meta">
      <b>Società:</b> _______________________________&nbsp;&nbsp;
      <b>Categoria:</b> _______________________________<br>
      <b>Dirigente accompagnatore:</b> _______________________________&nbsp;&nbsp;
      <b>Allenatore:</b> _______________________________
    </div>
    <table>
      <thead><tr>
        <th class="c">#</th><th class="c">Maglia</th><th>Cognome e nome</th>
        <th class="c">Nato il</th><th class="c">N° tessera</th><th class="c">Ente</th>
        <th class="c">Documento</th><th>Firma</th>
      </tr></thead>
      <tbody>${rows}${emptyRows}</tbody>
    </table>
    <div class="sign">
      <div>Il Dirigente</div>
      <div>L'Arbitro</div>
    </div>
    <script>window.onload=()=>window.print()</script>
  </body></html>`;
  const w = window.open("", "_blank");
  if (w) { w.document.write(html); w.document.close(); }
  else alert("Consenti le finestre pop-up per stampare la distinta.");
}

function SessionDetail({ session, players, team, onBack, onRecord, onMinutes, onPatch, onDelete }) {
  const isMatch = session.type === "partita";
  const [view, setView] = useState("presenze"); // presenze | lavoro
  const [distintaOpen, setDistintaOpen] = useState(false);
  const opts = [
    { k: "presente", full: "Presente", color: C.lime, icon: <Check size={16} strokeWidth={3} /> },
    { k: "assente", full: "Assente", color: C.clay, icon: <X size={16} strokeWidth={3} /> },
    { k: "giustificato", full: "Giustificato", color: C.amber, icon: <Minus size={16} strokeWidth={3} /> },
  ];

  return (
    <div style={{ paddingTop: 16 }}>
      <button onClick={onBack} style={backBtn}><ChevronLeft size={18} /> Storico</button>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        marginBottom: 18 }}>
        <div>
          <div style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: 22,
            textTransform: "capitalize" }}>{session.type}</div>
          <div style={{ color: C.muted, fontSize: 14 }}>{fmtDate(session.date)}</div>
        </div>
        <button onClick={onDelete} style={dangerBtn}><Trash2 size={17} /></button>
      </div>

      {isMatch && (
        <div style={{ marginBottom: 18 }}>
          <input value={session.opponent}
            onChange={(e) => onPatch(session.id, { opponent: e.target.value })}
            placeholder="Squadra avversaria" style={inp} />
          <button onClick={() => setDistintaOpen(true)}
            style={{ ...outlineBtn, width: "100%", justifyContent: "center", marginTop: 10 }}>
            <FileText size={17} /> Genera distinta
          </button>
        </div>
      )}

      {distintaOpen && (
        <DistintaModal session={session} players={players} team={team}
          onClose={() => setDistintaOpen(false)} />
      )}

      {/* switch presenze / piano di lavoro */}
      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        {[
          { k: "presenze", label: "Presenze", icon: <ClipboardList size={15} /> },
          { k: "lavoro", label: isMatch ? "Note gara" : "Lavoro svolto", icon: <ClipboardPen size={15} /> },
        ].map((t) => (
          <button key={t.k} onClick={() => setView(t.k)}
            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              padding: "9px", borderRadius: 10, fontWeight: 600, fontSize: 14,
              background: view === t.k ? C.lime : "transparent",
              color: view === t.k ? C.pitchDeep : C.chalk,
              border: `1px solid ${view === t.k ? C.lime : C.line}`, transition: "all .15s" }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {view === "presenze" ? (
        <>
          <div style={{ display: "grid", gap: 8 }}>
            {players.map((p) => {
              const status = session.records[p.id];
              return (
                <div key={p.id} style={{ background: C.surface, border: `1px solid ${C.line}`,
                  borderRadius: 12, padding: "10px 12px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                      <div style={{ ...jersey, width: 34, height: 34, fontSize: 13 }}>{p.number || "–"}</div>
                      <div style={{ fontWeight: 600, fontSize: 15, whiteSpace: "nowrap",
                        overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {opts.map((o) => {
                        const active = status === o.k;
                        return (
                          <button key={o.k} onClick={() => onRecord(session.id, p.id, o.k)} title={o.full}
                            style={{ width: 38, height: 38, borderRadius: 9, display: "flex",
                              alignItems: "center", justifyContent: "center",
                              background: active ? o.color : "transparent",
                              color: active ? C.pitchDeep : C.muted,
                              border: `1px solid ${active ? o.color : C.line}`, transition: "all .12s" }}>
                            {o.icon}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {isMatch && status === "presente" && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10,
                      paddingTop: 10, borderTop: `1px solid ${C.line}` }}>
                      <Timer size={15} color={C.muted} />
                      <span style={{ color: C.muted, fontSize: 13 }}>Minuti giocati</span>
                      <input type="number" min="0" max="120"
                        value={session.minutes?.[p.id] ?? ""}
                        onChange={(e) => onMinutes(session.id, p.id, e.target.value)}
                        placeholder="0"
                        style={{ ...inp, width: 76, marginLeft: "auto", padding: "7px 10px",
                          textAlign: "center" }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 18, color: C.muted, fontSize: 12,
            justifyContent: "center" }}>
            <Legend color={C.lime} label="Presente" />
            <Legend color={C.clay} label="Assente" />
            <Legend color={C.amber} label="Giustificato" />
          </div>
        </>
      ) : (
        <WorkPlan plan={session.plan || { objective: "", notes: "", drills: [] }}
          isMatch={isMatch}
          onChange={(plan) => onPatch(session.id, { plan })} />
      )}
    </div>
  );
}

// ─── Piano di lavoro della seduta ───────────────────────────────────
function WorkPlan({ plan, isMatch, onChange }) {
  const set = (k, v) => onChange({ ...plan, [k]: v });
  const drills = plan.drills || [];

  const addDrill = () => onChange({ ...plan, drills: [...drills,
    { id: uid(), title: "", minutes: "", desc: "" }] });
  const patchDrill = (id, patch) => onChange({ ...plan,
    drills: drills.map((d) => d.id === id ? { ...d, ...patch } : d) });
  const removeDrill = (id) => onChange({ ...plan, drills: drills.filter((d) => d.id !== id) });
  const move = (id, dir) => {
    const i = drills.findIndex((d) => d.id === id);
    const j = i + dir;
    if (j < 0 || j >= drills.length) return;
    const next = [...drills];
    [next[i], next[j]] = [next[j], next[i]];
    onChange({ ...plan, drills: next });
  };

  const totalMin = drills.reduce((s, d) => s + (parseInt(d.minutes, 10) || 0), 0);

  return (
    <div>
      <SectionTitle>{isMatch ? "Obiettivo tattico" : "Obiettivo della seduta"}</SectionTitle>
      <div style={cardWrap}>
        <input value={plan.objective || ""} onChange={(e) => set("objective", e.target.value)}
          placeholder={isMatch ? "Es. pressing alto, ripartenze rapide" : "Es. costruzione dal basso"}
          style={inp} />
      </div>

      {!isMatch && (
        <>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <SectionTitle>Fasi / esercizi{drills.length > 0 && ` · ${drills.length}`}</SectionTitle>
            {totalMin > 0 && (
              <span style={{ color: C.muted, fontSize: 12, display: "flex", alignItems: "center",
                gap: 4 }}><Clock size={12} /> {totalMin}′ totali</span>
            )}
          </div>

          {drills.length === 0 ? (
            <div style={{ ...cardWrap, textAlign: "center", color: C.muted, fontSize: 13,
              padding: "22px" }}>
              Nessun esercizio. Aggiungi le fasi del tuo allenamento qui sotto.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10, marginBottom: 12 }}>
              {drills.map((d, i) => (
                <div key={d.id} style={{ background: C.surface, border: `1px solid ${C.line}`,
                  borderRadius: 12, padding: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <div style={{ ...jersey, width: 28, height: 28, fontSize: 12, background: C.lime,
                      color: C.pitchDeep }}>{i + 1}</div>
                    <input value={d.title} onChange={(e) => patchDrill(d.id, { title: e.target.value })}
                      placeholder="Nome esercizio" style={{ ...inp, flex: 1, padding: "9px 11px" }} />
                    <div style={{ display: "flex", alignItems: "center", gap: 4,
                      background: C.pitchDeep, border: `1px solid ${C.line}`, borderRadius: 10,
                      padding: "0 10px" }}>
                      <input type="number" min="0" value={d.minutes}
                        onChange={(e) => patchDrill(d.id, { minutes: e.target.value })}
                        placeholder="0" style={{ width: 40, background: "transparent", border: "none",
                          color: C.chalk, fontSize: 15, outline: "none", textAlign: "right",
                          padding: "9px 0" }} />
                      <span style={{ color: C.muted, fontSize: 13 }}>′</span>
                    </div>
                  </div>
                  <textarea value={d.desc} onChange={(e) => patchDrill(d.id, { desc: e.target.value })}
                    placeholder="Descrizione, obiettivi, varianti, materiale…" rows={2}
                    style={{ ...inp, resize: "vertical", minHeight: 46, lineHeight: 1.5 }} />
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginTop: 8 }}>
                    <button onClick={() => move(d.id, -1)} disabled={i === 0}
                      style={{ ...tinyBtn, opacity: i === 0 ? 0.35 : 1 }}>↑</button>
                    <button onClick={() => move(d.id, 1)} disabled={i === drills.length - 1}
                      style={{ ...tinyBtn, opacity: i === drills.length - 1 ? 0.35 : 1 }}>↓</button>
                    <button onClick={() => removeDrill(d.id)}
                      style={{ ...tinyBtn, color: C.clay }}><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button onClick={addDrill} style={{ ...outlineBtn, width: "100%",
            justifyContent: "center", marginBottom: 24 }}>
            <Plus size={17} /> Aggiungi esercizio
          </button>
        </>
      )}

      <SectionTitle>{isMatch ? "Cronaca e note" : "Note e riepilogo"}</SectionTitle>
      <div style={cardWrap}>
        <textarea value={plan.notes || ""} onChange={(e) => set("notes", e.target.value)}
          placeholder={isMatch
            ? "Andamento della gara, cambi, episodi, valutazioni…"
            : "Com'è andata la seduta, intensità, chi ha lavorato a parte…"}
          rows={4} style={{ ...inp, resize: "vertical", minHeight: 90, lineHeight: 1.5 }} />
      </div>
      <div style={{ textAlign: "center", color: C.muted, fontSize: 12, marginBottom: 8 }}>
        Tutto si salva da solo.
      </div>
    </div>
  );
}

// ─── Statistiche + Export ───────────────────────────────────────────
function Statistiche({ state, coach, team, onOpen }) {
  const { players, sessions } = state;
  const matches = sessions.filter((s) => s.type === "partita").length;
  const trainings = sessions.filter((s) => s.type === "allenamento").length;
  const rows = players.map((p) => ({ p, st: playerStats(p.id, sessions) }));

  return (
    <div style={{ paddingTop: 20 }}>
      <AbsenceAlert alerts={absenceAlerts(players, sessions)} onOpen={onOpen} />
      <SectionTitle>Riepilogo squadra</SectionTitle>
      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <MiniStat n={players.length} l="Atleti" accent={C.lime} />
        <MiniStat n={trainings} l="Allenam." accent={C.chalk} />
        <MiniStat n={matches} l="Partite" accent={C.clay} />
      </div>

      {(() => {
        const unavailable = players.filter((p) => p.status && p.status !== "disponibile");
        if (unavailable.length === 0) return null;
        return (
          <div style={{ ...cardWrap, marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: C.chalk }}>
              Indisponibili · {unavailable.length}
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {unavailable.map((p) => {
                const m = statusMeta(p.status);
                return (
                  <button key={p.id} onClick={() => onOpen(p.id)}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                      gap: 10, background: C.pitchDeep, border: `1px solid ${C.line}`,
                      borderRadius: 10, padding: "9px 12px", width: "100%", textAlign: "left" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: m.color,
                        flexShrink: 0 }} />
                      <span style={{ fontWeight: 600, fontSize: 14, color: C.chalk,
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {p.name}</span>
                    </span>
                    <span style={{ color: m.color, fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
                      {m.label}{p.returnDate ? ` · ${p.returnDate}` : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })()}

      <SectionTitle>Esporta presenze</SectionTitle>
      <div style={{ ...cardWrap, display: "flex", gap: 10 }}>
        <button onClick={() => exportCSV(state, coach, team)} disabled={sessions.length === 0}
          style={{ ...primaryBtn, flex: 1, justifyContent: "center",
            opacity: sessions.length === 0 ? 0.45 : 1 }}>
          <Download size={17} /> Excel (CSV)
        </button>
        <button onClick={() => exportPDF(state, coach, team)} disabled={sessions.length === 0}
          style={{ ...outlineBtn, flex: 1, justifyContent: "center",
            opacity: sessions.length === 0 ? 0.45 : 1 }}>
          <Download size={17} /> PDF
        </button>
      </div>

      <SectionTitle>Classifica presenze</SectionTitle>
      {rows.length === 0 ? (
        <Empty icon={<BarChart3 size={26} />} text="Aggiungi atleti e registra sedute per vedere le statistiche." />
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {[...rows].sort((a, b) => b.st.rate - a.st.rate).map(({ p, st }) => (
            <button key={p.id} onClick={() => onOpen(p.id)} style={{ ...rowCard, padding: "12px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                <div style={{ ...jersey, width: 34, height: 34, fontSize: 13 }}>{p.number || "–"}</div>
                <div style={{ textAlign: "left", minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, whiteSpace: "nowrap",
                    overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                  <div style={{ color: C.muted, fontSize: 12, display: "flex", gap: 10, marginTop: 2 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                      <Trophy size={11} /> {st.callups} conv.</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                      <Clock size={11} /> {st.minutes}′</span>
                  </div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 800,
                  color: st.rate >= 75 ? C.lime : st.rate >= 50 ? C.amber : C.clay, fontSize: 18 }}>
                  {st.rate}%</div>
                <div style={miniLabel}>{st.present}/{st.total}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Statistiche per giocatore ──────────────────────────────────────
function playerStats(pid, sessions) {
  const total = sessions.length;
  const present = sessions.filter((s) => s.records[pid] === "presente").length;
  const absent = sessions.filter((s) => s.records[pid] === "assente").length;
  const justified = sessions.filter((s) => s.records[pid] === "giustificato").length;
  const matchSessions = sessions.filter((s) => s.type === "partita");
  const matches = matchSessions.length;
  const callups = matchSessions.filter((s) => s.records[pid] === "presente").length;
  const minutes = matchSessions.reduce((sum, s) =>
    sum + (parseInt(s.minutes?.[pid], 10) || 0), 0);
  return {
    total, present, absent, justified, matches, callups, minutes,
    rate: total ? Math.round((present / total) * 100) : 0,
    avgMin: callups ? Math.round(minutes / callups) : 0,
  };
}

// Soglia di allerta assenze nell'arco di 7 giorni
const ABSENCE_ALERT_THRESHOLD = 3;

// Conta le assenze "assente" di un atleta negli ultimi 7 giorni
function weeklyAbsences(pid, sessions) {
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  return sessions.filter((s) => {
    if (s.records[pid] !== "assente") return false;
    const t = new Date(s.date + "T00:00:00").getTime();
    return !isNaN(t) && t >= weekAgo && t <= now;
  }).length;
}

// Elenco atleti oltre soglia negli ultimi 7 giorni
function absenceAlerts(players, sessions) {
  return players
    .map((p) => ({ player: p, count: weeklyAbsences(p.id, sessions) }))
    .filter((x) => x.count > ABSENCE_ALERT_THRESHOLD);
}

// Metadati per lo stato di disponibilità
function statusMeta(status) {
  switch (status) {
    case "infortunato": return { label: "Infortunato", color: C.clay };
    case "recupero": return { label: "In recupero", color: C.amber };
    default: return { label: "Disponibile", color: C.lime };
  }
}

// ─── Export CSV (Excel) ─────────────────────────────────────────────
function exportCSV(state, coach, team) {
  const { players, sessions } = state;
  const ordered = [...sessions].sort((a, b) => a.date.localeCompare(b.date));
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const head = ["Atleta", "N°", "Ruolo", ...ordered.map((s) =>
    `${s.type === "partita" ? "Partita" : "Allen."} ${s.date}${s.opponent ? " vs " + s.opponent : ""}`),
    "Presenze %", "Convocazioni", "Minuti"];
  const lines = [head.map(esc).join(",")];
  players.forEach((p) => {
    const st = playerStats(p.id, sessions);
    const cells = ordered.map((s) => {
      const r = s.records[p.id];
      const map = { presente: "P", assente: "A", giustificato: "G" };
      let v = map[r] || "";
      if (s.type === "partita" && r === "presente" && s.minutes?.[p.id]) v += ` (${s.minutes[p.id]}')`;
      return v;
    });
    lines.push([p.name, p.number, p.role, ...cells, `${st.rate}%`, st.callups, st.minutes].map(esc).join(","));
  });
  const csv = "\uFEFF" + lines.join("\n");
  const slug = (s) => String(s || "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
  download(new Blob([csv], { type: "text/csv;charset=utf-8;" }),
    `presenze-${slug(team?.name)}-${today()}.csv`);
}

// ─── Export PDF (via finestra di stampa) ────────────────────────────
function exportPDF(state, coach, team) {
  const { players, sessions } = state;
  const ordered = [...sessions].sort((a, b) => a.date.localeCompare(b.date));
  const map = { presente: "P", assente: "A", giustificato: "G" };
  const cell = (r) => r ? `<span class="b b-${r}">${map[r]}</span>` : "";
  const esc = (s) => String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

  const rows = players.map((p) => {
    const st = playerStats(p.id, sessions);
    const cols = ordered.map((s) => `<td>${cell(s.records[p.id])}${
      s.type === "partita" && s.records[p.id] === "presente" && s.minutes?.[p.id]
        ? `<br><small>${s.minutes[p.id]}'</small>` : ""}</td>`).join("");
    return `<tr><td class="nm"><b>${esc(p.name)}</b><br><small>#${esc(p.number) || "–"} ${esc(p.role)}</small></td>
      ${cols}<td class="hl">${st.rate}%</td><td>${st.callups}</td><td>${st.minutes}'</td></tr>`;
  }).join("");
  const cols = ordered.map((s) => `<th>${s.type === "partita" ? "P" : "A"}<br><small>${
    fmtShort(s.date)}${s.opponent ? "<br>" + esc(s.opponent) : ""}</small></th>`).join("");

  // Sezione piani di lavoro degli allenamenti
  const plans = ordered.filter((s) => s.plan &&
    (s.plan.objective || s.plan.notes || (s.plan.drills || []).length)).map((s) => {
    const dr = (s.plan.drills || []).map((d, i) =>
      `<li><b>${esc(d.title) || "Esercizio " + (i + 1)}</b>${d.minutes ? ` — ${d.minutes}'` : ""}${
        d.desc ? `<br><span class="dd">${esc(d.desc)}</span>` : ""}</li>`).join("");
    return `<div class="plan">
      <div class="ph">${s.type === "partita" ? "Partita" : "Allenamento"} · ${fmtShort(s.date)}${
        s.opponent ? " vs " + esc(s.opponent) : ""}</div>
      ${s.plan.objective ? `<div><b>Obiettivo:</b> ${esc(s.plan.objective)}</div>` : ""}
      ${dr ? `<ol>${dr}</ol>` : ""}
      ${s.plan.notes ? `<div class="pn"><b>Note:</b> ${esc(s.plan.notes)}</div>` : ""}
    </div>`;
  }).join("");

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Report ${esc(coach.name)}</title>
  <style>
    body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;padding:28px;color:#0B2E24}
    h1{font-size:20px;margin:0}h2{font-size:15px;margin:26px 0 12px;color:#0B2E24}
    .sub{color:#5a7d70;font-size:13px;margin:4px 0 20px}
    table{border-collapse:collapse;width:100%;font-size:12px}
    th,td{border:1px solid #cdddd5;padding:6px 8px;text-align:center}
    th{background:#0B2E24;color:#fff;font-weight:600}
    .nm{text-align:left;white-space:nowrap}.nm small,td small{color:#5a7d70;font-weight:400}
    .hl{font-weight:700;background:#f2f8ec}
    .b{display:inline-block;width:20px;height:20px;line-height:20px;border-radius:5px;font-weight:700;color:#fff}
    .b-presente{background:#4a9d5b}.b-assente{background:#d5674a}.b-giustificato{background:#d0a020}
    .plan{border:1px solid #cdddd5;border-radius:8px;padding:12px 14px;margin-bottom:12px;font-size:13px}
    .ph{font-weight:700;margin-bottom:6px}.dd{color:#5a7d70}.pn{margin-top:6px}
    ol{margin:8px 0 0;padding-left:20px}li{margin-bottom:5px}
    @media print{body{padding:0}.plan{break-inside:avoid}}
  </style></head><body>
    <h1>${esc(team?.name) || "Squadra"}</h1>
    <div class="sub">Mister ${esc(coach.name)} · ${players.length} atleti · ${sessions.length} sedute · generato il ${fmtShort(today())}</div>
    <table><thead><tr><th class="nm">Atleta</th>${cols}<th>Pres.%</th><th>Conv.</th><th>Min.</th></tr></thead>
    <tbody>${rows}</tbody></table>
    <p style="margin-top:12px;color:#5a7d70;font-size:11px">
      A allenamento · P partita · P presente · A assente · G giustificato</p>
    ${plans ? `<h2>Lavoro svolto per seduta</h2>${plans}` : ""}
    <script>window.onload=()=>{window.print()}</script>
  </body></html>`;
  const w = window.open("", "_blank");
  if (w) { w.document.write(html); w.document.close(); }
  else alert("Consenti le finestre pop-up per esportare il PDF.");
}

function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a);
  a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ─── UI helpers ─────────────────────────────────────────────────────
function TabBar({ tab, setTab }) {
  const items = [
    { k: "rosa", label: "Rosa", icon: <Users size={20} /> },
    { k: "presenze", label: "Presenze", icon: <ClipboardList size={20} /> },
    { k: "stats", label: "Statistiche", icon: <BarChart3 size={20} /> },
  ];
  return (
    <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: C.pitch,
      borderTop: `1px solid ${C.line}`, display: "flex", justifyContent: "center",
      padding: "8px 0 max(8px, env(safe-area-inset-bottom))" }}>
      <div style={{ display: "flex", gap: 8, width: "100%", maxWidth: 760, padding: "0 16px" }}>
        {items.map((it) => (
          <button key={it.k} onClick={() => setTab(it.k)}
            style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
              gap: 4, padding: "8px", borderRadius: 12, background: "transparent",
              color: tab === it.k ? C.lime : C.muted, transition: "color .15s" }}>
            {it.icon}
            <span style={{ fontSize: 12, fontWeight: 600 }}>{it.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

function Shell({ children }) {
  return (
    <div style={{ minHeight: "100vh", background: C.pitchDeep, color: C.chalk,
      fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Archivo:wght@600;800&family=Inter:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        button { font-family: inherit; cursor: pointer; border: none; }
        input, select, textarea { font-family: inherit; }
        ::placeholder { color: ${C.muted}; }
        @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
      `}</style>
      {children}
    </div>
  );
}

const SectionTitle = ({ children }) => (
  <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, textTransform: "uppercase",
    letterSpacing: "0.1em", marginBottom: 10 }}>{children}</div>
);

function Field({ label, value, onChange, placeholder }) {
  return (
    <label style={{ display: "block", marginBottom: 12 }}>
      <div style={fieldLabel}>{label}</div>
      <input value={value || ""} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} style={inp} />
    </label>
  );
}

function Area({ label, value, onChange, placeholder }) {
  return (
    <label style={{ display: "block", marginBottom: 12 }}>
      <div style={fieldLabel}>{label}</div>
      <textarea value={value || ""} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} rows={2}
        style={{ ...inp, resize: "vertical", minHeight: 52, lineHeight: 1.5 }} />
    </label>
  );
}

function MiniStat({ n, l, accent }) {
  return (
    <div style={{ flex: 1, background: C.surface, border: `1px solid ${C.line}`,
      borderRadius: 12, padding: "12px 8px", textAlign: "center", minWidth: 0 }}>
      <div style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: 19,
        color: accent }}>{n}</div>
      <div style={miniLabel}>{l}</div>
    </div>
  );
}

const Legend = ({ color, label }) => (
  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
    <span style={{ width: 10, height: 10, borderRadius: 3, background: color }} /> {label}
  </span>
);

function AbsenceAlert({ alerts, onOpen }) {
  if (!alerts || alerts.length === 0) return null;
  return (
    <div style={{ background: "rgba(232,137,106,0.12)", border: `1px solid ${C.clay}`,
      borderRadius: 14, padding: "14px 16px", marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <AlertTriangle size={18} color={C.clay} />
        <span style={{ fontWeight: 700, fontSize: 14, color: C.clay }}>
          {alerts.length === 1 ? "Atleta da tenere d'occhio" : "Atleti da tenere d'occhio"}
        </span>
      </div>
      <div style={{ color: C.chalk, fontSize: 13, lineHeight: 1.5, marginBottom: 4 }}>
        {alerts.length === 1 ? "Ha" : "Hanno"} più di {ABSENCE_ALERT_THRESHOLD} assenze
        negli ultimi 7 giorni:
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
        {alerts.map(({ player, count }) => (
          <button key={player.id} onClick={() => onOpen && onOpen(player.id)}
            style={{ display: "flex", alignItems: "center", gap: 6, background: C.pitchDeep,
              border: `1px solid ${C.clay}`, borderRadius: 9, padding: "6px 10px",
              color: C.chalk, fontSize: 13, fontWeight: 600 }}>
            {player.name}
            <span style={{ background: C.clay, color: C.pitchDeep, borderRadius: 6,
              padding: "1px 6px", fontSize: 12, fontWeight: 700 }}>{count}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Empty({ icon, text }) {
  return (
    <div style={{ border: `1px dashed ${C.line}`, borderRadius: 14, padding: "34px 24px",
      textAlign: "center", color: C.muted }}>
      <div style={{ opacity: 0.6, marginBottom: 12, display: "flex", justifyContent: "center" }}>{icon}</div>
      <div style={{ fontSize: 14, lineHeight: 1.5, maxWidth: 320, margin: "0 auto" }}>{text}</div>
    </div>
  );
}

function Splash() {
  return (
    <div style={{ minHeight: "100vh", background: C.pitchDeep, color: C.muted,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Inter', sans-serif" }}>Carico lo spogliatoio…</div>
  );
}

// ─── style tokens ───────────────────────────────────────────────────
const inp = { width: "100%", background: C.pitchDeep, border: `1px solid ${C.line}`,
  borderRadius: 10, padding: "11px 13px", color: C.chalk, fontSize: 15, outline: "none" };
const fieldLabel = { fontSize: 12, color: C.muted, marginBottom: 6, fontWeight: 500 };
const miniLabel = { color: C.muted, fontSize: 10, textTransform: "uppercase",
  letterSpacing: "0.06em", marginTop: 3 };
const primaryBtn = { display: "flex", alignItems: "center", gap: 6, background: C.lime,
  color: C.pitchDeep, fontWeight: 700, fontSize: 14, padding: "11px 16px", borderRadius: 10 };
const outlineBtn = { display: "flex", alignItems: "center", gap: 6, background: "transparent",
  color: C.chalk, fontWeight: 600, fontSize: 14, padding: "11px 16px", borderRadius: 10,
  border: `1px solid ${C.line}` };
const dangerBtn = { display: "flex", alignItems: "center", justifyContent: "center",
  background: "transparent", color: C.clay, border: `1px solid ${C.line}`, borderRadius: 10,
  padding: "11px 14px" };
const backBtn = { display: "flex", alignItems: "center", gap: 4, background: "transparent",
  color: C.muted, fontSize: 14, fontWeight: 600, padding: "6px 0", marginBottom: 12 };
const tinyBtn = { display: "flex", alignItems: "center", justifyContent: "center",
  width: 32, height: 30, borderRadius: 8, background: "transparent",
  border: `1px solid ${C.line}`, color: C.muted, fontSize: 15, fontWeight: 700 };
const rowCard = { display: "flex", alignItems: "center", justifyContent: "space-between",
  background: C.surface, border: `1px solid ${C.line}`, borderRadius: 14, padding: "14px 16px",
  width: "100%", textAlign: "left", transition: "border-color .15s" };
const cardWrap = { background: C.surface, border: `1px solid ${C.line}`, borderRadius: 14,
  padding: 14, marginBottom: 24 };
const jersey = { width: 44, height: 44, borderRadius: 10, background: C.line,
  display: "flex", alignItems: "center", justifyContent: "center",
  fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: 16, flexShrink: 0 };

// ─── util ───────────────────────────────────────────────────────────
function fmtDate(iso) {
  try {
    return new Date(iso + "T00:00:00").toLocaleDateString("it-IT",
      { weekday: "short", day: "numeric", month: "short" });
  } catch { return iso; }
}
function fmtShort(iso) {
  try { return new Date(iso + "T00:00:00").toLocaleDateString("it-IT",
    { day: "2-digit", month: "2-digit", year: "2-digit" }); } catch { return iso; }
}
function today() { return new Date().toISOString().slice(0, 10); }
