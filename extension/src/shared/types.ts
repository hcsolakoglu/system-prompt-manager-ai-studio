export type InsertMode = 'replace' | 'append' | 'prepend';

export type Theme = 'auto' | 'light' | 'dark';

export interface Profile {
  id: string;
  name: string;
  content: string;
  tags?: string[];
  favorite?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Settings {
  insertMode: InsertMode; // default: 'replace'
  showContextMenu: boolean; // default: true
  theme: Theme; // default: 'auto'
  confirmOverwriteSystem: boolean; // default: true
}

export interface StorageSchema {
  profiles: Profile[];
  lastUsedProfileId?: string;
  settings: Settings;
  version: number; // for migrations
}
