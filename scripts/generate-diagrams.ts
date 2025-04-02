import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { spawn } from 'bun';

// Directory configuration
const DOCS_DIR = 'docs';
const MERMAID_DIR = join(DOCS_DIR, 'mermaid');
const GENERATED_DIR = join(DOCS_DIR, 'generated');
const DIAGRAMS_DIR = join(GENERATED_DIR, 'diagrams');

// Ensure directories exist
if (!Bun.file(GENERATED_DIR).exists()) {
  await Bun.write(`${GENERATED_DIR}/.gitkeep`, '');
}
if (!Bun.file(DIAGRAMS_DIR).exists()) {
  await Bun.write(`${DIAGRAMS_DIR}/.gitkeep`, '');
}
if (!Bun.file(MERMAID_DIR).exists()) {
  await Bun.write(`${MERMAID_DIR}/.gitkeep`, '');
}

// Read the architecture.md file
const architectureFile = join(DOCS_DIR, 'architecture.md');
const content = await Bun.file(architectureFile).text();

// Extract mermaid diagrams and save them to separate files
const mermaidRegex = /```mermaid\n([\s\S]*?)\n```/g;
let match: RegExpExecArray | null = null;
let diagramIndex = 0;

// First pass: Extract and save diagrams
match = mermaidRegex.exec(content);
while (match !== null) {
  diagramIndex++;
  const diagramContent = match[1];
  const mermaidFile = join(MERMAID_DIR, `diagram-${diagramIndex}.mmd`);

  // Save Mermaid definition to its own file
  await Bun.write(mermaidFile, diagramContent);

  match = mermaidRegex.exec(content);
}

// Second pass: Generate SVGs from Mermaid files
const mermaidFiles = (await readdir(MERMAID_DIR)).filter((file) =>
  file.endsWith('.mmd'),
);
for (const [index, file] of mermaidFiles.entries()) {
  const inputFile = join(MERMAID_DIR, file);
  const outputFile = join(DIAGRAMS_DIR, `diagram-${index + 1}.svg`);

  try {
    const proc = spawn([
      'npx',
      'mmdc',
      '-i',
      inputFile,
      '-o',
      outputFile,
      '-b',
      'transparent',
    ]);
    await proc.exited;
    console.log(`Generated diagram ${index + 1}`);
  } catch (error) {
    console.error(`Error generating diagram ${index + 1}:`, error);
  }
}

// Update the architecture.md file to only include SVG references
const updatedContent = content.replace(
  /```mermaid\n([\s\S]*?)\n```\n*/g,
  (_, __, offset) => {
    const currentIndex =
      Math.floor(content.slice(0, offset).match(/```mermaid/g)?.length || 0) +
      1;
    return `![Generated Diagram](generated/diagrams/diagram-${currentIndex}.svg)\n\n`;
  },
);

await Bun.write(architectureFile, updatedContent);

console.log('Diagram generation complete!');
