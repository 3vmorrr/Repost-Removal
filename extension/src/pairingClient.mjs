const ERROR_KEYS = {
  invalid_code: 'pairingInvalid',
  expired_code: 'pairingExpired',
  account_inactive: 'pairingApproval',
  already_used: 'pairingUsed',
};

export class PairingError extends Error {
  constructor(key) {
    super(key);
    this.name = 'PairingError';
    this.key = key;
  }
}

export async function readPairingResponse(response) {
  let result;
  try {
    result = await response.json();
  } catch {
    throw new PairingError('workerError');
  }

  if (!response.ok || !result?.ok || typeof result.token !== 'string' || !/^[a-f0-9]{64}$/i.test(result.token)) {
    const key = ERROR_KEYS[result?.errorCode] ?? 'workerError';
    throw new PairingError(key);
  }

  return { token: result.token, dailyLimit: Number(result.dailyLimit ?? 1000) };
}
