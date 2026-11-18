#!/usr/bin/env node
// packages/render-engine/package.json
var package_default = {
  name: "@videoengine/render-engine",
  version: "0.1.0",
  private: true,
  type: "module",
  exports: {
    ".": "./src/index.ts"
  },
  engines: {
    node: ">=22.18.0"
  },
  scripts: {
    typecheck: "tsc --noEmit",
    build: "echo 'render-engine: source-only package, nothing to build'"
  },
  dependencies: {
    "@hyperframes/producer": "0.9.58",
    "@puppeteer/browsers": "3.2.7"
  },
  devDependencies: {
    "@types/node": "26.6.6",
    "@videoengine/config": "workspace:*",
    typescript: "7.0.2"
  }
};

// packages/render-engine/src/connect.ts
import { execFile } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { homedir, hostname } from "node:os";
import { dirname, join } from "node:path";
var CLIENT_ID = "videoengine-render-engine";
var WEB_URL = (process.env.VIDEOENGINE_WEB_URL ?? "https://video.ariva.cloud").replace(/\/+$/, "");
var API_URL = (process.env.VIDEOENGINE_API_URL ?? "https://video-api.ariva.cloud").replace(/\/+$/, "");
var CREDENTIALS_PATH = join(homedir(), ".config", "videoengine", "render-engine.json");
async function readCredentials() {
  try {
    return JSON.parse(await readFile(CREDENTIALS_PATH, "utf8"));
  } catch {
    return null;
  }
}
async function postJson(url, body, bearer) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...bearer ? { authorization: `Bearer ${bearer}` } : {}
    },
    body: JSON.stringify(body)
  });
  return { res, json: await res.json().catch(() => ({})) };
}
function openBrowser(url) {
  const [command, args] = process.platform === "darwin" ? ["open", [url]] : process.platform === "win32" ? ["cmd", ["/c", "start", "", url]] : ["xdg-open", [url]];
  execFile(command, args, () => {});
}
var sleep = (ms) => new Promise((done) => setTimeout(done, ms));
async function connect(log = console.log) {
  const { res, json: code } = await postJson(`${WEB_URL}/api/auth/device/code`, {
    client_id: CLIENT_ID
  });
  if (!res.ok)
    throw new Error(`Could not start sign-in (${res.status}).`);
  const userCode = String(code.user_code);
  const link = String(code.verification_uri_complete ?? code.verification_uri);
  log(`Your code: ${userCode.slice(0, 4)}-${userCode.slice(4)}`);
  log(`Approve it in your browser: ${link}`);
  openBrowser(link);
  let interval = Number(code.interval ?? 5) * 1000;
  let sessionToken;
  while (!sessionToken) {
    await sleep(interval);
    const { json } = await postJson(`${WEB_URL}/api/auth/device/token`, {
      grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      device_code: code.device_code,
      client_id: CLIENT_ID
    });
    if (typeof json.access_token === "string")
      sessionToken = json.access_token;
    else if (json.error === "slow_down")
      interval += 5000;
    else if (json.error === "access_denied")
      throw new Error("The sign-in was declined.");
    else if (json.error === "expired_token")
      throw new Error("The code ran out. Run connect again.");
    else if (json.error !== "authorization_pending") {
      throw new Error(`Sign-in failed: ${String(json.error_description ?? json.error)}`);
    }
  }
  const previous = await readCredentials();
  const name = hostname();
  const { res: made, json: token } = await postJson(`${API_URL}/render-tokens`, { name }, sessionToken);
  if (!made.ok) {
    const error = token.error;
    throw new Error(error?.message ?? `Could not connect this computer (${made.status}).`);
  }
  const credentials = {
    apiUrl: API_URL,
    token: String(token.token),
    tokenId: String(token.id),
    name,
    organizationName: typeof token.organizationName === "string" ? token.organizationName : null
  };
  await mkdir(dirname(CREDENTIALS_PATH), { recursive: true });
  await writeFile(CREDENTIALS_PATH, JSON.stringify(credentials, null, 2), { mode: 384 });
  if (previous)
    await revoke(previous).catch(() => {});
  return credentials;
}
async function revoke(credentials) {
  const res = await fetch(`${credentials.apiUrl}/render-tokens/current`, {
    method: "DELETE",
    headers: { authorization: `Bearer ${credentials.token}` }
  });
  if (!res.ok && res.status !== 401)
    throw new Error(`Could not sign out (${res.status}).`);
}
async function signOut() {
  const credentials = await readCredentials();
  if (!credentials)
    return false;
  await revoke(credentials);
  await rm(CREDENTIALS_PATH, { force: true });
  return true;
}

// packages/render-engine/src/start.ts
import { setTimeout as sleep2 } from "node:timers/promises";

// packages/render-engine/src/binaries.ts
import { execFile as execFile2 } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { chmod, mkdir as mkdir2, mkdtemp, readdir, rename, rm as rm2, writeFile as writeFile2 } from "node:fs/promises";
import { homedir as homedir2, release } from "node:os";
import { join as join2, resolve } from "node:path";
import { promisify } from "node:util";
import { Browser, install } from "@puppeteer/browsers";
var run = promisify(execFile2);
var CHROME_VERSION = "152.0.7977.30";
var BTBN = "https://github.com/BtbN/FFmpeg-Builds/releases/download/autobuild-2026-02-28-12-59/ffmpeg-n8.0.1-66-g27b8d1a017";
var RIEDL = "https://ffmpeg.martin-riedl.de/download/macos";
var FFMPEG = {
  "darwin-arm64": {
    name: "riedl-8.0.1-arm64-1766430132",
    archives: [
      {
        url: `${RIEDL}/arm64/1766430132_8.0.1/ffmpeg.zip`,
        sha256: "c56f4e2b2ce26a61becf890d8da3415347a1d7d4418cb514915f21612358b790"
      },
      {
        url: `${RIEDL}/arm64/1766430132_8.0.1/ffprobe.zip`,
        sha256: "ad74fb26500f9a67864611856a655636d910b47a21c9ee2f2f7bc7cbaa45bbb2"
      }
    ]
  },
  "darwin-x64": {
    name: "riedl-8.0.1-x64-1766437297",
    archives: [
      {
        url: `${RIEDL}/amd64/1766437297_8.0.1/ffmpeg.zip`,
        sha256: "a6c41c69e829697e408308f1ecd6acdfd0d0a84973ff3a6bf782beba83885ed6"
      },
      {
        url: `${RIEDL}/amd64/1766437297_8.0.1/ffprobe.zip`,
        sha256: "a09b01e8f54ccdbeb661d48952f412edb858860b38ec7fd1c3901a645e3a3b04"
      }
    ]
  },
  "linux-x64": {
    name: "btbn-n8.0.1-66-g27b8d1a017-linux64",
    archives: [
      {
        url: `${BTBN}-linux64-gpl-8.0.tar.xz`,
        sha256: "26d2ecd0cefba99f9d1ea92252a3a4f743a58df4c1c3cf9f8bbaaa40b1fca5b0"
      }
    ]
  },
  "win32-x64": {
    name: "btbn-n8.0.1-66-g27b8d1a017-win64",
    archives: [
      {
        url: `${BTBN}-win64-gpl-8.0.zip`,
        sha256: "e1f9fc491ef1969e666cfe36ec1d6c02b53baf49df800d5256eda10c942b1251"
      }
    ]
  }
};
var BROWSER_PATH_VARS = [
  "HYPERFRAMES_BROWSER_PATH",
  "PRODUCER_HEADLESS_SHELL_PATH",
  "PUPPETEER_EXECUTABLE_PATH"
];
async function prepareBinaries(onStatus = () => {}) {
  const platform = `${process.platform}-${process.arch}`;
  const build = FFMPEG[platform];
  if (!build) {
    throw new Error(`Rendering on ${platform} is not supported yet: macOS, Linux (x64) and Windows (x64) are.`);
  }
  if (process.platform === "darwin" && Number.parseInt(release(), 10) < 22) {
    throw new Error("Rendering on this Mac needs macOS 13 or newer.");
  }
  for (const name of BROWSER_PATH_VARS)
    delete process.env[name];
  const hyperframesCache = process.env.HYPERFRAMES_CACHE_DIR ? resolve(process.env.HYPERFRAMES_CACHE_DIR) : join2(homedir2(), ".cache", "hyperframes");
  onStatus(`Checking Chrome ${CHROME_VERSION}`);
  await install({
    browser: Browser.CHROMEHEADLESSSHELL,
    buildId: CHROME_VERSION,
    cacheDir: join2(hyperframesCache, "chrome")
  });
  const exe = process.platform === "win32" ? ".exe" : "";
  const dir = join2(homedir2(), ".cache", "videoengine", "ffmpeg", build.name);
  const ffmpeg = join2(dir, `ffmpeg${exe}`);
  const ffprobe = join2(dir, `ffprobe${exe}`);
  if (!existsSync(ffmpeg) || !existsSync(ffprobe)) {
    onStatus("Downloading FFmpeg 8.0.1");
    await downloadFfmpeg(build, dir, exe);
  }
  const { stdout } = await run(ffmpeg, ["-hide_banner", "-version"]);
  if (!stdout.includes("8.0.1"))
    throw new Error(`Unexpected FFmpeg at ${ffmpeg}: ${stdout}`);
  process.env.HYPERFRAMES_FFMPEG_PATH = ffmpeg;
  process.env.HYPERFRAMES_FFPROBE_PATH = ffprobe;
  return { ffmpeg, ffprobe };
}
async function downloadFfmpeg(build, dir, exe) {
  await mkdir2(join2(dir, ".."), { recursive: true });
  const work = await mkdtemp(`${dir}.partial-`);
  try {
    const unpacked = join2(work, "unpacked");
    await mkdir2(unpacked);
    for (const [index, archive] of build.archives.entries()) {
      const res = await fetch(archive.url);
      if (!res.ok)
        throw new Error(`Download failed (${res.status}): ${archive.url}`);
      const bytes = Buffer.from(await res.arrayBuffer());
      const sha256 = createHash("sha256").update(bytes).digest("hex");
      if (sha256 !== archive.sha256)
        throw new Error(`Checksum mismatch for ${archive.url}`);
      const file = join2(work, `archive-${index}${archive.url.slice(archive.url.lastIndexOf("."))}`);
      await writeFile2(file, bytes);
      await run("tar", ["-xf", file, "-C", unpacked]).catch((error) => {
        throw new Error(`Could not unpack ${archive.url} (on Linux, install xz-utils): ${error.message}`);
      });
    }
    const out = join2(work, "bin");
    await mkdir2(out);
    for (const name of [`ffmpeg${exe}`, `ffprobe${exe}`]) {
      const found = await findFile(unpacked, name);
      if (!found)
        throw new Error(`${name} is missing from the FFmpeg download`);
      await rename(found, join2(out, name));
      await chmod(join2(out, name), 493);
    }
    await rm2(dir, { recursive: true, force: true });
    await rename(out, dir);
  } finally {
    await rm2(work, { recursive: true, force: true });
  }
}
async function findFile(dir, name) {
  for (const entry of await readdir(dir, { withFileTypes: true, recursive: true })) {
    if (entry.isFile() && entry.name === name)
      return join2(entry.parentPath, entry.name);
  }
  return;
}

// packages/render-engine/src/jobs.ts
import { createWriteStream, openAsBlob } from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

class StopJob extends Error {
}

class TokenRefused extends Error {
}
async function check(res, what) {
  if (res.ok)
    return res;
  const body = await res.json().catch(() => null);
  const message = body?.error?.message ?? `HTTP ${res.status}`;
  if (res.status === 409)
    throw new StopJob(`${what}: ${message}`);
  if (res.status === 401)
    throw new TokenRefused(`${what}: ${message}`);
  throw new Error(`${what}: ${message}`);
}
function jobsApi(connection) {
  const apiUrl = connection.apiUrl.replace(/\/+$/, "");
  const headers = (job, extra = {}) => ({
    authorization: `Bearer ${connection.token}`,
    ...job ? { "x-render-attempt": String(job.attempt) } : {},
    ...extra
  });
  return {
    async claim(worker, backend) {
      const res = await fetch(`${apiUrl}/render-jobs/claim`, {
        method: "POST",
        headers: headers(undefined, { "content-type": "application/json" }),
        body: JSON.stringify({ worker, backend })
      });
      if (res.status === 204)
        return null;
      return await (await check(res, "claim")).json();
    },
    async downloadFile(job, path, dest) {
      const encoded = path.split("/").map(encodeURIComponent).join("/");
      const res = await check(await fetch(`${apiUrl}/render-jobs/${job.id}/files/${encoded}`, { headers: headers(job) }), `download ${path}`);
      if (!res.body)
        throw new Error(`download ${path}: empty body`);
      await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
    },
    async report(job, stage, progress) {
      await check(await fetch(`${apiUrl}/render-jobs/${job.id}/progress`, {
        method: "POST",
        headers: headers(job, { "content-type": "application/json" }),
        body: JSON.stringify({
          stage,
          progress: Math.max(0, Math.min(100, Math.round(progress)))
        })
      }), "progress");
    },
    async upload(job, mp4Path, durationMs) {
      await check(await fetch(`${apiUrl}/render-jobs/${job.id}/output`, {
        method: "PUT",
        headers: headers(job, {
          "content-type": "video/mp4",
          "x-render-duration-ms": String(Math.round(durationMs))
        }),
        body: await openAsBlob(mp4Path, { type: "video/mp4" })
      }), "upload");
    },
    async fail(job, error, retry) {
      await check(await fetch(`${apiUrl}/render-jobs/${job.id}/fail`, {
        method: "POST",
        headers: headers(job, { "content-type": "application/json" }),
        body: JSON.stringify({ error: error.slice(0, 2000), retry })
      }), "fail");
    }
  };
}

// packages/render-engine/src/run-job.ts
import { mkdir as mkdir3, mkdtemp as mkdtemp2, rm as rm3 } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname as dirname2, join as join3, resolve as resolve2, sep } from "node:path";

// packages/render-engine/src/render.ts
import { createRenderJob, executeRenderJob, RenderCancelledError } from "@hyperframes/producer";

// packages/render-engine/src/settings.ts
import { resolveConfig } from "@hyperframes/producer";
var FPS = 30;
var OUTPUT = {
  format: "mp4",
  quality: "standard",
  maxBitrate: "20M",
  keyframeIntervalSeconds: 2
};
var engineConfig = resolveConfig({
  browserGpuMode: "software",
  forceScreenshot: false,
  beginFrameFirstFrameDeadlineMs: 20000
});

// packages/render-engine/src/render.ts
class CompositionError extends Error {
}
async function renderFolder(options) {
  const job = createRenderJob({
    fps: FPS,
    ...OUTPUT,
    maxRenderMs: options.maxMs,
    workers: options.workers,
    producerConfig: engineConfig
  });
  try {
    await executeRenderJob(job, options.dir, options.output, (current) => options.onProgress(stageOf(current.stageProgress?.code), current.progress), options.signal);
  } catch (error) {
    if (error instanceof RenderCancelledError || options.signal.aborted)
      throw options.signal.reason;
    throw new CompositionError(error instanceof Error ? error.message : String(error));
  }
  const frames = job.totalFrames ?? job.framesRendered ?? 0;
  return { durationMs: frames / FPS * 1000 };
}
function stageOf(code) {
  if (code === "capture")
    return "capturing";
  if (code === "encode" || code === "assemble")
    return "encoding";
  return "preparing";
}

// packages/render-engine/src/run-job.ts
class Shutdown extends Error {
}
function log(job, message) {
  console.log(`[render ${job.id} #${job.attempt}] ${message}`);
}
async function runJob(job, options) {
  const { api, shutdown } = options;
  const render = options.render ?? ((o) => renderFolder(o));
  const controller = new AbortController;
  const stopOnShutdown = () => controller.abort(new Shutdown("The worker is shutting down."));
  shutdown.addEventListener("abort", stopOnShutdown);
  let stage = "preparing";
  let progress = 0;
  const reporter = setInterval(() => {
    api.report(job, stage, progress).catch((error) => {
      if (error instanceof StopJob)
        controller.abort(error);
      else
        log(job, `progress not sent: ${error.message}`);
    });
  }, options.reportSeconds * 1000);
  const dir = await mkdtemp2(join3(tmpdir(), "videoengine-render-"));
  const started = Date.now();
  try {
    log(job, `version ${job.versionNumber} of video ${job.videoId}, ${job.files.length} files`);
    const project = join3(dir, "project");
    for (const file of job.files) {
      controller.signal.throwIfAborted();
      const dest = resolve2(project, file.path);
      if (!dest.startsWith(project + sep))
        throw new Error(`Refused file path ${file.path}`);
      await mkdir3(dirname2(dest), { recursive: true });
      await api.downloadFile(job, file.path, dest);
    }
    const output = join3(dir, "video.mp4");
    const { durationMs } = await render({
      dir: project,
      output,
      workDir: join3(dir, "work"),
      signal: controller.signal,
      maxMs: options.maxMs,
      onProgress: (nextStage, value) => {
        stage = nextStage;
        progress = value * 0.95;
      }
    });
    stage = "uploading";
    progress = 95;
    controller.signal.throwIfAborted();
    await api.upload(job, output, durationMs);
    log(job, `done in ${Math.round((Date.now() - started) / 1000)} s`);
  } catch (error) {
    await settle(api, job, controller.signal.aborted ? controller.signal.reason : error);
  } finally {
    clearInterval(reporter);
    shutdown.removeEventListener("abort", stopOnShutdown);
    await rm3(dir, { recursive: true, force: true });
  }
}
async function settle(api, job, reason) {
  if (reason instanceof StopJob) {
    log(job, `stopped: ${reason.message}`);
    return;
  }
  const message = reason instanceof Error ? reason.message : String(reason);
  const retry = !(reason instanceof CompositionError);
  log(job, `${retry ? "will retry" : "failed"}: ${message}`);
  try {
    await api.fail(job, message, retry);
  } catch (error) {
    log(job, `failure not sent: ${error.message}`);
  }
}

// packages/render-engine/src/start.ts
var IDLE_SECONDS = 5;
var REPORT_SECONDS = 2;
var MAX_RENDER_MINUTES = 20;
async function start(log = console.log) {
  const credentials = await readCredentials();
  if (!credentials)
    throw new Error("This computer is not connected. Run connect first.");
  await prepareBinaries(log);
  const api = jobsApi(credentials);
  const shutdown = new AbortController;
  for (const name of ["SIGINT", "SIGTERM"]) {
    process.once(name, () => {
      log("Stopping…");
      shutdown.abort();
    });
  }
  const where = credentials.organizationName ? ` in ${credentials.organizationName}` : "";
  log(`Rendering your videos${where} on ${credentials.name}. Leave this running; Ctrl+C stops it.`);
  while (!shutdown.signal.aborted) {
    try {
      const job = await api.claim(credentials.name);
      if (job) {
        await runJob(job, {
          api,
          shutdown: shutdown.signal,
          reportSeconds: REPORT_SECONDS,
          maxMs: MAX_RENDER_MINUTES * 60000
        });
        continue;
      }
    } catch (error) {
      if (error instanceof TokenRefused) {
        throw new Error("This computer was disconnected. Run connect to connect it again.");
      }
      log(`Could not reach AI Video Engine: ${error.message}`);
    }
    await sleep2(IDLE_SECONDS * 1000, undefined, { signal: shutdown.signal }).catch(() => {});
  }
  log("Stopped.");
}

// packages/render-engine/src/cli.ts
var command = process.argv[2];
try {
  if (command === "connect") {
    const credentials = await connect();
    const where = credentials.organizationName ? ` in ${credentials.organizationName}` : "";
    console.log(`Connected ${credentials.name}${where}. Saved in ${CREDENTIALS_PATH}.`);
  } else if (command === "start") {
    await start();
  } else if (command === "--version" || command === "version") {
    console.log(package_default.version);
  } else if (command === "sign-out") {
    console.log(await signOut() ? "Signed out." : "This computer was not connected.");
  } else {
    console.log("Usage: render-engine connect | start | sign-out | --version");
    process.exitCode = command ? 1 : 0;
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
