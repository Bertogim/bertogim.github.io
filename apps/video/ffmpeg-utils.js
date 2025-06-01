// Configuración inicial
const CORE_VERSION = "0.12.6";
const FFMPEG_VERSION = "0.12.10";
const baseURLFFMPEG = `https://unpkg.com/@ffmpeg/ffmpeg@${FFMPEG_VERSION}/dist/umd`;
const baseURLCore = `https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/umd`;
const baseURLCoreMT = `https://unpkg.com/@ffmpeg/core-mt@${CORE_VERSION}/dist/umd`;

let ffmpeg = null;
let ffmpegLogs = [];
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
    parsedData = {}; // Reset parsed progress

    ffmpeg.on('log', ({ message }) => {
        ffmpegLogs.push(message);

        // Example log line: frame= 260 fps=85 q=31.0 size=256kB time=00:00:10.90 bitrate=192.4kbits/s speed=3.56x
        const regex = /frame=\s*(\d+).*?fps=\s*([\d.]+).*?q=\s*([\d.\-]+).*?size=\s*([\d.kMG]+B).*?time=\s*([\d:.]+).*?bitrate=\s*([\d.\-k]+bits\/s).*?speed=\s*([\d.]+)x/;
        const match = message.match(regex);

        if (match) {
            parsedData = {
                frame: parseInt(match[1]),
                fps: parseFloat(match[2]),
                q: parseFloat(match[3]),
                size: match[4],
                time: match[5],
                bitrate: match[6],
                speed: parseFloat(match[7])
            };
        } else {
            //console.warn("Can't regex ffmpeg message, message: "+message)
            console.log(message)
        }
    });

    const exitCode = await ffmpeg.exec(args);
    if (exitCode !== 0) {
        throw new Error(`FFmpeg failed with code ${exitCode}`);
    }

    return ffmpegLogs;
}
