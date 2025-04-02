import { readdir } from 'node:fs/promises';
import { spawn } from 'bun';

// Directory configuration
const DOCS_DIR = 'docs';
const MERMAID_DIR = `${DOCS_DIR}/mermaid`;
const GENERATED_DIR = `${DOCS_DIR}/generated`;

console.log('Starting diagram generation...');
console.log(`Using directories:
- Mermaid files: ${MERMAID_DIR}
- Generated SVGs: ${GENERATED_DIR}
`);

// Ensure generated directory exists
if (!(await Bun.file(GENERATED_DIR).exists())) {
  await Bun.write(`${GENERATED_DIR}/.gitkeep`, '');
  console.log(`Created directory: ${GENERATED_DIR}`);
}

// Get all .mmd files
const mermaidFiles = await readdir(MERMAID_DIR);
const diagramFiles = mermaidFiles.filter((file) => file.endsWith('.mmd'));

console.log(`Found ${diagramFiles.length} diagram files`);

// Generate SVGs for each diagram
for (const file of diagramFiles) {
  const diagramNumber = file.match(/diagram-(\d+)\.mmd/)?.[1];
  if (!diagramNumber) {
    console.warn(`Skipping file ${file} - doesn't match expected format`);
    continue;
  }

  const inputFile = `${MERMAID_DIR}/${file}`;
  const outputFile = `${GENERATED_DIR}/diagram-${diagramNumber}.svg`;

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
      '--scale',
      '1.2',
    ]);

    // Log stdout and stderr
    const text = await new Response(proc.stdout).text();
    if (text) {
      console.log('stdout:', text);
    }

    const error = await new Response(proc.stderr).text();
    if (error) {
      console.error('stderr:', error);
    }

    const exitCode = await proc.exited;
    if (exitCode === 0) {
      console.log(`✓ Generated diagram ${diagramNumber}`);
    } else {
      console.error(
        `✗ Error generating diagram ${diagramNumber}: Exit code ${exitCode}`,
      );
    }
  } catch (error) {
    console.error(`✗ Error generating diagram ${diagramNumber}:`, error);
  }
}

console.log('\nDiagram generation complete!');
