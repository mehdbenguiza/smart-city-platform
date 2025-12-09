const express = require('express');
const router = express.Router();
const Traffic = require('../models/Traffic');

const seedTraffic = async () => {
  const count = await Traffic.countDocuments();
  if (count === 0) {
    await Traffic.insertMany([
      { lineId: "B1", status: "delayed", delayMinutes: 15, message: "Accident sur le trajet" },
      { lineId: "M2", status: "normal" }
    ]);
  }
};
seedTraffic();

router.get('/', async (req, res) => {
  const traffic = await Traffic.find();
  res.json(traffic);
});

module.exports = router;
