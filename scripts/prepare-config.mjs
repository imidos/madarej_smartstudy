import { readFile, writeFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';

const targetPath = 'public/generation-config.json';
const examplePath = 'public/generation-config.example.json';

async function fileExists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function prepare() {
  const exists = await fileExists(targetPath);
  if (exists) {
    console.log(`[prepare-config] ${targetPath} already exists, skipping.`);
    return;
  }

  let template;
  try {
    template = JSON.parse(await readFile(examplePath, 'utf8'));
  } catch (err) {
    console.error(`[prepare-config] Could not read ${examplePath}:`, err);
    template = {
      apiKey: '',
      model: 'nvidia/nemotron-3-super-120b-a12b:free',
      zeroCost: true,
      reasoningEffort: 'medium',
      researchEnabled: false,
      researchBudgetUsd: 0,
      maxTokens: 12000,
      timeoutSeconds: 180,
    };
  }

  if (process.env.GENERATION_CONFIG) {
    try {
      const parsed = JSON.parse(process.env.GENERATION_CONFIG);
      await writeFile(targetPath, JSON.stringify(parsed, null, 2) + '\n');
      console.log(`[prepare-config] Generated ${targetPath} from GENERATION_CONFIG environment variable.`);
      return;
    } catch (e) {
      console.warn('[prepare-config] Failed to parse GENERATION_CONFIG as JSON, falling back.');
    }
  }

  if (process.env.OPENROUTER_API_KEY) {
    template.apiKey = process.env.OPENROUTER_API_KEY.trim();
    console.log(`[prepare-config] Injected OPENROUTER_API_KEY into ${targetPath}.`);
  }

  await writeFile(targetPath, JSON.stringify(template, null, 2) + '\n');
  console.log(`[prepare-config] Generated ${targetPath}.`);
}

prepare().catch((err) => {
  console.error('[prepare-config] Error:', err);
  process.exit(1);
});
