-- Allow insert on universe_config for initialization
DROP POLICY IF EXISTS universe_config_insert ON universe_config;
CREATE POLICY universe_config_insert ON universe_config FOR INSERT WITH CHECK (true);

-- Allow insert on galaxies for initialization
DROP POLICY IF EXISTS galaxies_insert ON galaxies;
CREATE POLICY galaxies_insert ON galaxies FOR INSERT WITH CHECK (true);

-- Initialize the universe with seed
SELECT initialize_universe(42424242424242);
