-- Synthetic local fixture, catalog-derived public table shape; never a release migration.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create table public.company_projects (id uuid primary key);
create table public.system_agents (
  "id" uuid default gen_random_uuid() not null,
  "agent_name" character varying(100) not null,
  "role" character varying(100) not null,
  "system_prompt" text not null,
  "status" character varying(20) default 'ACTIVE'::character varying,
  "created_at" timestamp with time zone default now(),
  "metadata" jsonb default '{}'::jsonb,
  constraint "system_agents_agent_name_key" UNIQUE (agent_name),
  constraint "system_agents_pkey" PRIMARY KEY (id)
);
alter table public.system_agents enable row level security;
create table public.agent_tasks (
  "id" uuid default gen_random_uuid() not null,
  "agent_id" uuid,
  "task_description" text not null,
  "output_data" jsonb,
  "status" character varying(20) default 'PENDING'::character varying,
  "approval_required" boolean default true,
  "is_approved" boolean default false,
  "created_at" timestamp with time zone default now(),
  "project_id" uuid,
  "task_name" character varying(255),
  "payload" jsonb default '{}'::jsonb,
  "execution_result" jsonb,
  "updated_at" timestamp with time zone default now(),
  "risk_level" smallint default 2 not null,
  "action_class" text default 'UNCLASSIFIED'::text not null,
  "data_class" text default 'INTERNAL'::text not null,
  "external_action_allowed" boolean default false not null,
  "correlation_id" uuid default gen_random_uuid() not null,
  "idempotency_key" text,
  "expires_at" timestamp with time zone,
  "model_route" jsonb default '{}'::jsonb not null,
  "budget_limit_usd" numeric(12,4),
  "approved_at" timestamp with time zone,
  "approved_by_reference" text,
  "approval_reason" text,
  "lifecycle_state" text default 'LEGACY_PENDING'::text not null,
  "parent_task_id" uuid,
  "requested_by_reference" text,
  "qa_required" boolean default true not null,
  "qa_state" text default 'NOT_REVIEWED'::text not null,
  "execution_mode" text default 'NONE'::text not null,
  "completed_at" timestamp with time zone,
  constraint "agent_tasks_agent_id_fkey" FOREIGN KEY (agent_id) REFERENCES system_agents(id) ON DELETE CASCADE,
  constraint "agent_tasks_budget_limit_check" CHECK (((budget_limit_usd IS NULL) OR (budget_limit_usd >= (0)::numeric))),
  constraint "agent_tasks_data_class_check" CHECK ((data_class = ANY (ARRAY['PUBLIC'::text, 'INTERNAL'::text, 'CONFIDENTIAL'::text, 'RESTRICTED'::text]))),
  constraint "agent_tasks_execution_mode_check" CHECK ((execution_mode = ANY (ARRAY['NONE'::text, 'INTERNAL'::text, 'MODEL_ROUTED'::text, 'HUMAN'::text]))),
  constraint "agent_tasks_lifecycle_state_check" CHECK ((lifecycle_state = ANY (ARRAY['LEGACY_PENDING'::text, 'DRAFT'::text, 'READY'::text, 'WAITING_APPROVAL'::text, 'APPROVED'::text, 'EXECUTING'::text, 'QA_REVIEW'::text, 'COMPLETED'::text, 'HELD'::text, 'REJECTED'::text, 'CANCELLED'::text, 'EXPIRED'::text]))),
  constraint "agent_tasks_no_self_parent_check" CHECK (((parent_task_id IS NULL) OR (parent_task_id <> id))),
  constraint "agent_tasks_parent_task_id_fkey" FOREIGN KEY (parent_task_id) REFERENCES agent_tasks(id) ON DELETE RESTRICT,
  constraint "agent_tasks_pkey" PRIMARY KEY (id),
  constraint "agent_tasks_project_id_fkey" FOREIGN KEY (project_id) REFERENCES company_projects(id) ON DELETE CASCADE,
  constraint "agent_tasks_qa_state_check" CHECK ((qa_state = ANY (ARRAY['NOT_REVIEWED'::text, 'PASS'::text, 'HOLD'::text, 'ESCALATE'::text, 'FAIL'::text]))),
  constraint "agent_tasks_risk_level_check" CHECK (((risk_level >= 0) AND (risk_level <= 3)))
);
alter table public.agent_tasks enable row level security;
alter table public.company_projects enable row level security;
insert into public.system_agents(id,agent_name,role,system_prompt,status) values ('2c9aa5a2-ded7-4ffd-b528-3f27f28cb386','Neura-CMO','Chief Marketing Officer','SYNTHETIC_TEST_PROMPT','ACTIVE');
insert into public.system_agents(id,agent_name,role,system_prompt,status) values ('3684f69f-ec37-4799-810c-4f0863ae021f','Neura-QA','Quality & Security Officer','SYNTHETIC_TEST_PROMPT','ACTIVE');
insert into public.system_agents(id,agent_name,role,system_prompt,status) values ('797903d3-3192-4c81-9a24-aff7b30e808b','MedPulse-Scout','Medical Trend Scout','SYNTHETIC_TEST_PROMPT','ACTIVE');
insert into public.system_agents(id,agent_name,role,system_prompt,status) values ('9e7ee046-a6c5-4cfe-babb-1231159a49cc','MedPulse-Creator','Clinical Content Creator','SYNTHETIC_TEST_PROMPT','ACTIVE');
insert into public.system_agents(id,agent_name,role,system_prompt,status) values ('9f02e200-50c5-4a6f-9aba-6c67e04db549','MedPulse-Sales','Lead Gen & Sales Agent','SYNTHETIC_TEST_PROMPT','ACTIVE');
insert into public.system_agents(id,agent_name,role,system_prompt,status) values ('dce3a297-b28c-45b5-96d5-da4a8dc195aa','Neura-PM','Product Manager','SYNTHETIC_TEST_PROMPT','ACTIVE');
