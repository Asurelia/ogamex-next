"""
Script pour extraire les vaisseaux individuels de la sprite sheet OGame
Utilise Pillow pour découper l'image ships_200.jpg
"""

from PIL import Image
import os

# Chemins
SPRITE_SHEET = r"F:\jeux_unreal\Ogames_clones\OGameX\public\img\content\ships_200.jpg"
OUTPUT_DIR = r"F:\jeux_unreal\Ogames_clones\ogamex-next\public\img\ships_hq"

# Dimensions de la sprite sheet: 3400x200 pixels
# 17 vaisseaux = 200x200 pixels chacun

SHIPS = [
    "light_fighter",      # 0
    "heavy_fighter",      # 1
    "cruiser",            # 2
    "battleship",         # 3
    "battlecruiser",      # 4
    "bomber",             # 5
    "destroyer",          # 6
    "deathstar",          # 7
    "small_cargo",        # 8
    "large_cargo",        # 9
    "colony_ship",        # 10
    "recycler",           # 11
    "espionage_probe",    # 12
    "solar_satellite",    # 13
    "crawler",            # 14
    "reaper",             # 15
    "pathfinder",         # 16
]

def extract_ships():
    # Créer le dossier de sortie
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Ouvrir la sprite sheet
    sprite_sheet = Image.open(SPRITE_SHEET)
    width, height = sprite_sheet.size
    print(f"Sprite sheet size: {width}x{height}")

    # Calculer la largeur de chaque vaisseau
    ship_width = width // len(SHIPS)
    ship_height = height
    print(f"Each ship: {ship_width}x{ship_height}")

    # Extraire chaque vaisseau
    for i, ship_name in enumerate(SHIPS):
        left = i * ship_width
        right = left + ship_width
        top = 0
        bottom = ship_height

        # Découper
        ship_image = sprite_sheet.crop((left, top, right, bottom))

        # Sauvegarder
        output_path = os.path.join(OUTPUT_DIR, f"{ship_name}.png")
        ship_image.save(output_path, "PNG")
        print(f"Saved: {output_path}")

if __name__ == "__main__":
    extract_ships()
    print("\nDone! Ships extracted to:", OUTPUT_DIR)
