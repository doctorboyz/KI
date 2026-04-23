import { hostExec } from "../../../../sdk";
import { cmdWake, fetchIssuePrompt } from "../../shared/wake";

function parseIssueUrl(url: string): { org: string; repo: string; issueNum: number } {
  const m = url.match(/github\.com[:/]([^/]+)\/([^/]+)\/issues\/(\d+)/);
  if (!m) throw new Error(`Invalid issue URL: ${url}\nExpected: https://github.com/org/repo/issues/N`);
  return { org: m[1], repo: m[2], issueNum: parseInt(m[3]) };
}

async function detectCurrentKappa(): Promise<string | null> {
  if (!process.env.TMUX) return null;
  try {
    const windowName = (await hostExec("tmux display-message -p '#{window_name}'")).trim();
    // Window name pattern: <kappa>-kappa or <kappa>-<task>
    const m = windowName.match(/^([^-]+)-/);
    return m ? m[1] : null;
  } catch { return null; }
}

export async function cmdAssign(issueUrl: string, opts: { kappa?: string }): Promise<void> {
  const { org, repo, issueNum } = parseIssueUrl(issueUrl);
  const slug = `${org}/${repo}`;

  // Detect kappa from current window if not specified
  let kappa = opts.kappa;
  if (!kappa) {
    kappa = await detectCurrentKappa() ?? undefined;
  }
  if (!kappa) {
    throw new Error("could not detect kappa — pass --kappa <name>");
  }

  console.log(`\x1b[36m⚡\x1b[0m fetching issue #${issueNum} from ${slug}...`);
  const prompt = await fetchIssuePrompt(issueNum, slug);

  await cmdWake(kappa, {
    incubate: slug,
    task: `issue-${issueNum}`,
    prompt,
  });
}
