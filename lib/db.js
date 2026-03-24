/* HOT SEATS - Supabase Database Layer */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_KEY || "";

async function sb(table, { method = "GET", body, query = "", headers: extra = {} } = {}) {
  const url = SUPABASE_URL + "/rest/v1/" + table + (query ? "?" + query : "");
  const res = await fetch(url, {
    method,
    headers: { apikey: SUPABASE_KEY, Authorization: "Bearer " + SUPABASE_KEY, "Content-Type": "application/json", Prefer: method === "POST" ? "return=representation" : method === "PATCH" ? "return=representation" : "", ...extra },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) { console.error("Supabase error:", res.status, await res.text()); return method === "GET" ? [] : null; }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}
// EMPLOYEES
export async function loginEmployee(name) {
  if (!SUPABASE_URL || !name) return null;
  const existing = await sb("employees", { query: "name=eq." + encodeURIComponent(name) + "&limit=1" });
  if (existing?.length > 0) return existing[0];
  const created = await sb("employees", { method: "POST", body: { name, created_at: new Date().toISOString() } });
  return created?.[0] || null;
}

export async function getEmployees() {
  if (!SUPABASE_URL) return [];
  return await sb("employees", { query: "order=name.asc" });
}

// CALL LOGS
export async function getCallLogs() {
  if (!SUPABASE_URL) return {};
  const rows = await sb("call_logs", { query: "order=updated_at.desc" });
  const map = {};
  (rows || []).forEach(r => {
    if (!map[r.event_id]) {
      map[r.event_id] = { status: r.status || "NOT_CALLED", note: r.note || "", note_by: r.note_by || "", employee: r.employee || "", timestamp: r.updated_at || r.created_at, revenue_amount: r.revenue_amount || 0, revenue_tickets: r.revenue_tickets || 0 };
    }
  });
  return map;
}

export async function upsertCallLog(eventId, eventName, venue, status, empId, emp, note, noteBy, revAmt, revTix) {
  if (!SUPABASE_URL) return null;
  const existing = await sb("call_logs", { query: "event_id=eq." + encodeURIComponent(eventId) + "&limit=1" });
  if (existing?.length > 0) {
    return await sb("call_logs", { method: "PATCH", query: "event_id=eq." + encodeURIComponent(eventId), body: { status, employee: emp || existing[0].employee, employee_id: empId || existing[0].employee_id, note: note || existing[0].note, note_by: noteBy || existing[0].note_by, revenue_amount: revAmt || existing[0].revenue_amount || 0, revenue_tickets: revTix || existing[0].revenue_tickets || 0, updated_at: new Date().toISOString() } });
  }
  return await sb("call_logs", { method: "POST", body: { event_id: eventId, event_name: eventName || "", venue: venue || "", status, employee: emp || "", employee_id: empId || "", note: note || "", note_by: noteBy || "", revenue_amount: revAmt || 0, revenue_tickets: revTix || 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() } });
}

export async function updateCallNote(eventId, note, emp) {
  if (!SUPABASE_URL) return null;
  const existing = await sb("call_logs", { query: "event_id=eq." + encodeURIComponent(eventId) + "&limit=1" });
  if (existing?.length > 0) {
    return await sb("call_logs", { method: "PATCH", query: "event_id=eq." + encodeURIComponent(eventId), body: { note, note_by: emp || "", updated_at: new Date().toISOString() } });
  }
  return await sb("call_logs", { method: "POST", body: { event_id: eventId, status: "NOT_CALLED", note, note_by: emp || "", created_at: new Date().toISOString(), updated_at: new Date().toISOString() } });
}

export async function updateCallRevenue(eventId, amount, tickets) {
  if (!SUPABASE_URL) return null;
  const existing = await sb("call_logs", { query: "event_id=eq." + encodeURIComponent(eventId) + "&limit=1" });
  if (existing?.length > 0) {
    return await sb("call_logs", { method: "PATCH", query: "event_id=eq." + encodeURIComponent(eventId), body: { revenue_amount: amount || 0, revenue_tickets: tickets || 0, updated_at: new Date().toISOString() } });
  }
  return await sb("call_logs", { method: "POST", body: { event_id: eventId, status: "NOT_CALLED", revenue_amount: amount || 0, revenue_tickets: tickets || 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() } });
}

// PHONE CACHE
export async function getPhoneCache() {
  if (!SUPABASE_URL) return {};
  const rows = await sb("phone_cache", { query: "order=cached_at.desc" });
  const map = {};
  (rows || []).forEach(r => {
    const vk = (r.venue_key || "").toLowerCase().trim();
    if (vk && !map[vk]) map[vk] = { phone: r.phone, name: r.name, cachedAt: r.cached_at };
  });
  return map;
}

export async function cachePhone(venueKey, result, venue) {
  if (!SUPABASE_URL || !venueKey) return null;
  const existing = await sb("phone_cache", { query: "venue_key=eq." + encodeURIComponent(venueKey) + "&limit=1" });
  if (existing?.length > 0) {
    return await sb("phone_cache", { method: "PATCH", query: "venue_key=eq." + encodeURIComponent(venueKey), body: { phone: result?.phone || null, name: result?.name || venue || "", cached_at: new Date().toISOString() } });
  }
  return await sb("phone_cache", { method: "POST", body: { venue_key: venueKey, venue_name: venue || "", phone: result?.phone || null, name: result?.name || venue || "", cached_at: new Date().toISOString() } });
}

// REMINDERS
export async function getReminders() {
  if (!SUPABASE_URL) return [];
  return await sb("reminders", { query: "order=remind_at.asc" });
}

export async function addReminder(eventId, eventName, time, label, empId, emp) {
  if (!SUPABASE_URL) return null;
  return await sb("reminders", { method: "POST", body: { event_id: eventId, event_name: eventName || "", remind_at: time, label: label || "", employee: emp || "", employee_id: empId || "", created_at: new Date().toISOString() } });
}

// EMPLOYEE STATS
export async function getEmployeeStats() {
  if (!SUPABASE_URL) return {};
  const logs = await sb("call_logs", { query: "select=employee,status,revenue_amount" });
  const stats = {};
  (logs || []).forEach(r => {
    const e = r.employee || "Unknown";
    if (!stats[e]) stats[e] = { calls: 0, hits: 0, sold: 0 };
    stats[e].calls++;
    if (r.status === "HIT") stats[e].hits++;
    if (r.status === "SOLD_OUT") stats[e].sold++;
  });
  return stats;
}
