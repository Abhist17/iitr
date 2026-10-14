// src/services/blockchain.service.js
const { ethers } = require("ethers");
const crypto = require("crypto");
const fs = require("fs");

const CONTRACT_ABI = [
  "function submitDocument(string applicationId, string ipfsCid, bytes32 documentHash, uint256 confidenceScore) external",
  "function verifyDocument(string applicationId, bool approved, string rejectionReason) external",
  "function getRecord(string applicationId) external view returns (tuple(string applicationId, string ipfsCid, bytes32 documentHash, uint256 confidenceScore, uint8 status, address submittedBy, address verifiedBy, uint256 submittedAt, uint256 verifiedAt, string rejectionReason))",
  "event DocumentSubmitted(string applicationId, string ipfsCid, uint256 timestamp)",
  "event DocumentVerified(string applicationId, uint8 status, address officer, uint256 timestamp)"
];

function getProvider() {
  // Polygon Mumbai testnet (or use Amoy for newer)
  return new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL);
}

function getContract(withSigner = false) {
  const provider = getProvider();
  if (withSigner) {
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    return new ethers.Contract(process.env.CONTRACT_ADDRESS, CONTRACT_ABI, wallet);
  }
  return new ethers.Contract(process.env.CONTRACT_ADDRESS, CONTRACT_ABI, provider);
}

function hashFile(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  return "0x" + crypto.createHash("sha256").update(fileBuffer).digest("hex");
}

async function submitDocumentToBlockchain({ applicationId, ipfsCid, filePath, confidenceScore }) {
  try {
    const contract = getContract(true);
    const documentHash = hashFile(filePath);
    const scoreInt = Math.round(confidenceScore * 100); // 0.93 → 93

    console.log("Submitting to blockchain...");
    const tx = await contract.submitDocument(
      applicationId,
      ipfsCid,
      documentHash,
      scoreInt
    );

    console.log("TX sent:", tx.hash);
    const receipt = await tx.wait();
    console.log("TX confirmed in block:", receipt.blockNumber);

    return {
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      documentHash,
    };
  } catch (error) {
    console.error("Blockchain submission error:", error.message);
    throw new Error("Blockchain submission failed: " + error.message);
  }
}

async function getDocumentRecord(applicationId) {
  try {
    const contract = getContract(false);
    const record = await contract.getRecord(applicationId);
    return {
      applicationId: record.applicationId,
      ipfsCid: record.ipfsCid,
      confidenceScore: Number(record.confidenceScore) / 100,
      status: ["Pending", "Approved", "Rejected"][Number(record.status)],
      submittedAt: new Date(Number(record.submittedAt) * 1000).toISOString(),
      verifiedAt: record.verifiedAt > 0
        ? new Date(Number(record.verifiedAt) * 1000).toISOString()
        : null,
    };
  } catch (error) {
    console.error("Blockchain fetch error:", error.message);
    throw new Error("Blockchain fetch failed: " + error.message);
  }
}

module.exports = { submitDocumentToBlockchain, getDocumentRecord, hashFile };