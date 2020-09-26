module.exports = {
  port: 3002,
  swagger: {
    host: 'localhost:3002',
    schemes: ['http', 'https'],
  },
  database: {
    mongo: {
      options: {
        useNewUrlParser: true,
        useCreateIndex: true,
        useFindAndModify: false,
        useUnifiedTopology: true,
      },
    },
  },
  routePrefix: '/akll-match',
  fastifyOptions: {
    logger: false,
    ignoreTrailingSlash: true,
  },
  csgo: {
    mapPool: ['de_inferno', 'de_train', 'de_mirage',
      'de_nuke', 'de_overpass', 'de_dust2', 'de_vertigo'],
  },
};
