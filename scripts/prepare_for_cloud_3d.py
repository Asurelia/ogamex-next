"""
Prepare images for cloud 3D generation services
- Lists all upscaled images ready for conversion
- Provides direct links to free services
"""

import os
from pathlib import Path

# Paths
SHIPS_HQ = Path(r"F:\jeux_unreal\Ogames_clones\ogamex-next\public\img\ships_hq")
OUTPUT_3D = Path(r"F:\jeux_unreal\Ogames_clones\ogamex-next\public\models")

def main():
    print("=" * 60)
    print("  Images pretes pour conversion 3D (Cloud)")
    print("=" * 60)

    # List ships (best quality - 800x800)
    ships = list(SHIPS_HQ.glob("*_upscaled.png"))

    print(f"\nVaisseaux (800x800) - {len(ships)} fichiers:")
    print("-" * 40)

    for i, ship in enumerate(ships, 1):
        name = ship.stem.replace("_upscaled", "")
        print(f"  {i:2}. {name}")

    print("\n" + "=" * 60)
    print("  SERVICES CLOUD GRATUITS")
    print("=" * 60)

    print("""
    1. FAST3D.IO (Sans inscription - Le plus rapide)
       https://fast3d.io/
       - Upload image -> 10 secondes -> Download .glb
       - Qualite moyenne mais rapide

    2. TRIPO3D (Meilleure qualite)
       https://www.tripo3d.ai/
       - 300 credits gratuits/mois
       - Upload image -> 30 secondes -> Download .glb
       - Meilleure topology

    3. MESHY AI (Avec animations)
       https://www.meshy.ai/
       - 200 credits gratuits/mois
       - Inclut des animations
    """)

    print("=" * 60)
    print("  WORKFLOW RECOMMANDE")
    print("=" * 60)

    print("""
    1. Ouvrir Fast3D.io dans le navigateur
    2. Drag & drop une image depuis:
       """ + str(SHIPS_HQ) + """
    3. Attendre ~10 secondes
    4. Telecharger le .glb
    5. Sauvegarder dans:
       """ + str(OUTPUT_3D / "ships") + """
    """)

    # Create output directories
    (OUTPUT_3D / "ships").mkdir(parents=True, exist_ok=True)
    (OUTPUT_3D / "defenses").mkdir(parents=True, exist_ok=True)
    (OUTPUT_3D / "buildings").mkdir(parents=True, exist_ok=True)

    print("\nDossiers de sortie crees:")
    print(f"  - {OUTPUT_3D / 'ships'}")
    print(f"  - {OUTPUT_3D / 'defenses'}")
    print(f"  - {OUTPUT_3D / 'buildings'}")

    print("\n" + "=" * 60)
    print("  Ouvre Fast3D.io et commence par light_fighter_upscaled.png")
    print("=" * 60)

if __name__ == "__main__":
    main()
