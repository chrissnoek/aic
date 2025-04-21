# aic – AI Commit Messages

> Generate meaningful git commit messages using OpenAI and your staged diff.

![npm version](https://img.shields.io/npm/v/aic)
![node version](https://img.shields.io/node/v/aic)
![license](https://img.shields.io/npm/l/aic)

---

## ✨ Features

- 💬 Uses OpenAI (GPT-3.5) to generate concise, present-tense commit messages
- 🧠 Detects and prefixes commit messages with a conventional commit type:
  - `feat`: new feature
  - `fix`: bug fix
  - `docs`: documentation changes
  - `style`: formatting only (no logic)
  - `refactor`: code refactoring (no behavior change)
  - `test`: adding or modifying tests
  - `chore`: tooling or maintenance

---

## 🚀 Installation

Install globally via npm:

```bash
npm install -g aic
```

---

## ⚙️ Setup

Before using `aic`, you must set your OpenAI API key:

1. Create a `.env` file in the root of your project (or set an environment variable globally).

```
OPENAI_API_KEY=your-openai-api-key-here
```

Make sure this file is **excluded from version control**.

---

## 🧪 Usage

```bash
aic
```

After running the command:

- `aic` checks for staged changes (`git diff --cached`).
- It sends the diff to OpenAI.
- It shows you a suggested commit message.
- You confirm with `y` or reject it.

### Example Output

```bash
✅ Suggested commit message:

fix: handle null input in user validator

🤖 Do you want to use this commit message? (y/N):
```

---

## 🛠️ How It Works

- Diff is extracted using `git diff --cached`
- Prompt is created and sent to the OpenAI Chat API
- AI categorizes and rewrites the commit message
- You approve or cancel
- Final commit is created with `git commit -m` if confirmed

---

## 🔒 Security Note

Your code diff is **not stored** anywhere. It is sent to OpenAI's API for the sole purpose of generating a commit message.

Make sure **not to commit secrets** or sensitive data to your staging area before using this tool.

---
