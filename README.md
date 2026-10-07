# ea-control-frontend

Monorepo del frontend de EduAirControl (web + móvil).

```
ea-control-frontend/
├── apps/web/      # React 19 + Vite 8 (SPA)
└── apps/mobile/   # Expo / React Native
```

Cada app conserva su historial de git original (migrado desde `EduAirControl/Web/Front-End`
y `Mobil`).

## Objetivo de la migración

El frontend pasa a consumir **los microservicios a través del api-gateway** (ADR-005/017):

- **Autenticación OAuth2/OIDC** con el gateway como **BFF**: cookies httpOnly (sin tokens en
  `localStorage`), flujo Authorization Code + PKCE.
- **Login con `companyCode`** (institución) — multi-tenant (ADR-016).
- **Datos filtrados por institución**; pantalla nueva de **super-admin** (gestión de instituciones).
- Servicios reescritos a los contratos de los microservicios (rutas canónicas, UUID, etc.).

> Estado: estructura creada y publicada. La migración funcional (OAuth2 + servicios) se
> realiza por fases.
