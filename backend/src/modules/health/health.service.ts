export interface DependencyChecks {
  database: () => Promise<unknown>;
  redis: () => Promise<unknown>;
}

type DependencyName = keyof DependencyChecks;

interface CheckResult {
  status: 'up' | 'down';
}

async function withTimeout(check: () => Promise<unknown>, timeoutMs: number): Promise<void> {
  let timeout: NodeJS.Timeout | undefined;

  try {
    await Promise.race([
      check(),
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => reject(new Error('Dependency check timed out')), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function checkReadiness(
  checks: DependencyChecks,
  timeoutMs: number,
): Promise<{ ready: boolean; checks: Record<DependencyName, CheckResult> }> {
  const entries = await Promise.all(
    (Object.entries(checks) as [DependencyName, () => Promise<unknown>][]).map(
      async ([name, check]) => {
        try {
          await withTimeout(check, timeoutMs);
          return [name, { status: 'up' }] as const;
        } catch {
          return [name, { status: 'down' }] as const;
        }
      },
    ),
  );
  const results = Object.fromEntries(entries) as Record<DependencyName, CheckResult>;

  return {
    ready: Object.values(results).every((result) => result.status === 'up'),
    checks: results,
  };
}
