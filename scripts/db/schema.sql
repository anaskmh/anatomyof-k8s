-- CloudTruck jobs board schema (Neon Postgres)
CREATE TABLE IF NOT EXISTS jobs (
  id            SERIAL PRIMARY KEY,
  external_key  TEXT UNIQUE NOT NULL,          -- stable dedupe key: <source_file>|<country>|<row#>
  category      TEXT NOT NULL,                 -- 'Cloud & DevOps' | 'Software & AI'
  role_type     TEXT NOT NULL,                 -- position family used by the role filter
  title         TEXT NOT NULL,
  company       TEXT NOT NULL,
  location      TEXT,
  country       TEXT NOT NULL,                 -- 'United Arab Emirates' | 'Saudi Arabia'
  posted_on     DATE,
  experience    TEXT,                          -- Entry level / Associate / Mid-Senior / Director / Internship
  employment_type TEXT,                        -- Full-time / Contract (only in the daily-report PDFs)
  skills        TEXT,
  salary        TEXT,
  source        TEXT,                          -- LinkedIn / Indeed / Naukri Gulf, '+'-joined when merged
  apply_url     TEXT,
  status        TEXT NOT NULL DEFAULT 'open',  -- open | closed
  collected_on  DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Added after the first deploy; safe on tables created from the full definition above.
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS employment_type TEXT;

CREATE INDEX IF NOT EXISTS jobs_role_type_idx  ON jobs (role_type);
CREATE INDEX IF NOT EXISTS jobs_country_idx    ON jobs (country);
CREATE INDEX IF NOT EXISTS jobs_category_idx   ON jobs (category);
CREATE INDEX IF NOT EXISTS jobs_status_idx     ON jobs (status);
CREATE INDEX IF NOT EXISTS jobs_posted_on_idx  ON jobs (posted_on DESC);
