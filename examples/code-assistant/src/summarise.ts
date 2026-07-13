import * as fs from "fs";
import * as path from "path";

/**
 * Represents a single action taken during a coding session.
 */
export interface SessionAction {
  timestamp: string;
  type: "read" | "write" | "create" | "delete" | "command" | "discussion";
  description: string;
  files?: string[];
}

/**
 * Represents a complete coding session.
 */
export interface Session {
  startTime: string;
  endTime?: string;
  workingDirectory: string;
  projectName: string;
  actions: SessionAction[];
  notes: string[];
}

/**
 * Creates a new session object.
 */
export function createSession(
  workingDirectory: string,
  projectName: string
): Session {
  return {
    startTime: new Date().toISOString(),
    workingDirectory,
    projectName,
    actions: [],
    notes: [],
  };
}

/**
 * Records an action in the session log.
 */
export function recordAction(
  session: Session,
  type: SessionAction["type"],
  description: string,
  files?: string[]
): void {
  session.actions.push({
    timestamp: new Date().toISOString(),
    type,
    description,
    files,
  });
}

/**
 * Adds a free-form note to the session.
 */
export function addNote(session: Session, note: string): void {
  session.notes.push(note);
}

/**
 * Generates a markdown summary of the session.
 */
export function summarise(session: Session): string {
  const lines: string[] = [];

  lines.push(`# Session Summary: ${session.projectName}`);
  lines.push("");
  lines.push(`**Started:** ${session.startTime}`);
  lines.push(
    `**Ended:** ${session.endTime || new Date().toISOString()}`
  );
  lines.push(`**Directory:** \`${session.workingDirectory}\``);
  lines.push("");

  // Group actions by type
  const grouped: Record<string, SessionAction[]> = {};
  for (const action of session.actions) {
    if (!grouped[action.type]) {
      grouped[action.type] = [];
    }
    grouped[action.type].push(action);
  }

  // Files modified
  const allFiles = new Set<string>();
  for (const action of session.actions) {
    if (action.files) {
      for (const file of action.files) {
        allFiles.add(file);
      }
    }
  }

  if (allFiles.size > 0) {
    lines.push("## Files Touched");
    lines.push("");
    for (const file of Array.from(allFiles).sort()) {
      lines.push(`- \`${file}\``);
    }
    lines.push("");
  }

  // Action log
  if (session.actions.length > 0) {
    lines.push("## Actions");
    lines.push("");
    for (const action of session.actions) {
      const icon = actionIcon(action.type);
      const fileList = action.files
        ? ` (${action.files.map((f) => `\`${f}\``).join(", ")})`
        : "";
      lines.push(`- ${icon} ${action.description}${fileList}`);
    }
    lines.push("");
  }

  // Notes
  if (session.notes.length > 0) {
    lines.push("## Notes");
    lines.push("");
    for (const note of session.notes) {
      lines.push(`- ${note}`);
    }
    lines.push("");
  }

  // Stats
  lines.push("## Stats");
  lines.push("");
  lines.push(`- **Total actions:** ${session.actions.length}`);
  lines.push(`- **Files touched:** ${allFiles.size}`);
  lines.push(
    `- **Reads:** ${grouped["read"]?.length || 0}`
  );
  lines.push(
    `- **Writes:** ${(grouped["write"]?.length || 0) + (grouped["create"]?.length || 0)}`
  );
  lines.push(
    `- **Commands:** ${grouped["command"]?.length || 0}`
  );
  lines.push("");

  return lines.join("\n");
}

/**
 * Returns an icon for each action type.
 */
function actionIcon(type: SessionAction["type"]): string {
  switch (type) {
    case "read":
      return "[READ]";
    case "write":
      return "[WRITE]";
    case "create":
      return "[CREATE]";
    case "delete":
      return "[DELETE]";
    case "command":
      return "[CMD]";
    case "discussion":
      return "[CHAT]";
    default:
      return "[-]";
  }
}

/**
 * Saves a session summary to a markdown file.
 */
export function saveSummary(session: Session, outputDir: string): string {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const date = new Date().toISOString().split("T")[0];
  const slug = session.projectName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const filename = `${date}-${slug}.md`;
  const filepath = path.join(outputDir, filename);

  const content = summarise(session);
  fs.writeFileSync(filepath, content, "utf-8");

  return filepath;
}
