const { log } = require('../../lib');
const { CsgoServer } = require('../../models');

const schema = {
  description: 'Create CS:GO server. Requires admin / moderator role',
  summary: 'Create CS:GO server',
  tags: ['Server'],
  body: {
    type: 'object',
    required: ['name', 'ip', 'port'],
    properties: {
      name: {
        type: 'string',
      },
      ip: {
        type: 'string',
      },
      port: {
        type: 'number',
      },
      password: {
        type: 'string',
      },
      league: {
        type: 'string',
        enum: ['all', 'pro', 'division'],
        default: 'all',
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
    await CsgoServer.create(req.body);
  } catch (error) {
    log.error('Error creating a server! ', error);
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
