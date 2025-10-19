import { desktopCapturer, nativeImage } from 'electron';
import fs from 'fs';
import path from "path";
import { fileURLToPath } from "url";
import filePathData from "./filePathData.js";
import mongoose from "mongoose";
import z from "zod";
import dotenv from 'dotenv';

import Tesseract from 'tesseract.js';

import { StateGraph, Annotation } from "@langchain/langgraph";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { logOperation } from './fileSysOperations.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const Store_Photos = path.resolve(__dirname, "../../frameCaptures");
const Store_test = path.resolve(__dirname, "../../extractedOCR");

dotenv.config();

const dbUrl = process.env.DB_URL;
if (!dbUrl) {
    throw new Error("DB_URL environment variable is not defined");
}

mongoose
    .connect(dbUrl)
    .then(() => console.log("Connected to MongoDB"))
    .catch((err: any) => console.log("MongoDB Connection failed", err));

const tagDocs = await filePathData.find({}, { tags: 1, _id: 0 }).lean();
const allTagsInDB: string[] = tagDocs.flatMap((doc) => doc.tags || []);

// Structured Schemas
const fileResponseSchema = z.object({
    output: z.string().describe("The textual output, summary, or result message."),
    filePaths: z.array(
        z.string()).describe("List of absolute file paths"
        ),
});
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

const agentModel = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash-lite",
    temperature: 1,
});

//Agent with structures
const filterSearch = agentModel.withStructuredOutput(getKeywords);
const resWithFilePaths = agentModel.withStructuredOutput(fileResponseSchema);
const filterFiles = agentModel.withStructuredOutput(filePathArraySchema);

const StateAnnotation = Annotation.Root({
    userInput: Annotation<string>,
    retrievedDocs: Annotation<
        Array<{
            path: string;
            description: string;
        }>
    >,
    agentOutput: Annotation<{
        output: string;
        filePaths: string[];
    }>,
});

async function getFilePaths(state: typeof StateAnnotation.State) {
    console.log("all tags: ", allTagsInDB)
    console.log("1. Action executed from File AI agent");
    const keywordResult = await filterSearch.invoke([
        {
            role: "system",
            content: `Using the extracted OCR, guess what the user is doing on 
                      their screen and select the key words from these tags: ${allTagsInDB.join(", ")}. 
                      Do not auto generate your own tags. You must use the tags given and recommend 
                      relevant ones for output`,
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
                You are selecting file paths that are relevant to what appears on the user's screen, based on extracted OCR text.
                Use the OCR content to infer what the user is currently working on — for example, 
                an assignment, lecture notes, project, or document — and select all file paths that are contextually related.

                A file is considered related if:
                - Its description or name includes topics, keywords, or terms that appear in the OCR text.
                - It is from the same course, subject, or semester as mentioned in the OCR.
                - It represents materials that would logically accompany or support the on-screen content 
                (e.g., if OCR shows an assignment, also include lecture notes or coursework files).

                File paths are listed below — each line includes a description and its absolute path in quotes. 
                Only use these files; do not generate new paths or modify existing ones.

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

async function returnOutput(state: typeof StateAnnotation.State) {
    console.log("reached agent");
    try {
        const docString = state.retrievedDocs.map(
            (doc) => `Description: ${doc.description}, Filepath: "${doc.path}"`
        );


        const finalAnswer = await resWithFilePaths.invoke([
            {
                role: "system",
                content: `
                    You are an intelligent file recommendation assistant analyzing OCR text from the user's current screen.
                    Use the extracted text and the provided file paths to determine what the user is working on and recommend files that would help them complete their task.

                    If the user is viewing or editing an assignment, in addition to recommending that assignment file, 
                    also suggest any related lecture notes, reference PDFs, or coursework that may help them solve or understand it.

                    If the user is viewing an assignment, then provide any lecture or course notes needed that is given to you. If viewing a lecture note, 
                    then provide an assignment that might correspond to the note being viewed

                    If no file seems clearly relevant to the OCR from the tab, respond with:
                    "I couldn't find any files on your current tab. Please try switching tabs."

                    Provide a short 2 to 3 sentence summary explaining what you recommended and why.

                    Only use the file paths listed below (each with a description). Do not invent new ones:
                    ${docString.join("\n")}
                    `
            },
            {
                role: "user",
                content: state.userInput
            }
        ])

        console.log("5. Agent finished");
        return { agentOutput: finalAnswer }
    } catch (error) {
        console.error("Error in executeAction:", error);
        return { agentOutput: `Error processing request: ${error}` };
    }
}

const agentWorkflow = new StateGraph(StateAnnotation)
    .addNode("getFilePaths", getFilePaths)
    .addNode("executeAction", returnOutput)
    .addEdge("__start__", "getFilePaths")
    .addEdge("getFilePaths", "executeAction")
    .addEdge("executeAction", "__end__")
    .compile(); 

export default async function ScreenShareAgent(): Promise<{
    output: string;
    filePaths: string[];
}> {
    logOperation("SCREEN_AGENT", "Current Tab");
    const sources = await desktopCapturer.getSources({
        types: ["screen"],
        thumbnailSize: { width: 1900, height: 1200 },
    });
    const primaryScreen = sources[0];
    const image = nativeImage.createFromDataURL(
        primaryScreen.thumbnail.toDataURL()
    );
    const filePath = path.join(Store_Photos, `screen_capture_${Date.now()}.png`);
    fs.writeFileSync(filePath, image.toPNG());

    const result = (await Tesseract.recognize(filePath, 'eng')).data;

    const ocrText = result.text;
    const textFilePath = path.join(Store_test, `ocr_result_${Date.now()}.txt`);
    fs.writeFileSync(textFilePath, ocrText, 'utf-8');

    let output: {
        output: string;
        filePaths: string[];
    };
    try {
        const state = await agentWorkflow.invoke({
            userInput: ocrText,
        });
        output = state.agentOutput;
        console.log(output);
        return output;
    } catch (err) {
        console.error(err);
        return { output: "Error processing request...", filePaths: [] };
    }
}
