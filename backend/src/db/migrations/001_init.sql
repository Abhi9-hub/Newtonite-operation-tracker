-- Initial schema. All tables are created now so later phases need no new migrations.

-- ===== Identity & access =====
CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL UNIQUE,
  name          text NOT NULL,
  password_hash text NOT NULL,
  is_active     boolean NOT NULL DEFAULT true,   -- disabled users are rejected on every request
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE teams (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- A user can be in many teams with a different role in each.
CREATE TABLE memberships (
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id    uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  role       text NOT NULL CHECK (role IN ('viewer', 'member', 'lead')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, team_id)
);
CREATE INDEX memberships_team_idx ON memberships (team_id);

-- ===== Work items =====
CREATE TABLE work_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id     uuid NOT NULL REFERENCES teams(id),
  title       text NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
  description text NOT NULL DEFAULT '',
  status      text NOT NULL DEFAULT 'open'
              CHECK (status IN ('open', 'in_progress', 'in_review', 'resolved')),
  priority    text NOT NULL DEFAULT 'medium'
              CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  assignee_id uuid REFERENCES users(id),
  version     integer NOT NULL DEFAULT 1,        -- optimistic-lock counter, bumped on every change
  created_by  uuid NOT NULL REFERENCES users(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  -- Full-text search column maintained by Postgres itself.
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))
  ) STORED
);
-- Supports the main list view: filter by team/status, newest first, keyset pagination.
CREATE INDEX work_items_list_idx ON work_items (team_id, status, updated_at DESC, id DESC);
-- Supports "my work" queries.
CREATE INDEX work_items_assignee_idx ON work_items (assignee_id) WHERE assignee_id IS NOT NULL;
-- Supports full-text search.
CREATE INDEX work_items_search_idx ON work_items USING GIN (search_vector);

CREATE TABLE comments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_item_id uuid NOT NULL REFERENCES work_items(id),
  author_id    uuid NOT NULL REFERENCES users(id),
  body         text NOT NULL CHECK (length(body) BETWEEN 1 AND 5000),
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX comments_item_idx ON comments (work_item_id, created_at);

-- ===== Audit history =====
-- bigserial gives a strict ordering of events. No cascade: history must never vanish.
CREATE TABLE activity_log (
  id           bigserial PRIMARY KEY,
  work_item_id uuid NOT NULL REFERENCES work_items(id),
  actor_id     uuid NOT NULL REFERENCES users(id),
  type         text NOT NULL,                    -- e.g. created, claimed, status_changed
  before       jsonb,                            -- snapshot of changed fields before
  after        jsonb,                            -- snapshot of changed fields after
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX activity_item_idx ON activity_log (work_item_id, id DESC);

-- Enforce append-only at the database level: no UPDATE or DELETE, ever.
CREATE FUNCTION forbid_activity_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'activity_log is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER activity_log_append_only
  BEFORE UPDATE OR DELETE ON activity_log
  FOR EACH ROW EXECUTE FUNCTION forbid_activity_mutation();

-- ===== Idempotency =====
-- One row per (user, client-supplied key). status_code/response_body stay NULL
-- while the first request is still in flight (used in Phase 3).
CREATE TABLE idempotency_keys (
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key           text NOT NULL,
  request_hash  text NOT NULL,                   -- detects the same key reused with a different payload
  status_code   integer,
  response_body jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, key)
);