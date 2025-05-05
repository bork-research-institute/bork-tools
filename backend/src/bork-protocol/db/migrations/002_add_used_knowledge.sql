-- Add used_knowledge column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'posted_threads' 
        AND column_name = 'used_knowledge'
    ) THEN
        ALTER TABLE posted_threads 
        ADD COLUMN used_knowledge JSONB DEFAULT '[]';
    END IF;
END $$; 