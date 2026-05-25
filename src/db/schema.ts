import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  date,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * employees — alle LAB21-medewerkers. Geen Zoho-users; identity leeft hier.
 *
 * - `functie`: 'Accountmanager' | 'Verkoper' | 'Inkoop en Planning' | ...
 * - `manager_id`: voor verkopers de default AM; voor AMs/I&P meestal null
 */
export const employees = pgTable(
  "employees",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    naam: text("naam").notNull(),
    functie: text("functie").notNull(),
    vestiging: text("vestiging"),
    active: boolean("active").notNull().default(true),
    managerId: uuid("manager_id").references((): import("drizzle-orm/pg-core").AnyPgColumn =>
      employees.id,
    ),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    emailIdx: uniqueIndex("employees_email_idx").on(t.email),
    functieIdx: index("employees_functie_idx").on(t.functie),
    managerIdx: index("employees_manager_idx").on(t.managerId),
  }),
);

/**
 * delegations — tijdelijke AM-vervanging (vakantie, verlof, ...).
 * Alleen consulted op het moment van order-creatie om de juiste AM-snapshot te bepalen.
 */
export const delegations = pgTable(
  "delegations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fromAmId: uuid("from_am_id").notNull().references(() => employees.id),
    toAmId: uuid("to_am_id").notNull().references(() => employees.id),
    validFrom: date("valid_from").notNull(),
    validUntil: date("valid_until").notNull(),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    fromIdx: index("delegations_from_idx").on(t.fromAmId, t.validFrom, t.validUntil),
  }),
);

/**
 * order_assignments — snapshot van order → AM op het moment van order-creatie.
 * Na de snapshot beweegt deze koppeling niet meer, ongeacht latere employees.manager_id-wisselingen.
 */
export const orderAssignments = pgTable(
  "order_assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    zohoOrderId: text("zoho_order_id").notNull(),
    verkoperId: uuid("verkoper_id").notNull().references(() => employees.id),
    accountmanagerId: uuid("accountmanager_id").notNull().references(() => employees.id),
    snapshottedAt: timestamp("snapshotted_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    zohoOrderIdx: uniqueIndex("order_assignments_zoho_order_idx").on(t.zohoOrderId),
    amIdx: index("order_assignments_am_idx").on(t.accountmanagerId),
    verkoperIdx: index("order_assignments_verkoper_idx").on(t.verkoperId),
  }),
);

export type Employee = typeof employees.$inferSelect;
export type NewEmployee = typeof employees.$inferInsert;
export type Delegation = typeof delegations.$inferSelect;
export type NewDelegation = typeof delegations.$inferInsert;
export type OrderAssignment = typeof orderAssignments.$inferSelect;
export type NewOrderAssignment = typeof orderAssignments.$inferInsert;
