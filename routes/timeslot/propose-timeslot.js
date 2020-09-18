const { log } = require('../../lib');
const { Match } = require('../../models');

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
        timeslot: {
          type: 'object',
          properties: {
            startTime: {
              type: 'date',
            },
            endTime: {
              type: 'date',
            },
          },
        },
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
  if (!req.body.challongeMatchId || req.body.proposedTimeslots.length < 1) {
    log.error('Not enough parameters! ');
    reply.status(400).send({
      status: 'ERROR',
      error: 'Bad Request',
    });
  }

  let authPayload;

  // Check auth headers
  if (req.raw.headers.authorization) {
    try {
      authPayload = await req.jwtVerify();
    } catch (error) {
      reply.status(401).send({
        status: 'ERROR',
        error: 'Unauthorized',
        message: 'Please authenticate',
      });
    }
  }
  try {
    await Match.findOneAndUpdate({
      challongeMatchId: req.body.challongeMatchId,
    }, {
      $push: {
        proposedTimeslots: req.body.proposedTimeslots,
      },
    });
  } catch (error) {
    log.error('Error updating timeslots! ', error);
    reply.status(500).send({
      status: 'ERROR',
      error: 'Internal Server Error',
    });
    return;
  };


  
};

module.exports = async function (fastify) {
  fastify.route({
    method: 'GET',
    url: '/heartbeat',
    handler,
    schema,
  });
};