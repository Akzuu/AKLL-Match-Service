const config = require('config');
const bent = require('bent');
const { log } = require('../../lib');
const { Match } = require('../../models');

const AKLL_CHALLONGE_SERVICE_URL = config.get('akllChallongeServiceUrl');

const getMatches = bent(AKLL_CHALLONGE_SERVICE_URL, 'GET', 'json', 200);

const schema = {
  description: 'Create matches from challonge',
  summary: 'Create match from challonge tournament',
  tags: ['Match'],
  params: {
    type: 'object',
    properties: {
      challongeTournamentId: {
        type: 'string',
      },
    },
  },
};

const handler = async (req, reply) => {
  // const authPayload = req.auth.jwtPayload;
  // if (!authPayload.roles.includes('admin')
  // && !authPayload.roles.includes('moderator')) {
  //   reply.status(403).send({
  //     status: 'ERROR',
  //     error: 'Forbidden',
  //     message: 'Only admins and moderators are allowed to create matches! ',
  //   });
  //   return;
  // }

  // Get matches from challonge service
  let matches;
  try {
    matches = await getMatches(`/service/${req.params.challongeTournamentId}/matches`);
  } catch (error) {
    log.error('Error getting matches from challonge service! ', error);
  }
  // TODO: Make sure matches are received
  // Create matches
  console.log(matches);



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
    url: '/challonge/:challongeTournamentId/matches/create',
    handler,
    // preValidation: fastify.auth([fastify.verifyJWT]),
    schema,
  });
};
