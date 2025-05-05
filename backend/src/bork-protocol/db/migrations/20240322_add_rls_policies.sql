-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for all users" ON account_topics;
DROP POLICY IF EXISTS "Enable all access for postgres" ON account_topics;
DROP POLICY IF EXISTS "Enable all access for backend service" ON account_topics;

DROP POLICY IF EXISTS "Enable read access for all users" ON accounts;
DROP POLICY IF EXISTS "Enable all access for postgres" ON accounts;
DROP POLICY IF EXISTS "Enable all access for backend service" ON accounts;

DROP POLICY IF EXISTS "Enable read access for all users" ON agent_prompts;
DROP POLICY IF EXISTS "Enable all access for postgres" ON agent_prompts;
DROP POLICY IF EXISTS "Enable all access for backend service" ON agent_prompts;

DROP POLICY IF EXISTS "Enable read access for all users" ON agent_settings;
DROP POLICY IF EXISTS "Enable all access for postgres" ON agent_settings;
DROP POLICY IF EXISTS "Enable all access for backend service" ON agent_settings;

DROP POLICY IF EXISTS "Enable read access for all users" ON cache;
DROP POLICY IF EXISTS "Enable all access for postgres" ON cache;
DROP POLICY IF EXISTS "Enable all access for backend service" ON cache;

DROP POLICY IF EXISTS "Enable read access for all users" ON goals;
DROP POLICY IF EXISTS "Enable all access for postgres" ON goals;
DROP POLICY IF EXISTS "Enable all access for backend service" ON goals;

DROP POLICY IF EXISTS "Enable read access for all users" ON knowledge;
DROP POLICY IF EXISTS "Enable all access for postgres" ON knowledge;
DROP POLICY IF EXISTS "Enable all access for backend service" ON knowledge;

DROP POLICY IF EXISTS "Enable read access for all users" ON logs;
DROP POLICY IF EXISTS "Enable all access for postgres" ON logs;
DROP POLICY IF EXISTS "Enable all access for backend service" ON logs;

DROP POLICY IF EXISTS "Enable read access for all users" ON market_analysis;
DROP POLICY IF EXISTS "Enable all access for postgres" ON market_analysis;
DROP POLICY IF EXISTS "Enable all access for backend service" ON market_analysis;

DROP POLICY IF EXISTS "Enable read access for all users" ON memories;
DROP POLICY IF EXISTS "Enable all access for postgres" ON memories;
DROP POLICY IF EXISTS "Enable all access for backend service" ON memories;

DROP POLICY IF EXISTS "Enable read access for all users" ON participants;
DROP POLICY IF EXISTS "Enable all access for postgres" ON participants;
DROP POLICY IF EXISTS "Enable all access for backend service" ON participants;

DROP POLICY IF EXISTS "Enable read access for all users" ON posted_threads;
DROP POLICY IF EXISTS "Enable all access for postgres" ON posted_threads;
DROP POLICY IF EXISTS "Enable all access for backend service" ON posted_threads;

DROP POLICY IF EXISTS "Enable read access for all users" ON rooms;
DROP POLICY IF EXISTS "Enable all access for postgres" ON rooms;
DROP POLICY IF EXISTS "Enable all access for backend service" ON rooms;

DROP POLICY IF EXISTS "Enable read access for all users" ON spam_users;
DROP POLICY IF EXISTS "Enable all access for postgres" ON spam_users;
DROP POLICY IF EXISTS "Enable all access for backend service" ON spam_users;

DROP POLICY IF EXISTS "Enable read access for all users" ON stream_settings;
DROP POLICY IF EXISTS "Enable all access for postgres" ON stream_settings;
DROP POLICY IF EXISTS "Enable all access for backend service" ON stream_settings;

DROP POLICY IF EXISTS "Enable read access for all users" ON target_accounts;
DROP POLICY IF EXISTS "Enable all access for postgres" ON target_accounts;
DROP POLICY IF EXISTS "Enable all access for backend service" ON target_accounts;

DROP POLICY IF EXISTS "Enable read access for all users" ON token_metrics_history;
DROP POLICY IF EXISTS "Enable all access for postgres" ON token_metrics_history;
DROP POLICY IF EXISTS "Enable all access for backend service" ON token_metrics_history;

DROP POLICY IF EXISTS "Enable read access for all users" ON token_snapshots;
DROP POLICY IF EXISTS "Enable all access for postgres" ON token_snapshots;
DROP POLICY IF EXISTS "Enable all access for backend service" ON token_snapshots;

DROP POLICY IF EXISTS "Enable read access for all users" ON topic_weights;
DROP POLICY IF EXISTS "Enable all access for postgres" ON topic_weights;
DROP POLICY IF EXISTS "Enable all access for backend service" ON topic_weights;

DROP POLICY IF EXISTS "Enable read access for all users" ON trades;
DROP POLICY IF EXISTS "Enable all access for postgres" ON trades;
DROP POLICY IF EXISTS "Enable all access for backend service" ON trades;

DROP POLICY IF EXISTS "Enable read access for all users" ON tweet_analysis;
DROP POLICY IF EXISTS "Enable all access for postgres" ON tweet_analysis;
DROP POLICY IF EXISTS "Enable all access for backend service" ON tweet_analysis;

DROP POLICY IF EXISTS "Enable read access for all users" ON tweets;
DROP POLICY IF EXISTS "Enable all access for postgres" ON tweets;
DROP POLICY IF EXISTS "Enable all access for backend service" ON tweets;

DROP POLICY IF EXISTS "Enable read access for all users" ON twitter_configs;
DROP POLICY IF EXISTS "Enable all access for postgres" ON twitter_configs;
DROP POLICY IF EXISTS "Enable all access for backend service" ON twitter_configs;

DROP POLICY IF EXISTS "Enable read access for all users" ON user_mentions_relationship;
DROP POLICY IF EXISTS "Enable all access for postgres" ON user_mentions_relationship;
DROP POLICY IF EXISTS "Enable all access for backend service" ON user_mentions_relationship;

DROP POLICY IF EXISTS "Enable read access for all users" ON yaps;
DROP POLICY IF EXISTS "Enable all access for postgres" ON yaps;
DROP POLICY IF EXISTS "Enable all access for backend service" ON yaps;

-- Create policies for each table

-- account_topics policies
CREATE POLICY "Enable read access for all users" ON account_topics
    FOR SELECT TO public USING (true);
CREATE POLICY "Enable all access for postgres" ON account_topics
    FOR ALL TO postgres USING (true) WITH CHECK (true);

-- accounts policies
CREATE POLICY "Enable read access for all users" ON accounts
    FOR SELECT TO public USING (true);
CREATE POLICY "Enable all access for postgres" ON accounts
    FOR ALL TO postgres USING (true) WITH CHECK (true);

-- agent_prompts policies
CREATE POLICY "Enable read access for all users" ON agent_prompts
    FOR SELECT TO public USING (true);
CREATE POLICY "Enable all access for postgres" ON agent_prompts
    FOR ALL TO postgres USING (true) WITH CHECK (true);

-- agent_settings policies
CREATE POLICY "Enable read access for all users" ON agent_settings
    FOR SELECT TO public USING (true);
CREATE POLICY "Enable all access for postgres" ON agent_settings
    FOR ALL TO postgres USING (true) WITH CHECK (true);

-- cache policies
CREATE POLICY "Enable read access for all users" ON cache
    FOR SELECT TO public USING (true);
CREATE POLICY "Enable all access for postgres" ON cache
    FOR ALL TO postgres USING (true) WITH CHECK (true);

-- goals policies
CREATE POLICY "Enable read access for all users" ON goals
    FOR SELECT TO public USING (true);
CREATE POLICY "Enable all access for postgres" ON goals
    FOR ALL TO postgres USING (true) WITH CHECK (true);

-- knowledge policies
CREATE POLICY "Enable read access for all users" ON knowledge
    FOR SELECT TO public USING (true);
CREATE POLICY "Enable all access for postgres" ON knowledge
    FOR ALL TO postgres USING (true) WITH CHECK (true);

-- logs policies
CREATE POLICY "Enable read access for all users" ON logs
    FOR SELECT TO public USING (true);
CREATE POLICY "Enable all access for postgres" ON logs
    FOR ALL TO postgres USING (true) WITH CHECK (true);

-- market_analysis policies
CREATE POLICY "Enable read access for all users" ON market_analysis
    FOR SELECT TO public USING (true);
CREATE POLICY "Enable all access for postgres" ON market_analysis
    FOR ALL TO postgres USING (true) WITH CHECK (true);

-- memories policies
CREATE POLICY "Enable read access for all users" ON memories
    FOR SELECT TO public USING (true);
CREATE POLICY "Enable all access for postgres" ON memories
    FOR ALL TO postgres USING (true) WITH CHECK (true);

-- participants policies
CREATE POLICY "Enable read access for all users" ON participants
    FOR SELECT TO public USING (true);
CREATE POLICY "Enable all access for postgres" ON participants
    FOR ALL TO postgres USING (true) WITH CHECK (true);

-- posted_threads policies
CREATE POLICY "Enable read access for all users" ON posted_threads
    FOR SELECT TO public USING (true);
CREATE POLICY "Enable all access for postgres" ON posted_threads
    FOR ALL TO postgres USING (true) WITH CHECK (true);

-- rooms policies
CREATE POLICY "Enable read access for all users" ON rooms
    FOR SELECT TO public USING (true);
CREATE POLICY "Enable all access for postgres" ON rooms
    FOR ALL TO postgres USING (true) WITH CHECK (true);

-- spam_users policies
CREATE POLICY "Enable read access for all users" ON spam_users
    FOR SELECT TO public USING (true);
CREATE POLICY "Enable all access for postgres" ON spam_users
    FOR ALL TO postgres USING (true) WITH CHECK (true);

-- stream_settings policies
CREATE POLICY "Enable read access for all users" ON stream_settings
    FOR SELECT TO public USING (true);
CREATE POLICY "Enable all access for postgres" ON stream_settings
    FOR ALL TO postgres USING (true) WITH CHECK (true);

-- target_accounts policies
CREATE POLICY "Enable read access for all users" ON target_accounts
    FOR SELECT TO public USING (true);
CREATE POLICY "Enable all access for postgres" ON target_accounts
    FOR ALL TO postgres USING (true) WITH CHECK (true);

-- token_metrics_history policies
CREATE POLICY "Enable read access for all users" ON token_metrics_history
    FOR SELECT TO public USING (true);
CREATE POLICY "Enable all access for postgres" ON token_metrics_history
    FOR ALL TO postgres USING (true) WITH CHECK (true);

-- token_snapshots policies
CREATE POLICY "Enable read access for all users" ON token_snapshots
    FOR SELECT TO public USING (true);
CREATE POLICY "Enable all access for postgres" ON token_snapshots
    FOR ALL TO postgres USING (true) WITH CHECK (true);

-- topic_weights policies
CREATE POLICY "Enable read access for all users" ON topic_weights
    FOR SELECT TO public USING (true);
CREATE POLICY "Enable all access for postgres" ON topic_weights
    FOR ALL TO postgres USING (true) WITH CHECK (true);

-- trades policies
CREATE POLICY "Enable read access for all users" ON trades
    FOR SELECT TO public USING (true);
CREATE POLICY "Enable all access for postgres" ON trades
    FOR ALL TO postgres USING (true) WITH CHECK (true);

-- tweet_analysis policies
CREATE POLICY "Enable read access for all users" ON tweet_analysis
    FOR SELECT TO public USING (true);
CREATE POLICY "Enable all access for postgres" ON tweet_analysis
    FOR ALL TO postgres USING (true) WITH CHECK (true);

-- tweets policies
CREATE POLICY "Enable read access for all users" ON tweets
    FOR SELECT TO public USING (true);
CREATE POLICY "Enable all access for postgres" ON tweets
    FOR ALL TO postgres USING (true) WITH CHECK (true);

-- twitter_configs policies
CREATE POLICY "Enable read access for all users" ON twitter_configs
    FOR SELECT TO public USING (true);
CREATE POLICY "Enable all access for postgres" ON twitter_configs
    FOR ALL TO postgres USING (true) WITH CHECK (true);

-- user_mentions_relationship policies
CREATE POLICY "Enable read access for all users" ON user_mentions_relationship
    FOR SELECT TO public USING (true);
CREATE POLICY "Enable all access for postgres" ON user_mentions_relationship
    FOR ALL TO postgres USING (true) WITH CHECK (true);

-- yaps policies
CREATE POLICY "Enable read access for all users" ON yaps
    FOR SELECT TO public USING (true);
CREATE POLICY "Enable all access for postgres" ON yaps
    FOR ALL TO postgres USING (true) WITH CHECK (true);

-- Grant access to views
GRANT SELECT ON market_summary TO public;
GRANT ALL ON market_summary TO postgres;

-- Ensure new tables get the same grants
ALTER DEFAULT PRIVILEGES IN SCHEMA public 
    GRANT SELECT ON TABLES TO anon;
