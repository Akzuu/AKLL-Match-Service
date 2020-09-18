const mongoose = require('mongoose');

const { Schema } = mongoose;
const { ObjectId } = Schema.Types;

const schema = new Schema({
  challongeMatchId: {
    type: String,
    unique: true,
    sparse: true,
  },
  challongeRound: {
    type: Number,
  },
  teamOne: {
    id: {
      type: ObjectId,
    },
    name: {
      type: String,
    },
  },
  teamTwo: {
    id: {
      type: ObjectId,
    },
    name: {
      type: String,
    },
  },
  game: {
    type: String,
  },
  bestOf: {
    type: Number,
  },
  proposedTimeslots: [{
    proposerId: {
      type: ObjectId,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
  }],
  lockedTimeslot: {
    startTime: {
      type: Date,
    },
    endTime: {
      type: Date,
    },
  },
  matchDeadline: {
    type: Date,
  },
  matchPlayed: {
    type: Boolean,
  },
  endScore: {
    winner: {
      name: {
        type: String,
      },
      id: {
        type: ObjectId,
      },
    },
    winnerScore: {
      type: Number,
    },
    loserScore: {
      type: Number,
    },
  },
  csgo: {
    server: {
      type: ObjectId,
      ref: 'csgoServers',
    },
    statServiceId: {
      type: ObjectId,
    },
    maps: [{
      mapName: {
        type: String,
      },
      winner: {
        name: {
          type: String,
        },
        id: {
          type: ObjectId,
        },
      },
      winnerScore: {
        type: Number,
      },
      loserScore: {
        type: Number,
      },
    }],
  },
  lol: {
    statServiceGameIds: {
      type: [ObjectId],
    },
    tournamentCodes: {
      type: [String],
    }
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('matches', schema);
