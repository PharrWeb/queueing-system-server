const router = require("express").Router();
const db = require("../mock/mockDB");

router.get("/summary", (_req, res) => {
  res.json(db.statsSummary());
});

module.exports = router;