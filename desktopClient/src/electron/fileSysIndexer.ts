import fs from "fs";
import path from "path";
import z from "zod";
import filePathData from "./filePathData.js";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { fileURLToPath } from "url";

interface FileMetadata {
  name: string;
  path: string;
  type: string;
  description: string;
  tags: string[];
  size: number;
  lastModified: Date;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SANDBOX_DIR = path.resolve(__dirname, "../../sandbox");

const agentModel = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash-lite",
  temperature: 0,
});

const fileMetadataSchema = z.object({
  tags: z.array(z.string().min(1)),
  description: z.string().min(5),
});

const fileMetadataRetriever = agentModel.withStructuredOutput(fileMetadataSchema);

async function generateFileMetadata(
  fileName: string,
  existingTags: string[]
): Promise<z.infer<typeof fileMetadataSchema>> {
  const systemPrompt = `
    You are a smart file indexing assistant that classifies files for university students and researchers.

    Your goal:
    1. Analyze the file name and infer what it represents.
    2. Use the list of known tags to stay consistent, but you may add new relevant ones.
    3. Output ONLY JSON with "tags" and "description" fields.
    `;

  const userPrompt = `
    Filename: "${fileName}"
    Existing tags across all files: ${existingTags.join(", ")}

    Generate metadata now.
    `;

  try {
    const response = await fileMetadataRetriever.invoke([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]);

    return response;
  } catch (error) {
    console.error("Error generating file metadata:", error);
    return { tags: [], description: "" };
  }
}

// Recursive function to traverse all directories
async function indexDirectory(dir: string, allTagsInDB: string[]) {
  const entries = fs.readdirSync(dir);

  for (const entry of entries) {
    const entryPath = path.join(dir, entry);
    const stats = fs.statSync(entryPath);

    if (stats.isDirectory()) {
      // Recurse into subdirectory
      await indexDirectory(entryPath, allTagsInDB);
      continue;
    }

    // Skip already indexed files
    const exists = await filePathData.findOne({ path: entryPath }).lean();
    if (exists) continue;

    console.log(`Indexing file: ${entryPath}`);

    const ext = path.extname(entry).replace(".", "") || "unknown";
    const { tags, description } = await generateFileMetadata(entry, allTagsInDB);

    const newDoc: FileMetadata = {
      name: entry,
      path: entryPath,
      type: ext,
      description,
      tags,
      size: stats.size,
      lastModified: stats.mtime,
    };

    await filePathData.create(newDoc);
    console.log(`Indexed: ${entry} → [${tags.join(", ")}]`);
  }
}

export default async function fileIndexer(): Promise<void> {
  try {
    console.log("Starting recursive file indexer...");
    const tagDocs = await filePathData.find({}, { tags: 1, _id: 0 }).lean();
    const allTagsInDB: string[] = tagDocs.flatMap((doc) => doc.tags || []);

    await indexDirectory(SANDBOX_DIR, allTagsInDB);

    console.log("File indexing complete!");
  } catch (error) {
    console.error("File indexer error:", error);
  }
}
