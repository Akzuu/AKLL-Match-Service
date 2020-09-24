const bent = require('bent');
const config = require('config');
const log = require('./logger');

const AKLL_BACKEND_URL = config.get('akllBackendUrl');

const getTokens = bent(`${AKLL_BACKEND_URL}`,
  'GET', 'json', 200);

const verifyJWT = async (req, reply, done) => {
  let auth;
  try {
    auth = await getTokens('/utility/tokens', {}, {
      Authorization: req.raw.headers.authorization,
    });
  } catch (error) {
    log.error('Error requesting new tokens! ', error);
    done(new Error('Internal Server Error'));
  }

  req.auth = auth;
};

module.exports = {
  verifyJWT,
};
