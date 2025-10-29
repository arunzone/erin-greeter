const { Kysely, sql } = require('kysely');

exports.up = async function(db) {
  await db.schema
    .createTable('user')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`)
    )
    .addColumn('first_name', 'varchar(255)', (col) => col.notNull())
    .addColumn('last_name', 'varchar(255)', (col) => col.notNull())
    .addColumn('created_at', 'timestamp', (col) =>
      col.defaultTo(sql`now()`).notNull()
    )
    .execute();

  // Create user_birthday table
  await db.schema
    .createTable('user_birthday')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`)
    )
    .addColumn('user_id', 'uuid', (col) =>
      col.notNull().references('user.id')
    )
    .addColumn('day', 'integer', (col) => col.notNull().check(sql`"day" >= 1 and "day" <= 31`))
    .addColumn('month', 'integer', (col) => col.notNull().check(sql`"month" >= 1 and "month" <= 12`))
    .addColumn('year', 'integer', (col) => col.notNull())
    .addColumn('sent_year', 'integer')
    .addColumn('timezone', 'text', (col) => col.notNull().defaultTo('UTC'))
    .addColumn('created_at', 'timestamp', (col) =>
      col.defaultTo(sql`now()`).notNull()
    )
    .execute();

  await db.schema
    .createIndex('user_birthday_user_id_idx')
    .on('user_birthday')
    .column('user_id')
    .execute();

  await db.schema
    .createIndex('user_birthday_month_day_timezone_sent_year_idx')
    .on('user_birthday')
    .column('month', 'day', 'timezone', 'sent_year')
    .execute();
};

exports.down = async function(db) {
  await db.schema.dropTable('user_birthday').execute();
  await db.schema.dropTable('user').execute();
};