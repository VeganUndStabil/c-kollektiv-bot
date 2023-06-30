import { OAuth2Scopes } from "discord.js";
import { db } from "src/db";
import { applyServices, discord, discordLogin } from "src/discord";
import { env } from "src/util/env";
import "./services";


async function init() {
  console.log(env("postgres_host"));

  await db.initialize();
  await db.runMigrations();
  await db.synchronize();
  console.log("db up");
  await applyServices(discord);
  await discordLogin();
  console.log("bot up");
  const invite = discord.generateInvite({
    scopes: [OAuth2Scopes.Bot],
    permissions: ["Administrator"],
  });
  console.log(invite);
}

init().then();

