const { nanoid } = require('nanoid');
const { Pool } = require('pg');
const InvariantError = require('../../exceptions/InvariantError');
const NotFoundError = require('../../exceptions/NotFoundError');
const AuthorizationError = require('../../exceptions/AuthorizationError');

class PlaylistsService {
  constructor() {
    this._pool = new Pool();
  }

  async addPlaylist({ name, owner }) {
    const playlist_id = `playlist-${nanoid(16)}`;

    const query = {
      text: 'INSERT INTO playlists VALUES($1, $2, $3) RETURNING id',
      values: [playlist_id, name, owner],
    };

    const result = await this._pool.query(query);

    if (!result.rowCount) {
      throw new InvariantError('Playlist gagal ditambahkan');
    }

    return result.rows[0].id;
  }

  async getPlaylists(userId) {
    const query = {
      text: 'SELECT playlists.id, playlists.name, users.username AS owner FROM playlists JOIN users ON users.id = playlists.owner WHERE playlists.owner = $1',
      values: [userId],
    };

    const result = await this._pool.query(query);
    if (!result.rowCount) {
      const queryCollab = {
        text: 'SELECT playlists.id, playlists.name, users.username FROM playlists JOIN collaborations ON collaborations.playlist_id = playlists.id JOIN users ON users.id = playlists.owner WHERE collaborations.user_id = $1',
        values: [userId],
      };
      const resultCollab = await this._pool.query(queryCollab);
      return resultCollab.rows;
    }

    return result.rows;
  }

  async deletePlaylistById(id) {
    const query = {
      text: 'DELETE FROM playlists WHERE id = $1',
      values: [id],
    };

    const result = await this._pool.query(query);

    if (!result.rowCount) {
      throw new NotFoundError('Playlist gagal dihapus. Id tidak ditemukan');
    }
  }

  async addPlaylistSong({ playlist_id, songId }) {
    const PlaylistSongid = `playlist-song-${nanoid(16)}`;

    const query = {
      text: 'INSERT INTO playlist_songs values ($1, $2, $3) RETURNING id',
      values: [PlaylistSongid, playlist_id, songId],
    };

    const result = await this._pool.query(query);

    if (!result.rowCount) {
      throw new InvariantError('Song gagal ditambahkan');
    }

    return result.rows[0].id;
  }

  async getPlaylistSong(playlist_id) {
    const query = {
      text: 'SELECT playlist_songs.*, playlists.*, songs.title, songs.performer, users.username  FROM playlist_songs JOIN playlists ON playlist_songs.playlist_id = playlists.id JOIN songs ON playlist_songs.song_id = songs.id JOIN users ON playlists.owner = users.id  WHERE playlist_songs.playlist_id = $1',
      values: [playlist_id],
    };

    const result = await this._pool.query(query);

    if (!result.rowCount) {
      throw new NotFoundError('Song tidak ditemukan');
    }

    const playlist_song = {
      id: result.rows[0].playlist_id,
      name: result.rows[0].name,
      username: result.rows[0].username,
      songs: [],
    };

    result.rows.forEach((row) => {
      if (row.song_id) {
        playlist_song.songs.push({
          id: row.song_id,
          title: row.title,
          performer: row.performer,
        });
      }
    });

    return playlist_song;
  }

  async deletePlaylistSong(playlist_id, song_id) {
    const query = {
      text: 'DELETE FROM playlist_songs WHERE playlist_id = $1 AND song_id = $2',
      values: [playlist_id, song_id],
    };

    const result = await this._pool.query(query);

    if (!result.rowCount) {
      throw new NotFoundError('Song gagal dihapus. Id tidak ditemukan');
    }
  }

  async verifyPlaylistOwner(id, owner) {
    const query = {
      text: 'SELECT * FROM playlists WHERE id = $1',
      values: [id],
    };

    const result = await this._pool.query(query);

    if (!result.rowCount) {
      throw new NotFoundError('Playlist tidak ditemukan');
    }

    const playlist = result.rows[0];

    if (playlist.owner !== owner) {
      throw new AuthorizationError('Anda tidak berhak mengakses resource ini');
    }
  }

  async verifyPlaylistAccess(playlist_id, user_id) {
    const query = {
      text: 'SELECT playlists.*,collaborations.* FROM playlists LEFT JOIN collaborations ON playlists.id = collaborations.playlist_id WHERE playlists.id = $1 AND playlists.owner = $2 OR collaborations.user_id = $2',
      values: [playlist_id, user_id],
    };

    const result = await this._pool.query(query);

    if (!result.rowCount) {
      throw new AuthorizationError('Anda tidak berhak mengakses resource ini');
    }
  }

  async addPlaylistActivity(playlistId, songId, userId, action) {
    const id = `activity-${nanoid(16)}`;
    const time = new Date().toISOString();

    const query = {
      text: 'INSERT INTO playlist_song_activities VALUES($1, $2, $3, $4, $5, $6) RETURNING id',
      values: [id, playlistId, songId, userId, action, time],
    };

    const result = await this._pool.query(query);

    if (!result.rowCount) {
      throw new InvariantError('Activity gagal ditambahkan');
    }
  }

  async getPlaylistActivity(playlistId) {
    const query = {
      text: 'SELECT psa.playlist_id AS "playlistId", psa.action, psa.time, users.username, songs.title FROM playlist_song_activities psa JOIN users ON psa.user_id = users.id JOIN songs ON psa.song_id = songs.id WHERE psa.playlist_id = $1',
      values: [playlistId],
    };

    const result = await this._pool.query(query);

    const playlist_activity = {
      playlistId: result.rows[0].playlistId,
      activities: [],
    };

    result.rows.forEach((row) => {
      if (row.playlistId) {
        playlist_activity.activities.push({
          username: row.username,
          title: row.title,
          action: row.action,
          time: row.time,
        });
      }
    });

    return playlist_activity;
  }
}

module.exports = PlaylistsService;
