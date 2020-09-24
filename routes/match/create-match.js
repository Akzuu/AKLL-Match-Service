const { log } = require('../../lib');
const { Match } = require('../../models');

const schema = {
  description: 'Create a new match with linking to stat services. Only admins can create new matches.',
  summary: 'Create a match',
  tags: ['Match'],
  body: {
    type: 'object',
    required: ['teamOne', 'teamTwo', 'game', 'bestOf'],
    properties: {
      challongeMatchId: {
        type: 'string',
      },
      challongeRound: {
        type: 'number',
      },
      teamOne: {
        type: 'object',
        required: ['coreId', 'name'],
        properties: {
          coreId: {
            type: 'string',
          },
          name: {
            type: 'string',
          },
        },
      },
      teamTwo: {
        type: 'object',
        required: ['coreId', 'name'],
        properties: {
          coreId: {
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
  const authPayload = req.auth.jwtPayload;

  if (!authPayload.roles.includes('admin')
  && !authPayload.roles.includes('moderator')) {
    reply.status(403).send({
      status: 'ERROR',
      error: 'Forbidden',
      message: 'Only admins and moderators are allowed to create matches! ',
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
