const bent = require('bent');
const config = require('config');
const moment = require('moment');
const { log } = require('../../lib');
const { Match, Timeslot } = require('../../models');

const AKLL_BACKEND_URL = config.get('akllBackendUrl');

const getCaptainIds = bent(`${AKLL_BACKEND_URL}`, 'POST', 'json', 200);
const getTeam = bent(`${AKLL_BACKEND_URL}`, 'GET', 'json', 200);

const schema = {
  description: 'Propose a timeslot for match.',
  summary: 'Propose a timeslot',
  tags: ['Timeslot'],
  body: {
    type: 'object',
    required: ['matchId', 'proposedTimeslot'],
    properties: {
      matchId: {
        type: 'string',
      },
      proposedTimeslot: {
        type: 'object',
        required: ['startTime', 'endTime'],
        properties: {
          startTime: {
            type: 'string',
            format: 'date-time',
          },
          endTime: {
            type: 'string',
            format: 'date-time',
          },
        },
      },
    },
  },
};

const handler = async (req, reply) => {
  const { matchId, proposedTimeslot } = req.body;
  const authPayload = req.auth.jwtPayload;

  if (moment(proposedTimeslot.endTime).diff(moment(proposedTimeslot.startTime), 'hours') < 1) {
    reply.status(400).send({
      status: 'ERROR',
      error: 'Bad Request',
      message: 'Timeslot too short! Timeslot must be at least one hour long!',
    });
    return;
  }

  if (moment(proposedTimeslot.endTime).diff(moment(proposedTimeslot.startTime), 'hours') > 6) {
    reply.status(400).send({
      status: 'ERROR',
      error: 'Bad Request',
      message: 'Timeslot too long! Timeslot must be shorter than six hours!',
    });
    return;
  }

  let match;
  try {
    match = await Match.findOne({
      _id: matchId,
      matchDateLocked: false,
      matchPlayed: false,
    });
  } catch (error) {
    log.error('Error finding the match! ', error);
    reply.status(500).send({
      status: 'ERROR',
      error: 'Internal Server Error',
    });
    return;
  }

  if (!match) {
    reply.status(404).send({
      status: 'ERROR',
      error: 'Not Found',
      message: 'Match not found! Maybe match already has a timeslot or the id is invalid?',
    });
    return;
  }

  const teamIdArray = [match.teamOne.coreId, match.teamTwo.coreId];
  let captains;
  try {
    captains = await getCaptainIds('/team/get-captains', {
      teamIdArray,
    });
  } catch (error) {
    log.error('Error fetching captains! ', error);
    reply.status(500).send({
      status: 'ERROR',
      error: 'Internal Server Error',
    });
    return;
  }

  if (!captains.includes(authPayload._id)) {
    reply.status(401).send({
      status: 'ERROR',
      error: 'Unauthorized',
      message: 'Only captains can propose timeslots!',
    });
    return;
  }

  let team;
  try {
    team = await getTeam(`/team/${match.teamOne.coreId}/info`);
  } catch (error) {
    log.error('Error fetching team! ', error);
    reply.status(500).send({
      status: 'ERROR',
      error: 'Internal Server Error',
    });
    return;
  }

  if (!team) {
    log.error('Team not found! Id: ', match.teamOne.coreId);
    reply.status(500).send({
      status: 'ERROR',
      error: 'Internal Server Error',
    });
    return;
  }

  let proposerTeamId;
  if (String(team.captain._id) === String(authPayload._id)) {
    proposerTeamId = match.teamOne.coreId;
  } else {
    proposerTeamId = match.teamTwo.coreId;
  }

  const payload = {
    proposerId: authPayload._id,
    proposerTeamId,
    startTime: proposedTimeslot.startTime,
    endTime: proposedTimeslot.endTime,
  };

  let timeslot;
  try {
    timeslot = await Timeslot.create(payload);
  } catch (error) {
    log.error('Error when trying to create timeslot! ', error);
    reply.status(500).send({
      status: 'ERROR',
      error: 'Internal Server Error',
    });
    return;
  }

  try {
    await Match.findByIdAndUpdate(matchId, {
      $push: { proposedTimeslots: timeslot._id },
    });
  } catch (error) {
    log.error('Error when trying to add timeslot to match model! ', error);
    reply.status(500).send({
      status: 'ERROR',
      error: 'Internal Server Error',
    });
    return;
  }

  const { accessToken = undefined, refreshToken = undefined } = req.auth;
  reply.send({
    status: 'OK',
    accessToken,
    refreshToken,
  });
};

module.exports = async function (fastify) {
  fastify.route({
    method: 'POST',
    url: '/propose',
    handler,
    preValidation: fastify.auth([fastify.verifyJWT]),
    schema,
  });
};
