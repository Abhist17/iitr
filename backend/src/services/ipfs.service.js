// src/services/ipfs.service.js
const axios = require("axios");
const fs = require("fs");
const FormData = require("form-data");
const path = require("path");

const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_SECRET = process.env.PINATA_SECRET_API_KEY;

async function uploadToIPFS(filePath, metadata = {}) {
  try {
    const formData = new FormData();
    formData.append("file", fs.createReadStream(filePath));

    const pinataMetadata = JSON.stringify({
      name: path.basename(filePath),
      keyvalues: metadata,
    });
    formData.append("pinataMetadata", pinataMetadata);

    const pinataOptions = JSON.stringify({ cidVersion: 0 });
    formData.append("pinataOptions", pinataOptions);

    const response = await axios.post(
      "https://api.pinata.cloud/pinning/pinFileToIPFS",
      formData,
      {
        maxBodyLength: Infinity,
        headers: {
          ...formData.getHeaders(),
          pinata_api_key: PINATA_API_KEY,
          pinata_secret_api_key: PINATA_SECRET,
        },
      }
    );

    console.log("IPFS Upload success. CID:", response.data.IpfsHash);
    return {
      cid: response.data.IpfsHash,
      ipfsUrl: `https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`,
      size: response.data.PinSize,
    };
  } catch (error) {
    console.error("IPFS Upload Error:", error.message);
    throw new Error("IPFS upload failed: " + error.message);
  }
}

async function uploadJSONToIPFS(jsonData, name = "verification_record") {
  try {
    const response = await axios.post(
      "https://api.pinata.cloud/pinning/pinJSONToIPFS",
      {
        pinataContent: jsonData,
        pinataMetadata: { name },
      },
      {
        headers: {
          "Content-Type": "application/json",
          pinata_api_key: PINATA_API_KEY,
          pinata_secret_api_key: PINATA_SECRET,
        },
      }
    );

    console.log("JSON pinned to IPFS. CID:", response.data.IpfsHash);
    return {
      cid: response.data.IpfsHash,
      ipfsUrl: `https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`,
    };
  } catch (error) {
    console.error("IPFS JSON Upload Error:", error.message);
    throw new Error("IPFS JSON upload failed: " + error.message);
  }
}

module.exports = { uploadToIPFS, uploadJSONToIPFS };