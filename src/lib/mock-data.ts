export interface SearchResult {
  answer: string;
  sources: { page: number; filename: string }[];
  confidence: "high" | "partial";
  responseTime: number;
}

export interface ChatEntry {
  id: string;
  query: string;
  result: SearchResult;
  timestamp: Date;
}

const mockAnswers: Record<string, SearchResult> = {
  default: {
    answer:
      "Based on the company's HR policy document, the travel reimbursement policy states that employees are eligible for reimbursement of reasonable travel expenses incurred during business trips. This includes airfare (economy class), hotel accommodations (up to $200/night), meals (up to $75/day), and ground transportation. All expenses must be submitted within 30 days of travel completion with proper receipts attached.",
    sources: [
      { page: 12, filename: "HR_Policy.pdf" },
      { page: 45, filename: "Employee_Handbook.pdf" },
      { page: 3, filename: "Travel_Guidelines.pdf" },
    ],
    confidence: "high",
    responseTime: 1.8,
  },
  vacation: {
    answer:
      "According to the employee handbook, full-time employees accrue 15 days of paid vacation annually during their first 3 years. After 3 years, this increases to 20 days, and after 7 years, employees receive 25 days. Unused vacation days can be carried over up to a maximum of 5 days into the next calendar year.",
    sources: [
      { page: 8, filename: "Employee_Handbook.pdf" },
      { page: 22, filename: "Benefits_Overview.pdf" },
    ],
    confidence: "high",
    responseTime: 1.2,
  },
  security: {
    answer:
      "The IT security policy requires all employees to use multi-factor authentication for accessing company systems. Passwords must be at least 12 characters long and changed every 90 days. Remote access requires VPN connection, and all company devices must have endpoint protection software installed.",
    sources: [
      { page: 5, filename: "IT_Security_Policy.pdf" },
      { page: 15, filename: "Remote_Work_Guidelines.pdf" },
    ],
    confidence: "partial",
    responseTime: 2.1,
  },
};

export function getSearchResult(query: string): SearchResult {
  const q = query.toLowerCase();
  if (q.includes("vacation") || q.includes("time off") || q.includes("pto")) {
    return mockAnswers.vacation;
  }
  if (q.includes("security") || q.includes("password") || q.includes("vpn")) {
    return mockAnswers.security;
  }
  return mockAnswers.default;
}