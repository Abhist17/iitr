import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image_base64, application_id, name, dob, district } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const prompt = `You are an expert at reading Indian government identity documents.

Analyze this document image and:

1. Identify document type: aadhaar, pan, domicile, income_certificate, driving_licence, or unknown

2. Extract all visible fields

3. Fix image quality issues in your reading — handle tilted text, blur, OCR errors (0 vs O, 1 vs I, @ vs a)

Return ONLY valid JSON, no markdown, no explanation:
{
  "doc_type": "aadhaar",
  "name": "full english name or null",
  "dob": "DD/MM/YYYY or null",
  "gender": "MALE or FEMALE or null",
  "aadhaar_number": "1234 5678 9012 or null",
  "pan_number": "ABCDE1234F or null",
  "address": "full address or null",
  "pincode": "6 digit pincode or null",
  "district": "district name or null",
  "state": "state name or null",
  "father_name": "father name or null",
  "issue_date": "DD/MM/YYYY or null",
  "issuing_authority": "name or null",
  "annual_income": "amount or null",
  "confidence": "high or medium or low"
}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${image_base64}`,
                },
              },
              {
                type: "text",
                text: prompt,
              },
            ],
          },
        ],
        max_tokens: 1000,
        temperature: 0.1,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits in workspace settings." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      throw new Error(`AI gateway returned ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const rawText = aiData.choices[0].message.content.trim();
    const cleaned = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
    const extracted = JSON.parse(cleaned);

    const validation = {
      name_match:
        extracted.name !== null &&
        extracted.name.toLowerCase().trim() === name.toLowerCase().trim(),
      dob_match: extracted.dob !== null && extracted.dob === dob,
      district_match:
        (extracted.district !== null &&
          extracted.district.toLowerCase().includes(district.toLowerCase())) ||
        (extracted.address !== null &&
          extracted.address.toLowerCase().includes(district.toLowerCase())),
    };

    const passedCount = Object.values(validation).filter(Boolean).length;
    const verificationScore = Math.round((passedCount / 3) * 100);
    const isVerified = verificationScore >= 66;

    return new Response(
      JSON.stringify({
        application_id,
        doc_type: extracted.doc_type,
        extracted_fields: extracted,
        validation,
        verification_score: verificationScore,
        is_verified: isVerified,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (err) {
    console.error("verify-document error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
