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

if [ ! -e "$DESTINO/PHRONESIS.md" ]; then
  cp "$AQUI/plantillas/PHRONESIS.md" "$DESTINO/PHRONESIS.md"
  echo "  ✓ PHRONESIS.md (plantilla — complétala, o corre /ph-iniciar para que la llene leyendo el repo)"
fi

echo
echo "Listo: $copiados copiados, $saltados ya existían."
echo "Siguiente paso: abre Claude Code en $DESTINO y corre /ph-iniciar"
