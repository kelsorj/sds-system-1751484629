-- Fix the ghs_classifications table to have auto-incrementing primary key ID

-- Step 1: Make id column NOT NULL (required for primary key)
ALTER TABLE ghs_classifications ALTER COLUMN id SET NOT NULL;

-- Step 2: Add primary key constraint on id column
ALTER TABLE ghs_classifications ADD CONSTRAINT ghs_classifications_pkey PRIMARY KEY (id);

-- Step 3: Create a sequence for auto-incrementing
CREATE SEQUENCE IF NOT EXISTS ghs_classifications_id_seq OWNED BY ghs_classifications.id;

-- Step 4: Set the sequence to start from the current maximum ID + 1
SELECT setval('ghs_classifications_id_seq', COALESCE((SELECT MAX(id) FROM ghs_classifications), 0) + 1, false);

-- Step 5: Set the default value for id column to use the sequence
ALTER TABLE ghs_classifications ALTER COLUMN id SET DEFAULT nextval('ghs_classifications_id_seq');

-- Verify the changes
\d ghs_classifications;
