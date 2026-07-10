export class SourceUnavailableError extends Error {
  constructor(
    readonly sourceName: string,
    message: string,
    readonly status?: number
  ) {
    super(message);
  }
}
