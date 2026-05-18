export function redactSecret(value: string): string {
  if (!value) {
    return "";
  }

  if (value.length <= 8) {
    return "[REDACTED]";
  }

  return `${value.slice(0, 4)}...[REDACTED]...${value.slice(-4)}`;
}

export function safeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message.replace(/[A-Za-z0-9_=-]{24,}/g, "[REDACTED]");
  }

  return "Unexpected error";
}

