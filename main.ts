import { closeSync, openSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { run } from './solve.js';

const input = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const output = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const cases = JSON.parse(readFileSync(join(input, 'cases.json'), 'utf8'));
const file = openSync(join(output, 'answers.json'), 'w');
try {
  writeFileSync(file, '[');
  for (let i = 0; i < cases.length; i++) {
    if (i) writeFileSync(file, ',');
    writeFileSync(file, JSON.stringify(run(cases[i].input)));
  }
  writeFileSync(file, ']');
} finally {
  closeSync(file);
}
