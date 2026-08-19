import express from 'express';
import morgan from 'morgan';
import fs from 'fs';
import path from 'path';

const WORKING_DIR = '/workspace';

const app = express();

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * Prevent access outside WORKING_DIR
 */
const getSafePath = (file) => {
    const resolvedPath = path.resolve(WORKING_DIR, file);

    if (
        resolvedPath !== WORKING_DIR &&
        !resolvedPath.startsWith(WORKING_DIR + path.sep)
    ) {
        throw new Error('Invalid file path');
    }

    return resolvedPath;
};

/**
 * @route GET /
 * @description Health check route
 */
app.get('/', (req, res) => {
    res.status(200).json({
        message: 'Hello from sandbox agent',
        status: 'success',
    });
});

/**
 * @route GET /list-files
 * @description Lists all files recursively inside WORKING_DIR.
 * Skips ignored directories.
 */
app.get('/list-files', async (req, res) => {
    const ignoredDirectories = new Set([
        'node_modules',
        '.git',
        'dist',
        '.agent',
    ]);

    const listFiles = async (dir) => {
        const entries = await fs.promises.readdir(dir, {
            withFileTypes: true,
        });

        const results = [];

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);

            // Skip ignored directories
            if (
                entry.isDirectory() &&
                ignoredDirectories.has(entry.name)
            ) {
                continue;
            }

            // Recursively enter directories
            if (entry.isDirectory()) {
                const nestedFiles = await listFiles(fullPath);

                results.push(...nestedFiles);
                continue;
            }

            // Add only files
            if (entry.isFile()) {
                results.push(
                    path.relative(WORKING_DIR, fullPath)
                );
            }
        }

        return results;
    };

    try {
        const files = await listFiles(WORKING_DIR);

        res.status(200).json({
            message: 'Files in working directory',
            files,
        });
    } catch (err) {
        res.status(500).json({
            message: 'Error listing files',
            error: err.message,
        });
    }
});

/**
 * @route GET /read-files
 * @description Reads contents of files specified in query parameter.
 *
 * Example:
 * /read-files?files=file1.txt,src/file2.txt
 */
app.get('/read-files', async (req, res) => {
    const files = req.query.files;

    if (!files) {
        return res.status(400).json({
            message: 'No files specified in query parameter',
            status: 'error',
        });
    }

    const fileList = files
        .split(',')
        .map((file) => file.trim())
        .filter(Boolean);

    const results = await Promise.all(
        fileList.map(async (file) => {
            try {
                const filePath = getSafePath(file);

                const content = await fs.promises.readFile(
                    filePath,
                    'utf-8'
                );

                return {
                    [file]: content,
                };
            } catch (err) {
                return {
                    [file]: `Error reading file: ${err.message}`,
                };
            }
        })
    );

    res.status(200).json({
        message: 'File contents',
        files: results,
    });
});

/**
 * @route PATCH /update-files
 * @description Updates existing files.
 *
 * Expected body:
 * {
 *   "updates": [
 *     {
 *       "file": "src/test.js",
 *       "content": "console.log('Hello')"
 *     }
 *   ]
 * }
 */
app.patch('/update-files', async (req, res) => {
    const updates = req.body.updates;

    if (!updates || !Array.isArray(updates)) {
        return res.status(400).json({
            message:
                'Invalid request body. Expected an "updates" array.',
            status: 'error',
        });
    }

    const results = await Promise.all(
        updates.map(async (update) => {
            const { file, content } = update;

            if (!file || content === undefined) {
                return {
                    [file || 'unknown']: 'Invalid file or content',
                };
            }

            try {
                const filePath = getSafePath(file);

                await fs.promises.mkdir(
                    path.dirname(filePath),
                    { recursive: true }
                );

                await fs.promises.writeFile(
                    filePath,
                    content,
                    'utf-8'
                );

                return {
                    [file]: 'File updated successfully',
                };
            } catch (err) {
                return {
                    [file]: `Error updating file: ${err.message}`,
                };
            }
        })
    );

    res.status(200).json({
        message: 'Files updated',
        files: results,
    });
});

/**
 * @route POST /create-files
 * @description Creates new files.
 *
 * Expected body:
 * {
 *   "files": [
 *     {
 *       "file": "src/test.js",
 *       "content": "console.log('Hello')"
 *     }
 *   ]
 * }
 */
app.post('/create-files', async (req, res) => {
    const files = req.body.files;

    if (!files || !Array.isArray(files)) {
        return res.status(400).json({
            message:
                'Invalid request body. Expected a "files" array.',
            status: 'error',
        });
    }

    const results = await Promise.all(
        files.map(async (fileObj) => {
            const { file, content } = fileObj;

            if (!file || content === undefined) {
                return {
                    [file || 'unknown']: 'Invalid file or content',
                };
            }

            try {
                const filePath = getSafePath(file);

                // Create nested directories automatically
                await fs.promises.mkdir(
                    path.dirname(filePath),
                    { recursive: true }
                );

                await fs.promises.writeFile(
                    filePath,
                    content,
                    'utf-8'
                );

                return {
                    [file]: 'File created successfully',
                };
            } catch (err) {
                return {
                    [file]: `Error creating file: ${err.message}`,
                };
            }
        })
    );

    res.status(201).json({
        message: 'Files created successfully',
        files: results,
    });
});

export default app;