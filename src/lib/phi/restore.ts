import type { Finding } from "./types";

const TOKEN =
  /\[(?:NAME|DATE OF BIRTH|MRN|INSURANCE ID|ADDRESS|PHONE|SSN|EMAIL|DIAGNOSIS|MEDICATION)\]/g;

export interface RestoredReply {
  text: string;
  restored: number;
  unmatched: number;
}

export function restoreReply(reply: string, findings: Finding[]): RestoredReply {
  const queues = new Map<string, string[]>();
  for (const finding of [...findings].sort((a, b) => a.start - b.start)) {
    const list = queues.get(finding.replacement) ?? [];
    list.push(finding.text);
    queues.set(finding.replacement, list);
  }
  let restored = 0;
  let unmatched = 0;
  const text = reply.replace(TOKEN, (token) => {
    const next = queues.get(token)?.shift();
    if (!next) {
      unmatched += 1;
      return token;
    }
    restored += 1;
    return next;
  });
  return { text, restored, unmatched };
}
