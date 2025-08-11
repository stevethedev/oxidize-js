import { build } from 'esbuild';
import {rm, readFile, writeFile, copyFile} from 'node:fs/promises'
import { join, sep } from "node:path";
import { URL, fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

// Run the build script.
main().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
});

/**
 * The main function for the build script.
 * @returns A promise that resolves when the build is complete.
 */
async function main(): Promise<void> {
    const [cjs, esm] = await Promise.all([ esbuild("cjs"), esbuild("esm")])
    await buildPackageJson({ cjs, esm });
    await copyFile(filePath("README.md"), distPath("README.md"));
    await copyFile(filePath("LICENSE"), distPath("LICENSE"));
    await copyFile(filePath("CHANGELOG.md"), distPath("CHANGELOG.md"));
}

/**
 * Build the project using esbuild.
 * @param format The format to build the project as.
 * @returns A promise that resolves when the build is complete.
 */
async function esbuild(format: "esm" | "cjs"): Promise<string> {
    const outdir = distPath(format);
    const ext = format === "esm" ? "mjs" : "cjs";
    const tsconfig = filePath("tsconfig.json");

    await rm(outdir, { recursive: true, force: true });
    await build({
        entryPoints: [srcPath("**/*.ts")],
        outdir,
        format,
        outExtension: { ".js": `.${ext}` },
        tsconfig,
    });

    spawnSync("tsc", ["--emitDeclarationOnly", "--declaration", "--outDir", outdir, "--project", tsconfig], {
        stdio: "inherit",
        shell: true,
    });
    const outPath = outdir.substring(distPath("").length + 1).split(sep).join("/");
    return `${outPath}/index.${ext}`;
}

/**
 * Build the package.json file.
 * @param cjs The path to the CommonJS build.
 * @param esm The path to the ESM build.
 */
async function buildPackageJson({ cjs, esm }: Record<"cjs" | "esm", string>): Promise<void> {
    const packageJsonString = await readFile(filePath("package.json"), "utf-8");
    const packageJson = JSON.parse(packageJsonString);
    const main = cjs;
    const module = esm;

    const entries = Object.entries(packageJson)
        .filter(([key]: [string, unknown]) => {
            return !(["devDependencies", "jest", "scripts"]).includes(key);
        });


    const newPackageJson = {
        ...Object.fromEntries(entries),
        main,
        module,
    };

    await writeFile(distPath("package.json"), JSON.stringify(newPackageJson, null, 2));
}

/**
 * Get the absolute path to a file relative to the src directory.
 * @param fp The file path relative to the src directory.
 * @returns The absolute path to the file.
 */
function srcPath(...fp: string[]): string {
    return filePath("src", ...fp);
}

/**
 * Get the absolute path to a file relative to the dist directory.
 * @param fp The file path relative to the dist directory.
 * @returns The absolute path to the file.
 */
function distPath(...fp: string[]): string {
    return filePath("dist", ...fp);
}

/**
 * Get the absolute path to a file relative to the root of the project.
 * @param fp The file path relative to the root of the project.
 * @returns The absolute path to the file.
 */
function filePath(...fp: string[]): string {
    const __dirname = fileURLToPath(new URL("..", import.meta.url));
    return join(__dirname, ...fp);
}
