# DB Migrations — Estructura

## Arquitectura de Bases de Datos

```
Next.js App
├── Supabase (ybszqmvjxwxofqgrhpkf)  ← TODO lo operacional + admin
│   ├── sucursales, barberos, servicios
│   ├── citas, bloqueos, clientes
│   ├── configuracion_ia_global
│   ├── ia_request_logs (monitor panel)
│   └── usuarios_admin, auth
│
└── PostgreSQL externo (18.216.112.9) ← SOLO memoria del agente IA
    └── n8n_chat_histories (historial LangChain)
```

---

## 📁 `db/supabase/` → Aplicar en Supabase Dashboard

Todos los datos operacionales y la configuración de la app van aquí.

| Archivo | Descripción |
|---|---|
| `001_initial_schema.sql` | Schema base: sucursales, barberos, citas, etc. |
| `002_seed_citas.sql` | Datos de prueba |
| `003_add_branch_fields.sql` | Campos adicionales de sucursal |
| `004_punto_equilibrio.sql` | Cálculo financiero |
| `005_optimizaciones.sql` | Índices y performance |
| `006_fix_rls_login.sql` | Políticas RLS |
| `007_merge_negocios_into_sucursales.sql` | Migración de datos |
| `008_configuracion_ia.sql` | Tabla `configuracion_ia_global` |
| `010_request_logs.sql` | Tabla `ia_request_logs` (Monitor IA) |
| `011_ai_providers.sql` | Multi-provider support (Anthropic, Groq) |

**Aplicar:** Supabase Dashboard → SQL Editor → ejecutar en orden numérico.

---

## 📁 `db/evolutiondb/` → Aplicar en PostgreSQL externo

**SOLO** la tabla de historial de conversaciones del agente IA.

| Archivo | Descripción |
|---|---|
| `001_chat_history.sql` | Tabla `n8n_chat_histories` (memoria LangChain) |
| `002_ai_views.sql` | Vistas de lectura rápida (opcional, para dashboards) |

**Aplicar:**
```bash
psql "postgres://evouser:1234@18.216.112.9:5432/evolutiondb?sslmode=disable" -f db/evolutiondb/001_chat_history.sql
```
