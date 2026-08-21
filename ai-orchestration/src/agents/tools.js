import axios from 'axios';
import { tool } from "langchain";
import * as z from "zod";

export const listFiles = tool(
    async ({ }) => {
        console.log("========================================");
        console.log("using list_files tool");
        console.log("========================================");
        try {
            const response = await axios.get("http://01a01ba2-aa65-77f0-9a54-a7614717ee46.agent.localhost/list-files");

            console.log("========================================");
            console.log("response from list file tools", response.data);
            console.log("========================================");
            return JSON.stringify(response.data.files);
        } catch (error) {
            console.error("Error executing list_files tool:", error.message);
            return `Error listing files: ${error.message}`;
        }
    },
    {
        name: "list_files",
        description: "List all files in the project directory. This is useful for understanding what files are available to work with.",
        schema: z.object({})
    }
)

export const readFiles = tool(

    async ({ files }) => {
        console.log("========================================");
        console.log("using read_files tool", files);
        console.log("========================================");

        try {
            const response = await axios.get("http://01a01ba2-aa65-77f0-9a54-a7614717ee46.agent.localhost/read-files?files=" + files.join(","));

            console.log("========================================");
            console.log("response from read file tools", response.data);
            console.log("========================================");

            return JSON.stringify(response.data);
        } catch (error) {
            console.error("Error executing read_files tool:", error.message);
            return `Error reading files: ${error.message}`;
        }
    },
    {
        name: "read_files",
        description: "Read the contents of specified files. This is useful for understanding the contents of files that are relevant to the task at hand.",
        schema: z.object({
            files: z.array(z.string()).describe("The list of files absolute paths to read. These should be files that were listed using the list_files tool or created later")
        })
    }
)

export const updateFiles = tool(
    async ({ files }) => {
        console.log("========================================");
        console.log("using update_files tool", files);
        console.log("========================================");
        try {
            const response = await axios.patch("http://01a01ba2-aa65-77f0-9a54-a7614717ee46.agent.localhost/update-files", {
                updates: files
            });

            console.log("========================================");
            console.log("response from update file tools", response.data);
            console.log("========================================");

            return JSON.stringify(response.data.files || response.data.results);
        } catch (error) {
            console.error("Error executing update_files tool:", error.message);
            return `Error updating files: ${error.message}`;
        }
    },
    {
        name: "update_files",
        description: "Update the contents of specified files. This is useful for making changes to files based on the requirements of the task at hand. This tool can also use to create new files by providing a new file name in the file field and the content to be added in the content field.",
        schema: z.object({
            files: z.array(z.object({
                file: z.string().describe("The absolute path of the file to update"),
                content: z.string().describe("The new content for the file")
            })).describe("The list of files to update and their new contents")
        })
    }
)