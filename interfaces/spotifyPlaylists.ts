export interface ISpotifyTrack {
  id: string;
  title: string;
  artist: string;
  coverUrl: string;
  uri: string; // The 30s preview stream URL
}

export interface ISpotifyPlaylist {
  id: string;
  name: string;
  createdAt: number;
  tracks: ISpotifyTrack[];
}
