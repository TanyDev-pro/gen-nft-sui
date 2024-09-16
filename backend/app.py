import os
from flask import Flask, request, jsonify, render_template
from generator import generate_nfts
from werkzeug.utils import secure_filename
import requests


publisher_url = "https://publisher-devnet.walrus.space"

def upload_files_to_walrus(paths, publisher_url):
    urls = []
    for path in paths:
        with open(path, 'rb') as file_data:
            response = requests.put(f"{publisher_url}/v1/store", data = file_data)
            print("Walrus response: ",path, response.status_code)
            if response.status_code == 200:
                blob_info = response.json()
                if "newlyCreated" in blob_info:
                    #urls.append(blob_info["newlyCreated"]["blobObject"]["id"])
                    urls.append(blob_info["newlyCreated"]["blobObject"]["blobId"])
                    print(f'Walrus info result {urls[-1]}')
                elif "alreadyCertified" in blob_info:
                    urls.append(blob_info["alreadyCertified"]["blobId"])
                    print(f'Walrus info result {urls[-1]}')
    return urls

from flask_cors import CORS

app = Flask(__name__, template_folder='../frontend/templates', static_folder='../frontend/static')
CORS(app)

UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/generate', methods=['POST'])
def generate():
    try:
        total_nfts = int(request.form.get('totalNFTs', 0))
        print(request.form)
        backgrounds = {}
        characters = {}
        sunglasses = {}

        print("Received request to generate NFTs")
        print("Total NFTs requested:", total_nfts)
        print("Files received:", request.files)

        for key in request.files:
            files_list = request.files.getlist(key)
            print(f"Processing files with key: {key}, number of files: {len(files_list)}")

            for file in files_list:
                print(f"Processing file with key: {key}, filename: {file.filename}")

                if file.filename:  # Check if filename is not empty
                    filename = secure_filename(file.filename)
                    file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))

                    # Updated logic to count quantities correctly
                    quantity_key = f"{key.replace('Grid', 'Input')}"
                    quantity = int(request.form.get(quantity_key, 1))

                    if 'backgroundsGrid' in key:
                        if filename in backgrounds:
                            backgrounds[filename]['quantity'] += quantity
                        else:
                            backgrounds[filename] = {'filename': filename, 'quantity': quantity}
                        print(f"Added/Updated background: {filename}, quantity: {backgrounds[filename]['quantity']}")

                    elif 'charactersGrid' in key:
                        if filename in characters:
                            characters[filename]['quantity'] += quantity
                        else:
                            characters[filename] = {'filename': filename, 'quantity': quantity}
                        print(f"Added/Updated character: {filename}, quantity: {characters[filename]['quantity']}")

                    elif 'sunglassesGrid' in key:
                        if filename in sunglasses:
                            sunglasses[filename]['quantity'] += quantity
                        else:
                            sunglasses[filename] = {'filename': filename, 'quantity': quantity}
                        print(f"Added/Updated sunglasses: {filename}, quantity: {sunglasses[filename]['quantity']}")
                else:
                    print(f"Skipped empty file for key: {key}")

        backgrounds_list = list(backgrounds.values())
        characters_list = list(characters.values())
        sunglasses_list = list(sunglasses.values())

        if not backgrounds_list or not characters_list or not sunglasses_list:
            print("Missing required files.")
            return jsonify({"error": "Please upload at least one background, one character, and one pair of sunglasses image."}), 400

        print("All required files are present. Generating NFTs...")

        result, paths = generate_nfts(total_nfts, backgrounds_list, characters_list, sunglasses_list, app.config['UPLOAD_FOLDER'])
        print(f'Paths printed for debugging{paths}'
              )
        blobs = upload_files_to_walrus(paths, publisher_url)
        return jsonify({"generated": result, "blobs": blobs})

    except Exception as e:
        print(f"An error occurred: {str(e)}")
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(debug=True)
