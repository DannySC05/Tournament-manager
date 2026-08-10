# Torneos API REST con JWT

Backend para administrar torneos deportivos, sus equipos y sus partidos. Incluye autenticacion JWT, roles `ADMIN` y `CONSULTA`, SQLite, reglas de negocio y validaciones.

## Ejecucion

```powershell
cd C:\Users\User\Documents\API_Mundial-Examen\backend
npm start
```

La API se ejecuta en `http://localhost:3000` y crea automaticamente `database/torneos.sqlite`.

Para verificar el backend de forma aislada:

```powershell
npm run verify
```

## Modelo

- `users`: cuentas con rol `ADMIN` o `CONSULTA`.
- `torneos`: nombre, deporte, formato, fechas y estado.
- `equipos`: pertenecen a un torneo y pueden tener grupo opcional.
- `partidos`: pertenecen a un torneo y enfrentan dos equipos del mismo torneo.

El primer usuario de una base vacia puede registrarse como `ADMIN`; los siguientes se crean con rol `CONSULTA`.

## Endpoints

| Metodo | Ruta | Rol |
|---|---|---|
| POST | `/api/auth/register` | Publico |
| POST | `/api/auth/login` | Publico |
| GET | `/api/auth/me` | ADMIN o CONSULTA |
| GET, POST | `/api/torneos` | Consulta, ADMIN |
| GET, PUT, DELETE | `/api/torneos/{id}` | Consulta, ADMIN |
| GET, POST | `/api/torneos/{id}/equipos` | Consulta, ADMIN |
| PUT, DELETE | `/api/equipos/{id}` | ADMIN |
| GET, POST | `/api/torneos/{id}/partidos` | Consulta, ADMIN |
| GET, PUT, DELETE | `/api/partidos/{id}` | Consulta, ADMIN |
| PUT | `/api/partidos/{id}/resultado` | ADMIN |

Los metodos de modificacion (`POST`, `PUT`, `DELETE`) requieren `ADMIN`. En las peticiones protegidas se debe enviar `Authorization: Bearer <token>`.
