import dotenv from 'dotenv';

import { StateGraph, Annotation } from "@langchain/langgraph";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { tool } from "@langchain/core/tools";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

import z from "zod";
import { deleteFile, openWithDefaultApp } from './fileSysOperations.js';
import filePathData from "./filePathData.js";

dotenv.config();

import mongoose from "mongoose";

const dbUrl = process.env.DB_URL;
if (!dbUrl) {
    throw new Error("DB_URL environment variable is not defined");
}

mongoose
    .connect(dbUrl)
    .then(() => console.log("Connected to MongoDB"))
    .catch((err: any) => console.log("MongoDB Connection failed", err));

//Tools for docx and excel 