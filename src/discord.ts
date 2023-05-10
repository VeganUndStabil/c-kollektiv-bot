import { Client, OAuth2Scopes } from "discord.js";

export const client = new Client({
  intents: [
    "Guilds",
  ],
});