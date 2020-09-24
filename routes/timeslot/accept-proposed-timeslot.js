const bent = require('bent');
const config = require('config');
const { log } = require('../../lib');
const { Match } = require('../../models');

const AKLL_BACKEND_URL = config.get('akllBackendUrl');

const getCaptainIds = bent(`${AKLL_BACKEND_URL}`,
  'POST', 'json', 200);

const schema = {
  description: 'Accept proposed timeslot.',
  summary: 'Accept a timeslot',
  tags: ['Timeslot'],
  body: {
    type: 'object',
    required: ['matchId', 'acceptedTimeslotId'],
    properties: {
      matchId: {
        type: 'string',
      },
      acceptedTimeslotId: {
        type: 'string',
      },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
        },
      },
    },
  },
};

const handler = async (req, reply) => {
  const { matchId, acceptedTimeslotId } = req.body;
  const authPayload = req.auth.jwtPayload;

  let match;
  try {
    match = await Match.findById(matchId)
      .populate('proposedTimeslots');
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

  if (match.acceptedTimeslot) {
    reply.status(400).send({
      status: 'ERROR',
      error: 'Bad Request',
      message: 'Timeslot already accepted by both parties for this match!',
    });
    return;
  }

  const acceptedTimeslotArr = match.proposedTimeslots
    .filter((timeslot) => String(timeslot._id) === acceptedTimeslotId);

  if (!acceptedTimeslotArr) {
    reply.status(404).send({
      status: 'ERROR',
      error: 'Not Found',
      message: 'Timeslot not found!',
    });
    return;
  }

  const acceptedTimeslot = acceptedTimeslotArr[0];

  if (String(acceptedTimeslot.proposerId) === authPayload._id) {
    reply.status(400).send({
      status: 'ERROR',
      error: 'Bad Request',
      message: 'You can not accept timeslot proposed by yourself!',
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
      message: 'Only team captains can accept timeslots!',
    });
    return;
  }

  try {
    await Match.findByIdAndUpdate(matchId, {
      $set: {
        acceptedTimeslot: acceptedTimeslotId,
        proposedTimeslots: [],
      },
    });
  } catch (error) {
    log.error('Error when trying to update match! ', error);
    reply.status(500).send({
      status: 'ERROR',
      error: 'Internal Server Error',
    });
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
    url: '/accept',
    handler,
    preValidation: fastify.auth([fastify.verifyJWT]),
    schema,
  });
};
