"""
Script pour extraire, upscaler et supprimer le fond des vaisseaux OGame
"""

from PIL import Image
import os

# Chemins
SPRITE_SHEET = r"F:\jeux_unreal\Ogames_clones\OGameX\public\img\content\ships_200.jpg"
OUTPUT_DIR = r"F:\jeux_unreal\Ogames_clones\ogamex-next\public\img\ships_hq"

# Liste des vaisseaux (ordre dans la sprite sheet)
SHIPS = [
    "light_fighter",
    "heavy_fighter",
    "cruiser",
    "battleship",
    "battlecruiser",
    "bomber",
    "destroyer",
    "deathstar",
    "small_cargo",
    "large_cargo",
    "colony_ship",
    "recycler",
    "espionage_probe",
    "solar_satellite",
    "crawler",
    "reaper",
    "pathfinder",
]

def upscale_image(img, scale=4):
    """Upscale image using LANCZOS resampling (high quality)"""
    new_size = (img.width * scale, img.height * scale)
    return img.resize(new_size, Image.LANCZOS)

def process_ships(ship_filter=None):
    """
    Extraire et upscaler les vaisseaux
    ship_filter: None pour tous, ou nom du vaisseau spécifique
    """
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Ouvrir la sprite sheet
    sprite_sheet = Image.open(SPRITE_SHEET)
    width, height = sprite_sheet.size
    print(f"Sprite sheet: {width}x{height}")

    ship_width = width // len(SHIPS)
    print(f"Each ship: {ship_width}x{height}")

    ships_to_process = SHIPS if ship_filter is None else [ship_filter]

    for ship_name in ships_to_process:
        if ship_name not in SHIPS:
            print(f"Unknown ship: {ship_name}")
            continue

        i = SHIPS.index(ship_name)

        # Découper
        left = i * ship_width
        ship_image = sprite_sheet.crop((left, 0, left + ship_width, height))

        # Upscale x4 (200x200 -> 800x800)
        print(f"Processing {ship_name}...")
        upscaled = upscale_image(ship_image, scale=4)
        print(f"  Upscaled to: {upscaled.width}x{upscaled.height}")

        # Sauvegarder version upscalée
        output_path = os.path.join(OUTPUT_DIR, f"{ship_name}_upscaled.png")
        upscaled.save(output_path, "PNG")
        print(f"  Saved: {output_path}")

    print("\nDone!")
    return OUTPUT_DIR

if __name__ == "__main__":
    import sys

    # Si un argument est passé, traiter seulement ce vaisseau
    if len(sys.argv) > 1:
        process_ships(sys.argv[1])
    else:
        # Traiter tous les vaisseaux
        process_ships()
