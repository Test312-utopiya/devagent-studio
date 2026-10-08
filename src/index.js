#!/usr/bin/env node
"use strict";

const { program } = require("commander");
const chalk = require("chalk");
const ora = require("ora");
const Anthropic = require("@anthropic-ai/sdk");
const fs = require("fs");
const path = require("path");
const { glob } = require("glob");
require("dotenv").config();

// ─── Logo ────────────────────────────────────────────────────────────────────
const logo = `
${chalk.hex("#6366F1").bold("  ██████╗ ███████╗██╗   ██╗ █████╗  ██████╗ ███████╗███╗   ██╗████████╗")}
${chalk.hex("#818CF8").bold(" ██╔══██╗██╔════╝██║   ██║██╔══██╗██╔════╝ ██╔════╝████╗  ██║╚══██╔══╝")}
${chalk.hex("#A855F7").bold(" ██║  ██║█████╗  ██║   ██║███████║██║  ███╗█████╗  ██╔██╗ ██║   ██║   ")}
${chalk.hex("#C084FC").bold(" ██║  ██║██╔══╝  ╚██╗ ██╔╝██╔══██║██║   ██║██╔══╝  ██║╚██╗██║   ██║   ")}
${chalk.hex("#6366F1").bold(" ██████╔╝███████╗ ╚████╔╝ ██║  ██║╚██████╔╝███████╗██║ ╚████║   ██║   ")}
${chalk.gray("  ╚═════╝ ╚══════╝  ╚═══╝  ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═══╝   ╚═╝   ")}
${chalk.gray("                        STUDIO  ")}${chalk.hex("#6366F1")("v0.4.2")}  ${chalk.gray("— Powered by Claude 3.5 Sonnet")}
`;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getApiKey() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    console.error(chalk.red("\n  ✖ ANTHROPIC_API_KEY is not set."));
    console.log(chalk.gray("  Run: export ANTHROPIC_API_KEY=your-key-here\n"));
    process.exit(1);
  }
  return key;
}

async function readRepoFiles(dir, maxFiles = 30) {
  const patterns = ["**/*.js", "**/*.ts", "**/*.py", "**/*.go", "**/*.md"];
  const ignore = ["**/node_modules/**", "**/.git/**", "**/dist/**", "**/build/**"];
  let files = [];
  for (const pattern of patterns) {
    const matches = await glob(pattern, { cwd: dir, ignore, absolute: true });
    files = [...files, ...matches];
    if (files.length >= maxFiles) break;
  }
  files = files.slice(0, maxFiles);

  let context = "";
  for (const f of files) {
    const rel = path.relative(dir, f);
    const content = fs.readFileSync(f, "utf8").slice(0, 2000);
    context += `\n\n--- FILE: ${rel} ---\n${content}`;
  }
  return { context, count: files.length };
}

// ─── Claude Client ────────────────────────────────────────────────────────────
async function askClaude(prompt, systemPrompt) {
  const client = new Anthropic({ apiKey: getApiKey() });
  const response = await client.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 4096,
    system: systemPrompt || "You are DevAgent Studio, an expert autonomous software engineering AI.",
    messages: [{ role: "user", content: prompt }],
  });
  return response.content[0].text;
}

// ─── Commands ─────────────────────────────────────────────────────────────────
program.name("devagent").description(chalk.bold("DevAgent Studio CLI — AI-powered developer agent")).version("0.4.2");

// ── init ──
program
  .command("init")
  .description("Initialize DevAgent in the current repository")
  .action(() => {
    console.log(logo);
    const config = {
      version: "0.4.2",
      model: "claude-3-5-sonnet-20241022",
      maxFiles: 30,
      testCommand: "npm test",
      outputDir: ".devagent",
    };
    fs.writeFileSync(".devagent.json", JSON.stringify(config, null, 2));
    console.log(chalk.green("  ✔ Initialized DevAgent Studio in this repository."));
    console.log(chalk.gray("  Config written to .devagent.json\n"));
    console.log(chalk.cyan("  Next: Set your Claude API key:"));
    console.log(chalk.white("  export ANTHROPIC_API_KEY=your-key-here\n"));
  });

// ── run ──
program
  .command("run")
  .description("Run an autonomous coding task using Claude")
  .requiredOption("-t, --task <task>", "The coding task to perform")
  .option("-d, --dir <dir>", "Target directory", process.cwd())
  .action(async (opts) => {
    console.log(logo);
    const spinner = ora({ text: chalk.cyan("Indexing repository AST tree..."), color: "magenta" }).start();

    try {
      const { context, count } = await readRepoFiles(opts.dir);
      spinner.succeed(chalk.green(`Indexed ${count} files`));

      const taskSpinner = ora({ text: chalk.cyan("Claude 3.5 Sonnet is reasoning..."), color: "magenta" }).start();

      const result = await askClaude(
        `Repository context:\n${context}\n\nTask: ${opts.task}\n\nProvide a detailed implementation plan and the exact code changes needed.`,
        "You are DevAgent Studio, an expert autonomous software engineering AI. Analyze the repository context and provide precise, actionable code changes to complete the requested task. Format your response with clear sections: ANALYSIS, CHANGES NEEDED, and CODE."
      );

      taskSpinner.succeed(chalk.green("Claude 3.5 Sonnet response ready"));
      console.log("\n" + chalk.hex("#6366F1").bold("━".repeat(60)));
      console.log(chalk.bold.white("  DEVAGENT OUTPUT"));
      console.log(chalk.hex("#6366F1").bold("━".repeat(60)));
      console.log("\n" + result + "\n");
    } catch (e) {
      spinner.fail(chalk.red("Error: " + e.message));
    }
  });

// ── review ──
program
  .command("review")
  .description("AI code review of recent git changes using Claude")
  .option("-d, --dir <dir>", "Target directory", process.cwd())
  .action(async (opts) => {
    console.log(logo);
    const spinner = ora({ text: chalk.cyan("Reading git diff..."), color: "magenta" }).start();

    try {
      const { execSync } = require("child_process");
      let diff;
      try {
        diff = execSync("git diff HEAD~1 HEAD", { cwd: opts.dir }).toString();
        if (!diff) diff = execSync("git diff --staged", { cwd: opts.dir }).toString();
      } catch {
        diff = execSync("git show HEAD", { cwd: opts.dir }).toString();
      }

      if (!diff.trim()) {
        spinner.fail(chalk.yellow("No git diff found. Make a commit or stage some changes first."));
        return;
      }

      spinner.succeed(chalk.green("Git diff captured"));
      const reviewSpinner = ora({ text: chalk.cyan("Claude is reviewing your code..."), color: "magenta" }).start();

      const result = await askClaude(
        `Please review the following git diff and provide:\n1. Security issues\n2. Performance concerns\n3. Code quality suggestions\n4. Missing edge cases\n\nGit diff:\n${diff.slice(0, 8000)}`,
        "You are a senior software engineer conducting a thorough code review. Be specific, constructive, and highlight both issues and positive aspects. Format with clear emoji-prefixed sections."
      );

      reviewSpinner.succeed(chalk.green("Code review complete"));
      console.log("\n" + chalk.hex("#6366F1").bold("━".repeat(60)));
      console.log(chalk.bold.white("  AI CODE REVIEW REPORT"));
      console.log(chalk.hex("#6366F1").bold("━".repeat(60)));
      console.log("\n" + result + "\n");
    } catch (e) {
      spinner.fail(chalk.red("Error: " + e.message));
    }
  });

// ── ask ──
program
  .command("ask")
  .description("Ask a natural language question about your codebase")
  .argument("<question>", "Your question about the codebase")
  .option("-d, --dir <dir>", "Target directory", process.cwd())
  .action(async (question, opts) => {
    console.log(logo);
    const spinner = ora({ text: chalk.cyan("Scanning codebase for context..."), color: "magenta" }).start();

    try {
      const { context, count } = await readRepoFiles(opts.dir);
      spinner.succeed(chalk.green(`Scanned ${count} files`));

      const answerSpinner = ora({ text: chalk.cyan("Claude is analyzing..."), color: "magenta" }).start();

      const result = await askClaude(
        `Repository files:\n${context}\n\nDeveloper question: ${question}`,
        "You are an expert software engineer with deep knowledge of this codebase. Answer questions about the code clearly and specifically, referencing actual files and functions where relevant."
      );

      answerSpinner.succeed(chalk.green("Answer ready"));
      console.log("\n" + chalk.hex("#6366F1").bold("━".repeat(60)));
      console.log(chalk.bold.white(`  Q: ${question}`));
      console.log(chalk.hex("#6366F1").bold("━".repeat(60)));
      console.log("\n" + result + "\n");
    } catch (e) {
      spinner.fail(chalk.red("Error: " + e.message));
    }
  });

// ── pr-desc ──
program
  .command("pr-desc")
  .description("Generate a pull request title and description from your git diff")
  .option("-d, --dir <dir>", "Target directory", process.cwd())
  .action(async (opts) => {
    console.log(logo);
    const spinner = ora({ text: chalk.cyan("Reading changes..."), color: "magenta" }).start();

    try {
      const { execSync } = require("child_process");
      const diff = execSync("git diff HEAD~1 HEAD --stat && git diff HEAD~1 HEAD", { cwd: opts.dir }).toString();

      spinner.succeed(chalk.green("Changes captured"));
      const genSpinner = ora({ text: chalk.cyan("Claude is writing your PR description..."), color: "magenta" }).start();

      const result = await askClaude(
        `Based on this git diff, generate:\n1. A concise PR title (with conventional commit prefix)\n2. A markdown PR description with: Summary, Changes, Testing\n\nDiff:\n${diff.slice(0, 8000)}`,
        "You are a senior developer writing clear, informative GitHub pull request descriptions. Be professional and thorough."
      );

      genSpinner.succeed(chalk.green("PR description generated"));
      console.log("\n" + chalk.hex("#6366F1").bold("━".repeat(60)));
      console.log(chalk.bold.white("  PULL REQUEST DESCRIPTION"));
      console.log(chalk.hex("#6366F1").bold("━".repeat(60)));
      console.log("\n" + result + "\n");
    } catch (e) {
      spinner.fail(chalk.red("Error: " + e.message));
    }
  });

// ── scan ──
program
  .command("scan")
  .description("Scan dependencies for security vulnerabilities using Claude")
  .option("-d, --dir <dir>", "Target directory", process.cwd())
  .action(async (opts) => {
    console.log(logo);
    const spinner = ora({ text: chalk.cyan("Reading dependency manifests..."), color: "magenta" }).start();

    try {
      let deps = "";
      for (const file of ["package.json", "requirements.txt", "Gemfile", "go.mod", "Cargo.toml"]) {
        const fp = path.join(opts.dir, file);
        if (fs.existsSync(fp)) deps += `\n--- ${file} ---\n${fs.readFileSync(fp, "utf8")}`;
      }

      if (!deps) {
        spinner.fail(chalk.yellow("No dependency files found (package.json, requirements.txt, etc.)"));
        return;
      }

      spinner.succeed(chalk.green("Dependency files found"));
      const scanSpinner = ora({ text: chalk.cyan("Claude is scanning for vulnerabilities..."), color: "magenta" }).start();

      const result = await askClaude(
        `Scan these dependency files for known security issues, outdated packages, and risky dependencies. Suggest specific version upgrades.\n\n${deps}`,
        "You are a security engineer specializing in software supply chain vulnerabilities. Identify real risks and provide actionable remediation steps. Use severity labels (CRITICAL/HIGH/MEDIUM/LOW)."
      );

      scanSpinner.succeed(chalk.green("Security scan complete"));
      console.log("\n" + chalk.hex("#6366F1").bold("━".repeat(60)));
      console.log(chalk.bold.white("  DEPENDENCY SECURITY SCAN"));
      console.log(chalk.hex("#6366F1").bold("━".repeat(60)));
      console.log("\n" + result + "\n");
    } catch (e) {
      spinner.fail(chalk.red("Error: " + e.message));
    }
  });

program.parse(process.argv);
