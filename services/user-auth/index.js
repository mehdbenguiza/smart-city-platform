const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

mongoose.connect(process.env.MONGO_URI || 'mongodb://admin:secret123@mongo:27017/users_db?authSource=admin');

const User = mongoose.model('User', new mongoose.Schema({
  username: String,
  password: String
}));

const Reservation = mongoose.model('Reservation', new mongoose.Schema({
  userId: String,
  type: String,
  details: Object,
  ticket: String, // QR URL
  date: { type: Date, default: Date.now }
}));

const SECRET = 'smartcity2025';

// Signup
app.post('/signup', async (req, res) => {
  const { username, password } = req.body;
  const hashed = await bcrypt.hash(password, 10);
  try {
    const user = await User.create({ username, password: hashed });
    res.json({ message: "Compte créé" });
  } catch {
    res.status(400).json({ error: "Nom déjà pris" });
  }
});

// Login
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user || !await bcrypt.compare(password, user.password)) {
    return res.status(401).json({ error: "Mauvais identifiants" });
  }
  const token = jwt.sign({ userId: user._id }, SECRET);
  res.json({ token });
});

// Middleware auth
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: "No token" });
  try {
    const decoded = jwt.verify(token, SECRET);
    req.userId = decoded.userId;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
};

// Get reservations
app.get('/reservations', auth, async (req, res) => {
  const reservations = await Reservation.find({ userId: req.userId }).sort({ date: -1 });
  res.json(reservations);
});

// Reserve transport
app.post('/reserve-transport', auth, async (req, res) => {
  const { lineId } = req.body;
  const ticket = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=Transport:${lineId}`;
  const reservation = await Reservation.create({ userId: req.userId, type: "transport", details: { lineId }, ticket });
  res.json({ message: "Réservé", ticket });
});

// Reserve parking
app.post('/reserve-parking', auth, async (req, res) => {
  const { name } = req.body;
  const ticket = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=Parking:${name}`;
  const reservation = await Reservation.create({ userId: req.userId, type: "parking", details: { name }, ticket });
  res.json({ message: "Réservé", ticket });
});

app.listen(3006, () => console.log("User-Auth OK → 3006"));
