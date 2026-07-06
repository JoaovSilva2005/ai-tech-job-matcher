let debugEnabled = false;

export function setDebug(enabled: boolean): void {
  debugEnabled = enabled;
}

function timestamp(): string {
  return new Date().toISOString().slice(11, 19);
}

export const logger = {
  info(message: string): void {
    console.log(`[${timestamp()}] INFO  ${message}`);
  },
  warn(message: string): void {
    console.warn(`[${timestamp()}] WARN  ${message}`);
  },
  error(message: string): void {
    console.error(`[${timestamp()}] ERROR ${message}`);
  },
  debug(message: string): void {
    if (debugEnabled) {
      console.log(`[${timestamp()}] DEBUG ${message}`);
    }
  },
  step(step: number, total: number, message: string): void {
    console.log(`[${timestamp()}] [${step}/${total}] ${message}`);
  },
};
