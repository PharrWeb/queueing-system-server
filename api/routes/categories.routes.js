const router = require("express").Router();
const db = require("../mock/mockDB");

// Flat list
router.get("/", (_req, res) => {
  res.json(db.listCategoriesFlat());
});

module.exports = router;