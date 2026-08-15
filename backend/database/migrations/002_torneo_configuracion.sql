ALTER TABLE torneos
  ADD COLUMN IF NOT EXISTS participantes_count INTEGER NOT NULL DEFAULT 2
    CHECK (participantes_count IN (2, 4, 8, 10, 12, 16, 24, 32, 48)),
  ADD COLUMN IF NOT EXISTS cantidad_grupos INTEGER,
  ADD COLUMN IF NOT EXISTS ganador_equipo_id INTEGER REFERENCES equipos(id) ON DELETE SET NULL;
