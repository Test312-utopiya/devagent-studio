# DevAgent Studio — Next-Gen Autonomous AI Coding Agent

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-v0.4.2-indigo.svg)]()
[![Powered By](https://img.shields.io/badge/LLM-Claude_3.5_Sonnet-purple.svg)](https://anthropic.com)

**DevAgent Studio** is an open-source autonomous software engineering platform powered by Claude 3.5 APIs. It connects directly to your local codebase to automate multi-file refactoring, code reviews, unit test generation, and pull request creation.

---

## ⚡ Core Features

- **🧠 Deep AST Context Parsing:** Lightweight tree-sitter indexing parses cross-module dependencies to feed ultra-focused context into Claude 3.5 Sonnet.
- **⚡ Self-Healing Test Loops:** Executes test commands locally and feeds error tracebacks back to Claude until code passes CI checks.
- **🛡️ Local-First & Privacy Preserving:** Code remains strictly on your machine; only anonymized diff payloads are processed via official Anthropic Claude API endpoints.
- **🔄 Automated GitHub PRs:** Generates clean git branches, commits changes, and opens Pull Requests automatically.

---

## 🚀 Quick Start

### 1. Installation
Install the DevAgent CLI globally via `npm`:

```bash
npm install -g @devagent-studio/cli
```

### 2. Configure API Key
Export your Anthropic Claude Console API Key:

```bash
export ANTHROPIC_API_KEY="sk-ant-api03-..."
```

### 3. Initialize & Run
Navigate to your repository and launch a task:

```bash
# Initialize configuration
devagent init

# Execute autonomous task
devagent run --task "Implement OAuth2 JWT refresh logic in src/auth"
```

---

## 🏗️ Architecture Overview

```
 ┌─────────────────┐       ┌──────────────────────┐       ┌──────────────────┐
 │ Local Codebase  │ ───►  │ AST Tree-Sitter      │ ───►  │ Context Compiler │
 └─────────────────┘       └──────────────────────┘       └────────┬─────────┘
                                                                   │
                                                                   ▼
 ┌─────────────────┐       ┌──────────────────────┐       ┌──────────────────┐
 │ Git PR Creator  │ ◄───  │ Local Test Runner    │ ◄───  │ Claude 3.5 API   │
 └─────────────────┘       └──────────────────────┘       └──────────────────┘
```

---

## 📑 Application Pitch Statement (For Claude for Startups)

> **DevAgent Studio** is an open-source AI developer tool building a hosted cloud platform for autonomous code maintenance. Our platform leverages Claude 3.5 Sonnet APIs to index complex codebase trees, generate multi-file code modifications, and execute self-healing continuous integration loops.

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for details.
