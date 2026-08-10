PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  rol TEXT NOT NULL CHECK (rol IN ('ADMIN', 'CONSULTA')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS torneos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL UNIQUE,
  deporte TEXT NOT NULL,
  formato TEXT NOT NULL CHECK (formato IN ('LIGA', 'ELIMINACION', 'MIXTO')),
  fecha_inicio TEXT NOT NULL,
  fecha_fin TEXT,
  estado TEXT NOT NULL DEFAULT 'BORRADOR' CHECK (estado IN ('BORRADOR', 'EN_CURSO', 'FINALIZADO')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS equipos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  torneo_id INTEGER NOT NULL,
  nombre TEXT NOT NULL,
  grupo TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (torneo_id, nombre),
  FOREIGN KEY (torneo_id) REFERENCES torneos(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS partidos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  torneo_id INTEGER NOT NULL,
  equipo_local_id INTEGER NOT NULL,
  equipo_visitante_id INTEGER NOT NULL,
  fecha TEXT NOT NULL,
  sede TEXT NOT NULL,
  ronda TEXT NOT NULL,
  marcador_local INTEGER CHECK (marcador_local IS NULL OR marcador_local >= 0),
  marcador_visitante INTEGER CHECK (marcador_visitante IS NULL OR marcador_visitante >= 0),
  estado TEXT NOT NULL DEFAULT 'PROGRAMADO' CHECK (estado IN ('PROGRAMADO', 'EN_JUEGO', 'FINALIZADO')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (torneo_id) REFERENCES torneos(id) ON DELETE CASCADE,
  FOREIGN KEY (equipo_local_id) REFERENCES equipos(id) ON DELETE RESTRICT,
  FOREIGN KEY (equipo_visitante_id) REFERENCES equipos(id) ON DELETE RESTRICT,
  CHECK (equipo_local_id <> equipo_visitante_id)
);

CREATE INDEX IF NOT EXISTS idx_equipos_torneo ON equipos(torneo_id);
CREATE INDEX IF NOT EXISTS idx_partidos_torneo ON partidos(torneo_id);
CREATE INDEX IF NOT EXISTS idx_partidos_estado ON partidos(estado);
