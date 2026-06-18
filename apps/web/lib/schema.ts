import { pgTable, uuid, text, jsonb, timestamp } from 'drizzle-orm/pg-core'
import type { RubricScores, PhaseFeedback } from '@devgrill/shared'

export const subscriptions = pgTable('subscriptions', {
  id:        uuid('id').primaryKey().defaultRandom(),
  userId:    text('user_id').notNull().unique(),
  plan:      text('plan').notNull().default('free'), // 'free' | 'pro' | 'payg'
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const interviews = pgTable('interviews', {
  id:                  uuid('id').primaryKey().defaultRandom(),
  userId:              text('user_id').notNull(),
  threadId:            text('thread_id').notNull().unique(),
  questionTitle:       text('question_title'),
  questionDescription: text('question_description'),
  scores:              jsonb('scores').$type<RubricScores>(),
  phaseFeedback:       jsonb('phase_feedback').$type<PhaseFeedback[]>(),
  reportMarkdown:      text('report_markdown'),
  targetRole:          text('target_role'),
  targetCompany:       text('target_company'),
  clientIp:            text('client_ip'),
  createdAt:           timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
