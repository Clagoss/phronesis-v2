---
description: Prepara un proyecto para usar Phronesis v2 — crea PHRONESIS.md a partir del repo, el backlog, las lecciones y el registro de deudas. Se corre una sola vez.
---

# /ph-iniciar — preparar el proyecto

Se corre una vez, en la raíz del proyecto. No toca código.

## 1. ¿Ya está?

Si `PHRONESIS.md` existe en la raíz, no lo sobrescribas: muéstrale al dueño qué campos siguen
vacíos y termina.

## 2. Lee el repo antes de preguntar

Deduce todo lo que puedas sin molestar al dueño:

- **Stack:** `package.json`, `pyproject.toml`, `go.mod`, `Gemfile`, archivos de configuración del
  framework y del hosting (`wrangler.*`, `vercel.json`, `netlify.toml`, `fly.toml`, `Dockerfile`).
- **Base de datos y migraciones:** carpetas `migrations/`, `supabase/`, `prisma/`, `db/`.
- **Validación:** los scripts de `package.json` (o equivalentes) para typecheck, build, lint y tests.
- **Ramas:** `git branch -r`, y si hay workflows de despliegue en `.github/workflows/`.
- **Idioma:** el de los textos de la interfaz y de los últimos commits.
- **Guía existente:** `CLAUDE.md`, `README.md`, `CONTRIBUTING.md`. Si hay un backlog o un registro
  de deudas con otro nombre, úsalo en vez de crear uno nuevo.

## 3. Escribe PHRONESIS.md

Parte de la plantilla de Phronesis v2 (`plantillas/PHRONESIS.md`; si no la encuentras localmente,
reconstruye sus secciones) y llena lo que dedujiste. Marca con `<!-- deducido -->` lo que sacaste
del repo, para que el dueño sepa qué revisar.

**Pregunta solo lo que el repo no puede responder**, en una sola tanda corta:

1. ¿Qué es el producto y para quién, en una frase?
2. ¿Qué restricciones duras propias tiene, además de las que Phronesis v2 trae por defecto
   (migraciones, pagos, autenticación y permisos, borrado de datos)?
3. ¿Cuál es el flujo que más importa (el que el inspector de UX tiene que cuidar primero)?

Si el dueño no responde alguna, deja el campo vacío con un comentario. Un agente que no encuentra un
dato se abstiene; nunca lo inventa.

## 4. Crea los archivos del loop

En las rutas de la sección 8 (por defecto):

- `docs/mejora/BACKLOG.md` ← `plantillas/BACKLOG.md`
- `docs/mejora/LECCIONES.md` ← `plantillas/LECCIONES.md`
- `docs/DEUDAS.md` ← `plantillas/DEUDAS.md`, solo si el proyecto no tiene uno

## 5. Etiqueta de GitHub

Si hay `gh` disponible y el repo está en GitHub, crea la etiqueta que usan las restricciones duras:

```bash
gh label create necesita-decision --color D93F0B --description "Un agente de Phronesis v2 necesita una decisión humana" 2>/dev/null || true
```

## 6. Cierre

Muestra qué se creó, qué campos de `PHRONESIS.md` quedaron vacíos (en especial *Restricciones
duras* y *Validación*) y el siguiente paso: correr `/ph-inspeccionar seguridad` a mano una vez,
leer lo que encuentra, y recién entonces programar el ciclo diario.
