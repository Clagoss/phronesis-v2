#!/usr/bin/env bash
# Copia los agentes y comandos de Phronesis v2 a la carpeta .claude/ de un proyecto.
#
# Úsalo cuando quieras correr el loop en GitHub Actions (allá no hay marketplace de plugins: los
# archivos tienen que estar en el repo) o cuando prefieras versionar los agentes junto a tu código.
# Si solo vas a usar Phronesis v2 desde tu computador, instalar el plugin basta (ver README).
#
#   ./scripts/instalar.sh /ruta/a/tu-proyecto                 # todos los plugins
#   ./scripts/instalar.sh /ruta/a/tu-proyecto mejora ops      # solo algunos
#
# No sobrescribe archivos que ya existan en el destino: si editaste un agente, tu versión se queda.
# Para actualizar uno a propósito, bórralo en el destino y vuelve a correr el script.
set -euo pipefail

AQUI="$(cd "$(dirname "$0")/.." && pwd)"
DESTINO="${1:?Uso: instalar.sh /ruta/al/proyecto [plugin ...]}"
shift || true
PLUGINS=("$@")
[ ${#PLUGINS[@]} -eq 0 ] && PLUGINS=(mejora ops growth contenido)

[ -d "$DESTINO/.git" ] || { echo "✗ $DESTINO no parece un repo git"; exit 1; }
mkdir -p "$DESTINO/.claude/agents" "$DESTINO/.claude/commands"

copiados=0; saltados=0
for p in "${PLUGINS[@]}"; do
  [ -d "$AQUI/plugins/$p" ] || { echo "✗ no existe el plugin '$p'"; exit 1; }
  for tipo in agents commands; do
    [ -d "$AQUI/plugins/$p/$tipo" ] || continue
    for f in "$AQUI/plugins/$p/$tipo"/*.md; do
      dst="$DESTINO/.claude/$tipo/$(basename "$f")"
      if [ -e "$dst" ]; then
        echo "  · ya existe, no lo toco: .claude/$tipo/$(basename "$f")"; saltados=$((saltados+1))
      else
        cp "$f" "$dst"; echo "  ✓ .claude/$tipo/$(basename "$f")"; copiados=$((copiados+1))
      fi
    done
  done
done

# El plugin ops trae además el protocolo de deploy: el script de inventario y sus tres archivos de
# configuración. Van a scripts/ops/ y docs/ops/ del proyecto, sin pisar los que ya existan.
copiar_si_falta() {
  local origen="$1" destino="$2"
  mkdir -p "$(dirname "$destino")"
  if [ -e "$destino" ]; then
    echo "  · ya existe, no lo toco: ${destino#$DESTINO/}"; saltados=$((saltados+1))
  else
    cp "$origen" "$destino"; echo "  ✓ ${destino#$DESTINO/}"; copiados=$((copiados+1))
  fi
}
if printf '%s\n' "${PLUGINS[@]}" | grep -qx ops; then
  copiar_si_falta "$AQUI/plantillas/scripts/inventario-deploy.mjs" "$DESTINO/scripts/ops/inventario-deploy.mjs"
  copiar_si_falta "$AQUI/plantillas/scripts/orden-migraciones.mjs" "$DESTINO/scripts/ops/orden-migraciones.mjs"
  copiar_si_falta "$AQUI/plantillas/deploy.json"              "$DESTINO/docs/ops/deploy.json"
  copiar_si_falta "$AQUI/plantillas/fuera-del-lote.json"      "$DESTINO/docs/ops/fuera-del-lote.json"
  copiar_si_falta "$AQUI/plantillas/protocolo-revision.json"  "$DESTINO/docs/ops/protocolo-revision.json"
  echo "  → ajusta docs/ops/deploy.json (ramas, URL de salud, rutas sensibles) antes del primer /ph-deploy"
fi

# Los agentes que leen contenido de afuera (growth lee la web; el triage de ops, el correo) vienen con
# la puerta de ingesta de prospectos y la guardia. La guardia es un hook de Claude Code: se activa a
# mano en .claude/settings.json, porque el instalador no toca tus permisos.
if printf '%s\n' "${PLUGINS[@]}" | grep -qx growth; then
  copiar_si_falta "$AQUI/plantillas/scripts/ingesta-prospectos.mjs" "$DESTINO/scripts/ops/ingesta-prospectos.mjs"
  copiar_si_falta "$AQUI/plantillas/ingesta.json"                    "$DESTINO/docs/ops/outreach/ingesta.json"
fi
if printf '%s\n' "${PLUGINS[@]}" | grep -qxE 'growth|ops'; then
  copiar_si_falta "$AQUI/plantillas/scripts/guardia-agentes.mjs" "$DESTINO/scripts/ops/guardia-agentes.mjs"
  echo "  → activa la guardia: agrega a .claude/settings.json el hook PreToolUse de scripts/ops/guardia-agentes.mjs (README, «Agentes que leen afuera»)"
fi

if [ ! -e "$DESTINO/PHRONESIS.md" ]; then
  cp "$AQUI/plantillas/PHRONESIS.md" "$DESTINO/PHRONESIS.md"
  echo "  ✓ PHRONESIS.md (plantilla — complétala, o corre /ph-iniciar para que la llene leyendo el repo)"
fi

echo
echo "Listo: $copiados copiados, $saltados ya existían."
echo "Siguiente paso: abre Claude Code en $DESTINO y corre /ph-iniciar"
