const config = require('config');

const fastify = require('fastify');
const fastifySwagger = require('fastify-swagger');
const fastifyHelmet = require('fastify-helmet');
const fastifyAuth = require('fastify-auth');
const routes = require('./routes');

const { auth } = require('./lib');

const APPLICATION_PORT = config.get('port');
const ROUTE_PREFIX = config.get('routePrefix');
const FASTIFY_OPTIONS = config.get('fastifyOptions');

// Initialize swagger
const initSwagger = () => {
  const swaggerOptions = config.get('swagger');

  return {
    routePrefix: `${ROUTE_PREFIX}/documentation`,
    swagger: {
      info: {
        title: 'Project AKLL 2020 Web Backend - Match Service',
        description: 'Project AKLL 2020 Web Backend - Match Service',
        version: '1.0.0',
      },
      host: swaggerOptions.host,
      schemes: swaggerOptions.schemes,
      securityDefinitions: {
        bearerAuth: {
          type: 'apiKey',
          name: 'Authorization',
          in: 'header',
        },
      },
      security: [{
        bearerAuth: [],
      }],
      consumes: ['application/json'],
      produces: ['application/json'],
      tags: [{
        name: 'Match',
        description: 'Manage tournament matches',
      }, {
        name: 'Timeslot',
        description: 'Manage match timeslots',
      }, {
        name: 'Server',
        description: 'Server endpoints',
      }, {
        name: 'Utility',
        description: 'Utility endpoints',
      },
      ],
    },
    exposeRoute: true,
  };
};

// Routes
const matchRoute = async (server) => {
  Object.keys(routes.match).forEach((key) => {
    routes.match[key](server);
  });
};

const timeslotRoute = async (server) => {
  Object.keys(routes.timeslot).forEach((key) => {
    routes.timeslot[key](server);
  });
};

const utilityRoute = async (server) => {
  Object.keys(routes.utility).forEach((key) => {
    routes.utility[key](server);
  });
};

const serverRoute = async (server) => {
  Object.keys(routes.server).forEach((key) => {
    routes.server[key](server);
  });
};

/**
 * Init server
 * @param {Object} options Optional.
 */
const initServer = async () => {
  const server = fastify({
    logger: FASTIFY_OPTIONS.logger,
    ignoreTrailingSlash: FASTIFY_OPTIONS.ignoreTrailingSlash,
    ajv: {
      customOptions: {
        removeAdditional: 'all', // Remove additional params from the body etc
      },
    },
  });

  // Register plugins and routes
  server
    .decorate('verifyJWT', auth.verifyJWT)
    .register(fastifySwagger, initSwagger())
    .register(fastifyHelmet, {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ['\'self\''],
          styleSrc: ['\'self\'', '\'unsafe-inline\''],
          imgSrc: ['\'self\'', 'data:', 'validator.swagger.io'],
          scriptSrc: ['\'self\'', 'https: \'unsafe-inline\''],
        },
      },
    })
    .register(fastifyAuth)
    .register(timeslotRoute, { prefix: `${ROUTE_PREFIX}/timeslot` })
    .register(matchRoute, { prefix: `${ROUTE_PREFIX}/match` })
    .register(utilityRoute, { prefix: `${ROUTE_PREFIX}/utility` })
    .register(serverRoute, { prefix: `${ROUTE_PREFIX}/server` });

  return {
    start: async () => {
      await server.listen(APPLICATION_PORT, '0.0.0.0');
      return server;
    },
  };
};

module.exports = {
  initServer,
};
