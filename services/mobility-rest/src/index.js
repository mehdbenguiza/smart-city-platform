const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const mongoUri = process.env.MONGO_URI || 'mongodb://admin:secret123@mongo:27017/mobility_db?authSource=admin';

const connectWithRetry = () => {
  console.log('Tentative de connexion MongoDB...');
  mongoose.connect(mongoUri)
    .then(() => {
      console.log('MongoDB connecté !');
      startServer();
    })
    .catch(err => {
      console.error('MongoDB connexion échouée, retry dans 5s...', err.message);
      setTimeout(connectWithRetry, 5000);
    });
};

const startServer = () => {
  app.use('/api/lines', require('./routes/lines'));
  app.use('/api/traffic', require('./routes/traffic'));
  app.get('/health', (req, res) => res.status(200).send('Mobility Service OK'));

  const PORT = process.env.PORT || 3001;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Mobility Service (REST) → http://localhost:${PORT}`);
  });
};

connectWithRetry();
