create table users (
    id                     uuid primary key,
    email                  varchar(254) not null,
    password_hash          varchar(255) not null,
    display_name           varchar(80),
    language               varchar(2)   not null default 'en',
    experience_level       varchar(16),
    preferred_state_key    varchar(100),
    preferred_district_key varchar(100),
    onboarding_completed   boolean      not null default false,
    enabled                boolean      not null default true,
    token_version          integer      not null default 0,
    created_at             timestamptz  not null default now(),
    updated_at             timestamptz  not null default now(),
    constraint ck_users_email_lower check (email = lower(email)),
    constraint ck_users_language check (language in ('en', 'hi')),
    constraint ck_users_experience check (experience_level is null or experience_level in ('BEGINNER', 'INTERMEDIATE', 'EXPERIENCED'))
);
create unique index ux_users_email on users (email);

create table user_roles (
    user_id uuid        not null references users (id) on delete cascade,
    role    varchar(16) not null,
    primary key (user_id, role),
    constraint ck_user_roles_role check (role in ('FARMER', 'ADMIN'))
);

create table refresh_tokens (
    id                  uuid primary key,
    user_id             uuid        not null references users (id) on delete cascade,
    family_id           uuid        not null,
    token_hash          char(64)    not null,
    issued_at           timestamptz not null,
    last_used_at        timestamptz,
    expires_at          timestamptz not null,
    absolute_expires_at timestamptz not null,
    used                boolean     not null default false,
    revoked             boolean     not null default false
);
create unique index ux_refresh_tokens_hash on refresh_tokens (token_hash);
create index ix_refresh_tokens_family on refresh_tokens (family_id);
create index ix_refresh_tokens_user on refresh_tokens (user_id);

create table password_reset_tokens (
    id         uuid primary key,
    user_id    uuid        not null references users (id) on delete cascade,
    token_hash char(64)    not null,
    expires_at timestamptz not null,
    used_at    timestamptz,
    created_at timestamptz not null default now()
);
create unique index ux_password_reset_tokens_hash on password_reset_tokens (token_hash);
create index ix_password_reset_tokens_user on password_reset_tokens (user_id);
