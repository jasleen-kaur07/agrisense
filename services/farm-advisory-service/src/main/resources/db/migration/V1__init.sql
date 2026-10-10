CREATE TABLE farms (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL,
  name varchar(80) NOT NULL,
  state_key varchar(120) NOT NULL,
  district_key varchar(120) NOT NULL,
  state varchar(120) NOT NULL,
  district varchar(120) NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);
CREATE INDEX idx_farms_owner ON farms (owner_id);

CREATE TABLE fields (
  id uuid PRIMARY KEY,
  farm_id uuid NOT NULL REFERENCES farms (id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  name varchar(80) NOT NULL,
  area_acres numeric(12,3) NOT NULL CHECK (area_acres > 0),
  soil_n numeric(12,3) CHECK (soil_n IS NULL OR soil_n >= 0),
  soil_p numeric(12,3) CHECK (soil_p IS NULL OR soil_p >= 0),
  soil_k numeric(12,3) CHECK (soil_k IS NULL OR soil_k >= 0),
  soil_ph numeric(5,2) CHECK (soil_ph IS NULL OR (soil_ph >= 3 AND soil_ph <= 10)),
  soil_tested_on date,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);
CREATE INDEX idx_fields_owner ON fields (owner_id);
CREATE INDEX idx_fields_farm ON fields (farm_id);

CREATE TABLE recommendations (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL,
  field_id uuid REFERENCES fields (id) ON DELETE SET NULL,
  field_name varchar(80) NOT NULL,
  kind varchar(40) NOT NULL,
  season varchar(10) NOT NULL,
  state_key varchar(120) NOT NULL,
  district_key varchar(120) NOT NULL,
  state varchar(120) NOT NULL,
  district varchar(120) NOT NULL,
  regional_json jsonb NOT NULL,
  weather_json jsonb NOT NULL,
  data_versions_json jsonb NOT NULL,
  limitations jsonb NOT NULL,
  created_at timestamptz NOT NULL
);
CREATE INDEX idx_rec_owner_created ON recommendations (owner_id, created_at DESC);
CREATE INDEX idx_rec_field ON recommendations (field_id);
CREATE INDEX idx_rec_created ON recommendations (created_at DESC);

CREATE TABLE idempotency_keys (
  owner_id uuid NOT NULL,
  key uuid NOT NULL,
  recommendation_id uuid NOT NULL REFERENCES recommendations (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL,
  PRIMARY KEY (owner_id, key)
);

CREATE TABLE alerts (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL,
  field_id uuid REFERENCES fields (id) ON DELETE SET NULL,
  farm_id uuid REFERENCES farms (id) ON DELETE CASCADE,
  type varchar(30) NOT NULL,
  severity varchar(10) NOT NULL,
  title varchar(200) NOT NULL,
  message text NOT NULL,
  source varchar(120) NOT NULL,
  dedupe_key varchar(200) NOT NULL,
  created_at timestamptz NOT NULL,
  read_at timestamptz,
  CONSTRAINT uq_alert_dedupe UNIQUE (owner_id, dedupe_key)
);
CREATE INDEX idx_alerts_owner_created ON alerts (owner_id, created_at DESC);

CREATE TABLE feedback (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL,
  category varchar(20) NOT NULL,
  message varchar(2000) NOT NULL,
  rating integer CHECK (rating IS NULL OR (rating BETWEEN 1 AND 5)),
  created_at timestamptz NOT NULL
);
CREATE INDEX idx_feedback_created ON feedback (created_at DESC);
