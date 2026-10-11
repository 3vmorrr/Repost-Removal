export class PairingError extends Error { key: string; }
export function readPairingResponse(response: Response): Promise<{ token: string; dailyLimit: number }>;
