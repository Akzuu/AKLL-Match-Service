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
    coreId: {
      type: ObjectId,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    challongeId: {
      type: String,
    },
  },
  teamTwo: {
    coreId: {
      type: ObjectId,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    challongeId: {
      type: String,
    },
  },
  game: {
    type: String,
    required: true,
    enum: ['csgo', 'lol'],
  },
  bestOf: {
    type: Number,
    required: true,
  },
  proposedTimeslots: [{
    type: ObjectId,
    ref: 'timeslots',
  }],
  acceptedTimeslot: {
    type: ObjectId,
    ref: 'timeslots',
  },
  matchDateLocked: {
    type: Boolean,
    default: false,
  },
  matchDeadline: {
    type: Date,
  },
  matchPlayed: {
    type: Boolean,
    default: false,
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
    statsServiceMatchId: {
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
    },
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('matches', schema);
