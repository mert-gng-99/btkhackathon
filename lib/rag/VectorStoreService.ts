import { EmbeddingService, keywordTokens } from "@/lib/rag/EmbeddingService";
import type { RagChunk } from "@/types";

function cosine(a: number[], b: number[]): number {
  let score = 0;
  for (let index = 0; index < Math.min(a.length, b.length); index += 1) {
    score += a[index] * b[index];
  }
  return score;
}

function keywordScore(question: string, chunk: string): number {
  const query = keywordTokens(question);
  const target = keywordTokens(chunk);
  let overlap = 0;

  for (const token of query) {
    if (target.has(token)) {
      overlap += 1;
    }
  }

  return query.size > 0 ? overlap / query.size : 0;
}

export class VectorStoreService {
  constructor(private readonly embeddings = new EmbeddingService()) {}

  index(chunks: RagChunk[]): RagChunk[] {
    return chunks.map((chunk) => ({
      ...chunk,
      embedding: chunk.embedding ?? this.embeddings.embed(chunk.content)
    }));
  }

  retrieve(question: string, chunks: RagChunk[], limit = 6): RagChunk[] {
    const queryEmbedding = this.embeddings.embed(question);

    return chunks
      .map((chunk) => {
        const embedding = chunk.embedding ?? this.embeddings.embed(chunk.content);
        return {
          chunk: { ...chunk, embedding },
          score: cosine(queryEmbedding, embedding) + keywordScore(question, chunk.content) * 0.8
        };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((item) => item.chunk);
  }
}

