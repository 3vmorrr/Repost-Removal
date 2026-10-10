export interface Repost {
  id: string; creator: string; description: string; thumbnail: string; url: string;
  selected: boolean; status: 'pending' | 'removing' | 'removed' | 'failed' | 'remaining'; error: string;
  scan_page?: number;
}
export interface Overview {
  items: Repost[]; state: string; progress: OperationProgress; theme: 'light' | 'dark'; language: 'en' | 'ar';
  session: { status: 'unknown' | 'checking' | 'logged-out' | 'logged-in'; handle: string | null; stableId: string | null };
  browserVisible: boolean; version: string;
}

export interface OperationProgress {
  kind: 'idle' | 'scan' | 'remove';
  phase: 'idle' | 'running' | 'verifying' | 'complete' | 'stopped' | 'error';
  pagesScanned: number;
  found: number;
  processed: number;
  total: number;
  requested: number;
  failed: number;
  verificationPage: number;
  verificationTotal: number;
  startedAt: number | null;
  finishedAt: number | null;
}
