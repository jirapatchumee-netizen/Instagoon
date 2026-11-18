-- ============================================================================
-- Migration 0039: Aethelgard Magic Academy Universe & Long-Term Progression
-- Target: Cloudflare D1 (SQLite) — Instagoon Fullstack Architecture
-- ============================================================================

-- 1. Extend existing `relationships` table for 7-Year Academic Pacing
ALTER TABLE relationships ADD COLUMN academic_year INTEGER DEFAULT 1;
ALTER TABLE relationships ADD COLUMN term_season TEXT DEFAULT 'autumn';
ALTER TABLE relationships ADD COLUMN bastion_house TEXT DEFAULT 'Zephyr-Crown';
ALTER TABLE relationships ADD COLUMN censorship_level INTEGER DEFAULT 0;
ALTER TABLE relationships ADD COLUMN focus_points INTEGER DEFAULT 3;
ALTER TABLE relationships ADD COLUMN stat_arcane INTEGER DEFAULT 10;
ALTER TABLE relationships ADD COLUMN stat_charisma INTEGER DEFAULT 10;
ALTER TABLE relationships ADD COLUMN stat_alchemy INTEGER DEFAULT 10;
ALTER TABLE relationships ADD COLUMN endgame_route_flag TEXT DEFAULT 'undetermined';

-- 2. Bastion House Points Standings
CREATE TABLE IF NOT EXISTS academy_house_points (
    bastion_name TEXT PRIMARY KEY,
    element_domain TEXT NOT NULL,
    colors TEXT NOT NULL,
    points INTEGER DEFAULT 500,
    weekly_delta INTEGER DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Student Arcane Inventory & Gifted Artifacts
CREATE TABLE IF NOT EXISTS student_arcane_inventory (
    inventory_uid TEXT PRIMARY KEY,
    item_id TEXT NOT NULL,
    owner_id TEXT NOT NULL,
    item_type TEXT NOT NULL CHECK (item_type IN ('wand', 'potion', 'charm', 'contraband')),
    item_name TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    power_level INTEGER DEFAULT 1,
    acquired_year INTEGER DEFAULT 1,
    is_equipped INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_arcane_inv_owner ON student_arcane_inventory(owner_id, item_type);

-- 4. Edict 42 Censorship & Coded Slang Registry
CREATE TABLE IF NOT EXISTS academy_censorship_rules (
    rule_id TEXT PRIMARY KEY,
    min_censorship_level INTEGER NOT NULL,
    forbidden_pattern TEXT NOT NULL,
    coded_bypass_hint TEXT NOT NULL,
    origin_npc TEXT,
    penalty_stress_delta INTEGER DEFAULT 5,
    active INTEGER DEFAULT 1
);

-- 5. Academy Curriculum & Professor Metadata
CREATE TABLE IF NOT EXISTS academy_courses (
    course_id TEXT PRIMARY KEY,
    course_name TEXT NOT NULL,
    professor_name TEXT NOT NULL,
    stat_target TEXT NOT NULL,
    partner_npc_slug TEXT,
    base_fp_cost INTEGER DEFAULT 1
);

-- 6. Secondary Feed NPCs & Campus Voices
CREATE TABLE IF NOT EXISTS academy_secondary_npcs (
    npc_handle TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    bastion_affiliation TEXT NOT NULL,
    role_archetype TEXT NOT NULL,
    active_from_year INTEGER DEFAULT 1,
    faction_alignment TEXT DEFAULT 'neutral'
);

-- SEED DATA
INSERT OR IGNORE INTO academy_house_points (bastion_name, element_domain, colors, points, weekly_delta) VALUES
    ('Aethel-Pyre', 'Fire', 'Crimson & Gold', 520, 15),
    ('Nocturn-Coil', 'Shadow', 'Obsidian & Silver', 535, 20),
    ('Zephyr-Crown', 'Wind / Alchemy', 'Azure & Bronze', 510, -5),
    ('Terra-Root', 'Earth', 'Emerald & Amber', 505, 10);

INSERT OR IGNORE INTO academy_courses (course_id, course_name, professor_name, stat_target, partner_npc_slug, base_fp_cost) VALUES
    ('COURSE_ALCHEMY_01', 'Volatile Crucibles & Subtleties', 'Prof. Malakor Silt', 'stat_alchemy', 'evelyn', 1),
    ('COURSE_TRANSMUTE_02', 'Inanimate Ethics & Transmutation', 'Headmistress Morven', 'stat_arcane', 'cassian', 1),
    ('COURSE_FLORA_03', 'Carnivorous Flora & Mycology', 'Prof. Barnaby Oakhaven', 'stat_alchemy', 'rowan', 1),
    ('COURSE_RUNES_04', 'Archaic Rune-Logic & Encryption', 'Prof. Lyra Vance', 'stat_arcane', 'cassian', 1),
    ('COURSE_DEFENSE_05', 'Counter-Hexes & Civic Harmony', 'High Inquisitor Vespera', 'stat_charisma', 'faye', 1);

INSERT OR IGNORE INTO academy_censorship_rules (rule_id, min_censorship_level, forbidden_pattern, coded_bypass_hint, origin_npc, penalty_stress_delta) VALUES
    ('EDICT42_R01', 1, 'sovereign of ash', 'The Northern Frost / Ash-Front', 'evelyn', 5),
    ('EDICT42_R02', 1, 'dark lord', 'The Northern Frost', 'evelyn', 5),
    ('EDICT42_R03', 2, 'inquisitor abuse', 'Auntie Chamomile', 'faye', 8),
    ('EDICT42_R04', 2, 'resistance', 'The Winter Knitting Circle', 'evelyn', 10),
    ('EDICT42_R05', 2, 'underground club', 'The Winter Knitting Circle', 'evelyn', 10),
    ('EDICT42_R06', 2, 'ministry spy', 'Silver-Beaked Magpies', 'cassian', 6),
    ('EDICT42_R07', 3, 'escape route', 'Botanical Field Transfer', 'rowan', 12),
    ('EDICT42_R08', 3, 'smuggle', 'Botanical Field Transfer', 'rowan', 12),
    ('EDICT42_R09', 2, 'ash mark', 'Fitting the Heirloom Coat', 'cassian', 10);

INSERT OR IGNORE INTO academy_secondary_npcs (npc_handle, display_name, bastion_affiliation, role_archetype, active_from_year, faction_alignment) VALUES
    ('@celeste_quill', 'Celeste Vane', 'Zephyr-Crown', 'Chief Student Editor of The Silver Quill', 1, 'neutral'),
    ('@cipher_moth', 'Barnaby "Bramble" Finch', 'Terra-Root', 'Shadow Admin of The Underground Parchment', 1, 'student_ally'),
    ('@thorn_crest', 'Julian Thorne', 'Nocturn-Coil', 'Aristocratic Prefect & Inquisitorial Informant', 1, 'rival_snitch'),
    ('@pippa_sparkles', 'Pippa Meadowes', 'Zephyr-Crown', 'Tea-Leaf Astrologer & Campus Mood Barometer', 1, 'student_ally'),
    ('@gale_skycaptain', 'Garrick "Gale" Vance', 'Aethel-Pyre', 'Aero-Jousting Captain', 1, 'student_ally'),
    ('@analog_toby', 'Toby Miller', 'Terra-Root', 'Mundane-Born Junior & Cassette Enthusiast', 1, 'student_ally'),
    ('@inquisitor_vespera', 'High Inquisitor Vespera', 'Ministry of Arcane Affairs', 'Authoritarian Censor & Civic Harmony Instructor', 5, 'ministry_authority'),
    ('@argos_keys', 'Caretaker Argos', 'Aethelgard Staff', 'Grumpy Castle Warden & Secret Evacuation Ally', 1, 'neutral');
