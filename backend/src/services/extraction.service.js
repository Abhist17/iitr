function extractAadhaarData(text) {
    if (!text) return { name: null, dob: null, gender: null, aadhaar_number: null };

    const aadhaarRegex = /\b\d{4}\s\d{4}\s\d{4}\b/;
    const genderRegex = /\b(MALE|FEMALE|Male|Female)\b/;

    const dobPatterns = [
        /DOB[:\s]*(\d{2}[\/\.\-]\d{2}[\/\.\-]\d{4})/i,
        /\b(\d{2}[\/\.\-]\d{2}[\/\.\-]\d{4})\b/,
    ];

    const aadhaar = text.match(aadhaarRegex);
    const gender = text.match(genderRegex);

    // DOB extraction
    let dobValue = null;
    for (const pattern of dobPatterns) {
        const match = text.match(pattern);
        if (match) { dobValue = match[1] || match[0]; break; }
    }
    if (!dobValue) {
        const dobLine = text.split("\n").find(l => /DOB/i.test(l));
        if (dobLine) {
            const digits = dobLine.replace(/[^\d]/g, "");
            if (digits.length >= 8) {
                dobValue = `${digits.slice(0,2)}/${digits.slice(2,4)}/${digits.slice(4,8)}`;
            }
        }
    }

    const skipWords = [
        "government", "india", "aadhaar", "male", "female",
        "dob", "vid", "download", "issue", "date", "of"
    ];

    const lines = text.split("\n");
    let extractedName = null;
    let bestScore = 0;

    for (let line of lines) {
        line = line.trim();

        // Strip DOB portion if present — handles "Tahzeer DOB: 05/06/1997"
        let cleanLine = line.replace(/DOB[:\s]*[\d\/\.\-]+/gi, "").trim();
        if (cleanLine.length < 2) continue;

        const englishChars = (cleanLine.match(/[A-Za-z\s]/g) || []).length;
        const ratio = cleanLine.length > 0 ? englishChars / cleanLine.length : 0;

        if (ratio < 0.85) continue;
        if (cleanLine.length < 2 || cleanLine.length > 60) continue;
        if (aadhaarRegex.test(cleanLine)) continue;
        if (/^\d+$/.test(cleanLine)) continue;
        if (/^[A-Z\d\s]{1,4}$/.test(cleanLine)) continue; // skip short garbled like "HRT TTT" "VID" "L"

        const lower = cleanLine.toLowerCase();
        if (skipWords.some(w => lower.includes(w))) continue;

        const words = cleanLine.split(/\s+/).filter(w => w.length > 1);
        const capitalizedWords = words.filter(w => /^[A-Z][a-z]{1,}$/.test(w));
        const score = capitalizedWords.length * 3 + words.length + (ratio * 5);

        if (score > bestScore) {
            bestScore = score;
            extractedName = cleanLine;
        }
    }

    return {
        name: extractedName || null,
        dob: dobValue || null,
        gender: gender ? gender[0] : null,
        aadhaar_number: aadhaar ? aadhaar[0] : null
    };
}

module.exports = { extractAadhaarData };