const mongoose = require('mongoose');

const TrafficSchema = new mongoose.Schema({
  lineId: String,
  status: { type: String, enum: ['normal', 'delayed', 'cancelled'] },
  delayMinutes: Number,
  message: String,
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Traffic', TrafficSchema);
