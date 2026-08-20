import { supabase } from "./supabaseClient.js";

// ─── Autenticazione ─────────────────────────────────────────────────
export async function signUp(email, password, fullName) {
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: { data: { full_name: fullName } },
  });
  if (error) throw error;
  return data;
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export function onAuthChange(cb) {
  const { data } = supabase.auth.onAuthStateChange((_e, session) => cb(session));
  return () => data.subscription.unsubscribe();
}

// Legge il profilo (ruolo, nome) dell'utente autenticato
export async function getMyProfile() {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const { data, error } = await supabase
    .from("profiles").select("*").eq("id", u.user.id).single();
  if (error) return { id: u.user.id, full_name: u.user.email, role: "tecnico" };
  return data;
}

// ─── Squadre ────────────────────────────────────────────────────────
export async function listTeams() {
  const { data, error } = await supabase
    .from("teams").select("*").order("created_at");
  if (error) throw error;
  return data;
}

export async function createTeam(name) {
  const { data: u } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("teams").insert({ name, owner: u.user.id }).select().single();
  if (error) throw error;
  return data;
}

export async function renameTeam(id, name) {
  const { error } = await supabase.from("teams").update({ name }).eq("id", id);
  if (error) throw error;
}

export async function deleteTeam(id) {
  const { error } = await supabase.from("teams").delete().eq("id", id);
  if (error) throw error;
}

// ─── Atleti ─────────────────────────────────────────────────────────
// Converte tra il formato dell'app (camelCase) e quello del db (snake_case)
function playerToDb(p, teamId) {
  return {
    team_id: teamId,
    name: p.name, number: p.number, role: p.role, birth: p.birth,
    foot: p.foot, height: p.height, weight: p.weight, shoe: p.shoe,
    card_numbers: p.cardNumbers || {}, federations: p.federations || [],
    id_document: p.idDocument || "",
    status: p.status || "disponibile", status_note: p.statusNote || "",
    return_date: p.returnDate || "",
    notes: p.notes || "", strengths: p.strengths || "", goals: p.goals || "",
  };
}
function playerFromDb(r) {
  return {
    id: r.id, name: r.name, number: r.number || "", role: r.role || "",
    birth: r.birth || "", foot: r.foot || "", height: r.height || "",
    weight: r.weight || "", shoe: r.shoe || "",
    cardNumbers: r.card_numbers || {}, federations: r.federations || [],
    idDocument: r.id_document || "",
    status: r.status || "disponibile", statusNote: r.status_note || "",
    returnDate: r.return_date || "",
    notes: r.notes || "", strengths: r.strengths || "", goals: r.goals || "",
  };
}

// ─── Anagrafica atleti (athletes) e collegamenti (team_players) ──────
function athleteToDb(p) {
  return {
    name: p.name, number: p.number, role: p.role, birth: p.birth,
    foot: p.foot, height: p.height, weight: p.weight, shoe: p.shoe,
    card_numbers: p.cardNumbers || {}, federations: p.federations || [],
    id_document: p.idDocument || "",
    status: p.status || "disponibile", status_note: p.statusNote || "",
    return_date: p.returnDate || "",
    notes: p.notes || "", strengths: p.strengths || "", goals: p.goals || "",
  };
}
function athleteFromDb(r) {
  return {
    id: r.id, name: r.name, number: r.number || "", role: r.role || "",
    birth: r.birth || "", foot: r.foot || "", height: r.height || "",
    weight: r.weight || "", shoe: r.shoe || "",
    cardNumbers: r.card_numbers || {}, federations: r.federations || [],
    idDocument: r.id_document || "",
    status: r.status || "disponibile", statusNote: r.status_note || "",
    returnDate: r.return_date || "",
    notes: r.notes || "", strengths: r.strengths || "", goals: r.goals || "",
  };
}

// Anagrafica: elenco completo
export async function listAthletes() {
  const { data, error } = await supabase
    .from("athletes").select("*").order("name");
  if (error) throw error;
  return data.map(athleteFromDb);
}
export async function addAthlete(p) {
  const { data, error } = await supabase
    .from("athletes").insert(athleteToDb(p)).select().single();
  if (error) throw error;
  return athleteFromDb(data);
}
export async function addAthletesBulk(list) {
  if (!list || list.length === 0) return [];
  const rows = list.map(athleteToDb);
  const { data, error } = await supabase.from("athletes").insert(rows).select();
  if (error) throw error;
  return (data || []).map(athleteFromDb);
}
export async function updateAthlete(p) {
  const { error } = await supabase
    .from("athletes").update(athleteToDb(p)).eq("id", p.id);
  if (error) throw error;
}
export async function removeAthlete(id) {
  const { error } = await supabase.from("athletes").delete().eq("id", id);
  if (error) throw error;
}

// Collegamenti squadra ↔ atleta
export async function listTeamAthleteIds(teamId) {
  const { data, error } = await supabase
    .from("team_players").select("athlete_id").eq("team_id", teamId);
  if (error) throw error;
  return (data || []).map((r) => r.athlete_id);
}
export async function addAthleteToTeam(teamId, athleteId) {
  const { error } = await supabase
    .from("team_players").insert({ team_id: teamId, athlete_id: athleteId });
  if (error && !String(error.message).includes("duplicate")) throw error;
}
export async function removeAthleteFromTeam(teamId, athleteId) {
  const { error } = await supabase.from("team_players")
    .delete().eq("team_id", teamId).eq("athlete_id", athleteId);
  if (error) throw error;
}

// ─── Sedute ─────────────────────────────────────────────────────────
function sessionToDb(s, teamId) {
  return {
    team_id: teamId, type: s.type, date: s.date, opponent: s.opponent || "",
    records: s.records || {}, minutes: s.minutes || {}, plan: s.plan || {},
  };
}
function sessionFromDb(r) {
  return {
    id: r.id, type: r.type, date: r.date, opponent: r.opponent || "",
    records: r.records || {}, minutes: r.minutes || {},
    plan: r.plan || { objective: "", notes: "", drills: [] },
  };
}

// Carica atleti (dall'anagrafica, tramite collegamenti) + sedute di una squadra
export async function loadTeamData(teamId) {
  const [links, ss] = await Promise.all([
    supabase.from("team_players").select("athlete_id").eq("team_id", teamId),
    supabase.from("sessions").select("*").eq("team_id", teamId).order("date", { ascending: false }),
  ]);
  if (links.error) throw links.error;
  if (ss.error) throw ss.error;
  const ids = (links.data || []).map((r) => r.athlete_id);
  let players = [];
  if (ids.length > 0) {
    const at = await supabase.from("athletes").select("*").in("id", ids).order("name");
    if (at.error) throw at.error;
    players = at.data.map(athleteFromDb);
  }
  return {
    players,
    sessions: ss.data.map(sessionFromDb),
  };
}

// ─── Operazioni singole (usate dall'app) ────────────────────────────
export async function addPlayer(teamId, p) {
  const { data, error } = await supabase
    .from("players").insert(playerToDb(p, teamId)).select().single();
  if (error) throw error;
  return playerFromDb(data);
}

// Inserisce più atleti in una sola operazione (import da Excel)
export async function addPlayersBulk(teamId, players) {
  if (!players || players.length === 0) return [];
  const rows = players.map((p) => playerToDb(p, teamId));
  const { data, error } = await supabase.from("players").insert(rows).select();
  if (error) throw error;
  return (data || []).map(playerFromDb);
}
export async function updatePlayer(teamId, p) {
  const { error } = await supabase
    .from("players").update(playerToDb(p, teamId)).eq("id", p.id);
  if (error) throw error;
}
export async function removePlayer(id) {
  const { error } = await supabase.from("players").delete().eq("id", id);
  if (error) throw error;
}

export async function addSession(teamId, s) {
  const { data, error } = await supabase
    .from("sessions").insert(sessionToDb(s, teamId)).select().single();
  if (error) throw error;
  return sessionFromDb(data);
}
export async function updateSession(teamId, s) {
  const { error } = await supabase
    .from("sessions").update(sessionToDb(s, teamId)).eq("id", s.id);
  if (error) throw error;
}
export async function removeSession(id) {
  const { error } = await supabase.from("sessions").delete().eq("id", id);
  if (error) throw error;
}

// ─── Supervisore: panoramica di tutto ───────────────────────────────
export async function loadEverything() {
  const [teams, athletes, links, sessions, profiles] = await Promise.all([
    supabase.from("teams").select("*").order("created_at"),
    supabase.from("athletes").select("*"),
    supabase.from("team_players").select("*"),
    supabase.from("sessions").select("*"),
    supabase.from("profiles").select("*"),
  ]);
  if (teams.error) throw teams.error;
  const athleteList = (athletes.data || []).map(athleteFromDb);
  const byId = new Map(athleteList.map((a) => [a.id, a]));
  const linkRows = links.data || [];
  return {
    teams: teams.data,
    athletes: athleteList,               // anagrafica completa
    links: linkRows,                     // { team_id, athlete_id }
    athletesById: byId,
    sessions: (sessions.data || []).map(sessionFromDb),
    profiles: profiles.data || [],
    rawSessions: sessions.data || [],
  };
}
