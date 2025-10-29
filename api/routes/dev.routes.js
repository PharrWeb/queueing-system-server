const router = require("express").Router();
const fs = require("fs");
const path = require("path");
const DATA_PATH = path.join(__dirname, "../mock/data.json");
const db = require("../mock/mockDB");

router.post("/reset", (req, res) => {
  try {
    const mode = req.body?.mode || "flush";
    const { nextCode } = db.resetTickets({ mode });
    res.json({ ok: true, mode, nextCode });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

router.post("/repair", (_req, res) => {
  try {
    const info = db.repair();
    res.json({ ok: true, ...info });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

router.post("/seed", (req, res) => {
  try {
    const n = Math.max(0, Number(req.body?.n || 10));
    const count = db.seedTickets(n);
    res.json({ ok: true, seeded: count });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

module.exports = router;
