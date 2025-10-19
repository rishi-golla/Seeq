import dotenv from 'dotenv';

import { StateGraph, Annotation } from "@langchain/langgraph";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { tool } from "@langchain/core/tools";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

import z from "zod";
import { deleteFile, openWithDefaultApp } from './fileSysOperations.js';
import filePathData from "./filePathData.js";
import mongoose from "mongoose";
import { AgentHistoryData } from "./agentHistoryData.js";

dotenv.config();

const dbUrl = process.env.DB_URL;
if (!dbUrl) {
    throw new Error("DB_URL environment variable is not defined");
}

mongoose
    .connect(dbUrl)
    .then(() => console.log("Connected to MongoDB"))
    .catch((err: any) => console.log("MongoDB Connection failed", err));

// Global array to track opened files
let openedFiles: string[] = [];

// File system tools
const openFile = tool(
    ({ targetFile }: { targetFile: string }): void => {
        openWithDefaultApp(targetFile);
        openedFiles.push(targetFile); // Track opened file
    },
    {
        name: "OpenFilepath",
        description: "Using the filepath, this tool will open the file on the user's computer",
        schema: z.object({
            targetFile: z.string(),
        }),
    }
);

const removeFile = tool(
    ({ targetFile }: { targetFile: string }): void => {
        try {
            deleteFile(targetFile);
        } catch (error) {
            console.error("Error deleting file:", error);
            throw new Error(`Failed to delete file: ${error}`);
        }
    },
    {
        name: "RemoveFile",
        description: "Using the file string, this tool will remove the file from the user's computer",
        schema: z.object({
            targetFile: z.string(),
        }),
    }
);

// Structured Schemas
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

// Tags in DB
const tagDocs = await filePathData.find({}, { tags: 1, _id: 0 }).lean();
const allTagsInDB: string[] = tagDocs.flatMap((doc) => doc.tags || []);

// Model instantiation
const agentModel = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash-lite",
    temperature: 0.5,
});
const fileAgentHandler = createReactAgent({
    llm: agentModel,
    tools: [openFile, removeFile],
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

// Function to generate a 5-word summary
async function generateFiveWordSummary(output: string): Promise<string> {
    try {
        const summaryModel = new ChatGoogleGenerativeAI({
            model: "gemini-2.5-flash-lite",
            temperature: 0.3,
        });
        
        const response = await summaryModel.invoke([
            new SystemMessage("Generate exactly 5 words that summarize the following text. Be concise and descriptive."),
            new HumanMessage(output)
        ]);
        
        return typeof response.content === 'string' ? response.content : String(response.content);
    } catch (error) {
        console.error("Error generating summary:", error);
        return "Agent performed file operations";
    }
}

async function getFilePaths(state: typeof StateAnnotation.State) {
    console.log("all tags: ", allTagsInDB)
    console.log("1. Action executed from File AI agent");
    const keywordResult = await filterSearch.invoke([
        {
            role: "system",
            content: `Using the use response, guess what the user is intending on doing and 
                      select the key words from these tags: ${allTagsInDB.join(", ")}. 
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
                You are selecting file paths that are relevant to the user asked for.
                Use the response to infer what other filepaths the user will probably need finish action

                A file is considered related if:
                - Its description or name includes topics, keywords, or terms relate to user response.
                - It is from the same course, subject, or semester as mentioned in user response.
                - It represents materials that would logically accompany or support the on-screen content 
                (e.g., if user response shows an assignment, also include lecture notes or coursework files).

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
        // Reset opened files array for this execution
        openedFiles = [];
        
        const docString = state.retrievedDocs.map(
            (doc) => `Description: ${doc.description}, Filepath: "${doc.path}"`
        );

        const executer = await fileAgentHandler.invoke({
            messages: [
                new SystemMessage(`
                    Your name is Seeq, a intelligent file operations agent. You job is to run tools on 
                    anything similar to what the user wants. Even if one word is in the semantic description 
                    given for a filepath, use it

                    You are a file system AI agent with access to two tools:
                    1. OpenFilepath — opens a given file path.
                    2. RemoveFile — deletes a given file path.

                    You must only use multiple or one tools with file paths explicitly listed below:
                    ${docString.join("\n")}

                    Rules:
                    - Only act on file paths that appear exactly (verbatim) in the list above.
                    - NEVER invent, modify, guess, or generate file paths.
                    - If no listed path matches the user's request, reply only with:
                    "I couldn't find a matching file to perform that action."
                    - Always prefer tool calls when the user requests an action.

                    Action mapping:
                    - For requests like "delete", "remove", "erase", or "trash", call RemoveFile.
                    - For requests like "open", "show", or "view", call OpenFilepath.
                    - You may call tools multiple times if multiple valid paths match.

                    If the user asks for context or information (not an action), do not call any tools—only respond in text.

                    After performing an action, provide a short, polite confirmation message describing what was done.
                    `),
                new HumanMessage(state.userInput),
            ],
        });

        const lastMessage =
            executer.messages[executer.messages.length - 1].content;

        console.log("5. Agent finished");
        
        // Generate 5-word summary and save to database
        try {
            const messageContent = typeof lastMessage === 'string' ? lastMessage : String(lastMessage);
            const summary = await generateFiveWordSummary(messageContent);
            const historyData = new AgentHistoryData({
                description: summary,
                filePaths: openedFiles
            });
            await historyData.save();
            console.log("6. Agent history saved:", { summary, openedFiles });
        } catch (historyError) {
            console.error("Error saving agent history:", historyError);
        }
        
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

export async function fileSysAgent(query: string) {
    let output: string;
    console.log(query);
    try {
        const state = await agentWorkflow.invoke({
            userInput: query,
        });
        output = state.agentOutput;
    } catch (err) {
        console.error(err);
        return "Error processing request";
    }
    return output;
}
