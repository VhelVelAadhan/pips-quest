// Builds the claude.ai Artifact version of the game into ./artifact/pips-quest.html.
// The Artifact host wraps the page in its own <html>/<head>/<body>, so this page has no doctype or
// wrapper tags, inlines the CSS, and loads js/*.js published alongside it.
// Republish (from a Claude Code session): publish artifact/pips-quest.html to
//   https://claude.ai/artifact/Gj1qZPeJfVkeNoiiU8km8B
// with files: js/audio.js, js/sprites.js, js/levels.js, js/entities.js, js/game.js (from this repo).
// Usage: node tools/build-artifact.js
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'css', 'game.css'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const body = html.slice(html.indexOf('<body>') + 6, html.indexOf('</body>')).trim().replace(/\?v=\d+/g, '');

const page = `<title>Pip's Quest</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="theme-color" content="#000000">
<style>
${css}</style>
${body}
`;
fs.mkdirSync(path.join(root, 'artifact'), { recursive: true });
fs.writeFileSync(path.join(root, 'artifact', 'pips-quest.html'), page);
console.log('Built artifact/pips-quest.html (' + page.length + ' bytes)');
