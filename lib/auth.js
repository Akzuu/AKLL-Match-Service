const bent = require('bent');
const config = require('config');

const AKLL_BACKEND_URL = config.get('akllBackendUrl');

const getTokens = bent(`${AKLL_BACKEND_URL}`,
  'GET', 'json', 200);

const verifyJWT = async (req, reply, done) => {
  if (!req.raw.headers.authorization) {
    done(new Error('Please authenticate'));
    return;
  }

  let auth;
  try {
    auth = await getTokens('/utility/tokens', null, {
      Authorization: req.raw.headers.authorization,
    });
  } catch (error) {
    done(new Error('Problem verifying bearer token'));
  }

  req.auth = auth;
};

module.exports = {
  verifyJWT,
};
