# Plataforma de Torneos

Aplicacion para administrar torneos deportivos, compuesta por una interfaz Angular y una API Node.js con SQLite y JWT.

## Estructura

- `frontend/`: interfaz Angular, pantallas, estilos y servicios HTTP.
- `backend/`: API REST, autenticacion, reglas de negocio, base de datos, pruebas y coleccion de Postman.
- `GUIA_EXPLICACION_MUNDIAL_API.md`: guia tecnica y de exposicion existente.

## Iniciar el proyecto

Abre dos terminales desde la carpeta raiz del proyecto.

Terminal para la API:

```powershell
cd backend
npm install
npm start
```

Terminal para la interfaz:

```powershell
cd frontend
npm install
npm start
```

La interfaz queda disponible en `http://localhost:4200` y la API en `http://localhost:3000`.

Para los detalles de endpoints y pruebas, consulta [backend/README.md](backend/README.md).
