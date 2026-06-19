// ─── window.storage SHIM, BACKED BY SUPABASE ───────────────────────────────
//
// The original component (built as a Claude Artifact) calls window.storage.get
// / .set, which only exists inside Claude's preview sandbox. Outside that
// sandbox there is no window.storage at all, so every read/write would
// silently fail.
//
// Rather than rewrite every getFromStorage/setToStorage call site in the
// 1700-line component, this file installs a drop-in replacement with the
// exact same shape on window.storage, backed by a single Supabase table:
//
//   create table kv_store (
//     key text not null,
//     shared boolean not null default true,
//     value text,
//     updated_at timestamptz default now(),
//     primary key (key, shared)
//   );
//
// "shared" rows (shared=true) are the same for every visitor — used for
// tasks, members, and admin accounts, so one admin's changes are visible to
// everyone. "non-shared" rows (shared=false) are scoped to this browser only,
// via a random per-browser id stored in localStorage — used only for
// njms_session ("which account is logged in on THIS device").
//
// Import this file once, before the App component mounts (see main.jsx).

import { supabase } from "./supabaseClient.js";

const DEVICE_ID_KEY = "njms_device_id";

function getDeviceId() {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = `dev_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

// Per-device keys are namespaced so two different browsers don't collide
// in the same Supabase table.
function resolveKey(key, shared) {
  return shared ? key : `${key}::${getDeviceId()}`;
}

async function get(key, shared = true) {
  const row = resolveKey(key, shared);
  const { data, error } = await supabase
    .from("kv_store")
    .select("value")
    .eq("key", row)
    .eq("shared", shared)
    .maybeSingle();

  if (error) {
    console.error("storage.get error:", error);
    return null;
  }
  if (!data) return null;
  return { key, value: data.value, shared };
}

async function set(key, value, shared = true) {
  const row = resolveKey(key, shared);
  const { error } = await supabase
    .from("kv_store")
    .upsert({ key: row, shared, value, updated_at: new Date().toISOString() }, { onConflict: "key,shared" });

  if (error) {
    console.error("storage.set error:", error);
    return null;
  }
  return { key, value, shared };
}

async function del(key, shared = true) {
  const row = resolveKey(key, shared);
  const { error } = await supabase
    .from("kv_store")
    .delete()
    .eq("key", row)
    .eq("shared", shared);

  if (error) {
    console.error("storage.delete error:", error);
    return null;
  }
  return { key, deleted: true, shared };
}

async function list(prefix = "", shared = true) {
  let query = supabase.from("kv_store").select("key").eq("shared", shared);
  if (prefix) query = query.ilike("key", `${prefix}%`);
  const { data, error } = await query;

  if (error) {
    console.error("storage.list error:", error);
    return null;
  }
  return { keys: (data || []).map((r) => r.key), prefix, shared };
}

if (typeof window !== "undefined") {
  window.storage = { get, set, delete: del, list };
}
