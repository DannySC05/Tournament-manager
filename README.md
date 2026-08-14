# Plataforma de Torneos

Aplicacion para administrar torneos deportivos, compuesta por una interfaz Angular y una API Node.js con PostgreSQL y JWT.

## Estructura

- `frontend/`: interfaz Angular, pantallas, estilos y servicios HTTP.
- `backend/`: API REST, autenticacion, reglas de negocio, PostgreSQL, pruebas y coleccion de Postman.
- `docs/DESPLIEGUE_VERCEL_SUPABASE.md`: configuracion para desplegar frontend, API serverless y Supabase.

## Iniciar el proyecto

Abre dos terminales desde la carpeta raiz del proyecto.

Terminal para la API:

```powershell
cd backend
npm install
Copy-Item .env.example .env
# Completa DATABASE_URL y JWT_SECRET en .env
npm start
```

Terminal para la interfaz:

```powershell
cd frontend
npm install
npm start
```

La interfaz queda disponible en `http://localhost:4200` y la API en `http://localhost:3000`.

Antes del primer inicio local, aplica `database/migrations/001_init.sql` en Supabase o ejecuta `npm run db:migrate` con una `DATABASE_URL` valida.

Para los detalles de endpoints y pruebas, consulta [backend/README.md](backend/README.md).
