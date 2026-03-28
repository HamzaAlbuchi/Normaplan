"""
Design tokens — keep in sync with apps/web/src/index.css :root.
Use these names only; do not scatter hex literals in layout code.
"""

from reportlab.lib import colors as rl_colors
from reportlab.lib.colors import Color

# Surfaces & text (light surfaces)
BG = "#F4F1EB"
BG2 = "#EDEADE"
INK = "#18180F"
INK2 = "#6B6860"
INK3 = "#A8A49C"
SIDE = "#111108"
CARD = "#FAFAF5"
HERO_TITLE = "#F4F1EB"

# Text on dark surfaces (SIDE hero, etc.) — align with --on-dark-* in apps/web/src/index.css
C_ON_DARK_PRIMARY = Color(1, 1, 1, alpha=0.90)
C_ON_DARK_SECONDARY = Color(1, 1, 1, alpha=0.55)
C_ON_DARK_MUTED = Color(1, 1, 1, alpha=0.30)
C_ON_DARK_BORDER = Color(1, 1, 1, alpha=0.08)
C_ON_DARK_SURFACE = Color(1, 1, 1, alpha=0.04)

# Accent system
AMBER = "#D9772A"
AMBER_SOFT = "#FDF0E2"
AMBER_INK = "#9A5010"
RED = "#B83232"
RED_SOFT = "#FBECEC"
GREEN = "#2A6E47"
GREEN_SOFT = "#EAF4EE"
BLUE = "#1E4E80"
BLUE_SOFT = "#EAF0F8"

# Borders (CSS uses rgba — PDF uses solid approximations)
BORDER = "#E3DFD4"
BORDER2 = "#D8D3C8"
# Hero stat cells on dark background
STAT_CELL_BG = "#1A1A14"

# ReportLab Color objects (for TableStyle etc.)
C_BG = rl_colors.HexColor(BG)
C_BG2 = rl_colors.HexColor(BG2)
C_INK = rl_colors.HexColor(INK)
C_INK2 = rl_colors.HexColor(INK2)
C_INK3 = rl_colors.HexColor(INK3)
C_SIDE = rl_colors.HexColor(SIDE)
C_CARD = rl_colors.HexColor(CARD)
C_HERO_TITLE = rl_colors.HexColor(HERO_TITLE)
C_AMBER = rl_colors.HexColor(AMBER)
C_AMBER_SOFT = rl_colors.HexColor(AMBER_SOFT)
C_AMBER_INK = rl_colors.HexColor(AMBER_INK)
C_RED = rl_colors.HexColor(RED)
C_RED_SOFT = rl_colors.HexColor(RED_SOFT)
C_GREEN = rl_colors.HexColor(GREEN)
C_GREEN_SOFT = rl_colors.HexColor(GREEN_SOFT)
C_BLUE = rl_colors.HexColor(BLUE)
C_BLUE_SOFT = rl_colors.HexColor(BLUE_SOFT)
C_BORDER = rl_colors.HexColor(BORDER)
C_BORDER2 = rl_colors.HexColor(BORDER2)
C_STAT_CELL_BG = rl_colors.HexColor(STAT_CELL_BG)
C_STAT_CELL_BORDER = C_ON_DARK_BORDER
C_WHITE = rl_colors.white
