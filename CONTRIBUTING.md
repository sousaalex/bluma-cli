# Contributing to BluMa CLI

First, thank you for wanting to improve BluMa CLI! Your contributions are critical to keeping the project growing and improving. This guide outlines the standards and process to follow so we maintain quality, consistency, and a productive workflow.

## Table of Contents
- [How to contribute](#how-to-contribute)
- [How to open an issue](#how-to-open-an-issue)
- [How to open a Pull Request (PR)](#how-to-open-a-pull-request-pr)
- [Style Guide](#style-guide)
- [Local Setup Tips](#local-setup-tips)
- [Code Review and Merges](#code-review-and-merges)
- [Communication and Etiquette](#communication-and-etiquette)

---

## How to contribute

### 📋 Prerequisites
- **Node.js** >= 18 and **npm** >= 9 installed on your development machine
- Environment variables configured as per [README Configuration section](README.md#configuration-and-environment-variables)
- All dependencies installed (`npm install`)

### 🔄 Workflow
1. **Fork** the repository
2. **Clone** your fork locally
3. Create a branch named according to [Conventional Commits](https://www.conventionalcommits.org/) (e.g., `feat/add-logging`)
4. Make your changes following the [Style Guide](#style-guide)
5. Add or update tests when adding/modifying features
6. Ensure code builds without errors and passes lint checks (`npm run lint`)
7. Push to your fork and open a Pull Request against the `main` branch

## How to open an issue
- Report bugs with as much context, screenshots, steps to reproduce, and your environment as possible
- Suggest features clearly, with usage examples
- Open questions and discussions are welcome; just avoid SPAM

## How to open a Pull Request (PR)
- Pre-requisite: code builds cleanly and without lint errors
- Follow naming conventions and use clean commit messages
- Explain what you fixed/created, referencing issues if applicable
- Prefer "small", focused PRs; avoid huge batches

## Style Guide
- **Use English** for code, technical comments, and commit messages
- Use the project's indentation style (2 spaces)
- Prefer TypeScript and modern React (`react-jsx`), follow the Ink CLI standard
- Don't add new libraries without prior issue/PR discussion or consensus
- Comment on complex sections
- Export functions and components using default/export {} as appropriate

## Local Setup Tips
```bash
npm install
npm run build # or npm start
# Be sure to install global dependencies as detailed in README
```
For collaboration:
- Use the Node.js version recommended in the README
- If your change involves infrastructure/paths, test on Unix and Windows
- See package.json and build.js scripts for helpers and automations

## Code Review and Merges
- All PRs need review by at least one other collaborator (or owner)
- PRs left unreviewed for >5 days may be closed (unless an exception is opened)
- Critical bugs have highest priority
- Never force-push to main/master—use pull requests!

## Communication and Etiquette
- Be respectful, direct, & patient
- Use constructive language in PR/issue discussions
- If disagreeing, propose an alternative with technical justification
- Everyone is welcome to provide input; help review too!

---

BluMa CLI thanks you for your contribution!
For technical questions, open an issue. For critical bugs: email/fast-tag the owner. Break code, evolve, hack—but always thinking as a team!