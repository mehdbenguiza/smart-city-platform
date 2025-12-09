const mongoose = require('mongoose');

const LineSchema = new mongoose.Schema({
  lineId: { type: String, required: true, unique: true },
  name: String,
  type: { type: String, enum: ['bus', 'metro', 'tram', 'train'] } // on ajoute 'train'
});

module.exports = mongoose.model('Line', LineSchema);
