import fs from "node:fs/promises";
import path from "node:path";
import ts from "typescript";

const projectRoot = process.cwd();
const srcRoot = path.join(projectRoot, "src");

const EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const out = [];
  for (const ent of entries) {
    const abs = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...(await walk(abs)));
    else if (ent.isFile()) out.push(abs);
  }
  return out;
}

function readTsConfig(tsconfigPath) {
  const configFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
  if (configFile.error) {
    throw new Error(ts.flattenDiagnosticMessageText(configFile.error.messageText, "\n"));
  }
  const parsed = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    projectRoot,
    undefined,
    tsconfigPath,
  );
  if (parsed.errors?.length) {
    const msg = parsed.errors
      .map((e) => ts.flattenDiagnosticMessageText(e.messageText, "\n"))
      .join("\n");
    throw new Error(msg);
  }
  return parsed;
}

async function main() {
  const parsed = readTsConfig(path.join(projectRoot, "tsconfig.json"));

  const all = await walk(srcRoot);
  const files = all
    .filter((p) => EXTENSIONS.has(path.extname(p)))
    .map((p) => path.normalize(p));

  const fileTexts = new Map();
  const fileVersions = new Map();

  for (const f of files) {
    const text = await fs.readFile(f, "utf8");
    fileTexts.set(f, text);
    fileVersions.set(f, 0);
  }

  const servicesHost = {
    getScriptFileNames: () => files,
    getScriptVersion: (fileName) => String(fileVersions.get(path.normalize(fileName)) ?? 0),
    getScriptSnapshot: (fileName) => {
      const normalized = path.normalize(fileName);
      const text = fileTexts.get(normalized);
      if (typeof text !== "string") return undefined;
      return ts.ScriptSnapshot.fromString(text);
    },
    getCurrentDirectory: () => projectRoot,
    getCompilationSettings: () => parsed.options,
    getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
    fileExists: ts.sys.fileExists,
    readFile: ts.sys.readFile,
    readDirectory: ts.sys.readDirectory,
    directoryExists: ts.sys.directoryExists,
    getDirectories: ts.sys.getDirectories,
  };

  const languageService = ts.createLanguageService(servicesHost);
  const formatSettings = ts.getDefaultFormatCodeSettings();

  let changed = 0;
  for (const file of files) {
    const before = fileTexts.get(file);
    const fileChanges = languageService.organizeImports(
      { type: "file", fileName: file },
      formatSettings,
      undefined,
    );
    if (!fileChanges?.length) continue;

    const entry = fileChanges.find((c) => path.normalize(c.fileName) === file);
    const textChanges = entry?.textChanges ?? [];
    if (!textChanges.length) continue;

    const applied = ts.textChanges.applyChanges(before, textChanges);
    if (applied === before) continue;

    changed += 1;
    fileTexts.set(file, applied);
    fileVersions.set(file, (fileVersions.get(file) ?? 0) + 1);
    await fs.writeFile(file, applied, "utf8");
  }

  console.log(`Organized imports in ${changed} file(s).`);
}

main().catch((err) => {
  console.error(err?.message ?? err);
  process.exitCode = 1;
});
