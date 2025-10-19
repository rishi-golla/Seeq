import fs from "fs";
import path from "path";
import { exec } from "child_process";
import util from "util";
import { fileURLToPath } from "url";
import filePathData from "./filePathData.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const execPromise = util.promisify(exec);
const BASE_DIR = path.resolve(__dirname, "../../sandbox"); //Add extra ../ when testing locally

const LOG_DIR = path.join(BASE_DIR, "logs");
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

export function logOperation(operation: string, target?: string) {
  const logFile = path.join(LOG_DIR, "operations.log");
  const timestamp = new Date().toISOString();
  const entry = `[${timestamp}] ${operation}${target ? ` -> ${target}` : ""}\n`;
  fs.appendFileSync(logFile, entry);
}

function resolvePath(inputPath: string): string {
  if (path.isAbsolute(inputPath)) {
    return inputPath;
  }
  if (inputPath.startsWith(BASE_DIR)) {
    return inputPath;
  }
  return path.join(BASE_DIR, inputPath);
}

// ---------- File Operations ---------- //

export function writeFile(filename: string, content: string) {
  const filePath = resolvePath(filename);
  
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFileSync(filePath, content, "utf-8");
  logOperation("WRITE", filePath);
}

export function readFile(filename: string): string {
  const filePath = resolvePath(filename);
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  
  const data = fs.readFileSync(filePath, "utf-8");
  logOperation("READ", filePath);
  return data;
}

export function getAllFilesInDir(dir: string): string[] {
  const dirPath = resolvePath(dir);
  
  if (!fs.existsSync(dirPath)) {
    throw new Error(`Directory not found: ${dirPath}`);
  }
  
  if (!fs.statSync(dirPath).isDirectory()) {
    throw new Error(`Path is not a directory: ${dirPath}`);
  }
  
  const files = fs.readdirSync(dirPath);
  logOperation("LIST_DIR", dirPath);
  return files;
}

export async function deleteFile(filename: string) {
  const filePath = resolvePath(filename);
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  await filePathData.findOneAndDelete({ path: filePath });
  
  fs.unlinkSync(filePath);
  logOperation("DELETE", filePath);
}

export function renameFile(oldName: string, newName: string) {
  const oldPath = resolvePath(oldName);
  const newPath = resolvePath(newName);
  
  if (!fs.existsSync(oldPath)) {
    throw new Error(`Source file not found: ${oldPath}`);
  }
  
  // Ensure destination directory exists
  const destDir = path.dirname(newPath);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  
  fs.renameSync(oldPath, newPath);
  logOperation("RENAME/MOVE", `${oldPath} -> ${newPath}`);
}

export function createDirectory(dirname: string) {
  const dirPath = resolvePath(dirname);
  fs.mkdirSync(dirPath, { recursive: true });
  logOperation("MKDIR", dirPath);
}

//Copy files (Certain opers not safe)
export function copyItem(src: string, dest: string) {
  const srcPath = resolvePath(src);
  let destPath = resolvePath(dest);

  if (!fs.existsSync(srcPath)) {
    throw new Error(`Source not found: ${srcPath}`);
  }

  const srcStats = fs.statSync(srcPath);

  if (fs.existsSync(destPath) && fs.statSync(destPath).isDirectory()) {
    destPath = path.join(destPath, path.basename(srcPath));
  }

  const relative = path.relative(srcPath, destPath);
  if (srcStats.isDirectory() && relative && !relative.startsWith("..") && !path.isAbsolute(relative)) {
    throw new Error("Cannot copy a folder into itself or its subfolder.");
  }

  // Ensure destination directory exists
  const destDir = path.dirname(destPath);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  if (srcStats.isDirectory()) {
    fs.mkdirSync(destPath, { recursive: true });

    const entries = [...fs.readdirSync(srcPath)];
    for (const entry of entries) {
      copyItem(
        path.relative(BASE_DIR, path.join(srcPath, entry)),
        path.relative(BASE_DIR, path.join(destPath, entry))
      );
    }
  } else {
    fs.copyFileSync(srcPath, destPath);
  }

  logOperation("COPY", `${srcPath} -> ${destPath}`);
}

// Properties (metadata) ---WORKING
export function getProperties(target: string) {
  const targetPath = resolvePath(target);
  
  if (!fs.existsSync(targetPath)) {
    throw new Error(`Target not found: ${targetPath}`);
  }
  
  const stats = fs.statSync(targetPath);
  logOperation("PROPERTIES", targetPath);
  return {
    size: stats.size,
    isFile: stats.isFile(),
    isDirectory: stats.isDirectory(),
    created: stats.birthtime,
    modified: stats.mtime,
  };
}

// Search files in sandbox ---WORKING
export function crawlFiles(query: string): string[] {
  const results: string[] = [];

  function searchSubDir(dir: string) {
    const entries = fs.readdirSync(dir);
    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      if (entry.toLowerCase().includes(query.toLowerCase())) {
        results.push(fullPath);
      }
      if (fs.statSync(fullPath).isDirectory()) {
        searchSubDir(fullPath);
      }
    }
  }

  searchSubDir(BASE_DIR);
  logOperation("SEARCH", query);
  return results;
}

// Open with default app (oper dependent) ---WORKING
export async function openWithDefaultApp(target: string) {
  const targetPath = resolvePath(target);
  
  if (!fs.existsSync(targetPath)) {
    throw new Error(`Target not found: ${targetPath}`);
  }
  
  let command = "";

  if (process.platform === "win32") {
    command = `start "" "${targetPath}"`;
  } else if (process.platform === "darwin") {
    command = `open "${targetPath}"`;
  } else {
    command = `xdg-open "${targetPath}"`;
  }

  console.log("open tool called", target);

  await execPromise(command);
  logOperation("OPEN", targetPath);
}

// Build a one-level directory tree starting at dir (relative to BASE_DIR); defaults to sandbox root
export function getOneLevelTree(dir: string) {

  const rootPath = resolvePath(dir);
  console.log(rootPath);

  if (!fs.existsSync(rootPath)) {
    throw new Error(`Directory not found: ${rootPath}`);
  }
  if (!fs.statSync(rootPath).isDirectory()) {
    throw new Error(`Path is not a directory: ${rootPath}`);
  }

  const entries = fs.readdirSync(rootPath);
  const rootFiles: string[] = [];
  const folders: { name: string; files: string[]; folders: string[] }[] = [];

  for (const entry of entries) {
    const entryPath = path.join(rootPath, entry);
    const stats = fs.statSync(entryPath);
    if (stats.isDirectory()) {
      const childEntries = fs.readdirSync(entryPath);
      const childFiles: string[] = [];
      const childFolders: string[] = [];
      for (const child of childEntries) {
        const childPath = path.join(entryPath, child);
        const childStats = fs.statSync(childPath);
        if (childStats.isDirectory()) {
          childFolders.push(child);
        } else if (childStats.isFile()) {
          childFiles.push(child);
        }
      }
      folders.push({ name: entry, files: childFiles, folders: childFolders });
    } else if (stats.isFile()) {
      rootFiles.push(entry);
    }
  }

  const result = {
    name: path.basename(rootPath) || path.basename(BASE_DIR),
    rootFiles,
    folders,
  };

  logOperation("LIST_TREE", rootPath);
  return result;
}