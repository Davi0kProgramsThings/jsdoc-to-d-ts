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

    const output = transpile(content);

    fs.writeFileSync(toTypeScriptExtension(file), output);
}

async function transpileProject(path?: string): Promise<void> {
    const config = await readTSConfig(path);

    const include = config.include ?? ["**/*"];

    const exclude = config.exclude ?? ["node_modules", ".git"];

    const paths = await fg(include, {
        ignore: exclude,
        absolute: true,
        onlyFiles: true
    });

    const files = paths.filter(path => /\.(js|mjs)$/.test(path));

    for (const file of files) {
        const content = fs.readFileSync(file, "utf-8");

        const output = transpile(content);

        if (output.split("\n").length > 2) {
            fs.writeFileSync(toTypeScriptExtension(file), output);
        }
    }
}

function exitWithError(message: string): void {
    console.error(message);

    process.exit(1);
}

const program = new Command();

program.name("jsdoc-to-d-ts")
  .description("Blazing fast transpiler from JavaScript with JSDoc to TypeScript's type definitions")
  .version("1.0.0", "-v, --version", "Outputs the version number")
  .helpOption("-h, --help", "Displays help for command");

program
  .argument("[file]", "Transpiles a single file")
  .option("-p, --project [config]", "The path of the tsconfig.json file of the project to transpile")
  .action(async (file: string, options: { project?: string }) => {
    if (file) {
        transpileFile(file);
    } else {
        await transpileProject(options.project);
    }
  });

program.parse();
