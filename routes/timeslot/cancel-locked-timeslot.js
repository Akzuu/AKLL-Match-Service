const bent = require('bent');
const config = require('config');
const moment = require('moment');
const { log } = require('../../lib');
const { Match, CsgoServer } = require('../../models');

const AKLL_BACKEND_URL = config.get('akllBackendUrl');
const AKL_CONFIG_SERVICE_URL = config.get('aklConfigServiceUrl');

const getCaptainIds = bent(`${AKLL_BACKEND_URL}`, 'POST', 'json', 200);
const cancelMatch = bent(`${AKL_CONFIG_SERVICE_URL}`, 'POST', 'json', 200);

const schema = {
  description: 'Cancel locked timeslot for a match',
  summary: 'Cancel locked timeslot',
  tags: ['Timeslot'],
  body: {
    type: 'object',
    required: ['matchId'],
    properties: {
      matchId: {
        type: 'string',
      },
    },
  },
};

const handler = async (req, reply) => {
  const { matchId } = req.body;
  const authPayload = req.auth.jwtPayload;

  let match;
  try {
    match = await Match.findOne({
      _id: matchId,
      matchDateLocked: true,
      matchPlayed: false,
    })
      .populate('acceptedTimeslot');
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
      message: 'Match not found! Maybe match already has already been cancelled or it has been played?',
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
      message: 'Only captains can cancel locked timeslots!',
    });
    return;
  }

  // Make sure hasn't started
  const currentTimePlusFifteen = moment().add(15, 'minutes');
  const startTime = moment(match.acceptedTimeslot.startTime);

  if (currentTimePlusFifteen.isAfter(startTime)) {
    reply.status(400).send({
      status: 'ERROR',
      error: 'Bad Request',
      message: 'Match must be cancelled at least 15 minutes before match start!',
    });
    return;
  }

  match.depopulate('acceptedTimeslot');

  try {
    await cancelMatch(`/service/config/${match.challongeMatchId}/delete`);
  } catch (error) {
    log.error('Failed to cancel match from match service! ', error);
    reply.status(500).send({
      status: 'ERROR',
      error: 'Internal Server Error',
      message: 'Contact admin with error code 1003',
    });
    return;
  }

  let server;
  try {
    server = await CsgoServer.findByIdAndUpdate(match.csgo.server, {
      $pull: { lockedTimeslots: match.acceptedTimeslot },
    });
  } catch (error) {
    log.error('Error when trying to pull timeslot from server! ', error);
    reply.status(500).send({
      status: 'ERROR',
      error: 'Internal Server Error',
    });
    return;
  }

  if (!server) {
    reply.status(404).send({
      status: 'ERROR',
      error: 'Bad Request',
      message: 'Contact admin with code 1004',
    });
    return;
  }

  try {
    await Match.findByIdAndUpdate(matchId, {
      $set: {
        'csgo.server': null,
        acceptedTimeslot: null,
        matchDateLocked: false,
      },
    });
  } catch (error) {
    log.error('Error when trying to cancel timeslot for match! ', error);
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
  });
};

module.exports = async function (fastify) {
  fastify.route({
    method: 'POST',
    url: '/cancel',
    handler,
    preValidation: fastify.auth([fastify.verifyJWT]),
    schema,
  });
};
