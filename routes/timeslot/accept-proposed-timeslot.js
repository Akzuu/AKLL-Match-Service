const bent = require('bent');
const config = require('config');
const moment = require('moment');
const { log } = require('../../lib');
const { Match, CsgoServer } = require('../../models');

const AKLL_BACKEND_URL = config.get('akllBackendUrl');
const AKL_CONFIG_SERVICE = config.get('aklConfigServiceUrl');
const SPECTATORS = config.get('csgo.spectators');
const MAP_POOL = config.get('csgo.mapPool');

const getCaptainIds = bent(`${AKLL_BACKEND_URL}`,
  'POST', 'json', 200);

const getTeam = bent(`${AKLL_BACKEND_URL}`,
  'GET', 'json', 200);

const postMatchConfig = bent(`${AKL_CONFIG_SERVICE}`,
  'POST', 'json', 200, 201);

const schema = {
  description: 'Accept proposed timeslot.',
  summary: 'Accept a timeslot',
  tags: ['Timeslot'],
  body: {
    type: 'object',
    required: ['matchId', 'acceptedTimeslotId'],
    properties: {
      matchId: {
        type: 'string',
      },
      acceptedTimeslotId: {
        type: 'string',
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
  const { matchId, acceptedTimeslotId } = req.body;
  const authPayload = req.auth.jwtPayload;

  let match;
  try {
    match = await Match.findById(matchId)
      .populate('proposedTimeslots');
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
      message: 'Match not found! Make sure matchId is valid!',
    });
    return;
  }

  if (match.acceptedTimeslot) {
    reply.status(400).send({
      status: 'ERROR',
      error: 'Bad Request',
      message: 'Timeslot already accepted by both parties for this match!',
    });
    return;
  }

  const acceptedTimeslotArr = match.proposedTimeslots
    .filter((timeslot) => String(timeslot._id) === acceptedTimeslotId);

  if (!acceptedTimeslotArr || acceptedTimeslotArr.length < 1) {
    reply.status(404).send({
      status: 'ERROR',
      error: 'Not Found',
      message: 'Timeslot not found!',
    });
    return;
  }

  const acceptedTimeslot = acceptedTimeslotArr[0];

  // Add some time so that servers have time to update / backup / whatever
  acceptedTimeslot.endTime.setHours(acceptedTimeslot.endTime.getHours() + 1);

  if (String(acceptedTimeslot.proposerId) === authPayload._id) {
    reply.status(400).send({
      status: 'ERROR',
      error: 'Bad Request',
      message: 'You can not accept timeslot proposed by yourself!',
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
      message: 'Only team captains can accept timeslots!',
    });
    return;
  }

  // If CSGO, make sure there is room for the match
  const emptyServers = [];
  if (match.game === 'csgo') {
    let servers;
    try {
      servers = await CsgoServer.find().populate('lockedTimeslots');
    } catch (error) {
      log.error('Error when trying to find csgo servers! ', error);
      reply.status(500).send({
        status: 'ERROR',
        error: 'Internal Server Error',
      });
      return;
    }

    if (!servers || servers.length < 1) {
      reply.status(404).send({
        status: 'ERROR',
        error: 'Not Found',
        message: 'CS:GO Servers not found! Contact admin!',
      });
      return;
    }

    const momentedAcceptedTimeslot = {
      startTime: moment(acceptedTimeslot.startTime),
      endTime: moment(acceptedTimeslot.endTime),
    };

    // Refactor this shit
    servers.forEach((server) => {
      if (!server.lockedTimeslots || server.lockedTimeslots.length < 1) {
        emptyServers.push(server);
      } else if (server.lockedTimeslots.length > 0) {
        const conflict = server.lockedTimeslots.find((slot) => {
          const momentedTimeslot = {
            startTime: moment(slot.startTime),
            endTime: moment(slot.endTime),
          };

          if (momentedTimeslot.startTime
            .isBetween(momentedAcceptedTimeslot.startTime, momentedAcceptedTimeslot.endTime)
            || momentedTimeslot.endTime
              .isBetween(momentedAcceptedTimeslot.startTime, momentedAcceptedTimeslot.endTime)) {
            return slot;
          }
          return undefined;
        });

        if (!conflict) {
          emptyServers.push(server);
        }
      }
    });

    if (emptyServers.length < 1) {
      reply.status(400).send({
        status: 'ERROR',
        error: 'Bad Request',
        message: 'No empty servers found for this timeslot! Choose another one!',
      });
      return;
    }

    const emptyServer = emptyServers[0];

    let teamOne;
    let teamTwo;
    try {
      teamOne = await getTeam(`/team/${match.teamOne.coreId}/info`);
      teamTwo = await getTeam(`/team/${match.teamTwo.coreId}/info`);
    } catch (error) {
      log.error('Error when trying to find teams! ', error);
      reply.status(500).send({
        status: 'ERROR',
        error: 'Internal Server Error',
        message: 'Contact admin with error code: 1001',
      });
      return;
    }

    // TODO: Create function to do this to avoid repetation

    const teamOnePlayers = [];
    teamOne.members.forEach((player) => {
      const playerPayload = {
        steamId64: player.steam.steamID64,
        forcedName: player.username,
      };

      teamOnePlayers.push(playerPayload);
    });

    const teamTwoPlayers = [];
    teamTwo.members.forEach((player) => {
      const playerPayload = {
        steamId64: player.steam.steamID64,
        forcedName: player.username,
      };

      teamTwoPlayers.push(playerPayload);
    });

    const configPayload = {
      matchId: match.challongeMatchId,
      server: emptyServer.name,
      matchDate: {
        startTime: acceptedTimeslot.startTime,
        endTime: acceptedTimeslot.endTime,
      },
      bo: match.bestOf,
      spectators: SPECTATORS,
      vetoStarter: 'team1',
      sideChoosingMethod: 'standard',
      mapPool: MAP_POOL,
      playersPerTeam: 5,
      teamOne: {
        name: teamOne.teamName,
        tag: teamOne.abbreviation,
        players: teamOnePlayers,
      },
      teamTwo: {
        name: teamTwo.teamName,
        tag: teamTwo.abbreviation,
        players: teamTwoPlayers,
      },
    };

    try {
      await postMatchConfig('/service/config', configPayload);
    } catch (error) {
      log.error('Error when trying to post match config to server! ', error);
      reply.status(500).send({
        status: 'ERROR',
        error: 'Internal Server Error',
        message: 'Contact admin with error code: 1002',
      });
      return;
    }

    try {
      await CsgoServer.findByIdAndUpdate(emptyServer._id, {
        $push: { lockedTimeslots: acceptedTimeslotId },
      });
    } catch (error) {
      log.error('Error when trying to update CS:GO server! ', error);
      reply.status(500).send({
        status: 'ERROR',
        error: 'Internal Server Error',
      });
      return;
    }

    try {
      await Match.findByIdAndUpdate(matchId, {
        $set: {
          acceptedTimeslot: acceptedTimeslotId,
          proposedTimeslots: [],
          matchDateLocked: true,
          'csgo.server': emptyServer._id,
        },
      });
    } catch (error) {
      log.error('Error when trying to update match! ', error);
      reply.status(500).send({
        status: 'ERROR',
        error: 'Internal Server Error',
      });
      return;
    }
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
    url: '/accept',
    handler,
    preValidation: fastify.auth([fastify.verifyJWT]),
    schema,
  });
};
