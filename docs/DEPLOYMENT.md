# Ghost.js Deployment Guide 🚀
> **How to launch Ghost.js on GitHub and NPM.**

Ghost.js is a modern monorepo. Follow these steps to share it with the world!

## 1. Publish to GitHub
1. **Initialize Git**:
   ```bash
   git init
   git add .
   git commit -m "First phantom release: Ghost.js 1.0"
   ```
2. **Push to Remote**:
   Create a new repo on GitHub and run:
   ```bash
   git remote add origin https://github.com/yourusername/project-ghost.git
   git branch -M main
   git push -u origin main
   ```

## 2. Publish to NPM (The "Packagist" for JS)
Ghost is a monorepo, so you should publish each package individually or use a tool like `Lerna`. To publish manually:

1. **Login to NPM**:
   ```bash
   npm login
   ```
2. **Publish each Pillar**:
   ```bash
   # In each folder: packages/core, packages/paradigms, etc.
   npm publish --access public
   ```

## 3. GitHub Pages (For Demos)
To host your `demo-app` on GitHub Pages:
1. Run `ghost build` inside `demo-app`.
2. Push the `demo-app` to its own repo or a branch.
3. Enable "GitHub Pages" in repo settings and point it to the `/root` or `/dist` folder.

## 4. PHP / Packagist Note
If you are integrating Ghost with a PHP/Laravel project:
1. Include the Ghost bundle in your `resources/js/app.js`.
2. Ghost's **HTTP Pillar** (XML/JSON support) makes it perfect for communicating with Laravel/Symfony controllers.

## 5. Recent CLI Release Note
The `ghost make:events` bundle now supports `--with-notifications`, which scaffolds notification event helpers, notification jobs, notification listeners, and the notification listener bootstrap alongside the existing auth and CRUD bundle options.

---
You are now ready to launch! 👻🚀
