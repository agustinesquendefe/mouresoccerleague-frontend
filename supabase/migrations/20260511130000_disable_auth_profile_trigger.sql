-- The portal access flow resolves players, coaches, and referees by email from
-- their domain tables. A failing profiles trigger blocks auth.users creation and
-- prevents magic-link access, so auth user creation should not depend on it.
drop trigger if exists on_auth_user_created on auth.users;
