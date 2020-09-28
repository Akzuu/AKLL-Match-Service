const mongoose = require('mongoose');

const { Schema } = mongoose;
const { ObjectId } = Schema.Types;

const schema = new Schema({
  name: {
    type: String,
    required: true,
  },
  ip: {
    type: String,
    required: true,
  },
  port: {
    type: Number,
    required: true,
  },
  password: {
    type: String,
  },
  league: {
    type: String,
    enum: ['all', 'pro', 'division'],
    default: 'all',
  },
  lockedTimeslots: [{
    type: ObjectId,
    ref: 'timeslots',
  }],
}, {
  timestamps: true,
});

module.exports = mongoose.model('csgoServers', schema);
