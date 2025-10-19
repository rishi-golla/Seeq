import dotenv from 'dotenv';
import {PDFParse} from "pdf-parse";

import { StateGraph, Annotation } from "@langchain/langgraph";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { tool } from "@langchain/core/tools";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

import z from "zod";
import filePathData from "./filePathData.js";
import fs from "fs";
import path from "path";
import { Document, Packer, Paragraph, TextRun } from "docx";

// Enum for file types
export enum FileType {
    DOCX = "docx",
    EXL = "exl"
}

dotenv.config();

import mongoose from "mongoose";
import { openWithDefaultApp } from './fileSysOperations.js';

const dbUrl = process.env.DB_URL;
if (!dbUrl) {
    throw new Error("DB_URL environment variable is not defined");
}

mongoose
    .connect(dbUrl)
    .then(() => console.log("Connected to MongoDB"))
    .catch((err: any) => console.log("MongoDB Connection failed", err));

//Tools for docx and excel
const generateFileTool = tool(
    async ({ title, paragraphs }: { title: string; paragraphs: string[] }): Promise<string> => {
        const doc = new Document({
            sections: [
                {
                    children: [
                        new Paragraph({
                            text: title,
                            heading: "Heading1",
                        }),
                        ...paragraphs.map(
                            (p) =>
                                new Paragraph({
                                    children: [new TextRun({ text: p, size: 24 })],
                                    spacing: { after: 200 },
                                })
                        ),
                    ],
                },
            ],
        });

        const safeTitle = title.replace(/[<>:"/\\|?*]+/g, "_");
        const filePath = path.join(process.cwd(), `../FileGenCreation/${safeTitle}.docx`);
        const buffer = await Packer.toBuffer(doc);
        fs.writeFileSync(filePath, buffer);
        openWithDefaultApp(filePath);

        return filePath;
    },
    {
        name: "GenerateFile",
        description:
            "Creates a professional DOCX document with a title and structured paragraphs. Use this tool to generate reports, assignments, notes, essays, or any other document based on user requests and reference materials.",
        schema: z.object({
            title: z.string().describe("A clear, descriptive title that summarizes the document's purpose and content."),
            paragraphs: z
                .array(z.string())
                .describe("An array of well-structured paragraph content. Each paragraph should be 3-7 sentences and cover a specific topic or section of the document."),
        }),
    }
);

const readPDFTool = tool(
  async ({ filePath }: { filePath: string }): Promise<string> => {
    try {
      if (!fs.existsSync(filePath)) {
        return `Error: The file "${filePath}" does not exist.`;
      }

      if (path.extname(filePath).toLowerCase() !== ".pdf") {
        return `Error: "${filePath}" is not a PDF file.`;
      }

      const fileBuffer = fs.readFileSync(filePath);
      const uint8Array = new Uint8Array(fileBuffer);
      const pdfData = new PDFParse(uint8Array);
      const extractedText = await pdfData.getText();

      if (!extractedText) {
        return "The PDF appears to be empty or unreadable.";
      }

      return extractedText.total > 15000
        ? extractedText.text.slice(0, 15000) + "\n\n[Text truncated for length]"
        : extractedText.text;
    } catch (err: any) {
      console.error("Error reading PDF:", err);
      return `Error reading PDF: ${err.message}`;
    }
  },
  {
    name: "ReadPDF",
    description:
      "Extracts and returns readable text content from a given PDF file path. Use this to analyze or summarize PDF files the user provides.",
    schema: z.object({
      filePath: z
        .string()
        .describe("The absolute path to the PDF file you want to read and extract text from."),
    }),
  }
);

// File finding Schemas
const filePathArraySchema = z.object({
    docs: z.array(
        z.object({
            path: z.string(),
            description: z.string(),
        })
    ),
});

const getKeywords = z.object({
    word: z.array(z.string())
});

const tagDocs = await filePathData.find({}, { tags: 1, _id: 0 }).lean();
const allTagsInDB: string[] = tagDocs.flatMap((doc) => doc.tags || []);

// Model instantiation
const agentModel = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    temperature: 0.5,
});
const fileAgentHandler = createReactAgent({
    llm: agentModel,
    tools: [generateFileTool, readPDFTool]
});

// Model with structured output
const filterSearch = agentModel.withStructuredOutput(getKeywords);
const filterFiles = agentModel.withStructuredOutput(filePathArraySchema);

const StateAnnotation = Annotation.Root({
    userInput: Annotation<string>,
    retrievedDocs: Annotation<
        Array<{
            path: string;
            description: string;
        }>
    >,
    agentOutput: Annotation<string>,
});

async function getFilePaths(state: typeof StateAnnotation.State) {
    console.log("all tags: ", allTagsInDB)
    console.log("1. Action executed from File AI agent");
    const keywordResult = await filterSearch.invoke([
        {
            role: "system",
            content: `You are helping to create DOCX or Excel files based on user requests. 
                      Analyze the user's request to understand what type of document they want to create 
                      and select relevant keywords from these available tags: ${allTagsInDB.join(", ")}. 
                      
                      Focus on identifying:
                      - Document type (report, assignment, notes, spreadsheet, etc.)
                      - Subject matter or topic
                      - Academic course or project context
                      - Content structure needed
                      
                      Do not auto generate your own tags. You must use the tags given and recommend 
                      relevant ones for document creation context.`,
        },
        { role: "user", content: state.userInput },
    ]);
    const finalTags = Array.isArray(keywordResult.word)
        ? keywordResult.word.flat()
        : [keywordResult.word];

    console.log("2. Tags chosen by agent", finalTags);
    let files = [];
    try {
        files = await filePathData.find(
            { tags: { $in: finalTags } },
            "path description"
        ).lean();
    } catch (error) {
        console.error("Error fetching files by tags:", error);
        throw error;
    }

    console.log("3. Chosen files: ")
    files.map((file, idx) => {
        console.log("    ", idx, ". Description: ", file.description, "     Path: ", file.path)
    })

    const filesString = files
        .map((file) => `Description: ${file.description}, Filepath: "${file.path}"`)
        .join("\n");

    const retrievedDocs = await filterFiles.invoke([
        {
            role: "system",
            content: `
                You are selecting reference files that will help create a new DOCX or Excel document.
                Analyze the user's request to understand what type of document they want to create and 
                select files that would be useful as reference material or templates.

                A file is considered relevant for document creation if:
                - Its description or name includes topics, keywords, or terms related to the document content.
                - It is from the same course, subject, or project as the document being created.
                - It represents materials that would serve as good reference (lecture notes, previous assignments, 
                  templates, examples, or related coursework).
                - It contains data or information that should be included in the new document.
                - It provides context or background information for the document topic.

                File paths are listed below — each line includes a description and its absolute path in quotes. 
                Only use these files. You are allowed to backtrack a folder if the user
                wants content from multiple folders and are required to provide the parent directory with the required
                sub folders. 

                The file paths are:
                ${filesString}
                `,
        },
        { role: "user", content: state.userInput },
    ]);

    console.log("4. Final Chosen files for action node: ");
    retrievedDocs.docs.map((file, idx) => {
        console.log(" --- ", idx, ". Description: ", file.description, "      Path: ", file.path)
    })

    return { retrievedDocs: retrievedDocs.docs };
}

async function executeAction(state: typeof StateAnnotation.State) {
    try {
        const docString = state.retrievedDocs.map(
            (doc) => `Description: ${doc.description}, Filepath: "${doc.path}"`
        );

        const executer = await fileAgentHandler.invoke({
            messages: [
                new SystemMessage(`
                    Your name is Seeq, an intelligent document creation agent. Your job is to help users 
                    create DOCX files by analyzing reference materials and generating appropriate content.
                    Note: Excel file creation is coming soon!

                    You are a document creation AI agent with access to these tools:
                    1. ReadPDF — extracts text content from PDF files for analysis and reference
                    2. GenerateFile — creates a DOCX file with a title and paragraphs based on the user's request.

                    Reference files available for context (use these to inform your document creation):
                    ${docString.join("\n")}

                    Your primary responsibilities:
                    - Analyze the user's request to understand what type of document they want to create
                    - Use the ReadPDF tool to read and analyze any PDF reference files
                    - Extract relevant information from PDFs and other reference materials
                    - Generate appropriate content structure and paragraphs for the document
                    - Create a meaningful title that reflects the document's purpose
                    - Break down content into logical paragraphs for better readability

                    Document creation workflow:
                    1. First, use ReadPDF tool to read any PDF files from the reference materials
                    2. Analyze the extracted content along with other reference files
                    3. MANDATORY: Use GenerateFile tool to create a DOCX document based on the analyzed content
                    4. Ensure the document incorporates relevant information from the PDFs and other references

                    CRITICAL REQUIREMENTS:
                    - You MUST use the GenerateFile tool for EVERY document creation request
                    - You MUST NOT just provide text responses - you MUST generate actual DOCX files
                    - After reading PDFs, you MUST call GenerateFile with title and paragraphs
                    - The GenerateFile tool is the ONLY way to create documents - use it!

                    Document creation guidelines:
                    - Always use the ReadPDF tool first to read PDF reference files
                    - MANDATORY: Always use the GenerateFile tool when the user wants to create a document
                    - Create a clear, descriptive title that summarizes the document's purpose
                    - Structure content into logical paragraphs (3-7 sentences each)
                    - Use information from PDFs and other reference files to inform the content
                    - Ensure the document incorporates the PDF content into the generated paragraphs
                    - Ensure the document is well-organized and professional
                    - If creating academic documents, include proper structure and formatting

                    If the user asks for information about existing files or wants to view reference materials, 
                    provide helpful context without creating new documents.

                    IMPORTANT: When the user requests document creation, you MUST:
                    1. Read any PDF reference files using ReadPDF tool
                    2. Call GenerateFile tool with appropriate title and paragraphs
                    3. Do NOT just provide text - you MUST generate the actual DOCX file
                    4. Confirm the document was created successfully

                    After creating a document, provide a confirmation message describing what was generated.
                    `),
                new HumanMessage(state.userInput),
            ],
        });

        const lastMessage =
            executer.messages[executer.messages.length - 1].content;

        console.log("5. Agent finished");
        return { agentOutput: lastMessage };
    } catch (error) {
        console.error("Error in executeAction:", error);
        return { agentOutput: `Error processing request: ${error}` };
    }
}

const agentWorkflow = new StateGraph(StateAnnotation)
    .addNode("getFilePaths", getFilePaths)
    .addNode("executeAction", executeAction)
    .addEdge("__start__", "getFilePaths")
    .addEdge("getFilePaths", "executeAction")
    .addEdge("executeAction", "__end__")
    .compile();

export async function fileCreateAgent(query: string, type: FileType) {

    let output: string;
    console.log(query);
    console.log("File type:", type);

    try {
        const state = await agentWorkflow.invoke({
            userInput: query,
        });
        output = state.agentOutput;

        switch (type) {
            case FileType.DOCX:
                console.log("Processing DOCX file type");
                break;
            case FileType.EXL:
                console.log("Processing EXL file type");
                break;
            default:
                console.log("Unknown file type:", type);
        }
    } catch (err) {
        console.error(err);
        return "Error processing request";
    }
    return output;
}