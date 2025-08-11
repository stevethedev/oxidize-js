import ts from "typescript";
import * as fs from "fs";
import { glob } from "glob";

async function getAllSrcTsFiles(): Promise<string[]> {
  // Only include .ts files in src, excluding test files
  return await glob("src/**/*.ts", {
    ignore: ["**/*.spec.ts", "**/*.test.ts"],
    absolute: true,
  });
}

function getImports(filePath: string): string[] {
  const source = fs.readFileSync(filePath, "utf8");
  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
  );
  const imports: string[] = [];
  ts.forEachChild(sourceFile, (node) => {
    if (
      ts.isImportDeclaration(node) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      imports.push(node.moduleSpecifier.text);
    }
  });
  return imports;
}

test("No src file imports from node_modules", async () => {
  for (const file of await getAllSrcTsFiles()) {
    const imports = getImports(file);
    for (const imp of imports) {
      if (!imp.startsWith("./") && !imp.startsWith("../")) {
        throw new Error(
          `File ${file} imports '${imp}', which may be from node_modules`,
        );
      }
    }
  }
});
