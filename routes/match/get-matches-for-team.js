const { log } = require('../../lib');
const { Match } = require('../../models');

const schema = {
  description: 'Get all matches for a team',
  summary: 'Get matches for a team',
  tags: ['Match'],
  params: {
    type: 'object',
    properties: {
      teamCoreId: {
        type: 'string',
      },
    },
  },
  query: {
    type: 'object',
    properties: {
      matchDateLocked: {
        type: 'boolean',
      },
    },
  },
};

const handler = async (req, reply) => {
  const { teamCoreId } = req.params;
  const { matchDateLocked } = req.query;

  const searchConditions = {
    $or: [{ 'teamOne.coreId': teamCoreId }, { 'teamTwo.coreId': teamCoreId }],
  };

  if (typeof matchDateLocked === 'boolean') {
    searchConditions.matchDateLocked = matchDateLocked;
  }

  let matches;
  try {
    matches = await Match.find(searchConditions, {
      __v: 0,
      matchDateLocked: 0,
      createdAt: 0,
      updatedAt: 0,
    })
      .populate('csgo.server')
      .populate('proposedTimeslots')
      .populate('acceptedTimeslot');
  } catch (error) {
    log.error('Error finding matches! ', error);
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
    matches,
  });
};

module.exports = async function (fastify) {
  fastify.route({
    method: 'GET',
    url: '/:teamCoreId/all',
    handler,
    preValidation: fastify.auth([fastify.verifyJWT]),
    schema,
  });
};
