#!/usr/bin/env node

import fs from "fs";
import path from "path";

import fg from "fast-glob";
import { Command } from "commander";
import { parseJSONC } from "confbox";
import { resolveTSConfig } from "pkg-types";

import type { TSConfig } from "pkg-types";

import { transpile } from "../index.ts";

function toTypeScriptExtension(file: string): string {
    const extension = path.extname(file)

    return file.slice(0, file.length - extension.length) + (extension == ".mjs" ? ".d.mts" : ".d.ts");
}

function transpileFile(file: string): void {
    if (!fs.existsSync(file)) {
       exitWithError(`No file found with path: ${file}`);
    }

    const content = fs.readFileSync(file, "utf-8");

    const filename = toTypeScriptExtension(file)

    const output = transpile(content);

    fs.writeFileSync(filename, output);
}

function getTSConfigPath(project: string): string {
    const resolved = path.resolve(project);

    const file = fs.existsSync(resolved) && fs.statSync(resolved).isDirectory() ? path.join(resolved, "tsconfig.json") : resolved;

    if (!fs.existsSync(file)) {
        exitWithError(`No tsconfig.json file found with path: ${project}`);
    }

    return file;
}

async function transpileProject(project?: string | boolean): Promise<void> {
    const file = typeof project == "string"
        ? getTSConfigPath(project)
        : await resolveTSConfig().catch(() => exitWithError("No tsconfig.json file found in the current directory or in its parents."));

    const config = parseJSONC<TSConfig>(fs.readFileSync(file, "utf-8"));

    const root = path.dirname(file);

    const include = config.include ?? ["**/*"];

    const exclude = config.exclude ?? ["node_modules", ".git"];

    const paths = await fg(include, {
        cwd: root,
        ignore: exclude,
        absolute: true,
        onlyFiles: true
    });

    const files = paths.filter(_path => /\.(js|mjs)$/.test(_path));

    for (const file of files) {
        const content = fs.readFileSync(file, "utf-8");

        const filename = toTypeScriptExtension(file)

        const output = transpile(content);

        if (output.split("\n").length > 2) {
            if (config.compilerOptions?.outDir) {
                const sourceRoot = path.resolve(root, config.compilerOptions.rootDir ?? ".");
                const target = path.join(path.resolve(root, config.compilerOptions.outDir), path.relative(sourceRoot, filename));

                fs.mkdirSync(path.dirname(target), { recursive: true });

                fs.writeFileSync(target, output);
            } else {
                fs.writeFileSync(filename, output);
            }
        }
    }
}

function exitWithError(message: string): never {
    console.error(message);

    process.exit(1);
}

const { version: VERSION } = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, "../../package.json"), "utf-8"));

const program = new Command();

program.name("jsdoc-to-d-ts")
  .description("lightweight transpiler to convert javascript with jsdoc to typescript's .d.ts files")
  .version(VERSION, "-v, --version")
  .helpOption("-h, --help");

program
  .argument("[file]", "transpile a single file")
  .option("-p, --project [config]", "the path of the tsconfig.json file of the project to transpile")
  .action(async (file: string, options: { project?: string | boolean }) => {
    if (file) {
        transpileFile(file);
    } else {
        await transpileProject(options.project);
    }
  });

program.parse();
