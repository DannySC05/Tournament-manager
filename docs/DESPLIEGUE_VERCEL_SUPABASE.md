# Despliegue con Vercel y Supabase

La aplicacion conserva su API REST, JWT, roles, validaciones y reglas de negocio. Solo cambia la persistencia: SQLite fue reemplazado por PostgreSQL de Supabase.

## Arquitectura

```text
Navegador
  -> Angular en Vercel
  -> /api/* como Vercel Function
  -> PostgreSQL en Supabase
```

El frontend usa `/api` en produccion. Por eso no necesita conocer una URL externa ni configurar CORS entre dominios.

## 1. Crear la base de datos

1. Crea un proyecto gratuito en Supabase.
2. Abre `SQL Editor` y ejecuta el contenido de `backend/database/migrations/001_init.sql`.
3. En `Connect`, copia la URI del **Shared Pooler / Transaction mode** (puerto `6543`). Es la conexion recomendada para funciones serverless.
4. Conserva la contraseña y la URI fuera de Git.

Tambien puedes ejecutar la migracion desde tu equipo con una conexion directa de Supabase:

```powershell
cd backend
Copy-Item .env.example .env
# Edita .env con la URI directa y JWT_SECRET
npm run db:migrate
```

## 2. Preparar variables locales

En `backend/.env`, define como minimo:

```dotenv
DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-[REGION].pooler.supabase.com:6543/postgres
PG_POOL_MAX=1
JWT_SECRET=un-secreto-largo-y-aleatorio
JWT_EXPIRES_SECONDS=28800
```

`PG_POOL_MAX=1` evita abrir conexiones innecesarias desde funciones serverless. El archivo `.env` esta ignorado por Git.

## 3. Probar localmente

En una terminal:

```powershell
cd backend
npm install
npm start
```

En otra terminal:

```powershell
cd frontend
npm install
npm start
```

La interfaz de desarrollo usa `http://localhost:3000/api`. El build de produccion cambia automaticamente a `/api`.

Para comprobar autenticacion, autorizacion, reglas de negocio y clasificacion sin tocar Supabase:

```powershell
cd backend
npm run verify
```

## 4. Desplegar en Vercel

1. Sube los cambios a GitHub, sin archivos `.env` ni `.sqlite`.
2. En Vercel, selecciona `Add New > Project` e importa el repositorio completo.
3. Mantén la raiz del proyecto en la carpeta principal. `vercel.json` instala ambos paquetes, construye Angular y publica `frontend/dist/frontend/browser`.
4. En `Settings > Environment Variables`, registra para `Production` y `Preview`:
   - `DATABASE_URL`: URI del pooler de transacciones de Supabase.
   - `PG_POOL_MAX`: `1`.
   - `JWT_SECRET`: valor largo, aleatorio y privado.
   - `JWT_EXPIRES_SECONDS`: `28800` o el valor que prefieras.
5. Haz un nuevo despliegue. Las variables se aplican a despliegues nuevos.

La función `api/entry.js` delega al mismo manejador REST que se usa localmente. Las reglas de `vercel.json` envían `/api/*` hacia esa función y redirigen las rutas Angular al `index.html`.

## Seguridad y operación

- Nunca publiques `DATABASE_URL`, `JWT_SECRET` ni una base SQLite local.
- La contraseña se almacena como hash PBKDF2; el JWT se firma con `JWT_SECRET`.
- El primer usuario registrado en una base vacía puede ser `ADMIN`; los posteriores son `CONSULTA`.
- Antes de cambiar `JWT_SECRET` en producción, considera que todas las sesiones activas quedarán invalidadas.
- Usa las reglas de acceso de Supabase para restringir el acceso directo. Esta API se conecta con la cadena privada de PostgreSQL; el navegador nunca recibe esa cadena.

## Referencias oficiales

- [Conexiones PostgreSQL y pooler de Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [Variables de entorno de Vercel](https://vercel.com/docs/environment-variables)
- [Configuracion con vercel.json](https://vercel.com/docs/project-configuration/vercel-json)
