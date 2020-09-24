const bent = require('bent');
const config = require('config');
const { log } = require('../../lib');
const { Match, Timeslot } = require('../../models');

const AKLL_BACKEND_URL = config.get('akllBackendUrl');

const getCaptainIds = bent(`${AKLL_BACKEND_URL}/get-captains`, 'POST', 'json', 200);

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

  let match;
  try {
    match = await Match.findById(matchId);
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
      message: 'Match not found! Make sure matchId is valid!',
    });
    return;
  }

  const teamIdArray = [match.teamOne.coreId, match.teamTwo.coreId];
  let captains;
  try {
    captains = await getCaptainIds(teamIdArray);
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

  let timeslot;
  try {
    timeslot = await Timeslot.create(proposedTimeslot);
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

  const { accessToken = {}, refreshToken = {} } = req.auth;
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
