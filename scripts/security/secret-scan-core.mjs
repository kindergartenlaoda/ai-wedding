import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, existsSync, appendFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";

const RULES = [
  {
    id: "private-key",
    title: "私钥/证书",
    regex: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----|-----BEGIN CERTIFICATE-----/,
  },
  {
    id: "openai-api-key",
    title: "OpenAI / API Key (sk-*)",
    regex: /\bsk-(?:proj-)?[A-Za-z0-9_-]{10,}\b/,
  },
  {
    id: "aws-access-key",
    title: "AWS Access Key",
    regex: /\bAKIA[0-9A-Z]{16}\b/,
  },
  {
    id: "aliyun-ak",
    title: "阿里云 AccessKey ID",
    regex: /\bLTAI[0-9A-Za-z]{14,}\b/,
  },
  {
    id: "db-password",
    title: "数据库密码",
    regex: /(?:postgres|mysql|mongodb)(?:\+[a-z]+)?:\/\/[^:]+:[^@\s]+@/i,
  },
  {
    id: "connection-string-secret",
    title: "连接串中的密码",
    regex: /(?:DATABASE_URL|DB_URL|REDIS_URL|MONGO_URI)\s*[:=]\s*['"][^'"\n]{20,}['"]/i,
  },
  {
    id: "github-token",
    title: "GitHub Token",
    regex: /\bgh[pousr]_[A-Za-z0-9]{20,}\b/,
  },
  {
    id: "slack-token",
    title: "Slack Token",
    regex: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/,
  },
  {
    id: "cookie-secret",
    title: "Cookie / Session",
    regex: /(?:cookie|session|sessionid)\s*[:=]\s*['"][^'"\n]{20,}['"]/i,
  },
  {
    id: "jwt-token",
    title: "JWT Token",
    regex: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/,
  },
  {
    id: "token-id",
    title: "Token ID / 内部 Token",
    regex: /\btokenId\s*[:=]\s*['"]?[a-fA-F0-9]{8,}['"]?/i,
  },
  {
    id: "generic-secret-assignment",
    title: "硬编码密钥",
    regex: /\b(api[_-]?key|secret|token|password|passwd|access[_-]?key|secret[_-]?key)\b\s*[:=]\s*['"][^'"\n]{8,}['"]/i,
  },
];

const PLACEHOLDER_PATTERNS = [
  /\byour[-_ ]?(random|secret|token|key)\b/i,
  /\bexample\b/i,
  /\bplaceholder\b/i,
  /\bchangeme\b/i,
  /\bdummy\b/i,
];

function runGit(args) {
  return execFileSync("git", args, { encoding: "utf8" });
}

export function getGitDir() {
  return runGit(["rev-parse", "--git-dir"]).trim();
}

export function sha256(input) {
  return createHash("sha256").update(input).digest("hex");
}

function shouldIgnoreLine(line) {
  const trimmed = line.trim();
  if (!trimmed) {
    return true;
  }
  if (trimmed.startsWith("//") || trimmed.startsWith("#")) {
    return true;
  }
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function parseAddedLinesFromDiff(diffText) {
  const results = [];
  const lines = diffText.split("\n");
  let currentFile = "";
  let nextNewLineNumber = 0;

  for (const line of lines) {
    if (line.startsWith("diff --git ")) {
      currentFile = "";
      nextNewLineNumber = 0;
      continue;
    }

    if (line.startsWith("+++ b/")) {
      currentFile = line.slice(6);
      continue;
    }

    if (line.startsWith("@@")) {
      const match = line.match(/\+(\d+)(?:,(\d+))?/);
      nextNewLineNumber = match ? Number.parseInt(match[1], 10) : 0;
      continue;
    }

    if (!currentFile) {
      continue;
    }

    if (line.startsWith("+") && !line.startsWith("+++")) {
      results.push({
        filePath: currentFile,
        lineNumber: nextNewLineNumber,
        content: line.slice(1),
      });
      nextNewLineNumber += 1;
      continue;
    }

    if (line.startsWith(" ") || line === "") {
      if (nextNewLineNumber > 0) {
        nextNewLineNumber += 1;
      }
      continue;
    }
  }

  return results;
}

function detectInLine(filePath, lineNumber, content) {
  if (shouldIgnoreLine(content)) {
    return [];
  }

  const findings = [];
  for (const rule of RULES) {
    if (rule.regex.test(content)) {
      findings.push({
        ruleId: rule.id,
        ruleTitle: rule.title,
        filePath,
        lineNumber,
        snippet: content.trim().slice(0, 180),
      });
    }
  }
  return findings;
}

export function scanDiffText(diffText) {
  const addedLines = parseAddedLinesFromDiff(diffText);
  const findings = [];

  for (const line of addedLines) {
    findings.push(...detectInLine(line.filePath, line.lineNumber, line.content));
  }

  return findings;
}

export function scanFileContent(filePath, content) {
  const lines = content.split("\n");
  const findings = [];
  for (let i = 0; i < lines.length; i++) {
    findings.push(...detectInLine(filePath, i + 1, lines[i]));
  }
  return findings;
}

export function getStagedDiff() {
  return runGit(["diff", "--cached", "--no-color", "-U0"]);
}

export function getRangeDiff(range) {
  return runGit(["diff", "--no-color", "-U0", range]);
}

export function getFingerprintFromDiff(diffText) {
  return sha256(diffText);
}

export function ensureDir(path) {
  mkdirSync(path, { recursive: true });
}

export function writeJson(path, data) {
  ensureDir(dirname(path));
  writeFileSync(path, JSON.stringify(data, null, 2), "utf8");
}

export function readJson(path) {
  if (!existsSync(path)) {
    return null;
  }
  return JSON.parse(readFileSync(path, "utf8"));
}

export function appendJsonl(path, data) {
  ensureDir(dirname(path));
  appendFileSync(path, `${JSON.stringify(data)}\n`, "utf8");
}

export function removeFile(path) {
  if (existsSync(path)) {
    rmSync(path, { force: true });
  }
}

export function getRiskPaths() {
  const gitDir = getGitDir();
  const riskDir = join(gitDir, "secret-risk");
  return {
    gitDir,
    riskDir,
    pendingPath: join(riskDir, "pending.json"),
    overridePath: join(riskDir, "override.json"),
    auditPath: join(riskDir, "audit.log"),
  };
}

export function nowIso() {
  return new Date().toISOString();
}

export function currentUser() {
  return process.env.GIT_AUTHOR_NAME || process.env.USER || "unknown";
}

export function printFindings(findings) {
  for (const finding of findings) {
    const line = finding.lineNumber > 0 ? `:${finding.lineNumber}` : "";
    console.error(` - [${finding.ruleId}] ${finding.filePath}${line}`);
    console.error(`   ${finding.snippet}`);
  }
}
