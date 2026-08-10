PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  rol TEXT NOT NULL CHECK (rol IN ('ADMIN', 'CONSULTA')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS selecciones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL UNIQUE,
  continente TEXT NOT NULL,
  grupo TEXT NOT NULL,
  ranking_fifa INTEGER NOT NULL CHECK (ranking_fifa >= 1),
  entrenador TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS partidos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  seleccion_local_id INTEGER NOT NULL,
  seleccion_visitante_id INTEGER NOT NULL,
  fecha TEXT NOT NULL,
  estadio TEXT NOT NULL,
  fase TEXT NOT NULL CHECK (fase IN ('GRUPOS', 'OCTAVOS', 'CUARTOS', 'SEMIFINAL', 'FINAL')),
  goles_local INTEGER CHECK (goles_local IS NULL OR goles_local >= 0),
  goles_visitante INTEGER CHECK (goles_visitante IS NULL OR goles_visitante >= 0),
  estado TEXT NOT NULL DEFAULT 'PROGRAMADO' CHECK (estado IN ('PROGRAMADO', 'EN_JUEGO', 'FINALIZADO')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (seleccion_local_id) REFERENCES selecciones(id) ON DELETE RESTRICT,
  FOREIGN KEY (seleccion_visitante_id) REFERENCES selecciones(id) ON DELETE RESTRICT,
  CHECK (seleccion_local_id <> seleccion_visitante_id)
);

CREATE INDEX IF NOT EXISTS idx_selecciones_grupo ON selecciones(grupo);
CREATE INDEX IF NOT EXISTS idx_partidos_fase ON partidos(fase);
CREATE INDEX IF NOT EXISTS idx_partidos_estado ON partidos(estado);
