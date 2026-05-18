const VECTOR_SIZE = 96;

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

function hashToken(token: string): number {
  let hash = 0;
  for (let index = 0; index < token.length; index += 1) {
    hash = (hash * 31 + token.charCodeAt(index)) >>> 0;
  }
  return hash % VECTOR_SIZE;
}

export class EmbeddingService {
  embed(text: string): number[] {
    const vector = Array.from({ length: VECTOR_SIZE }, () => 0);
    const tokens = tokenize(text);

    for (const token of tokens) {
      vector[hashToken(token)] += 1;
    }

    const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
    return magnitude > 0 ? vector.map((value) => value / magnitude) : vector;
  }
}

export function keywordTokens(text: string): Set<string> {
  return new Set(tokenize(text));
}

