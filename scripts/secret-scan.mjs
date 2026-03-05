#!/usr/bin/env node
/**
 * 敏感信息扫描脚本
 *
 * 用法:
 *   pnpm run secret-scan           # 扫描待提交变更（已暂存 + 未暂存）
 *   pnpm run secret-scan -- --staged # 仅扫描已暂存
 *   pnpm run secret-scan:all       # 扫描全部已跟踪文件
 */

import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import {
  scanDiffText,
  scanFileContent,
  getStagedDiff,
  getRangeDiff,
  printFindings,
} from "./security/secret-scan-core.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const IGNORE_FILES = new Set([
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  ".env.example",
]);

function runGit(args) {
  return execFileSync("git", args, { encoding: "utf8", cwd: ROOT });
}

function getStagedFiles() {
  try {
    return runGit(["diff", "--cached", "--name-only"]).trim().split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

function getTrackedFiles() {
  try {
    return runGit(["ls-files"]).trim().split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

function scanStaged() {
  const diff = getStagedDiff();
  if (!diff.trim()) return [];
  return scanDiffText(diff);
}

/** 扫描已暂存 + 未暂存的修改（待提交的全部变更） */
function scanPending() {
  const diff = getRangeDiff("HEAD");
  if (!diff.trim()) return [];
  return scanDiffText(diff);
}

function scanAll() {
  const files = getTrackedFiles();
  const findings = [];
  for (const rel of files) {
    const base = basename(rel);
    if (IGNORE_FILES.has(base)) continue;
    const abs = join(ROOT, rel);
    if (!existsSync(abs)) continue;
    try {
      const content = readFileSync(abs, "utf8");
      findings.push(...scanFileContent(rel, content));
    } catch {
      // 二进制等跳过
    }
  }
  return findings;
}

const useAll = process.argv.includes("--all");
const stagedOnly = process.argv.includes("--staged");
const findings = useAll
  ? scanAll()
  : stagedOnly
    ? scanStaged()
    : scanPending();

if (findings.length === 0) {
  const msg = useAll
    ? "✓ 全部已跟踪文件未发现敏感信息"
    : stagedOnly
      ? "✓ 暂存区未发现敏感信息"
      : "✓ 待提交变更未发现敏感信息";
  console.log(msg);
  process.exit(0);
}

console.error("\n⚠ 发现敏感信息，请勿提交：\n");
printFindings(findings);
console.error(`\n共 ${findings.length} 处，建议：\n  1. 使用环境变量 (.env) 存储\n  2. 使用 .gitignore 排除敏感文件\n  3. 删除或替换为占位符\n`);
process.exit(1);
