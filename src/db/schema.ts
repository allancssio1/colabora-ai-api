import { pgTable, uuid, text, timestamp, integer, numeric, pgEnum } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// Enums
export const listStatusEnum = pgEnum('list_status', ['active', 'archived'])
export const subscriptionPlanEnum = pgEnum('subscription_plan', ['basic', 'intermediate', 'max'])
// We can use text for unit_type to be more flexible as per requirements, or enum. 
// Requirements say: ENUM ou string. Let's use text to allow flexibility if needed, or enum if we want strictness.
// prompt examples: 'kg', 'g', 'unidade(s)', etc. Text is safer for now unless we strictly map all.
// But let's define an enum for stricter typing if possible, or just text constraint.
// Given strict examples, let's stick to text for simplicity in "unit_type" unless forced.

export const auth = pgTable('auth', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
})

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  cpf: text('cpf'),
  auth_id: uuid('auth_id')
    .notNull()
    .unique()
    .references(() => auth.id, { onDelete: 'cascade' }),
  subscription_plan: subscriptionPlanEnum('subscription_plan'),
  subscription_expires_at: timestamp('subscription_expires_at'),
  subscription_status: text('subscription_status').default('none'),
  created_at: timestamp('created_at').defaultNow().notNull(),
})

export const lists = pgTable('lists', {
  id: uuid('id').primaryKey().defaultRandom(),
  location: text('location').notNull(), // 'local' is a reserved keyword in some contexts, using location as per schema requirements mapping 'local' -> location
  description: text('description'),
  event_date: timestamp('event_date').notNull(),
  user_id: uuid('user_id')
    .notNull()
    .references(() => users.id),
  status: listStatusEnum('status').default('active').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
  updated_by: uuid('updated_by').references(() => users.id),
})

export const items = pgTable('items', {
  id: uuid('id').primaryKey().defaultRandom(),
  list_id: uuid('list_id')
    .notNull()
    .references(() => lists.id, { onDelete: 'cascade' }),
  item_name: text('item_name').notNull(),
  quantity_per_portion: numeric('quantity_per_portion').notNull(), // decimal
  unit_type: text('unit_type').notNull(),
  member_name: text('member_name'),
  member_cpf: text('member_cpf'),
  registered_at: timestamp('registered_at'),
  position: integer('position').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
})

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  plan: subscriptionPlanEnum('plan').notNull(),
  amount: integer('amount').notNull(),
  status: text('status').notNull(),
  starts_at: timestamp('starts_at'),
  expires_at: timestamp('expires_at'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
})

export const pixTransactions = pgTable('pix_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  subscription_id: uuid('subscription_id')
    .notNull()
    .references(() => subscriptions.id, { onDelete: 'cascade' }),
  abacate_pay_id: text('abacate_pay_id').notNull().unique(),
  amount: integer('amount').notNull(),
  status: text('status').notNull(),
  br_code: text('br_code'),
  qr_code_base64: text('qr_code_base64'),
  expires_at: timestamp('expires_at'),
  paid_at: timestamp('paid_at'),
  created_at: timestamp('created_at').defaultNow().notNull(),
})

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  auth: one(auth, {
    fields: [users.auth_id],
    references: [auth.id],
  }),
  lists: many(lists),
  subscriptions: many(subscriptions),
}))

export const listsRelations = relations(lists, ({ one, many }) => ({
  user: one(users, {
    fields: [lists.user_id],
    references: [users.id],
  }),
  items: many(items),
}))

export const itemsRelations = relations(items, ({ one }) => ({
  list: one(lists, {
    fields: [items.list_id],
    references: [lists.id],
  }),
}))

export const subscriptionsRelations = relations(subscriptions, ({ one, many }) => ({
  user: one(users, {
    fields: [subscriptions.user_id],
    references: [users.id],
  }),
  pixTransactions: many(pixTransactions),
}))

export const pixTransactionsRelations = relations(pixTransactions, ({ one }) => ({
  subscription: one(subscriptions, {
    fields: [pixTransactions.subscription_id],
    references: [subscriptions.id],
  }),
}))
