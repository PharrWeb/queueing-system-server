const fs = require("fs");
const path = require("path");
const bus = require("./events");

const DATA_PATH = path.join(__dirname, "data.json");
const TMP_PATH = path.join(__dirname, "data.tmp");

// Helpers
const now = () => new Date().toISOString();
const ACTIVE_STATUSES = new Set(["waiting","called","serving"]);

const DEFAULTS = {
  sequences: { ticketSeq: 1 },
  kiosks: [
    { id:1, code:"K1", location:"Lobby A", is_active:true, created_at:now() },
    { id:2, code:"K2", location:"Lobby B", is_active:true, created_at:now() },
    { id:3, code:"K3", location:"Annex",   is_active:true, created_at:now() },
  ],
  users: [
    { id:1, username:"alice", role:"employee", display_name:"Alice", is_active:true },
    { id:2, username:"bob",   role:"employee", display_name:"Bob",   is_active:true },
    { id:3, username:"carol", role:"employee", display_name:"Carol", is_active:true },
    { id:4, username:"dan",   role:"employee", display_name:"Dan",   is_active:true },
    { id:5, username:"admin", role:"admin",    display_name:"Admin", is_active:true },
  ],
  // lanes will be generated to always be > employee count
  lanes: [],
  // employee lane assignments
  employeeLaneAssignments: [],
  categories: [
    // Licensing
    { id:  1, parent_id: null, name:"Licensing", is_selectable:false, is_active:true, is_visible:true, sort_order:1, prefix_letter:"A" },
    { id:  2, parent_id: 1,    name:"Driver License", is_selectable:false, is_active:true, is_visible:true, sort_order:1, prefix_letter:"A" },
    { id:  3, parent_id: 2,    name:"New Application", is_selectable:true, is_active:true, is_visible:true, sort_order:1, prefix_letter:"A" },
    { id:  4, parent_id: 2,    name:"Renewal",         is_selectable:true, is_active:true, is_visible:true, sort_order:2, prefix_letter:"A" },
    { id:  5, parent_id: 1,    name:"Professional",    is_selectable:true, is_active:true, is_visible:true, sort_order:2, prefix_letter:"A" },
    // Permits
    { id: 10, parent_id: null, name:"Permits", is_selectable:false, is_active:true, is_visible:true, sort_order:2, prefix_letter:"B" },
    { id: 11, parent_id: 10,   name:"Building",  is_selectable:true, is_active:true, is_visible:true, sort_order:1, prefix_letter:"B" },
    { id: 12, parent_id: 10,   name:"Electrical",is_selectable:true, is_active:true, is_visible:true, sort_order:2, prefix_letter:"B" },
    // Records
    { id: 20, parent_id: null, name:"Records", is_selectable:false, is_active:true, is_visible:true, sort_order:3, prefix_letter:"C" },
    { id: 21, parent_id: 20,   name:"Birth Certificate", is_selectable:true, is_active:true, is_visible:true, sort_order:1, prefix_letter:"C" },
    { id: 22, parent_id: 20,   name:"Marriage License",  is_selectable:true, is_active:true, is_visible:true, sort_order:2, prefix_letter:"C" },
    // Taxes
    { id: 30, parent_id: null, name:"Taxes", is_selectable:false, is_active:true, is_visible:true, sort_order:4, prefix_letter:"D" },
    { id: 31, parent_id: 30,   name:"Property Tax", is_selectable:true, is_active:true, is_visible:true, sort_order:1, prefix_letter:"D" },
    { id: 32, parent_id: 30,   name:"Business Tax", is_selectable:true, is_active:true, is_visible:true, sort_order:2, prefix_letter:"D" },
    // Benefits
    { id: 40, parent_id: null, name:"Benefits", is_selectable:false, is_active:true, is_visible:true, sort_order:5, prefix_letter:"E" },
    { id: 41, parent_id: 40,   name:"Eligibility", is_selectable:true, is_active:true, is_visible:true, sort_order:1, prefix_letter:"E" },
    { id: 42, parent_id: 40,   name:"Renewal",     is_selectable:true, is_active:true, is_visible:true, sort_order:2, prefix_letter:"E" },
    // Applications
    { id: 50, parent_id: null, name:"Applications", is_selectable:false, is_active:true, is_visible:true, sort_order:6, prefix_letter:"F" },
    { id: 51, parent_id: 50,   name:"Permit App",   is_selectable:true, is_active:true, is_visible:true, sort_order:1, prefix_letter:"F" },
    { id: 52, parent_id: 50,   name:"Grant App",    is_selectable:true, is_active:true, is_visible:true, sort_order:2, prefix_letter:"F" },
    // Other
    { id: 90, parent_id: null, name:"Other", is_selectable:true, is_active:true, is_visible:true, sort_order:99, prefix_letter:"Z" },
  ],
  tickets: [],
  ticketLaneHistory: [],
  ticketEvents: [],
  selectionSessions: [],
  selectionEvents: [],
};

function ensureFile() {
  if (!fs.existsSync(DATA_PATH)) {
    const lanes = ensureSeedLanesOnCreate(DEFAULTS);
    save({ ...DEFAULTS, lanes, created_at: now() });
  }
}

function normalize(db) {
  let changed = false;

  // backfill top-level keys
  for (const k of Object.keys(DEFAULTS)) {
    if (db[k] == null) {
      db[k] = Array.isArray(DEFAULTS[k]) ? DEFAULTS[k].map((x) => ({ ...x })) : { ...DEFAULTS[k] };
      changed = true;
    }
  }

  // guarantee a valid ticket sequence
  if (!db.sequences || typeof db.sequences.ticketSeq !== "number" || db.sequences.ticketSeq < 1) {
    db.sequences = { ticketSeq: 1 };
    changed = true;
  }

  // REPAIR ONLY if lanes are missing or empty, seed some once
  if (!Array.isArray(db.lanes) || db.lanes.length === 0) {
    db.lanes = ensureSeedLanesOnCreate(db);
    changed = true;
  }

  return changed;
}

function load() {
  ensureFile();
  let db;
  try {
    db = JSON.parse(fs.readFileSync(DATA_PATH, "utf8") || "{}");
  } catch {
    // Corrupted file? Re-seed.
    db = { ...DEFAULTS };
  }
  if (normalize(db)) save(db);
  return db;
}

function save(db) {
  const buf = Buffer.from(JSON.stringify(db, null, 2));
  const fd = fs.openSync(TMP_PATH, "w");
  try {
    fs.writeSync(fd, buf, 0, buf.length, 0);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fs.renameSync(TMP_PATH, DATA_PATH);
}

// Sequence -> A–Z + 00–99
function mapSeqToCode(seq) {
  const letterIndex = Math.floor((seq - 1) / 100) % 26; // 0..25
  const prefix = String.fromCharCode(65 + letterIndex); // 'A'..'Z'
  const num = (seq - 1) % 100;                          // 0..99
  const code = `${prefix}${num.toString().padStart(2, "0")}`;
  return { prefix, num, code };
}

function nextTicketCode(db) {
  // retry up to 300 to avoid active collisions
  for (let tries = 0; tries < 300; tries++) {
    const seq = db.sequences.ticketSeq++;
    const { prefix, num, code } = mapSeqToCode(seq);
    const conflict = db.tickets.some(
      t => t.prefix === prefix && t.seq_num === num && ACTIVE_STATUSES.has(t.status)
    );
    if (!conflict) return { prefix, num, code };
  }
  throw new Error("Unable to allocate a unique active ticket code after many attempts.");
}

function genLanes(n) {
  const list = [];
  for (let i = 1; i <= n; i++) {
    list.push({
      id: i,
      code: `L${i}`,
      name: `Lane ${i}`,
      is_open: false,
      is_deleted: false,
      created_at: now(),
      updated_at: now(),
    });
  }
  return list;
}

function ensureSeedLanesOnCreate(defaultsObj) {
  const employees = (defaultsObj.users || []).filter(
    (u) => u.role === "employee" && u.is_active !== false
  ).length;
  const count = Math.max(1, employees + 2);
  return genLanes(count);
}

// Reset allocator & data
function resetTickets({ mode = "flush" } = {}) {
  const db = load();
  if (mode === "complete") {
    const ts = now();
    db.tickets.forEach(t => {
      if (ACTIVE_STATUSES.has(t.status)) {
        t.status = "completed";
        if (!t.service_end_at) t.service_end_at = ts;
        t.closed_at = ts;
      }
    });
    db.ticketLaneHistory.forEach(h => { if (h.unassigned_at == null) h.unassigned_at = ts; });
  } else {
    db.tickets = [];
    db.ticketEvents = [];
    db.ticketLaneHistory = [];
    db.selectionSessions = [];
    db.selectionEvents = [];
    db.employeeLaneAssignments = db.employeeLaneAssignments || [];
  }
  db.sequences = { ticketSeq: 1 }; // ← critical
  save(db);
  return { nextCode: "A00" };
}

function repair() {
  const db = load();
  const changed = normalize(db);
  if (changed) save(db);
  return { fixed: changed, summary: Object.keys(db) };
}

// quick seeder
function seedTickets(n = 10) {
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push(module.exports.issueTicket({ kiosk_id: 1, category_id: 6 })); // adjust category_id as needed
  }
  return out.length;
}

// Public API
const dbApi = {
  getDb: () => load(),

  // Categories
  listCategoriesFlat() {
    const db = load();
    return db.categories.filter(c => c.is_active && c.is_visible).sort((a,b)=>a.sort_order-b.sort_order);
  },

  // Selection sessions & steps
  beginSession(kiosk_id) {
    const db = load();
    const id = (db.selectionSessions.at(-1)?.id || 0) + 1;
    db.selectionSessions.push({ id, kiosk_id, started_at: now(), completed_at: null, ticket_id: null });
    save(db);
    return id;
  },
  recordSelectionStep(session_id, category_id, level) {
    const db = load();
    const id = (db.selectionEvents.at(-1)?.id || 0) + 1;
    db.selectionEvents.push({ id, session_id, category_id, level, selected_at: now() });
    save(db);
    return id;
  },
  completeSession(session_id, ticket_id = null) {
    const db = load();
    const s = db.selectionSessions.find(s => s.id === session_id);
    if (s) {
      s.completed_at = now();
      if (ticket_id) s.ticket_id = ticket_id;
      save(db);
    }
  },

  // Tickets
  issueTicket({ kiosk_id, category_id }) {
    const db = load();
    const { prefix, num, code } = nextTicketCode(db);
    const id = (db.tickets.at(-1)?.id || 0) + 1;
    const ticket = {
      id, prefix, seq_num: num, code,
      issued_at: now(), status: "waiting", lane_id: null,
      kiosk_id: kiosk_id ?? null, category_id: category_id ?? null,
      service_start_at: null, service_end_at: null, closed_at: null
    };
    db.tickets.push(ticket);
    const evId = (db.ticketEvents.at(-1)?.id || 0) + 1;
    db.ticketEvents.push({ id: evId, ticket_id: id, event_type: "issued", category_id, lane_id: null, meta: null, occurred_at: now() });
    save(db);
    bus.emit("event", { type: "ticket-issued", data: ticket });   // <--- NEW
    return ticket;
  },

  callNextTicket(lane_id) {
    const db = load();
    const lane = db.lanes.find(l => l.id === lane_id);
    if (!lane || !lane.is_open) throw new Error("Lane is closed.");
    const next = db.tickets.filter(t => t.status === "waiting").sort((a,b)=>new Date(a.issued_at)-new Date(b.issued_at))[0];
    if (!next) return null;

    next.status = "called";
    next.lane_id = lane_id;

    const histId = (db.ticketLaneHistory.at(-1)?.id || 0) + 1;
    db.ticketLaneHistory.push({ id: histId, ticket_id: next.id, lane_id, assigned_at: now(), unassigned_at: null });

    const evId = (db.ticketEvents.at(-1)?.id || 0) + 1;
    db.ticketEvents.push({ id: evId, ticket_id: next.id, event_type: "called", lane_id, category_id: next.category_id, meta: null, occurred_at: now() });
    save(db);
    bus.emit("event", { type: "ticket-called", data: next });     // <--- NEW
    return next;
  },

  startService(ticket_id, lane_id) {
    const db = load();
    const t = db.tickets.find(t => t.id === ticket_id);
    if (!t) throw new Error("Ticket not found.");
    t.status = "serving";
    t.lane_id = lane_id ?? t.lane_id;
    if (!t.service_start_at) t.service_start_at = now();

    const evId = (db.ticketEvents.at(-1)?.id || 0) + 1;
    db.ticketEvents.push({ id: evId, ticket_id, event_type: "service_start", lane_id: t.lane_id, category_id: t.category_id, meta: null, occurred_at: now() });
    save(db);
    bus.emit("event", { type: "service-start", data: t });        // <--- NEW
    return t;
  },

  completeTicket(ticket_id, outcome) {
    const db = load();
    if (!["completed","no_show","cancelled"].includes(outcome)) throw new Error("Invalid outcome.");
    const t = db.tickets.find(t => t.id === ticket_id);
    if (!t) throw new Error("Ticket not found.");
    t.status = outcome;
    if (outcome === "completed" && !t.service_end_at) t.service_end_at = now();
    t.closed_at = now();

    const openHist = db.ticketLaneHistory.find(h => h.ticket_id === ticket_id && h.unassigned_at == null);
    if (openHist) openHist.unassigned_at = now();

    const evId = (db.ticketEvents.at(-1)?.id || 0) + 1;
    db.ticketEvents.push({ id: evId, ticket_id, event_type: outcome, lane_id: t.lane_id, category_id: t.category_id, meta: null, occurred_at: now() });
    save(db);
    bus.emit("event", { type: `ticket-${outcome}`, data: t });    // <--- NEW
    return t;
  },

  reassignTicket(ticket_id, new_lane_id) {
    const db = load();
    const t = db.tickets.find(t => t.id === ticket_id);
    if (!t) throw new Error("Ticket not found.");
    const old_lane = t.lane_id;
    t.lane_id = new_lane_id;

    const openHist = db.ticketLaneHistory.find(h => h.ticket_id === ticket_id && h.unassigned_at == null);
    if (openHist) openHist.unassigned_at = now();
    const histId = (db.ticketLaneHistory.at(-1)?.id || 0) + 1;
    db.ticketLaneHistory.push({ id: histId, ticket_id, lane_id: new_lane_id, assigned_at: now(), unassigned_at: null });

    const evId = (db.ticketEvents.at(-1)?.id || 0) + 1;
    const meta = { from_lane: old_lane, to_lane: new_lane_id };
    db.ticketEvents.push({ id: evId, ticket_id, event_type: "reassigned_lane", lane_id: new_lane_id, category_id: t.category_id, meta, occurred_at: now() });
    save(db);
    bus.emit("event", { type: "ticket-reassigned", data: { ticketId: ticket_id, from: old_lane, to: new_lane_id } }); // <--- NEW
    return t;
  },

  // Lanes & assignments
  setLaneOpenState(lane_id, is_open) {
    const db = load();
    const l = db.lanes.find(l => l.id === lane_id);
    if (!l) throw new Error("Lane not found.");
    l.is_open = !!is_open;
    l.updated_at = now();
    save(db);
    return l;
  },

  assignEmployeeToLane(user_id, lane_id) {
    const db = load();
    // release any current assignment for user or lane
    db.employeeLaneAssignments.forEach(a => {
      if ((a.user_id === user_id || a.lane_id === lane_id) && a.released_at == null) a.released_at = now();
    });
    const id = (db.employeeLaneAssignments.at(-1)?.id || 0) + 1;
    const rec = { id, user_id, lane_id, assigned_at: now(), released_at: null };
    db.employeeLaneAssignments.push(rec);
    save(db);
    return rec;
  },

  // Views
  currentlyServing() {
    const db = load();
    return db.tickets
      .filter(t => t.status === "called" || t.status === "serving")
      .sort((a,b)=>{
        const aPrio = a.status === "called" ? 0 : 1;
        const bPrio = b.status === "called" ? 0 : 1;
        if (aPrio !== bPrio) return aPrio - bPrio;
        return (new Date(b.service_start_at||0) - new Date(a.service_start_at||0)) ||
               (new Date(b.issued_at) - new Date(a.issued_at));
      })
      .map(t => ({
        ticket_id: t.id, code: t.code, status: t.status, lane_id: t.lane_id,
        lane_code: (load().lanes.find(l => l.id === t.lane_id)?.code) || null,
        issued_at: t.issued_at, service_start_at: t.service_start_at
      }));
  },

  currentQueue() {
    const db = load();
    return db.tickets
      .filter(t => t.status === "waiting")
      .sort((a,b)=> new Date(a.issued_at) - new Date(b.issued_at))
      .map(t => ({ ticket_id: t.id, code: t.code, status: t.status, issued_at: t.issued_at, category_id: t.category_id, lane_id: t.lane_id }));
  },

  // Simple stats
  statsSummary() {
    const db = load();
    const totalIssued = db.ticketEvents.filter(e=>e.event_type==="issued").length;
    const byCategory = {};
    db.tickets.forEach(t => {
      if (!t.category_id) return;
      byCategory[t.category_id] = (byCategory[t.category_id]||0) + 1;
    });
    return { totalIssued, byCategory };
  }
};

module.exports = dbApi;
// module.exports = {dbApi, resetTickets, repair, seedTickets};
