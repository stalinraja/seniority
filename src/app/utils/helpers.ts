export function searchCandidatesGeneric(candidates: any[], query: string): any[] {
  if (!query.trim()) return candidates;

  const tokens = query
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return candidates.filter((candidate) => {
    const qualificationParts = String(candidate.qualification || "")
      .split("-")
      .map((part) => part.trim().toLowerCase())
      .filter(Boolean);

    const tetText =
      candidate.tetCompletion === null || candidate.tetCompletion === undefined
        ? ""
        : String(candidate.tetCompletion);

    const haystack = [
      candidate.name,
      candidate.memberId,
      candidate.council,
      candidate.pastorate,
      candidate.diocese,
      candidate.institution,
      candidate.department,
      candidate.category,
      candidate.level,
      candidate.homePastorate,
      candidate.yearsOfExperience,
      candidate.qualification,
      candidate.email,
      candidate.pincode,
      tetText,
      ...qualificationParts,
    ]
      .map((v) => String(v || "").toLowerCase())
      .join(" ");

    return tokens.every((token) => haystack.includes(token));
  });
}
