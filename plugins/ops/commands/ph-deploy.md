---
description: Ejecuta el protocolo de deploy de Phronesis v2 (F0–F11). Sin argumentos llega hasta la puerta y espera «mergea»; con `mergea` sigue hasta la nota de release; con `estado` solo muestra el inventario.
argument-hint: "[estado | mergea | todo]"
---

# /ph-deploy — protocolo de deploy

Invoca a **ph-gestor-deploy** (o, sin subagentes, lee su archivo y ejecuta el protocolo tú mismo,
fase por fase y sin saltarte ninguna).

| `$ARGUMENTS` | Fases | Termina en |
|---|---|---|
| *(vacío)* | F0 → F6 | 🛑 la puerta: el manifiesto del lote, **esperando «mergea»** |
| `mergea` | F7 → F11 | deploy verificado, registrado y anunciado — solo si la puerta ya se mostró en esta sesión |
| `todo` | F0 → F11 | sin pausa, **salvo riesgo alto o una parada**: ahí se detiene igual |
| `estado` | F0 + F1 | el inventario, sin tocar nada |

Antes de empezar, verifica que existan `PHRONESIS.md` (§7 completa) y `docs/ops/deploy.json`. Si
falta alguno, dilo y ofrece crearlo desde `plantillas/` de Phronesis v2; no adivines ramas ni URLs.

**Las paradas mandan sobre cualquier argumento.** Un «mergea» no autoriza saltarse un inventario
INCOMPLETO, un CI en rojo ni un lote de riesgo alto sin pasar por la puerta.
