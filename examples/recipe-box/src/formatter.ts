import * as fs from "fs";
import * as path from "path";

/**
 * Recipe data structure used by the formatter.
 */
export interface Recipe {
  title: string;
  description: string;
  prepTime: string;
  cookTime: string;
  servings: number;
  tags: string[];
  ingredients: Ingredient[];
  steps: string[];
}

export interface Ingredient {
  name: string;
  quantity: string;
  unit: string;
}

const OUTPUT_DIR = path.resolve(__dirname, "..", "output");

/**
 * Converts a recipe title into a filename-safe slug.
 */
function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Formats an ingredient into a readable string.
 */
function formatIngredient(ingredient: Ingredient): string {
  const parts = [ingredient.quantity, ingredient.unit, ingredient.name].filter(
    Boolean
  );
  return `- ${parts.join(" ")}`;
}

/**
 * Formats a full recipe as a markdown string.
 */
export function formatRecipe(recipe: Recipe): string {
  const lines: string[] = [];

  lines.push(`# ${recipe.title}`);
  lines.push("");
  lines.push(recipe.description);
  lines.push("");
  lines.push("## Details");
  lines.push("");
  lines.push(`- **Prep time:** ${recipe.prepTime}`);
  lines.push(`- **Cook time:** ${recipe.cookTime}`);
  lines.push(`- **Servings:** ${recipe.servings}`);
  lines.push(`- **Tags:** ${recipe.tags.join(", ")}`);
  lines.push("");
  lines.push("## Ingredients");
  lines.push("");
  for (const ingredient of recipe.ingredients) {
    lines.push(formatIngredient(ingredient));
  }
  lines.push("");
  lines.push("## Instructions");
  lines.push("");
  recipe.steps.forEach((step, index) => {
    lines.push(`${index + 1}. ${step}`);
  });
  lines.push("");

  return lines.join("\n");
}

/**
 * Saves a formatted recipe to the output directory as a markdown file.
 * Returns the full path of the saved file.
 */
export function saveRecipe(recipe: Recipe): string {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const slug = slugify(recipe.title);
  const filename = `${slug}.md`;
  const filepath = path.join(OUTPUT_DIR, filename);
  const content = formatRecipe(recipe);

  fs.writeFileSync(filepath, content, "utf-8");

  return filepath;
}

/**
 * Lists all saved recipe files in the output directory.
 */
export function listRecipes(): string[] {
  if (!fs.existsSync(OUTPUT_DIR)) {
    return [];
  }

  return fs
    .readdirSync(OUTPUT_DIR)
    .filter((file) => file.endsWith(".md"))
    .sort();
}

/**
 * Reads a saved recipe file by slug or filename.
 */
export function readRecipe(nameOrSlug: string): string | null {
  const filename = nameOrSlug.endsWith(".md") ? nameOrSlug : `${nameOrSlug}.md`;
  const filepath = path.join(OUTPUT_DIR, filename);

  if (!fs.existsSync(filepath)) {
    return null;
  }

  return fs.readFileSync(filepath, "utf-8");
}
