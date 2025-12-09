const express = require('express');
const router = express.Router();
const Line = require('../models/Line');

// FORCER le rechargement complet à chaque démarrage
const seed = async () => {
  await Line.deleteMany({}); // on vide tout
  await Line.insertMany([
    { lineId: "B1",  name: "Bus Centre → Université", type: "bus" },
    { lineId: "B22", name: "Bus Gare → Hôpital", type: "bus" },
    { lineId: "B45", name: "Bus Port → Centre Commercial", type: "bus" },
    { lineId: "M1",  name: "Métro Ligne 1 Nord-Sud", type: "metro" },
    { lineId: "M2",  name: "Métro Ligne 2 Est-Ouest", type: "metro" },
    { lineId: "M5",  name: "Métro Ligne 5 Circulaire", type: "metro" },
    { lineId: "T1",  name: "Tram Centre → Aéroport", type: "tram" },
    { lineId: "T3",  name: "Tram Port → Stade", type: "tram" },
    { lineId: "RER-A", name: "RER A – Ville → Banlieue Nord", type: "train" },
    { lineId: "RER-B", name: "RER B – Centre → Sud", type: "train" },
    { lineId: "N1",  name: "Bus de Nuit Gare → Université", type: "bus" },
    { lineId: "N2",  name: "Bus de Nuit Centre → Port", type: "bus" },
  ]);
  console.log("12 lignes de transport chargées en force");
};
seed();

router.get('/', async (req, res) => {
  const lines = await Line.find();
  res.json(lines);
});

module.exports = router;
