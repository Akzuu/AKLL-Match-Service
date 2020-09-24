const { log } = require('../../lib');
const { Match } = require('../../models');

const schema = {
  description: 'Create a new match with linking to stat services. Only admins can create new matches.',
  summary: 'Create a match',
  tags: ['Match'],
  body: {
    type: 'object',
    properties: {
      challongeMatchId: {
        type: 'string',
      },
      challongeRound: {
        type: 'number',
      },
      teamOne: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
          },
          name: {
            type: 'string',
          },
        },
      },
      teamTwo: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
          },
          name: {
            type: 'string',
          },
        },
      },
      bestOf: {
        type: 'number',
      },
      game: {
        type: 'string',
      },
      matchDeadline: {
        type: 'string',
        format: 'date-time',
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
  let authPayload;

  // // Check auth headers
  // if (req.headers.authorization) {
  //   try {
  //     authPayload = await JWT.verify(req.headers.authorization);
  //   } catch (error) {
  //     reply.status(401).send({
  //       status: 'ERROR',
  //       error: 'Unauthorized',
  //       message: 'Please authenticate',
  //     });
  //     return;
  //   }
  // }

  if (!authPayload.roles.includes('admin')) {
    reply.status(403).send({
      status: 'ERROR',
      error: 'Forbidden',
      message: 'Only admins are allowed to create match! ',
    });
    return;
  }

  try {
    await Match.create(req.body);
  } catch (error) {
    log.error('Error creating a match! ', error);
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
    url: '/create-match',
    handler,
    preValidation: fastify.auth([fastify.verifyJWT]),
    schema,
  });
};
