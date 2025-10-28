const router = require("express").Router();
const db = require("../mock/mockDB");

// Issue ticket
router.post("/issue", (req, res) => {
  try {
    const { kioskId, categoryId } = req.body || {};
    const t = db.issueTicket({ kiosk_id: kioskId, category_id: categoryId });
    res.status(201).json({ ticketId: t.id, code: t.code, status: t.status });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Call next ticket to a lane
router.post("/call-next", (req, res) => {
  try {
    const { laneId } = req.body || {};
    const t = db.callNextTicket(Number(laneId));
    res.status(200).json(t ? { ticketId: t.id, code: t.code, laneId: t.lane_id } : null);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Start service
router.post("/start-service", (req, res) => {
  try {
    const { ticketId, laneId } = req.body || {};
    const t = db.startService(Number(ticketId), Number(laneId));
    res.status(200).json({ ok: true, ticketId: t.id, status: t.status });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Complete ticket
router.post("/complete", (req, res) => {
  try {
    const { ticketId, outcome } = req.body || {};
    const t = db.completeTicket(Number(ticketId), outcome);
    res.status(200).json({ ok: true, ticketId: t.id, status: t.status });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Reassign ticket to another lane
router.post("/reassign", (req, res) => {
  try {
    const { ticketId, newLaneId } = req.body || {};
    const t = db.reassignTicket(Number(ticketId), Number(newLaneId));
    res.status(200).json({ ok: true, ticketId: t.id, laneId: t.lane_id });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Queue snapshots
router.get("/queue", (_req, res) => res.json(db.currentQueue()));
router.get("/serving", (_req, res) => res.json(db.currentlyServing()));

module.exports = router;