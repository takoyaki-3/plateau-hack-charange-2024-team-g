import re
import os
import shutil

def extract_image_paths(mtl_file):
    image_paths = []
    with open(mtl_file, 'r') as file:
        for line in file:
            match = re.search(r'map_Kd\s+(.*\.jpg)', line)
            if match:
                image_paths.append(match.group(1))
    return image_paths

def copy_images(src_dir, dest_dir, image_paths):
    for image_path in image_paths:
        src_path = os.path.join(src_dir, image_path)
        dest_path = os.path.join(dest_dir, image_path)

        # ディレクトリが存在しない場合は作成する
        os.makedirs(os.path.dirname(dest_path), exist_ok=True)

        if os.path.exists(src_path):
            shutil.copy(src_path, dest_path)
            print(f"Copied {src_path} to {dest_path}")
        else:
            print(f"File {src_path} does not exist")

mtl_file = './src/assets/tokyo_tower.mtl'
src_dir = './dist/assets.old'
dest_dir = './src/assets'

image_paths = extract_image_paths(mtl_file)
copy_images(src_dir, dest_dir, image_paths)
