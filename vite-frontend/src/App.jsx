import React, { useState, useEffect } from 'react';
import './App.css';
import { ConnectButton, WalletProvider } from '@mysten/dapp-kit';
import { createNetworkConfig, SuiClientProvider } from '@mysten/dapp-kit';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@mysten/dapp-kit/dist/index.css';
import {
  isValidSuiObjectId,
  isValidSuiAddress,
  fromB64,
  fromHEX,
  toHEX,
} from "@mysten/sui/utils";
import { bcs } from "@mysten/sui/bcs";
//Parts for working with walrus b36 ids from URLs are taken from Mysten's flatland example 
import base from "base-x";
const BASE36 = "0123456789abcdefghijklmnopqrstuvwxyz";
const b36 = base(BASE36);
const UID = bcs.fixedArray(32, bcs.u8()).transform({
  input: (id) => fromHEX(id),
  output: (id) => toHEX(Uint8Array.from(id)),
});

function subdomainToObjectId(subdomain) {
  const objectId = "0x" + toHEX(b36.decode(subdomain.toLowerCase()));
  console.log(
    "obtained object id: ",
    objectId,
    isValidSuiObjectId(objectId),
    isValidSuiAddress(objectId),
  );
  return isValidSuiObjectId(objectId) ? objectId : null;
}

//http://2gieu18bdvt2s4pdvdpr01z75k4p4q8b5jjx54mprn500tscpw.localhost:5173/
function getSubdomainAndPath(scope) {
  // At the moment we only support one subdomain level.
  const url = new URL(scope);
  const hostname = url.hostname.split(".");

  if (hostname.length === 3 || (hostname.length === 2 && hostname[1] === "localhost")) {
    // Accept only one level of subdomain eg `subdomain.example.com` or `subdomain.localhost` in
    // case of local development
    const path = url.pathname == "/" ? "/index.html" : removeLastSlash(url.pathname);
    return { subdomain: hostname[0], path };
  }
  return null;
}


// Config options for the networks you want to connect to
const { networkConfig } = createNetworkConfig({
  localnet: { url: getFullnodeUrl('localnet') },
  mainnet: { url: getFullnodeUrl('mainnet') },
  testnet: { url: getFullnodeUrl('testnet') },
});
const queryClient = new QueryClient();

import { Transaction } from "@mysten/sui/transactions";
import { useSignAndExecuteTransaction } from "@mysten/dapp-kit";
//import { SuiTransactionBlockResponse } from "@mysten/sui.js/client";

function GenerateButton(props) {
  const generatorPackageId = "0x2f6a2a07a5adcf464a32a04e259bc2aaa9275f02b00efc5e5f0e3587bae84d99";
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();

  // Moved the function inside the onClick handler
  const handleClick = async (event) => {
    event.preventDefault(); // Prevent default behavior

    props.setLoading(true);
    const { formData, backgrounds, characters, sunglasses } = props;

    const form = new FormData();
    form.append('totalNFTs', formData.totalNFTs);

    // Append all background files
    backgrounds.forEach((file, index) => {
      form.append(`backgroundsGrid${index}`, file);
    });

    // Append all character files
    characters.forEach((file, index) => {
      form.append(`charactersGrid${index}`, file);
    });

    // Append all sunglasses files
    sunglasses.forEach((file, index) => {
      form.append(`sunglassesGrid${index}`, file);
    });

    try {
      const response = await fetch('http://localhost:5000/generate', {
        method: 'POST',
        body: form,
      });

      const result = await response.json();
      if (response.ok) {
        props.setLoading(false);
        const blobs = result.blobs;
        console.log(blobs);
        const txb = new Transaction();
        console.log("Entered transaction building");
        blobs.map(id =>
          txb.moveCall({
            arguments: [txb.pure.string(id), txb.pure.string("Open the link on sui scan to see the surprise NFT!")],
            target: `${generatorPackageId}::generator::mint`,
          })
        );

        signAndExecute(
          {
            transaction: txb,
            chain: 'sui:testnet',
          },
          {
            onSuccess: (result) => {
              console.log('Executed transaction', result);
            },
          }
        );
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      props.setLoading(false);
      document.getElementById('output').innerHTML = `
        <div class="alert alert-danger">Error: ${error.message}</div>
      `;
    }

    // Display success message after a timeout
    const output = document.getElementById('output');
    setTimeout(() => {
      props.setLoading(false);
      output.innerHTML = `<div class="alert alert-success">Successfully generated NFTs!</div>`;
    }, 2000);
  };

  return (
    <button type="button" className="btn btn-primary btn-lg btn-block" onClick={handleClick}>
      Generate NFTs
    </button>
  );
}

async function getNFT(objectId) {
  const client = new SuiClient({ url: "https://fullnode.testnet.sui.io:443" });
  const obj = await client.getObject({
    id: objectId,
    options: { showBcs: false, showContent: true, showType: true },
  });

  console.log("nft object:", obj);

  if (
    obj.data &&
    obj.data.bcs &&
    obj.data.bcs.dataType === "moveObject"
  ) {

  }

  return obj?.data?.content?.fields?.image_blob_id;
}

function BlobImage({ url }) {
  const [imageBlobUrl, setImageBlobUrl] = useState("");

  useEffect(() => {
    let isMounted = true; // Track whether the component is mounted

    async function fetchImage() {
      try {
        const response = await fetch(url);

        // Get the raw data as a blob
        const octetBlob = await response.blob();

        // Forcefully change the MIME type to image/png
        const pngBlob = new Blob([octetBlob], { type: "image/png" });

        // Only update the state if the component is still mounted
        const reader = new FileReader();
        reader.onloadend = () => {
          if (isMounted) {
            setImageBlobUrl(reader.result); // Set the base64 encoded image as the source
          }
        };
        reader.readAsDataURL(pngBlob); // Convert the blob to base64
      } catch (error) {
        console.error("Error fetching the image:", error);
      }
    }

    if (url) {
      fetchImage();
    }

    // Cleanup function: Revoke the object URL and set isMounted to false when the component unmounts
    return () => {
      if (imageBlobUrl) {
        URL.revokeObjectURL(imageBlobUrl);
      }
      isMounted = false;
    };
  }, [url]);

  return (
    <div style={{
      borderRadius: '16px', // More rounded corners for a smoother look
      boxShadow: '0 12px 35px rgba(0, 0, 0, 0.2)', // Slightly more prominent shadow for depth
      width: '50%', // Ensure 70% width for the image
      maxWidth: '800px', // Ensure it doesn't get too large on wide screens
      transition: 'transform 0.3s ease', // Add a hover effect for interaction
      display: "flex", justifyContent: "center"
    }}> {/* Center image container */}
      {imageBlobUrl ? (
        <img
          src={imageBlobUrl}
          alt="Blob Image"
          style={{ width: "50%" }} // Set width to 50%
          className="glowing-nft"
        />
      ) : (
        <p>Loading image...</p>
      )}
    </div>
  );
}

export default function App() {
  const [formData, setFormData] = useState({ totalNFTs: 2 });
  const [backgrounds, setBackgrounds] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [sunglasses, setSunglasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [picture, setPicture] = useState(null);

  const url = window.location.origin;
  console.log(url)
  const parsedUrl = getSubdomainAndPath(url);
  const objectId = parsedUrl ? subdomainToObjectId(parsedUrl?.subdomain) : null;
  console.log(objectId);
  if (objectId) {
    getNFT(objectId).then(obj => { setPicture(obj); console.log(obj); });
  }
  const handleFileInput = (files, setFiles) => {
    const fileArray = Array.from(files);
    setFiles((prev) => [...prev, ...fileArray]);
  };

  const toggleUploadArea = (areaId) => {
    const area = document.getElementById(areaId);
    area.style.display = area.style.display === 'block' ? 'none' : 'block';
  };

  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
        <WalletProvider>
          {!objectId ?
            (<div className="container mt-5 bg-dark text-white">
              <ConnectButton />
              <h1 className="text-center mb-4">NFT Generator</h1>
              <form className="needs-validation" noValidate>
                <div className="form-group">
                  <label htmlFor="totalNFTs">Total NFTs:</label>
                  <input
                    type="number"
                    className="form-control bg-dark text-white border-secondary"
                    id="totalNFTs"
                    name="totalNFTs"
                    value={formData.totalNFTs}
                    onChange={(e) => setFormData({ ...formData, totalNFTs: e.target.value })}
                    required
                  />
                  <div className="invalid-feedback">Please provide a valid number of NFTs.</div>
                </div>

                {/* Background Section */}
                <Section
                  title="Backgrounds"
                  files={backgrounds}
                  handleFileInput={(e) => handleFileInput(e.target.files, setBackgrounds)}
                  toggleUploadArea={() => toggleUploadArea('backgroundUploadArea')}
                  uploadAreaId="backgroundUploadArea"
                />

                {/* Characters Section */}
                <Section
                  title="Characters"
                  files={characters}
                  handleFileInput={(e) => handleFileInput(e.target.files, setCharacters)}
                  toggleUploadArea={() => toggleUploadArea('characterUploadArea')}
                  uploadAreaId="characterUploadArea"
                />

                {/* Sunglasses Section */}
                <Section
                  title="Sunglasses"
                  files={sunglasses}
                  handleFileInput={(e) => handleFileInput(e.target.files, setSunglasses)}
                  toggleUploadArea={() => toggleUploadArea('sunglassesUploadArea')}
                  uploadAreaId="sunglassesUploadArea"
                />

                <GenerateButton setLoading={setLoading} formData={formData}
                  backgrounds={backgrounds} characters={characters} sunglasses={sunglasses}></GenerateButton>
              </form>
              {loading && (
                <div id="loading" className="text-center mt-4">
                  <div className="spinner-border" role="status">
                    <span className="sr-only">Generating...</span>
                  </div>
                  <span>Generating NFTs...</span>
                </div>
              )}

              <div id="output" className="mt-4"></div>
            </div>) :
            <>
              {/* Large, Elegant Heading */}
              <h1 className="text-center mb-5 display-4 fw-bold text-uppercase" style={{ letterSpacing: '1.5px', lineHeight: '1.2', color: '#ffffff' }}>

              </h1>

              <h1 className="text-center mb-5 display-4 fw-bold text-uppercase" style={{ letterSpacing: '1.5px', lineHeight: '1.2', color: '#ffffff' }}>

                NFT Showroom
              </h1>
              <div className="text-center" style={{ maxWidth: '70%', margin: '0 auto', fontSize: '1.2rem', lineHeight: '1.8', color: '#ffffff' }}>
                <p className="lead mb-5" style={{ fontWeight: '400' }}>
                  Welcome, dear Collectioner! Congratulations. You've got this amazing NFT. Wow, its image content is entirely stored on Walrus! </p>

                <p className="mb-5" style={{ fontWeight: '300' }}>
                  Read below to understand the technical side of this magic.
                </p>
              </div>

              {/* Centered Image with Enhanced Styling */}
              {picture && (
                <div className="d-flex justify-content-center mb-5">
                  <BlobImage
                    url={"https://aggregator-devnet.walrus.space/v1/" + picture}

                    className="blob-image" // Add a class for further custom styling if needed
                  />
                </div>
              )}

              {/* Hover effect to scale the image slightly */}
              <style>
                {`
                .blob-image:hover {
                  transform: scale(1.05); /* Slight zoom effect on hover */
                }
                .glowing-nft {
                  width: 70%; /* Control the width */
                  max-width: 800px;
                  border-radius: 16px; /* Rounded corners */
                  transition: transform 0.3s ease; /* Smooth hover scaling */
                  box-shadow: 0 0 30px rgba(0, 0, 0, 0.2); /* Subtle base shadow */
                  animation: glowAnimation 4s infinite alternate; /* Apply the glow animation */
                }

      /* Glow intensifies on hover */
      .glowing-nft:hover {
        transform: scale(1.05); /* Slight zoom effect */
        box-shadow: 0 0 50px rgba(255, 255, 255, 0.6), 0 0 100px rgba(255, 255, 255, 0.4); /* Enhance glow on hover */
      }

      /* Keyframes for the glowing effect */
      @keyframes glowAnimation {
        0% {
          box-shadow: 0 0 30px rgba(255, 215, 0, 0.7), 0 0 60px rgba(255, 140, 0, 0.6), 0 0 90px rgba(255, 69, 0, 0.5);
        }
        50% {
          box-shadow: 0 0 40px rgba(144, 238, 144, 0.7), 0 0 80px rgba(0, 255, 127, 0.6), 0 0 120px rgba(50, 205, 50, 0.5);
        }
        100% {
          box-shadow: 0 0 50px rgba(30, 144, 255, 0.7), 0 0 100px rgba(0, 191, 255, 0.6), 0 0 150px rgba(70, 130, 180, 0.5);
        }
      }
              `}
              </style>

              {/* Improved Text with Better Layout and Spacing */}
              <div className="text-center" style={{ maxWidth: '70%', margin: '0 auto', fontSize: '1.2rem', lineHeight: '1.8', color: '#ffffff' }}>
                <p className="lead mb-5" style={{ fontWeight: '400' }}>
                  Step into the future of decentralized tech. This NFT is exclusive. Fetched directly from the SUI node. The object ID? Found from the browser URL.
                  Here it is, see it: {objectId}
                </p>
                <p className="mb-5" style={{ fontWeight: '300' }}>
                  The content? Straight from the object fields. It gave us the Walrus image blob ID. Seamlessly retrieved through the Walrus aggregator. Now restored, as the image you see here.
                </p>
                <p className="mb-5" style={{ fontWeight: '300' }}>
                  In a matter of seconds, Walrus delivers your NFT content. Use our NFT generator for your collections. Enjoy fast, secure, and decentralized access!
                </p>
              </div>
            </>

          }
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider >
  );
}

function Section({ title, files, handleFileInput, toggleUploadArea, uploadAreaId }) {
  return (
    <div className="mb-4">
      <div className="d-flex justify-content-between align-items-center">
        <h3>{title}</h3>
        <button type="button" className="btn btn-secondary" onClick={toggleUploadArea}>
          Add Files
        </button>
      </div>
      <div className="mt-3 drop-zone" id={uploadAreaId} style={{ display: 'none' }}>
        <p>Upload files or drag and drop</p>
        <input type="file" multiple onChange={handleFileInput} style={{ display: 'none' }} />
        <button type="button" className="btn btn-outline-light" onClick={() => document.getElementById(uploadAreaId).querySelector('input').click()}>
          Upload files
        </button>
      </div>
      <div className="row mt-3">
        {files.map((file, index) => (
          <div key={index} className="col-md-4 mb-3">
            <div className="card bg-dark text-white border-secondary">
              <img src={URL.createObjectURL(file)} className="card-img-top" alt={file.name} />
              <div className="card-body d-flex justify-content-between align-items-center">
                <h5 className="card-title mb-0">{file.name.split('.')[0]}</h5>
                <input type="number" className="form-control bg-dark text-white border-secondary" defaultValue={1} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
