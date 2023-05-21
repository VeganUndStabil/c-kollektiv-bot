import { Configuration } from "src/entities/configuration";
import { Request } from "src/entities/request";
import { User } from "src/entities/user";
import { DataSource } from "typeorm";


export const db = new DataSource({
  type: "postgres",
  host: "localhost",
  port: 5432,
  username: "discordbot",
  password: "discordbot",
  database: "discordbot",
  logging: false, // process.env.NODE_ENV !== "production",
  entities: [User, Request, Configuration],
});