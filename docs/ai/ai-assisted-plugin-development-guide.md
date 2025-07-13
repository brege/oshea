> ## Draft: [`docs/ai/ai-assisted-plugin-development-guide.md`](ai-assisted-plugin-development-guide.md)

# AI-Assisted Plugin Development: A How-To Guide

This guide explains how to use an AI assistant, like Gemini, Claude, or ChatGPT, to help you create a new plugin for `md-to-pdf`. By providing the AI with a specific "context package," you can get high-quality, relevant code that works within the project's architecture.

The official project repository is available at **https://github.com/brege/md-to-pdf**.

### The Core Idea: The "Minimal Context Package"

Instead of trying to explain the entire `md-to-pdf` project to an AI, we provide it with a concise package containing only the essential information it needs to create a plugin. This package includes:

1. **The Interaction Specification**: The technical rules of the plugin API.
2. **The Plugin Contract**: The required file structure and metadata.
3. **A Base Plugin Example**: The full source code of a simple, working plugin (like `default` or `cv`) to use as a starting point.

A helper script, `[`scripts/ai/ai-context-generator.js`](../../scripts/ai/ai-context-generator.js)`, gathers all this information and combines it into a single text file for you.

---

### Step 1: Generate the Context Package

Run the `[`ai-context-generator.js`](../../scripts/ai/ai-context-generator.js)` script from the project root to create your context package. It's best to use an existing, simple plugin as the base for the AI to modify.

**Command:**

```bash
node scripts/ai/ai-context-generator.js --plugin default --filename ai-context.txt
```

**Explanation:**

  * `--plugin default`: This tells the script to use the bundled `default` plugin as the code example. You could also use `--plugin cv` if you wanted to create a variation of the CV plugin.
  * `--filename ai-context.txt`: This saves the entire package into a single file named `ai-context.txt`.

You now have a complete, self-contained brief for the AI in one file.

---

### Step 2: Prepare and Use the Master Prompt

The "Master Prompt" is a template you will use to instruct the AI. It is structured so that you can write your specific request first, then paste the large context package at the end.

**How to Use:**

1. **Start a new chat** with your AI assistant.
2. **Copy the Master Prompt Template** from below into the chat window.
3. **Fill in your specific goal** in the `My Request` section at the top.
4. **Open `ai-context.txt`**, copy its entire contents, and paste it into the `[ PASTE THE ENTIRE CONTENTS OF ai-context.txt HERE ]` section at the bottom.
5. **Send the prompt.**

**Master Prompt Template:**

```markdown
You are an expert Node.js developer who specializes in creating plugins for the `md-to-pdf` command-line tool. Your task is to help me create a new plugin based on my request below.

You must follow these rules:
1. You will use the **Technical Context** provided at the end of this prompt as your sole source of information about the `md-to-pdf` architecture.
2. You will help me by providing the complete, updated file contents for the new plugin files.
3. Our workflow is as follows: I will use the `md-to-pdf` tool to scaffold the plugin files, then you will provide the code to modify them, and finally I will test your code and provide feedback.

---
### My Request:

**[BRIEFLY DESCRIBE YOUR GOAL HERE. For example: "I need to create a plugin for generating simple meeting minutes. It should have fields for attendees, agenda, and action items."]**

---
### Technical Context & Rules:

[ PASTE THE ENTIRE CONTENTS OF `ai-context.txt` HERE ]
```
