const router = require("express").Router();
const db = require("../mock/mockDB");

router.get("/", (_req, res) => {
  try {
    const { lanes = [] } = db.getDb();
    res.json(lanes);
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

router.post("/open-close", (req, res) => {
  try {
    const { laneId, isOpen } = req.body || {};
    const l = db.setLaneOpenState(Number(laneId), !!isOpen);
    res.json(l);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/assign", (req, res) => {
  try {
    const { userId, laneId } = req.body || {};
    const rec = db.assignEmployeeToLane(Number(userId), Number(laneId));
    res.json(rec);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

module.exports = router;