require('dotenv').config();

const Hapi = require('@hapi/hapi');
const ClientError = require('./exceptions/ClientError');
const Jwt = require('@hapi/jwt');

const albums = require('./api/albums');
const AlbumsService = require('./service/postgres/AlbumsService');
const AlbumsValidator = require('./validator/albums');

const songs = require('./api/songs');
const SongsService = require('./service/postgres/SongsService');
const SongsValidator = require('./validator/songs');

const users = require('./api/users');
const UsersService = require('./service/postgres/UsersService');
const UsersValidator = require('./validator/users');

const authentications = require('./api/authentications');
const AuthenticationsService = require('./service/postgres/AuthenticationsService');
const AuthenticationsValidator = require('./validator/authentications');
const TokenManager = require('./tokenize/TokenManager');

const playlists = require('./api/playlists');
const PlaylistsService = require('./service/postgres/PlaylistsService');
const PlaylistsValidator = require('./validator/playlists');

const collaborations = require('./api/collaborations');
const CollaborationsService = require('./service/postgres/CollaborationsService');
const CollaborationsValidator = require('./validator/collaborations');

const init = async () => {
  const albumsService = new AlbumsService();
  const songsService = new SongsService();
  const usersService = new UsersService();
  const authenticationsService = new AuthenticationsService();
  const collaborationsService = new CollaborationsService();
  const playlistsService = new PlaylistsService(collaborationsService);

  const server = Hapi.server({
    port: process.env.PORT,
    host: process.env.HOST,
    routes: {
      cors: {
        origin: ['*'],
      },
    },
  });

  await server.register([
    {
      plugin: Jwt,
    },
  ]);

  server.auth.strategy('playlistsapp_jwt', 'jwt', {
    keys: process.env.ACCESS_TOKEN_KEY,
    verify: {
      aud: false,
      iss: false,
      sub: false,
      maxAgeSec: process.env.ACCESS_TOKEN_AGE,
    },
    validate: (artifacts) => ({
      isValid: true,
      credentials: {
        id: artifacts.decoded.payload.id,
      },
    }),
  });

  await server.register([
    {
      plugin: albums,
      options: {
        albumsService: albumsService,
        validator: AlbumsValidator,
      },
    },
    {
      plugin: songs,
      options: {
        service: songsService,
        validator: SongsValidator,
      },
    },
    {
      plugin: users,
      options: {
        service: usersService,
        validator: UsersValidator,
      },
    },
    {
      plugin: authentications,
      options: {
        authenticationsService,
        usersService,
        tokenManager: TokenManager,
        validator: AuthenticationsValidator,
      },
    },
    {
      plugin: playlists,
      options: {
        playlistsService,
        songsService,
        validator: PlaylistsValidator,
      },
    },
    {
      plugin: collaborations,
      options: {
        collaborationsService,
        playlistsService,
        usersService,
        validator: CollaborationsValidator,
      },
    },
  ]);

  server.ext('onPreResponse', (request, h) => {
    const { response } = request;

    if (response instanceof ClientError) {
      const newResponse = h.response({
        status: 'fail',
        message: response.message,
      });
      newResponse.code(response.statusCode);
      return newResponse;
    }

    return h.continue;
  });

  await server.start();
  console.log(`Server running on ${server.info.uri}`);
};

init();
