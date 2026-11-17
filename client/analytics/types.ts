export interface RollupRunInfo {
  bucket: string;
  status: string;
  rows_written: number;
  finished_at: number;
  error?: string | null;
}

export interface HourBucketData {
  bucket: string;
  metrics: Record<string, number>;
}

export interface CreatorAggregate {
  creatorId: string;
  turns: number;
  tokensIn: number;
  tokensOut: number;
  costSatangEstimate: number;
}

export interface AdminOverviewPayload {
  scope: 'admin';
  source: string;
  generatedAt: number;
  meta: {
    costBasis: string;
    revenuePerCreator: string;
    traffic: string;
    freshness: string;
    lastRun: RollupRunInfo | null;
  };
  hours: HourBucketData[];
  lifetime: Record<string, number>;
  creators: CreatorAggregate[];
}

export interface CreatorViewPayload {
  scope: 'creator';
  source: string;
  generatedAt: number;
  creators: string[];
  meta: {
    money: string;
    costBasis: string;
  };
  hours: HourBucketData[];
}

export type AuthState =
  | { status: 'loading' }
  | { status: 'admin'; data: AdminOverviewPayload }
  | { status: 'creator'; data: CreatorViewPayload }
  | { status: 'player'; message?: string }
  | { status: 'unauthorized'; message?: string }
  | { status: 'disabled'; message?: string }
  | { status: 'error'; message: string };
