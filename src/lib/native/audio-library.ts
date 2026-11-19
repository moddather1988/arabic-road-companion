import { registerPlugin } from "@capacitor/core";

export interface AudioTrack {
  id: string;
  uri: string;
  title: string;
  artist: string;
  album: string;
  albumId: string;
  duration: number;
}

interface AudioLibraryPlugin {
  scan(): Promise<{ tracks: AudioTrack[] }>;
  setQueue(options: { tracks: AudioTrack[]; index: number }): Promise<void>;
  play(): Promise<void>;
  pause(): Promise<void>;
  next(): Promise<void>;
  previous(): Promise<void>;
  seek(options: { position: number }): Promise<void>;
  setVolume(options: { volume: number }): Promise<void>;
  state(): Promise<{
    playing: boolean;
    position: number;
    duration: number;
    index: number;
  }>;
}

export const AudioLibrary = registerPlugin<AudioLibraryPlugin>("AudioLibrary");
