from PIL import Image
import os
import random
import uuid

def generate_uuid():
    return str(uuid.uuid4())

def generate_nfts(total_nfts, backgrounds, characters, sunglasses, upload_folder):
    # Create lists of filenames repeated according to their quantity
    background_pool = [bg['filename'] for bg in backgrounds for _ in range(bg['quantity'])]
    character_pool = [char['filename'] for char in characters for _ in range(char['quantity'])]
    sunglass_pool = [sg['filename'] for sg in sunglasses for _ in range(sg['quantity'])]
    
    # Output folder for generated NFTs
    output_folder = 'output_nfts'
    os.makedirs(output_folder, exist_ok=True)
    
    generated_count = 0
    output_paths = []
    uid = generate_uuid()
    
    # Continue until the desired number of NFTs is generated or one of the pools is exhausted
    while generated_count < total_nfts and background_pool and character_pool and sunglass_pool:
        # Randomly select one from each pool
        background = random.choice(background_pool)
        character = random.choice(character_pool)
        sunglass = random.choice(sunglass_pool)
        
        # Remove the selected item from the pool to avoid reuse
        print(background_pool)
        print(character_pool)
        print(sunglass_pool)
        background_pool.remove(background)
        character_pool.remove(character)
        sunglass_pool.remove(sunglass)

        # Generate a combination (this could be where you generate an NFT image, for example)
        combination = (background, character, sunglass)
        #print(background_pool)

        # Save or process the combination (placeholder for actual NFT generation logic)
        print(f"Generated NFT {generated_count + 1}: {combination}")
        
        # # Check if there are enough elements to generate the requested number of NFTs
        # if generated_count < total_nfts:
        #     print(f"Could only generate {generated_count} NFTs due to exhausted resources.")

        bg_path = os.path.join(upload_folder, background)
        char_path = os.path.join(upload_folder, character)
        sunglass_path = os.path.join(upload_folder, sunglass)
        
        bg_image = Image.open(bg_path).convert("RGBA")
        char_image = Image.open(char_path).convert("RGBA")
        sunglass_image = Image.open(sunglass_path).convert("RGBA")

        combined_image = Image.alpha_composite(bg_image, char_image)
        final_image = Image.alpha_composite(combined_image, sunglass_image)

        output_path = os.path.join(output_folder, f'nft_{generated_count + 1}{uid}.png')
        final_image.save(output_path)
        output_paths.append(output_path)

        generated_count += 1
        print(f'Generated NFT {generated_count}: {output_path}')

    return generated_count, output_paths
