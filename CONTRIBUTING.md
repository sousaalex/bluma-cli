# Contributing to BluMa CLI

First, thank you for wanting to improve BluMa CLI!
Here are some guidelines to speed up your workflow and keep the project healthy.

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

1. **Fork the repository** and create a branch for your feature/fix (`feature/feature-name` or `fix/short-desc`)
2. Set up and run locally (see [Local Setup Tips](#local-setup-tips))
3. Test your changes in different environments and platforms if possible
4. Write tests and documentation for any significant additions
5. Open the PR against the main branch

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