import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';

const CONFIG_DIR = path.join(os.homedir(), '.robogarage');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

export interface RoboGarageConfig {
  baseUrl: string;
  token?: string;
  username?: string;
  agent?: 'codex' | 'claude' | 'opencode' | 'pi' | 'cursor' | 'gemini';
}

const DEFAULT_CONFIG: RoboGarageConfig = {
  baseUrl: 'https://robogarage-back2.onrender.com',
};

export function loadConfig(): RoboGarageConfig {
  try {
    if (!fs.existsSync(CONFIG_FILE)) return { ...DEFAULT_CONFIG };
    const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveConfig(cfg: RoboGarageConfig): void {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), { mode: 0o600 });
}

export function clearConfig(): void {
  try {
    fs.unlinkSync(CONFIG_FILE);
  } catch {
    /* ignore */
  }
}

export function configPath(): string {
  return CONFIG_FILE;
}
