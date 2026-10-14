// src/services/validation.service.js
const fuzz = require("fuzzball");

function normalizeText(text) {
  if (!text) return "";
  return text.toLowerCase().trim().replace(/\s+/g, " ");
}

function fuzzyMatch(str1, str2) {
  if (!str1 || !str2) return 0;
  const score = fuzz.ratio(normalizeText(str1), normalizeText(str2));
  return score / 100; // return 0–1
}

function validateDocuments(aadhaarData, applicationData) {
  const results = {};
  const THRESHOLD = 0.80;

  // Name validation
  if (aadhaarData.name && applicationData.name) {
    const nameScore = fuzzyMatch(aadhaarData.name, applicationData.name);
    results.name = {
      aadhaar_value: aadhaarData.name,
      application_value: applicationData.name,
      score: nameScore,
      passed: nameScore >= THRESHOLD,
    };
  }

  // DOB validation (exact match after normalization)
  if (aadhaarData.dob && applicationData.dob) {
    const dobScore = fuzzyMatch(aadhaarData.dob, applicationData.dob);
    results.dob = {
      aadhaar_value: aadhaarData.dob,
      application_value: applicationData.dob,
      score: dobScore,
      passed: dobScore >= 0.95,
    };
  }

  // Gender validation
  if (aadhaarData.gender && applicationData.gender) {
    const genderMatch =
      normalizeText(aadhaarData.gender) === normalizeText(applicationData.gender);
    results.gender = {
      aadhaar_value: aadhaarData.gender,
      application_value: applicationData.gender,
      score: genderMatch ? 1.0 : 0.0,
      passed: genderMatch,
    };
  }

  // Overall confidence
  const scores = Object.values(results).map((r) => r.score);
  const overallScore = scores.length
    ? scores.reduce((a, b) => a + b, 0) / scores.length
    : 0;

  const allPassed = Object.values(results).every((r) => r.passed);

  return {
    fields: results,
    overall_score: parseFloat(overallScore.toFixed(4)),
    all_passed: allPassed,
    status: allPassed ? "VERIFIED" : "MISMATCH_DETECTED",
  };
}

module.exports = { validateDocuments };