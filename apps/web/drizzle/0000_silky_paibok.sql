CREATE TABLE "interviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"thread_id" text NOT NULL,
	"question_title" text,
	"question_description" text,
	"scores" jsonb,
	"phase_feedback" jsonb,
	"report_markdown" text,
	"target_role" text,
	"target_company" text,
	"client_ip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "interviews_thread_id_unique" UNIQUE("thread_id")
);
