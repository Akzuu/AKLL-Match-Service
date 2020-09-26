const createMatch = require('./create-match');
const getAllConfirmedMatches = require('./get-all-confirmed-matches');
const getMatchesForTeam = require('./get-matches-for-team');
const createMatchChallonge = require('./create-matches-from-challonge');
const getMatchById = require('./get-match-by-id');

module.exports = {
  createMatch,
  getAllConfirmedMatches,
  getMatchesForTeam,
  createMatchChallonge,
  getMatchById,
};
