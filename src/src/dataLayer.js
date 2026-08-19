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

// Carica atleti + sedute di una squadra, nel formato dell'app
export async function loadTeamData(teamId) {
  const [pl, ss] = await Promise.all([
    supabase.from("players").select("*").eq("team_id", teamId).order("created_at"),
    supabase.from("sessions").select("*").eq("team_id", teamId).order("date", { ascending: false }),
  ]);
  if (pl.error) throw pl.error;
  if (ss.error) throw ss.error;
  return {
    players: pl.data.map(playerFromDb),
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
  const [teams, players, sessions, profiles] = await Promise.all([
    supabase.from("teams").select("*").order("created_at"),
    supabase.from("players").select("*"),
    supabase.from("sessions").select("*"),
    supabase.from("profiles").select("*"),
  ]);
  if (teams.error) throw teams.error;
  return {
    teams: teams.data,
    players: (players.data || []).map(playerFromDb),
    sessions: (sessions.data || []).map(sessionFromDb),
    profiles: profiles.data || [],
    rawPlayers: players.data || [],
    rawSessions: sessions.data || [],
  };
}
