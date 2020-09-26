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
  body: {
    type: 'object',
    properties: {
      game: {
        type: 'string',
        enum: ['csgo', 'lol'],
      },
      bestOf: {
        type: 'number',
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

  // Get matches from challonge service
  let res;
  try {
    res = await getMatches(`/service/${req.params.challongeTournamentId}/matches`);
  } catch (error) {
    log.error('Error getting matches from challonge service! ', error);
    reply.status(500).send({
      status: 'ERROR',
      error: 'Internal Server Error',
    });
    return;
  }

  if (!res || !res.matches || res.matches.length < 1) {
    reply.status(404).send({
      status: 'ERROR',
      error: 'Not Found',
      message: 'No matches found for this tournament. Has tournament started?',
    });
  }

  const bulkWritePayload = [];
  res.matches.forEach((match) => {
    const insertOneOp = {
      insertOne: {
        document: {
          challongeMatchId: match.matchId,
          challongeRound: match.round,
          teamOne: {
            coreId: match.teamOneCoreId,
            name: match.teamOneName,
            challongeId: match.teamOne,
          },
          teamTwo: {
            coreId: match.teamTwoCoreId,
            name: match.teamTwoName,
            challongeId: match.teamTwo,
          },
          game: req.body.game,
          bestOf: req.body.bestOf,
        },
      },
    };

    bulkWritePayload.push(insertOneOp);
  });

  let writeRes;
  try {
    writeRes = await Match.bulkWrite(bulkWritePayload);
  } catch (error) {
    log.error('Error writing matches to db! ', error);
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
    bulkWriteStatus: writeRes,
  });
};

module.exports = async function (fastify) {
  fastify.route({
    method: 'POST',
    url: '/challonge/:challongeTournamentId/matches/create',
    handler,
    preValidation: fastify.auth([fastify.verifyJWT]),
    schema,
  });
};
