#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case "write":
    writeFile(args[1], args[2]);
    break;

  case "read":
    readFile(args[1]);
    break;

  case "append":
    appendFile(args[1], args[2]);
    break;

  case "copy":
    copyFile(args[1], args[2]);
    break;

  case "delete":
    deleteFile(args[1]);
    break;

  case "list":
    listDirectory(args[1] || ".");
    break;

  default:
    showHelp();
}

/* ---------- FUNCTIONS ---------- */

function writeFile(filename, content) {
  fs.writeFileSync(filename, content);
  console.log(`✅ File "${filename}" written successfully`);
}

function readFile(filename) {
  if (!fs.existsSync(filename)) {
    console.log("❌ File not found");
    return;
  }
  const data = fs.readFileSync(filename, "utf8");
  console.log("📄 File Content:\n", data);
}

function appendFile(filename, content) {
  fs.appendFileSync(filename, content);
  console.log(`✅ Content appended to "${filename}"`);
}

function copyFile(source, destination) {
  fs.copyFileSync(source, destination);
  console.log(`✅ File copied from "${source}" to "${destination}"`);
}

function deleteFile(filename) {
  fs.unlinkSync(filename);
  console.log(`🗑️ File "${filename}" deleted`);
}

function listDirectory(dirPath) {
  const files = fs.readdirSync(dirPath);
  console.log(`📂 Contents of "${dirPath}":`);
  files.forEach(file => console.log(" -", file));
}

function showHelp() {
  console.log(`
📌 File Manager Commands:

node fileManager.js write <file> <content>
node fileManager.js read <file>
node fileManager.js append <file> <content>
node fileManager.js copy <source> <destination>
node fileManager.js delete <file>
node fileManager.js list [directory]
`);
}
