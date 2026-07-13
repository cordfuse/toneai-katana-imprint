import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const OUTPUT_DIR = path.resolve(__dirname, "..", "output");

/**
 * Allowed system commands and their descriptions.
 */
const ALLOWED_COMMANDS: Record<string, string> = {
  hostname: "System hostname",
  "uname -a": "Kernel information",
  uptime: "System uptime",
  "free -h": "Memory usage",
  "df -h": "Disk usage",
  "top -bn1 | head -20": "Process snapshot (top 20)",
  "ip addr": "Network interfaces",
  "ss -tlnp": "Listening ports",
  "systemctl list-units --type=service --state=running": "Running services",
};

/**
 * Runs a permitted system command and returns the output.
 * Throws if the command is not in the allowed list.
 */
export function runCommand(command: string): string {
  if (!ALLOWED_COMMANDS[command]) {
    throw new Error(
      `Command not permitted: "${command}". Allowed commands: ${Object.keys(ALLOWED_COMMANDS).join(", ")}`
    );
  }

  try {
    return execSync(command, {
      encoding: "utf-8",
      timeout: 10000,
    }).trim();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Command failed: ${message}`);
  }
}

/**
 * Checks the status of a systemd service (read-only).
 */
export function serviceStatus(serviceName: string): string {
  // Validate service name to prevent injection
  if (!/^[a-zA-Z0-9_.-]+$/.test(serviceName)) {
    throw new Error(`Invalid service name: "${serviceName}"`);
  }

  try {
    return execSync(`systemctl status ${serviceName}`, {
      encoding: "utf-8",
      timeout: 10000,
    }).trim();
  } catch (err: unknown) {
    // systemctl status returns non-zero for stopped services
    if (err && typeof err === "object" && "stdout" in err) {
      return (err as { stdout: string }).stdout?.trim() || "Service not found";
    }
    return "Service not found or not accessible";
  }
}

/**
 * Gathers a full system health snapshot.
 */
export function systemSnapshot(): Record<string, string> {
  const snapshot: Record<string, string> = {};

  for (const [command, label] of Object.entries(ALLOWED_COMMANDS)) {
    try {
      snapshot[label] = runCommand(command);
    } catch {
      snapshot[label] = "Failed to retrieve";
    }
  }

  return snapshot;
}

/**
 * Formats a system snapshot as a markdown report.
 */
export function formatReport(snapshot: Record<string, string>): string {
  const lines: string[] = [];
  const timestamp = new Date().toISOString();

  lines.push(`# System Health Report`);
  lines.push("");
  lines.push(`**Generated:** ${timestamp}`);
  lines.push("");

  for (const [label, output] of Object.entries(snapshot)) {
    lines.push(`## ${label}`);
    lines.push("");
    lines.push("```");
    lines.push(output);
    lines.push("```");
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Saves a report to the output directory.
 */
export function saveReport(content: string, filename: string): string {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const filepath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(filepath, content, "utf-8");

  return filepath;
}

/**
 * Generates a basic nginx config template and saves it.
 */
export function generateNginxConfig(
  serverName: string,
  port: number
): string {
  // Validate inputs
  if (!/^[a-zA-Z0-9._-]+$/.test(serverName)) {
    throw new Error(`Invalid server name: "${serverName}"`);
  }
  if (port < 1 || port > 65535) {
    throw new Error(`Invalid port: ${port}`);
  }

  const config = `server {
    listen 80;
    server_name ${serverName};

    location / {
        proxy_pass http://127.0.0.1:${port};
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
`;

  const filename = `nginx-${serverName}.conf`;
  const filepath = saveReport(config, filename);

  return filepath;
}
