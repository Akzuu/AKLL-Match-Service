const mongoose = require('mongoose');

const { Schema } = mongoose;

const schema = new Schema({
  name: {
    type: String,
    required: true,
  },
  ip: {
    type: String,
  },
  port: {
    type: Number,
  },
  password: {
    type: String,
  },
  league: {
    type: String,
    enum: ['all', 'pro', 'division'],
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('csgoServers', schema);
