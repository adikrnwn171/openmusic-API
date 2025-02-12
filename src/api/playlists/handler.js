class PlaylistsHandler {
  constructor(playlistsService, songsService, validator) {
    this._playlistsService = playlistsService;
    this._songsService = songsService;
    this._validator = validator;

    this.postPlaylistHandler = this.postPlaylistHandler.bind(this);
    this.getPlaylistsHandler = this.getPlaylistsHandler.bind(this);
    this.deletePlaylistHandler = this.deletePlaylistHandler.bind(this);
    this.postPlaylistSongHandler = this.postPlaylistSongHandler.bind(this);
    this.getPlaylistSongsHandler = this.getPlaylistSongsHandler.bind(this);
    this.deletePlaylistSongHandler = this.deletePlaylistSongHandler.bind(this);
    this.getPlaylistActivitiesHandler =
      this.getPlaylistActivitiesHandler.bind(this);
  }

  async postPlaylistHandler(request, h) {
    this._validator.validatePlaylistPayload(request.payload);
    const { name } = request.payload;
    const { id: credentialId } = request.auth.credentials;

    const playlistId = await this._playlistsService.addPlaylist({
      name,
      owner: credentialId,
    });

    const response = h.response({
      status: 'success',
      message: 'Playlist berhasil ditambahkan',
      data: {
        playlistId,
      },
    });
    response.code(201);
    return response;
  }

  async getPlaylistsHandler(request) {
    const { id: credentialId } = request.auth.credentials;
    const playlists = await this._playlistsService.getPlaylists(credentialId);
    return {
      status: 'success',
      data: {
        playlists,
      },
    };
  }

  async deletePlaylistHandler(request) {
    const { id } = request.params;
    const { id: credentialId } = request.auth.credentials;

    await this._playlistsService.verifyPlaylistOwner(id, credentialId);
    await this._playlistsService.deletePlaylistById(id);

    return {
      status: 'success',
      message: 'Playlist berhasil dihapus',
    };
  }

  async postPlaylistSongHandler(request, h) {
    this._validator.validatePlaylistSongPayload(request.payload);
    const { songId } = request.payload;
    const { id: playlist_id } = request.params;
    const { id: credentialId } = request.auth.credentials;
    const action = 'add';

    await this._playlistsService.verifyPlaylistAccess(
      playlist_id,
      credentialId,
    );
    await this._songsService.getSongById(songId);
    await this._playlistsService.addPlaylistActivity(
      playlist_id,
      songId,
      credentialId,
      action,
    );
    await this._playlistsService.addPlaylistSong({
      playlist_id,
      songId,
    });

    const response = h.response({
      status: 'success',
      message: 'Song berhasil ditambahkan ke playlist',
    });
    response.code(201);
    return response;
  }

  async getPlaylistSongsHandler(request) {
    const { id } = request.params;
    const { id: credentialId } = request.auth.credentials;

    const playlist = await this._playlistsService.getPlaylistSong(id);
    await this._playlistsService.verifyPlaylistAccess(id, credentialId);
    return {
      status: 'success',
      data: {
        playlist,
      },
    };
  }

  async deletePlaylistSongHandler(request) {
    this._validator.validatePlaylistSongPayload(request.payload);
    const { id } = request.params;
    const { id: credentialId } = request.auth.credentials;
    const { songId } = request.payload;
    const action = 'delete';

    await this._playlistsService.verifyPlaylistAccess(id, credentialId);
    await this._playlistsService.addPlaylistActivity(
      id,
      songId,
      credentialId,
      action,
    );
    await this._playlistsService.deletePlaylistSong(id, songId);

    return {
      status: 'success',
      message: 'Song berhasil dihapus dari playlist',
    };
  }

  async getPlaylistActivitiesHandler(request, h) {
    const { id } = request.params;
    const { id: credentialId } = request.auth.credentials;

    await this._playlistsService.verifyPlaylistOwner(id, credentialId);
    const result = await this._playlistsService.getPlaylistActivity(id);
    const response = h.response({
      status: 'success',
      data: result,
    });
    response.code(200);
    return response;
  }
}

module.exports = PlaylistsHandler;
