import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { copyTree, buildManifestJson, TEMPLATE_AS } from "./plugin-create-scaffold";

export function scaffoldAs(name: string, dest: string, templateDir = TEMPLATE_AS): void {
  if (!existsSync(templateDir)) {
    throw new Error(
      `AssemblyScript template not found at ${templateDir}\n` +
      `  The AS SDK is still being built — try again after the next aoi update,\n` +
      `  or check: https://github.com/Soul-Brews-Studio/aoi-js`,
    );
  }

  copyTree(templateDir, dest);

  // Rewrite package.json name
  const pkgPath = join(dest, "package.json");
  if (existsSync(pkgPath)) {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    pkg.name = name;
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  }

  // Write README
  writeFileSync(
    join(dest, "README.md"),
    `# ${name}

A aoi WASM command plugin (AssemblyScript).

## Build

\`\`\`bash
cd "${dest}"
npm install
npm run build
\`\`\`

Output: \`build/${name}.wasm\`

## Install

\`\`\`bash
aoi plugin install "${dest}"
\`\`\`
`,
  );

  // Emit plugin.json manifest
  writeFileSync(join(dest, "plugin.json"), buildManifestJson(name, "as"));
}
