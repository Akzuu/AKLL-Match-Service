const bent = require('bent');
const JWT = require('jsonwebtoken');
const config = require('config');
const { log } = require('../../lib');
const { Match } = require('../../models');

const AKLL_BACKEND_URL = config.get('akllBackendUrl');
const getCaptainIds = bent(`${AKLL_BACKEND_URL}/get-captains`, 'POST', 'json', 200);

const schema = {
  description: 'Propose a timeslot for match.',
  summary: 'Propose a timeslot.',
  tags: ['Timeslot'],
  body: {
    type: 'object',
    properties: {
      challongeMatchId: {
        type: 'string',
      },
      proposedTimeslots: {
        type: 'array',
        items: {
          $ref: '#/definitions/timeslot',
        },
      },
    },
    definitions: {
      timeslot: {
        type: 'object',
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
  /* response: {
    200: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
        },
      },
    },
  }, */
};

const handler = async (req, reply) => {
  if (!req.body.challongeMatchId || req.body.proposedTimeslots.length < 1) {
    log.error('Not enough parameters! ');
    reply.status(400).send({
      status: 'ERROR',
      error: 'Bad Request',
    });
    return;
  }

  let authPayload;

  // Check auth headers
  if (req.headers.authorization) {
    try {
      authPayload = await JWT.verify(req.headers.authorization);
    } catch (error) {
      reply.status(401).send({
        status: 'ERROR',
        error: 'Unauthorized',
        message: 'Please authenticate',
      });
      return;
    }
  }

  let match;
  try {
    match = await Match.findOne({
      challongeMatchId: req.body.challongeMatchId,
    });
  } catch (error) {
    log.error('Error finding the match! ', error);
    reply.status(500).send({
      status: 'ERROR',
      error: 'Internal Server Error',
    });
    return;
  }

  const teamIdArray = [match.teamOne.id, match.teamTwo.id];
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

  const proposedTimeslots = req.body.proposedTimeslots
    .map((timeslot) => ({ ...timeslot, proposerId: authPayload._id }));
  match.proposedTimeslots.push(proposedTimeslots);
  await match.save();
  reply.send({
    status: 'OK',
  });
};

module.exports = async function (fastify) {
  fastify.route({
    method: 'POST',
    url: '/propose-timeslot',
    handler,
    schema,
  });
};
