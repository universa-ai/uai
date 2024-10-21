import { Database } from "bun:sqlite";
const db = new Database("/Users/gur/.uai/mydb.sqlite", { create: true });
await db.query(`create table if not exists users(id INTEGER PRIMARY KEY);`)
  .run();
await db.query("insert or replace into users(id) values(1);").run();
console.log(db.query("select * from users LIMIT 1").get());
