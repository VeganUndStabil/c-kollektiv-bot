import { Configuration } from "src/entities/configuration";
import { Request } from "src/entities/request";
import { User } from "src/entities/user";
import { env } from "src/util/env";
import { DataSource } from "typeorm";


export const db = new DataSource({
  type: "postgres",
  host: env("postgres_host"),
  port: env("postgres_port", 5432),
  username: env("postgres_user"),
  password: env("postgres_password"),
  database: env("postgres_db"),
  logging: false, // process.env.NODE_ENV !== "production",
  entities: [User, Request, Configuration],
});
