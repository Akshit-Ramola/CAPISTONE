import "dotenv/config";
import { ChatMistralAI } from "@langchain/mistralai";
import { listFiles, readFiles, updateFiles } from "./tools.js";
import { createAgent } from "langchain";

const model = new ChatMistralAI({
    model: "mistral-medium-latest",
    apiKey: process.env.MISTRAL_API_KEY,
    temperature: 0.7,
})

const agent = createAgent({
    model,
    tools: [listFiles, readFiles, updateFiles],
})

await agent.invoke({
    messages: [
        {
            role: "user",
            content: "Update the theme of the project to night"
        }
    ]
})