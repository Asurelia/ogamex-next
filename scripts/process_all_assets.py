"""
Script pour upscaler toutes les images OGame (vaisseaux, defenses, batiments)
"""

from PIL import Image
import os
from pathlib import Path

# Chemins
BASE_INPUT = Path(r"F:\jeux_unreal\Ogames_clones\OGameX\public\img\objects")
BASE_OUTPUT = Path(r"F:\jeux_unreal\Ogames_clones\ogamex-next\public\img\assets_hq")

# Categories d'assets
CATEGORIES = {
    "ships": {
        "input_dir": BASE_INPUT / "units",
        "output_dir": BASE_OUTPUT / "ships",
        "files": [
            "light_fighter_small.jpg",
            "heavy_fighter_small.jpg",
            "cruiser_small.jpg",
            "battleship_small.jpg",
            "battlecruiser_small.jpg",
            "bomber_small.jpg",
            "destroyer_small.jpg",
            "deathstar_small.jpg",
            "reaper_small.jpg",
            "pathfinder_small.jpg",
            "small_cargo_small.jpg",
            "large_cargo_small.jpg",
            "colony_ship_small.jpg",
            "recycler_small.jpg",
            "espionage_probe_small.jpg",
            "solar_satellite_small.jpg",
            "crawler_small.jpg",
        ]
    },
    "defenses": {
        "input_dir": BASE_INPUT / "units",
        "output_dir": BASE_OUTPUT / "defenses",
        "files": [
            "rocket_launcher_small.jpg",
            "light_laser_small.jpg",
            "heavy_laser_small.jpg",
            "gauss_cannon_small.jpg",
            "ion_cannon_small.jpg",
            "plasma_turret_small.jpg",
            "small_shield_dome_small.jpg",
            "large_shield_dome_small.jpg",
            "anti_ballistic_missile_small.jpg",
            "interplanetary_missile_small.jpg",
        ]
    },
    "buildings": {
        "input_dir": BASE_INPUT / "buildings",
        "output_dir": BASE_OUTPUT / "buildings",
        "files": [
            "metal_mine_small.jpg",
            "crystal_mine_small.jpg",
            "deuterium_synthesizer_small.jpg",
            "solar_plant_small.jpg",
            "fusion_plant_small.jpg",
            "metal_store_small.jpg",
            "crystal_store_small.jpg",
            "deuterium_store_small.jpg",
            "robot_factory_small.jpg",
            "shipyard_small.jpg",
            "research_lab_small.jpg",
            "nanite_factory_small.jpg",
            "terraformer_small.jpg",
            "alliance_depot_small.jpg",
            "missile_silo_small.jpg",
            "lunar_base_small.jpg",
            "sensor_phalanx_small.jpg",
            "jump_gate_small.jpg",
            "space_dock_small.jpg",
        ]
    }
}


def upscale_image(img, scale=4):
    """Upscale image using LANCZOS resampling"""
    new_size = (img.width * scale, img.height * scale)
    return img.resize(new_size, Image.LANCZOS)


def process_category(category_name, category_config):
    """Process all images in a category"""
    input_dir = category_config["input_dir"]
    output_dir = category_config["output_dir"]
    files = category_config["files"]

    # Create output directory
    output_dir.mkdir(parents=True, exist_ok=True)

    print("")
    print("=" * 50)
    print("Processing %s (%d files)" % (category_name.upper(), len(files)))
    print("=" * 50)

    processed = 0
    errors = []

    for filename in files:
        input_path = input_dir / filename

        # Output filename: remove _small and change to .png
        output_name = filename.replace("_small.jpg", "_upscaled.png")
        output_path = output_dir / output_name

        if not input_path.exists():
            errors.append("Not found: %s" % input_path)
            continue

        try:
            # Load image
            img = Image.open(input_path)
            original_size = img.size

            # Convert to RGB if needed (for JPEG)
            if img.mode != 'RGB':
                img = img.convert('RGB')

            # Upscale x4
            upscaled = upscale_image(img, scale=4)

            # Save as PNG
            upscaled.save(output_path, "PNG", optimize=True)

            print("  [OK] %s (%dx%d -> %dx%d)" % (
                filename,
                original_size[0], original_size[1],
                upscaled.width, upscaled.height
            ))
            processed += 1

        except Exception as e:
            errors.append("Error processing %s: %s" % (filename, e))
            print("  [ERROR] %s" % filename)

    print("")
    print("  Processed: %d/%d" % (processed, len(files)))

    if errors:
        print("  Errors (%d):" % len(errors))
        for error in errors:
            print("    - %s" % error)

    return processed, errors


def main():
    print("=" * 60)
    print("  OGame Asset Processor - Upscale All Images (x4)")
    print("=" * 60)

    total_processed = 0
    total_errors = []

    for category_name, category_config in CATEGORIES.items():
        processed, errors = process_category(category_name, category_config)
        total_processed += processed
        total_errors.extend(errors)

    print("")
    print("=" * 60)
    print("  SUMMARY")
    print("=" * 60)
    print("  Total processed: %d" % total_processed)
    print("  Total errors: %d" % len(total_errors))
    print("")
    print("  Output directory: %s" % BASE_OUTPUT)
    print("")
    print("  Structure:")
    print("    assets_hq/")
    print("    +-- ships/      (17 files)")
    print("    +-- defenses/   (10 files)")
    print("    +-- buildings/  (19 files)")
    print("")
    print("=" * 60)


if __name__ == "__main__":
    main()
