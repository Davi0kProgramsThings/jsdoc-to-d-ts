#!/usr/bin/env node

import fs from "fs";
import path from "path";

import fg from "fast-glob";
import { Command } from "commander";
import { readTSConfig } from "pkg-types";

import { transpile } from "../index.ts";

function toTypeScriptExtension(file: string): string {
    const extension = path.extname(file)

    return file.slice(0, file.length - extension.length) + ".d.ts";
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

async function transpileProject(_path?: string): Promise<void> {
    const config = await readTSConfig(_path);

    const include = config.include ?? ["**/*"];

    const exclude = config.exclude ?? ["node_modules", ".git"];

    const paths = await fg(include, {
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
            if (config.compilerOptions.outDir) {
                const root = process.cwd();
                const sourceRoot = path.resolve(root, config.compilerOptions?.rootDir ?? ".");
                const target = path.join(root, config.compilerOptions.outDir, path.relative(sourceRoot, filename));

                fs.mkdirSync(path.dirname(target), { recursive: true });

                fs.writeFileSync(target, output);
            } else {
                fs.writeFileSync(filename, output);
            }
        }
    }
}

function exitWithError(message: string): void {
    console.error(message);

    process.exit(1);
}

const program = new Command();

program.name("jsdoc-to-d-ts")
  .description("lightweight transpiler to convert javascript with jsdoc to typescript's .d.ts files")
  .version("1.0.0", "-v, --version")
  .helpOption("-h, --help");

program
  .argument("[file]", "transpile a single file")
  .option("-p, --project [config]", "the path of the tsconfig.json file of the project to transpile")
  .action(async (file: string, options: { project?: string }) => {
    if (file) {
        transpileFile(file);
    } else {
        await transpileProject(options.project);
    }
  });

program.parse();
