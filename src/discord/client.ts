import { env } from "src/util/env";
import { Client } from "discord.js";

export const discord = new Client({
  intents: ["Guilds"],
});

export const discordLogin = async () => {
  await discord.login(env("discord_token"));
};
