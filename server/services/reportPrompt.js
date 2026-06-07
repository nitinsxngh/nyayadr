export const buildReportPrompt = (transcript, parties, refNumber, date, language = 'English') => `
Generate a settlement report based on the following mediation session.

Parties:
${JSON.stringify(parties, null, 2)}

Transcript:
${JSON.stringify(transcript, null, 2)}

Reference Number: ${refNumber}
Date: ${date}

${language === 'Hindi' ? "CRITICAL INSTRUCTION: You MUST translate all generated content (values) into Hindi language (हिंदी). However, the JSON structure and JSON keys MUST remain exactly as specified in English." : "Ensure the response is in English."}

In addition to summarizing the dispute, you MUST suggest the best way forward for the parties to help them settle outside the court, based on the following frameworks where relevant:
- Legal Services Authorities Act, 1987 (full + simplified version)
- Lok Adalat Rules (State-specific – Uttar Pradesh)
- NALSA Regulations
- Relevant provisions from: CPC (Order XXIII – compromise of suits), CrPC (compoundable offences), Motor Vehicles Act (MACT settlements), NI Act (Section 138 cheque bounce)
- General guidance from: NALSA official website, Uttar Pradesh State Legal Services Authority (UPSLSA), District Legal Services Authority (Ghaziabad), eCourts portal, National Judicial Data Grid (NJDG)

You should provide the best case scenario to help them resolve the matter amicably, but explicitly state that whether or not the parties want to accept it is entirely up to them.

The output must be a valid JSON object exactly matching this structure, with no extra text or markdown code blocks:
{
  "caseDetails": {
    "refNo": "${refNumber}",
    "policeStation": "Ghaziabad",
    "natureOfDispute": "Neighborhood Dispute / Civil Matter",
    "modeOfResolution": "Police-Assisted AI-Powered Alternative Dispute Resolution (ADR)",
    "date": "${date}",
    "venue": "Police Station / Mediation Room, Ghaziabad"
  },
  "parties": [
    {
      "role": "Claimant",
      "name": "Party Name",
      "address": "Party Address",
      "disputeRole": "Aggrieved Party"
    }
  ],
  "background": "Detailed summary of the dispute background.",
  "issues": ["Issue 1", "Issue 2"],
  "proceedingsSummary": "Summary of the mediation proceedings.",
  "settlementTerms": [
    {
      "title": "Term Title",
      "content": "Details of the term."
    }
  ],
  "withdrawalStatement": "Standard withdrawal statement.",
  "legalEffect": "Standard legal effect statement.",
  "recommendedWayForward": {
    "summary": "The best case scenario and recommended steps for an out-of-court settlement.",
    "applicableLaws": [
      {
        "act": "Name of the Act/Regulation",
        "relevance": "How this specific act/provision applies to their settlement."
      }
    ],
    "disclaimer": "This is an AI-generated advisory to help you understand the best way forward. Accepting this settlement is entirely voluntary and left to the discretion of the parties."
  }
}
`;

export const parseReportJson = (text) => {
  const clean = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  return JSON.parse(clean);
};
