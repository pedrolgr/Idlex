export interface HunteraAccount {
  id: string;
  email?: string;
  emailVerified?: boolean;
  [key: string]: unknown;
}

export interface HunteraCharacter {
  id: number | string;
  accountId?: string;
  name: string;
  level: number;
  vocation?: string;
  outfitId?: number;
  outfitColors?: {
    head: number;
    body: number;
    legs: number;
    feet: number;
  };
  lastOnlineAt?: number | string;
  [key: string]: unknown;
}

export interface LoginResponse {
  account: HunteraAccount;
  [key: string]: unknown;
}

export interface CharactersResponse {
  characters: HunteraCharacter[];
  nameChangeCredits?: number;
  [key: string]: unknown;
}

export interface GameTicketResponse {
  ticket: string;
  websocketUrl: string;
  character: HunteraCharacter;
  [key: string]: unknown;
}

export interface HunteraClientOptions {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  defaultTimeoutMs?: number;
}
