"""
Test TripoSR avec quelques images OGame pour valider la qualite
"""

import sys
import os

# Ajouter le chemin de TripoSR
TRIPOSR_PATH = r"F:\Dev\Comfyui\custom_nodes\ComfyUI-Flowty-TripoSR"
sys.path.insert(0, TRIPOSR_PATH)

import torch
from PIL import Image
import trimesh

# Chemins
MODEL_PATH = r"F:\Dev\Comfyui\models\triposr"
INPUT_DIR = r"F:\jeux_unreal\Ogames_clones\ogamex-next\public\img\ships_hq"
OUTPUT_DIR = r"F:\jeux_unreal\Ogames_clones\ogamex-next\public\models\ships"

# Images de test (quelques unes seulement)
TEST_IMAGES = [
    "light_fighter_upscaled.png",
    "cruiser_upscaled.png",
    "deathstar_upscaled.png",
]

def main():
    print("=" * 50)
    print("  Test TripoSR - Generation 3D")
    print("=" * 50)

    # Verifier GPU
    if torch.cuda.is_available():
        print(f"GPU: {torch.cuda.get_device_name(0)}")
        print(f"VRAM: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f} GB")
    else:
        print("ATTENTION: Pas de GPU detecte, sera tres lent!")

    # Creer dossier output
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    print("\nChargement du modele TripoSR...")

    try:
        # Import TripoSR
        from tsr.system import TSR
        from tsr.utils import remove_background, resize_foreground

        # Charger le modele
        model = TSR.from_pretrained(
            MODEL_PATH,
            config_name="config.yaml",
            weight_name="model.ckpt"
        )
        model.renderer.set_chunk_size(8192)
        model.to("cuda" if torch.cuda.is_available() else "cpu")

        print("Modele charge!")

        for img_name in TEST_IMAGES:
            input_path = os.path.join(INPUT_DIR, img_name)
            output_name = img_name.replace("_upscaled.png", ".glb")
            output_path = os.path.join(OUTPUT_DIR, output_name)

            if not os.path.exists(input_path):
                print(f"[SKIP] {img_name} - fichier non trouve")
                continue

            print(f"\nTraitement: {img_name}")

            # Charger image
            image = Image.open(input_path).convert("RGB")

            # Preprocess
            image = remove_background(image)
            image = resize_foreground(image, 0.85)

            # Generer mesh
            print("  Generation du mesh 3D...")
            with torch.no_grad():
                scene_codes = model([image], device="cuda" if torch.cuda.is_available() else "cpu")

            # Extraire mesh
            meshes = model.extract_mesh(scene_codes, resolution=256)
            mesh = meshes[0]

            # Sauvegarder
            mesh.export(output_path)
            print(f"  [OK] Sauvegarde: {output_path}")

            # Stats
            print(f"  Vertices: {len(mesh.vertices)}, Faces: {len(mesh.faces)}")

        print("\n" + "=" * 50)
        print("  Test termine!")
        print("=" * 50)

    except ImportError as e:
        print(f"\nERREUR Import: {e}")
        print("\nLe module TSR n'est pas dans ComfyUI-Flowty-TripoSR.")
        print("Utilisons l'approche API ComfyUI a la place.")
        return False

    except Exception as e:
        print(f"\nERREUR: {e}")
        return False

    return True

if __name__ == "__main__":
    main()
