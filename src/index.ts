import { OAuth2Scopes } from "discord.js";
import { db } from "src/db";
import { client } from "src/discord";
import { config } from "dotenv";


async function init() {
  config();
  await db.initialize();
  await db.runMigrations();
  await db.synchronize();
  console.log("db up");

  await client.login(process.env.DISCORD_TOKEN);
  console.log("bot up");
  const invite = client.generateInvite({
    scopes: [OAuth2Scopes.Bot],
    permissions: ["Administrator"],
  });
  console.log(invite);

  console.log("test");
}

init().then();

