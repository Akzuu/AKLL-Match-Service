const JWT = require('jsonwebtoken');
const bent = require('bent');
const config = require('config');
const log = require('./logger');

const AKLL_BACKEND_URL = config.get('akllBackendUrl');

const getTokens = bent(`${AKLL_BACKEND_URL}/utility/tokens`,
  'GET', 'json', 200);

const verifyJWT = async (req, reply, done) => {
  let payload;
  try {
    payload = await JWT.verify(req.headers.authorization);
  } catch (error) {
    done(new Error('Unauthorized'));
    return;
  }

  // Check if accessToken was used (refreshTokens only contain _id)
  if (payload.roles && payload.steamID64) {
    req.auth = { jwtPayload: payload };
  } else {
    // Request new tokens from main backend
    let auth;
    try {
      auth = await getTokens();
    } catch (error) {
      log.error('Error requesting new tokens! ', error);
      done(new Error('Internal Server Error'));
    }

    req.auth = auth;
  }
};

module.exports = {
  verifyJWT,
};
