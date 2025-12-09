const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect('mongodb://admin:secret123@mongo:27017/mobility_db?authSource=admin');

const Line = mongoose.model('Line', new mongoose.Schema({
  lineId: String,
  name: String,
  type: String
}));

// 12 lignes de transport (comme au début)
if (await Line.countDocuments() === 0) {
  await Line.insertMany([
    { lineId: "B1", name: "Bus Centre → Université", type: "bus" },
    { lineId: "B2", name: "Bus Gare → Port", type: "bus" },
    { lineId: "B3", name: "Bus Aéroport → Centre", type: "bus" },
    { lineId: "B4", name: "Bus Hôpital → Marché", type: "bus" },
    { lineId: "B5", name: "Bus Stade → Plage", type: "bus" },
    { lineId: "B6", name: "Bus Lycée → Cinéma", type: "bus" },
    { lineId: "M1", name: "Métro Ligne 1", type: "metro" },
    { lineId: "M2", name: "Métro Ligne 2", type: "metro" },
    { lineId: "T1", name: "Tramway Ligne 1", type: "tram" },
    { lineId: "T2", name: "Tramway Ligne 2", type: "tram" },
    { lineId: "T3", name: "Tramway Ligne 3", type: "tram" },
    { lineId: "T4", name: "Navette Aéroport", type: "navette" }
  ]);
}

app.get('/api/lines', async (req, res) => {
  const lines = await Line.find();
  res.json(lines);
});

app.listen(3001, () => console.log('Mobility REST OK → 3001'));
