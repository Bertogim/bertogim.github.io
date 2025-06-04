// Configuración inicial
const CORE_VERSION = "0.12.6";
const FFMPEG_VERSION = "0.12.10";
const baseURLFFMPEG = `https://unpkg.com/@ffmpeg/ffmpeg@${FFMPEG_VERSION}/dist/umd`;
const baseURLCore = `https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/umd`;
const baseURLCoreMT = `https://unpkg.com/@ffmpeg/core-mt@${CORE_VERSION}/dist/umd`;

let ffmpeg = null;
let ffmpegLogs = "";
let ffmpegLoaded = false;



async function toBlobURL(url, mimeType, cb) {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Failed to fetch ${url}`);

    const total = parseInt(resp.headers.get('Content-Length') || 0);
    let loaded = 0;
    const reader = resp.body.getReader();
    const chunks = [];

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        loaded += value.length;
        cb && cb({ url, total, received: loaded, delta: value.length, done: false });
    }

    const blob = new Blob(chunks, { type: mimeType });
    cb && cb({ url, total, received: loaded, delta: 0, done: true });
    return URL.createObjectURL(blob);
}

async function toBlobURLPatched(url, mimeType, patcher) {
    const resp = await fetch(url);
    const body = await resp.text();
    const patchedBody = patcher ? patcher(body) : body;
    const blob = new Blob([patchedBody], { type: mimeType });
    return URL.createObjectURL(blob);
}














// Carga FFmpeg (versión WASM)
export async function initializeFFmpeg(multiThread) {
    if (ffmpegLoaded == false) {
        try {
            console.log("Initializing FFmpeg...");
            let logCounter = 0;
            let lastProgress = null;

            await load(multiThread, (progress) => {
                lastProgress = progress;
                if (++logCounter % 100 === 0) {
                    console.log(`Loading FFmpeg: ${(progress.received / 1048576).toFixed(2)} MB`);
                }
            });

            if (lastProgress) {
                console.log(`FFmpeg fully loaded: ${(lastProgress.received / 1048576).toFixed(2)} MB`);
            }


            console.log("FFmpeg loaded successfully");
            ffmpegLoaded = true;
        } catch (error) {
            console.error("Failed to load FFmpeg:", error);
        }
    }
}

// Función interna `load` (configuración core)
export const load = async (multiThread, cb) => {
    const ffmpegBlobURL = await toBlobURLPatched(
        `${baseURLFFMPEG}/ffmpeg.js`,
        'text/javascript',
        (js) => js.replace('new URL(e.p+e.u(814),e.b)', 'r.workerLoadURL')
    );
    await import(ffmpegBlobURL);
    ffmpeg = new FFmpegWASM.FFmpeg();

    console.log("🚀 SharedArrayBuffer available:", typeof SharedArrayBuffer !== 'undefined');
    console.log("🛡️ crossOriginIsolated:", window.crossOriginIsolated);

    if (typeof SharedArrayBuffer === 'undefined' || !window.crossOriginIsolated) {
        console.warn("⚠️ Your environment is NOT ready for multithreaded FFmpeg (WASM).");
        console.warn("🔐 Required HTTP headers:");
        console.warn("  Cross-Origin-Opener-Policy: same-origin");
        console.warn("  Cross-Origin-Embedder-Policy: require-corp");
        console.warn("👉 These only work over HTTPS or localhost.");
    } else {
        console.log("✅ Environment supports FFmpeg multithreading (core-mt).");
    }


    // Configuración multi-thread o single-thread
    if (multiThread && window.crossOriginIsolated) {
        console.log("multi-threaded");

        await ffmpeg.load({
            workerLoadURL: await toBlobURL(`${baseURLFFMPEG}/814.ffmpeg.js`, 'text/javascript', cb),
            coreURL: await toBlobURL(`${baseURLCoreMT}/ffmpeg-core.js`, 'text/javascript', cb),
            wasmURL: await toBlobURL(`${baseURLCoreMT}/ffmpeg-core.wasm`, 'application/wasm', cb),
            workerURL: await toBlobURL(`${baseURLCoreMT}/ffmpeg-core.worker.js`, 'application/javascript', cb),
        });
    } else {
        console.log("single-threaded");

        await ffmpeg.load({
            workerLoadURL: await toBlobURL(`${baseURLFFMPEG}/814.ffmpeg.js`, 'text/javascript', cb),
            coreURL: await toBlobURL(`${baseURLCore}/ffmpeg-core.js`, 'text/javascript', cb),
            wasmURL: await toBlobURL(`${baseURLCore}/ffmpeg-core.wasm`, 'application/wasm', cb),
        });
    }
};

export async function createDirs(paths) {
    if (!Array.isArray(paths)) {
        paths = [paths]; // Asegura que siempre sea un array
    }
    for (const path of paths) {
        await ffmpeg.createDir(path); // Crear directorio
    }
}


// Montar un archivo real en el sistema de archivos virtual
export async function mountFile(videoFile, path) {
    await ffmpeg.mount('WORKERFS', { files: [videoFile] }, path); // Montar archivo
    return `${path}/${videoFile.name}`; // Ruta virtual
}

// Eliminar archivos/directorios virtuales
export async function unmountPaths(paths) {
    if (!Array.isArray(paths)) {
        paths = [paths]; // Asegura que siempre sea un array
    }

    for (const path of paths) {
        await ffmpeg.unmount(path).catch(() => { });
        await ffmpeg.deleteDir(path).catch(() => { });
    }
}

// Leer un archivo del sistema virtual
export async function readVirtualFile(virtualPath) {
    const fileData = await ffmpeg.readFile(virtualPath);
    return new Blob([fileData.buffer], { type: 'video/mp4' });
}



let parsedData = {};

export function getRunData() {
    return parsedData; // Returns the last parsed progress data
}

export async function runFFmpegCommand(args) {
    let ffmpegError = null;

    parsedData = {
        frame: null,
        fps: null,
        q: null,
        size: null,
        time: null,
        bitrate: null,
        speed: "?",
    }; // Reset parsed progress

    
    let localFFmpegLogs = "";


    ffmpeg.on('log', ({ message }) => {
        ffmpegLogs += message + '\n';
        localFFmpegLogs += message + '\n';

        // Language selection: 'EN' or 'ES'
        const lang = localStorage.getItem('selectedLanguage') || 'en';

        // ERROR MESSAGES

        if (message.includes('does not contain any stream')) {
            ffmpegError = lang === 'es'
                ? 'Este archivo no contiene audio que se pueda convertir.'
                : 'This file does not contain any audio stream to convert.';
        }

        if (message.includes('Invalid data found') || message.includes('could not find codec')) {
            ffmpegError = lang === 'es'
                ? 'El archivo de entrada no es válido o está dañado.'
                : 'The input file is invalid or corrupted.';
        }

        if (message.includes('No such file or directory')) {
            ffmpegError = lang === 'es'
                ? 'El archivo especificado no se encontró.'
                : 'The specified file was not found.';
        }

        if (message.toLowerCase().includes('deprecated pixel format used')) {
            // This warning is usually harmless, so we may ignore it or log it as a minor issue.
        }








        // Example log line: frame= 260 fps=85 q=31.0 size=256kB time=00:00:10.90 bitrate=192.4kbits/s speed=3.56x
        const frameMatch = message.match(/frame=\s*(\d+)/);
        const fpsMatch = message.match(/fps=\s*([\d.]+)/);
        const qMatch = message.match(/q=\s*([\d.\-]+)/);
        const sizeMatch = message.match(/size=\s*([\d.kMG]+B)/);
        const timeMatch = message.match(/time=\s*([\d:.]+)/);
        const bitrateMatch = message.match(/bitrate=\s*([\d.\-k]+bits\/s)/);
        const speedMatch = message.match(/speed=\s*([\d.]+)x/);

        if (
            frameMatch || fpsMatch || qMatch ||
            sizeMatch || timeMatch || bitrateMatch || speedMatch
        ) {
            parsedData = {
                frame: frameMatch ? parseInt(frameMatch[1], 10) : null,
                fps: fpsMatch ? parseFloat(fpsMatch[1]) : null,
                q: qMatch ? parseFloat(qMatch[1]) : null,
                size: sizeMatch ? sizeMatch[1] : null,
                time: timeMatch ? timeMatch[1] : null,
                bitrate: bitrateMatch ? bitrateMatch[1] : null,
                speed: speedMatch ? parseFloat(speedMatch[1]) : "?",
            };

        } else {
            //console.warn("Can't regex ffmpeg message, message: "+message)
            console.log(message)
        }
    });

    try {
        console.log("Running FFmpeg with args:", args.join(' '));
        console.trace();

        const exitCode = await ffmpeg.exec(args);
        if (exitCode !== 0 && !ffmpegError) {
            alert("General error, exit code " + exitCode);
            throw new Error(`FFmpeg failed with code ${exitCode}`);
        }

        if (ffmpegError) {
            alert(ffmpegError);  // Show user-friendly message
            throw new Error(ffmpegError);  // Stop further processing
        }
    } catch (err) {
        console.error('FFmpeg execution failed:', err);
        alert(lang === 'ES'
            ? 'Ocurrió un error al procesar el video.'
            : 'An error occurred while processing the video.');
    }

    return localFFmpegLogs;
}

export async function getLastFrameFromVideo(videoPath) {
    //Averages to only 75x speed, bad for long videos
    //Pretty accurate

    return new Promise(async (resolve, reject) => {
        let lastFrame = null;


        // Run FFmpeg command with the provided video file
        const args = [
            '-i', videoPath,
            '-map', '0:v:0',
            '-c', 'copy',
            '-f', 'null',
            '-y', '-' // Output to null device
        ];


        try {
            // Running FFmpeg command and capturing logs
            let ffmpegLogs = await runFFmpegCommand(args);

            // Regular expression to match frame numbers in the logs
            const frameRegex = /frame=\s*(\d+)/g;
            let match;

            // Loop through all log lines and find the last frame number
            while ((match = frameRegex.exec(ffmpegLogs)) !== null) {
                lastFrame = match[1]; // Capture the last matched frame
            }

            // Resolve with the last frame
            if (lastFrame !== null) {
                resolve(lastFrame);
            } else {
                reject('No frame data found in logs.');
            }
        } catch (error) {
            reject(`Error running FFmpeg: ${error.message}`);
        }
    });
}
export async function estimateTotalFrames(videoPath) {
    return new Promise(async (resolve, reject) => {
        let ffmpegLogs = "";

        const SAMPLE_DURATION = 30; // 2 minutes


        const args = [
            '-i', videoPath,
            '-t', SAMPLE_DURATION.toString(),
            '-map', '0:v:0',
            '-c', 'copy',
            '-f', 'null',
            '-preset', 'ultrafast',
            '-y', '-'
        ];

        try {
            // Run FFmpeg and capture logs
            ffmpegLogs = await runFFmpegCommand(args);

            // Variables to store the latest frame and time values
            let lastFrame = 0;
            let lastTimeInSeconds = 0;

            // Regex to match both frame and time values from log lines
            const logRegex = /frame=\s*(\d+).*?time=(\d+):(\d+):(\d+\.\d+)/g;
            let match;

            // Iterate over all matches to find the last logged frame and time
            while ((match = logRegex.exec(ffmpegLogs)) !== null) {
                const frame = parseInt(match[1]);
                const h = parseInt(match[2]);
                const m = parseInt(match[3]);
                const s = parseFloat(match[4]);
                const seconds = h * 3600 + m * 60 + s;

                lastFrame = frame;
                lastTimeInSeconds = seconds;
            }

            if (lastTimeInSeconds === 0) {
                return reject("Could not calculate time from logs.");
            }

            // Extract the total duration from the logs
            const durationMatch = ffmpegLogs.match(/Duration: (\d+):(\d+):(\d+\.\d+)/);
            if (!durationMatch) return reject("No duration found in logs.");

            const [_, hours, minutes, seconds] = durationMatch;
            const totalDurationInSeconds =
                parseInt(hours) * 3600 +
                parseInt(minutes) * 60 +
                parseFloat(seconds);

            // Estimate the real FPS based on the last known frame and timestamp
            const estimatedFps = lastFrame / lastTimeInSeconds;

            // Estimate the total number of frames for the full video
            const estimatedTotalFrames = Math.round(estimatedFps * totalDurationInSeconds);

            resolve(estimatedTotalFrames);

        } catch (err) {
            reject(err);
        }

    });
}
