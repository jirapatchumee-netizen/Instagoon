-- Migration 0036: Adjust default diamonds grant to 1,000
UPDATE energy SET diamonds = 1000 WHERE diamonds >= 1000000;
