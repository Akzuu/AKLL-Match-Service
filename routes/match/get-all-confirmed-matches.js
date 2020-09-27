const { log } = require('../../lib');
const { Match } = require('../../models');

const schema = {
  description: 'Get confirmed matches',
  summary: 'Get confirmed matches',
  tags: ['Match'],
};

const handler = async (req, reply) => {
  let matches;
  try {
    matches = await Match.find({
      matchDateLocked: true,
    }, {
      csgo: 0,
      lol: 0,
      challongeMatchId: 0,
      challongeRound: 0,
      __v: 0,
      proposedTimeslots: 0,
      matchDateLocked: 0,
      createdAt: 0,
      updatedAt: 0,
    })
      .populate('acceptedTimeslot');
  } catch (error) {
    log.error('Error finding matches! ', error);
    reply.status(500).send({
      status: 'ERROR',
      error: 'Internal Server Error',
    });
    return;
  }

  reply.send({
    status: 'OK',
    matches,
  });
};

module.exports = async function (fastify) {
  fastify.route({
    method: 'GET',
    url: '/confirmed',
    handler,
    schema,
  });
};
