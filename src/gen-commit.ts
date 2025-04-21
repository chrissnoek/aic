import { execSync } from 'child_process';
import axios, { AxiosError } from 'axios';
import * as readline from 'readline';
import * as dotenv from 'dotenv';
import { encode } from 'gpt-tokenizer';

interface GitDiff {
  content: string;
  isEmpty: boolean;
}

interface CommitMessage {
  content: string;
}

interface OpenAIConfig {
  apiKey: string;
  model: string;
  temperature: number;
  maxContextLength: number;
}

class GitCommitGenerator {
  private readonly openaiConfig: OpenAIConfig;
  private readonly promptTemplate: string;

  constructor() {
    dotenv.config();
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error("❌ OPENAI_API_KEY is not set. Please export it in your shell config.");
    }

    this.openaiConfig = {
      apiKey,
      model: 'gpt-3.5-turbo',
      temperature: 0.3,
      maxContextLength: 16385, // GPT-3.5-turbo's context length
    };

    this.promptTemplate = `
      You are a developer writing a conventional commit message for the following staged Git diff.
      Pick **one** of these commit types based on the changes:

      - feat: (new feature for the user)
      - fix: (bug fix for the user)
      - docs: (documentation only)
      - style: (code formatting, no production logic change)
      - refactor: (code refactor, no new feature or bug fix)
      - test: (test-only changes)
      - chore: (tooling or non-functional changes)

      Write a **single-line** commit message in **present tense**, starting with the appropriate prefix and a colon. Do not include any explanation or bullet points.

      Git diff:
      `;
  }

  private getStagedDiff(): GitDiff {
    try {
      const content = execSync('git diff --cached', { encoding: 'utf-8' });
      return {
        content,
        isEmpty: !content.trim(),
      };
    } catch (error) {
      throw new Error(`❌ Failed to get git diff: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private checkContextLength(diff: string): void {
    const promptTokens = encode(this.promptTemplate).length;
    const diffTokens = encode(diff).length;
    const totalTokens = promptTokens + diffTokens;

    if (totalTokens > this.openaiConfig.maxContextLength) {
      throw new Error(
        `❌ The staged changes are too large for the model to process.\n` +
        `- Total tokens: ${totalTokens}\n` +
        `- Maximum allowed: ${this.openaiConfig.maxContextLength}\n` +
        `- Diff tokens: ${diffTokens}\n\n` +
        `Please try committing your changes in smaller chunks.`
      );
    }
  }

  private async generateCommitMessage(diff: string): Promise<CommitMessage> {
    this.checkContextLength(diff);
    const prompt = this.promptTemplate + diff;

    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: this.openaiConfig.model,
          messages: [{ role: 'user', content: prompt }],
          temperature: this.openaiConfig.temperature,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.openaiConfig.apiKey}`,
          },
        }
      );

      return {
        content: response.data.choices[0].message.content.trim(),
      };
    } catch (error) {
      if (error instanceof AxiosError) {
        if (error.response?.status === 400 && error.response?.data?.error?.code === 'context_length_exceeded') {
          throw new Error(
            `❌ The staged changes are too large for the model to process.\n` +
            `Please try committing your changes in smaller chunks.`
          );
        }
        console.log(error.response?.data);
        throw new Error(`❌ Error generating commit message: ${error.response?.data || error.message}`);
      }
      throw new Error(`❌ Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async promptUser(): Promise<boolean> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise((resolve) => {
      rl.question('\n🤖 Do you want to use this commit message? (y/N): ', (answer) => {
        rl.close();
        resolve(answer.toLowerCase() === 'y');
      });
    });
  }

  private commitChanges(message: string): void {
    try {
      execSync(`git commit -m "${message.replace(/"/g, '\\"')}"`, { stdio: 'inherit' });
    } catch (error) {
      throw new Error(`❌ Failed to commit: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async run(): Promise<void> {
    try {
      const diff = this.getStagedDiff();
      
      if (diff.isEmpty) {
        console.log('⚠️ No staged changes found. Stage some files first.');
        return;
      }

      const commitMessage = await this.generateCommitMessage(diff.content);
      console.log('\n✅ Suggested commit message:\n');
      console.log(commitMessage.content);

      const shouldCommit = await this.promptUser();
      
      if (shouldCommit) {
        this.commitChanges(commitMessage.content);
      } else {
        console.log('🛑 Commit cancelled.');
      }
    } catch (error) {
      console.error(error instanceof Error ? error.message : 'An unexpected error occurred');
      process.exit(1);
    }
  }
}

// Run the generator
new GitCommitGenerator().run().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
