"use client";

import { Button } from "@heroui/react";
import { useEffect, useEffectEvent, useRef, useState } from "react";

type PlaybackState = "stopped" | "playing" | "paused";

interface EulerFrame {
    index: number;
    yaw: number;
    pitch: number;
    roll: number;
}

interface Vec3 {
    x: number;
    y: number;
    z: number;
}

interface Face {
    indices: number[];
}

interface Mesh {
    vertices: Vec3[];
    faces: Face[];
    seamLines: number[][];
}

interface RGB {
    r: number;
    g: number;
    b: number;
}

interface ControlIconProps {
    className?: string;
}

const SAMPLE_FILE_URL = "/samples/right-shoe-standard-gait.csv";
const FRAME_DURATION_MS = 60;
const INITIAL_VIEW_YAW = -34;
const INITIAL_VIEW_PITCH = -18;
const INITIAL_VIEW_ZOOM = 1.12;
const MIN_ZOOM = 0.75;
const MAX_ZOOM = 1.8;
const SHOE_MESH = buildShoeMesh();
const ROOT_CLASS_NAME =
    "mt-4 space-y-4 rounded-2xl border border-separator bg-surface-secondary/40 p-4";
const HEADER_CLASS_NAME = "flex flex-col gap-2 md:flex-row md:items-start md:justify-between";
const TITLE_GROUP_CLASS_NAME = "space-y-1";
const ACTIONS_CLASS_NAME = "flex flex-wrap gap-2";
const CONTROL_BUTTON_CLASS_NAME =
    "flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white/90 shadow-md transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-45 dark:border-white/10 dark:bg-slate-900/85 dark:hover:bg-slate-900";
const PLAY_BUTTON_CLASS_NAME = `${CONTROL_BUTTON_CLASS_NAME} text-green-600 dark:text-green-400`;
const PAUSE_BUTTON_CLASS_NAME = `${CONTROL_BUTTON_CLASS_NAME} text-amber-500 dark:text-amber-300`;
const STOP_BUTTON_CLASS_NAME = `${CONTROL_BUTTON_CLASS_NAME} text-red-600 dark:text-red-400`;
const VIEWER_BASE_CLASS_NAME =
    "relative h-80 touch-none overflow-hidden rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-surface-secondary to-background";
const VIEWER_GLOW_CLASS_NAME =
    "pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(189,233,165,0.28),transparent_55%)]";
const VIEWER_HIGHLIGHT_CLASS_NAME =
    "pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-white/14 to-transparent";
const READOUT_CLASS_NAME =
    "pointer-events-none absolute right-4 top-4 rounded-full bg-black/25 px-3 py-1 text-xs font-medium text-white backdrop-blur";
const CONTROL_WRAPPER_CLASS_NAME = "pointer-events-none absolute left-4 top-4 flex justify-start";
const CONTROL_STACK_CLASS_NAME =
    "pointer-events-auto flex flex-col items-center gap-2 rounded-[1.5rem] border border-white/15 bg-black/30 p-2 shadow-lg backdrop-blur-md";
const PROGRESS_CLASS_NAME = "space-y-2";
const PROGRESS_LABEL_CLASS_NAME = "flex items-center justify-between text-xs font-medium";
const PROGRESS_INPUT_CLASS_NAME = "accent-accent h-2 w-full cursor-pointer";

const UPPER_COLOR: RGB = { r: 124, g: 170, b: 94 };
const TOP_COLOR: RGB = { r: 148, g: 194, b: 116 };
const HEEL_COLOR: RGB = { r: 90, g: 127, b: 69 };
const SOLE_COLOR: RGB = { r: 233, g: 238, b: 228 };
const OUTLINE_COLOR = "rgba(19, 31, 22, 0.18)";
const GRID_COLOR = "rgba(255, 255, 255, 0.12)";
const SHADOW_COLOR = "rgba(17, 24, 39, 0.18)";

const DEFAULT_FRAME: EulerFrame = {
    index: 0,
    yaw: 0,
    pitch: 0,
    roll: 0,
};

function PlayIcon({ className = "h-4 w-4" }: Readonly<ControlIconProps>) {
    return (
        <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className={className}
            fill="currentColor"
        >
            <path d="M8 6.5v11l9-5.5-9-5.5Z" />
        </svg>
    );
}

function PauseIcon({ className = "h-4 w-4" }: Readonly<ControlIconProps>) {
    return (
        <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className={className}
            fill="currentColor"
        >
            <path d="M7 6h3v12H7zM14 6h3v12h-3z" />
        </svg>
    );
}

function StopIcon({ className = "h-4 w-4" }: Readonly<ControlIconProps>) {
    return (
        <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className={className}
            fill="currentColor"
        >
            <path d="M7 7h10v10H7z" />
        </svg>
    );
}

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}

function gaussian(t: number, center: number, spread: number) {
    const delta = t - center;
    return Math.exp(-(delta * delta) / (2 * spread * spread));
}

function toRadians(value: number) {
    return (value * Math.PI) / 180;
}

function add(a: Vec3, b: Vec3): Vec3 {
    return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function subtract(a: Vec3, b: Vec3): Vec3 {
    return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function scale(vector: Vec3, factor: number): Vec3 {
    return {
        x: vector.x * factor,
        y: vector.y * factor,
        z: vector.z * factor,
    };
}

function dot(a: Vec3, b: Vec3) {
    return a.x * b.x + a.y * b.y + a.z * b.z;
}

function cross(a: Vec3, b: Vec3): Vec3 {
    return {
        x: a.y * b.z - a.z * b.y,
        y: a.z * b.x - a.x * b.z,
        z: a.x * b.y - a.y * b.x,
    };
}

function length(vector: Vec3) {
    return Math.hypot(vector.x, vector.y, vector.z);
}

function normalize(vector: Vec3): Vec3 {
    const vectorLength = length(vector);
    if (vectorLength === 0) {
        return { x: 0, y: 0, z: 0 };
    }

    return scale(vector, 1 / vectorLength);
}

function rotateX(vector: Vec3, angle: number): Vec3 {
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);

    return {
        x: vector.x,
        y: vector.y * cosine - vector.z * sine,
        z: vector.y * sine + vector.z * cosine,
    };
}

function rotateY(vector: Vec3, angle: number): Vec3 {
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);

    return {
        x: vector.x * cosine + vector.z * sine,
        y: vector.y,
        z: -vector.x * sine + vector.z * cosine,
    };
}

function rotateZ(vector: Vec3, angle: number): Vec3 {
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);

    return {
        x: vector.x * cosine - vector.y * sine,
        y: vector.x * sine + vector.y * cosine,
        z: vector.z,
    };
}

function mixColor(color: RGB, amount: number, target: RGB): RGB {
    return {
        r: Math.round(color.r + (target.r - color.r) * amount),
        g: Math.round(color.g + (target.g - color.g) * amount),
        b: Math.round(color.b + (target.b - color.b) * amount),
    };
}

function shadeColor(color: RGB, factor: number): string {
    const constrained = clamp(factor, 0.15, 1.35);
    const red = Math.round(clamp(color.r * constrained, 0, 255));
    const green = Math.round(clamp(color.g * constrained, 0, 255));
    const blue = Math.round(clamp(color.b * constrained, 0, 255));
    return `rgb(${red}, ${green}, ${blue})`;
}

function chooseFaceColor(center: Vec3, normal: Vec3): RGB {
    if (center.y < -0.06) {
        return SOLE_COLOR;
    }

    if (center.x < -1.05) {
        return HEEL_COLOR;
    }

    if (normal.y > 0.42) {
        return TOP_COLOR;
    }

    return UPPER_COLOR;
}

function transformModelVertex(vertex: Vec3, frame: EulerFrame): Vec3 {
    let transformed = rotateX(vertex, toRadians(frame.roll));
    transformed = rotateZ(transformed, toRadians(frame.pitch));
    transformed = rotateY(transformed, toRadians(frame.yaw));

    return add(transformed, { x: 0, y: 0.54, z: 0 });
}

function applyView(vertex: Vec3, viewYaw: number, viewPitch: number): Vec3 {
    let transformed = rotateY(vertex, toRadians(viewYaw));
    transformed = rotateX(transformed, toRadians(viewPitch));
    return transformed;
}

function projectPoint(
    vertex: Vec3,
    width: number,
    height: number,
    zoom: number,
): { x: number; y: number; depth: number } {
    const depth = vertex.z + 7.25;
    const focalLength = Math.min(width, height) * 0.95 * zoom;
    const perspective = focalLength / depth;

    return {
        x: width / 2 + vertex.x * perspective,
        y: height * 0.58 - vertex.y * perspective,
        depth,
    };
}

function drawGroundGrid(
    context: CanvasRenderingContext2D,
    width: number,
    height: number,
    viewYaw: number,
    viewPitch: number,
    zoom: number,
) {
    const groundY = -0.38;
    context.save();
    context.strokeStyle = GRID_COLOR;
    context.lineWidth = 1;

    for (let x = -3.3; x <= 3.3; x += 0.55) {
        const start = projectPoint(
            applyView({ x, y: groundY, z: -2.2 }, viewYaw, viewPitch),
            width,
            height,
            zoom,
        );
        const end = projectPoint(
            applyView({ x, y: groundY, z: 2.2 }, viewYaw, viewPitch),
            width,
            height,
            zoom,
        );

        context.beginPath();
        context.moveTo(start.x, start.y);
        context.lineTo(end.x, end.y);
        context.stroke();
    }

    for (let z = -2.2; z <= 2.2; z += 0.55) {
        const start = projectPoint(
            applyView({ x: -3.3, y: groundY, z }, viewYaw, viewPitch),
            width,
            height,
            zoom,
        );
        const end = projectPoint(
            applyView({ x: 3.3, y: groundY, z }, viewYaw, viewPitch),
            width,
            height,
            zoom,
        );

        context.beginPath();
        context.moveTo(start.x, start.y);
        context.lineTo(end.x, end.y);
        context.stroke();
    }

    context.restore();
}

function drawShadow(
    context: CanvasRenderingContext2D,
    width: number,
    height: number,
    viewYaw: number,
    viewPitch: number,
    zoom: number,
) {
    const shadowPoints = Array.from({ length: 36 }, (_, index) => {
        const angle = (index / 36) * Math.PI * 2;
        const worldPoint = {
            x: Math.cos(angle) * 1.55,
            y: -0.36,
            z: Math.sin(angle) * 0.56,
        };

        return projectPoint(applyView(worldPoint, viewYaw, viewPitch), width, height, zoom);
    });

    context.save();
    context.fillStyle = SHADOW_COLOR;
    context.beginPath();
    shadowPoints.forEach((point, index) => {
        if (index === 0) {
            context.moveTo(point.x, point.y);
        } else {
            context.lineTo(point.x, point.y);
        }
    });
    context.closePath();
    context.filter = "blur(10px)";
    context.fill();
    context.restore();
}

function buildShoeMesh(): Mesh {
    const sliceCount = 28;
    const ringSegments = 18;
    const vertices: Vec3[] = [];
    const faces: Face[] = [];
    const seamLines: number[][] = [];

    const topIndex = Math.floor(ringSegments / 4);
    const leftLaceIndex = topIndex + 3;
    const rightLaceIndex = topIndex - 3;
    const ridgeLine: number[] = [];

    const vertexIndex = (slice: number, segment: number) =>
        slice * ringSegments + ((segment % ringSegments) + ringSegments) % ringSegments;

    for (let slice = 0; slice < sliceCount; slice += 1) {
        const t = slice / (sliceCount - 1);
        const x = -1.58 + t * 3.15;

        let width =
            0.2 +
            0.18 * gaussian(t, 0.2, 0.12) +
            0.14 * gaussian(t, 0.55, 0.18) +
            0.2 * gaussian(t, 0.82, 0.12);

        if (t < 0.1) {
            width *= 0.7 + t * 2.4;
        }
        if (t > 0.92) {
            width *= 1 - (t - 0.92) * 9;
        }

        const upperHeight =
            0.13 +
            0.18 * gaussian(t, 0.26, 0.11) +
            0.12 * gaussian(t, 0.55, 0.15) +
            0.08 * gaussian(t, 0.84, 0.08);
        const lowerDepth = 0.1 + 0.02 * gaussian(t, 0.83, 0.12);
        const outerBias = 0.04 * Math.sin(Math.PI * t);
        const instepLift = 0.05 * gaussian(t, 0.34, 0.12);
        const archCut = 0.05 * gaussian(t, 0.52, 0.11);

        const startIndex = vertices.length;

        for (let segment = 0; segment < ringSegments; segment += 1) {
            const angle = (segment / ringSegments) * Math.PI * 2;
            const cosine = Math.cos(angle);
            const sine = Math.sin(angle);
            const widthScale = cosine >= 0 ? 1.05 : 0.88;

            const z = width * cosine * widthScale + outerBias;
            let y = -0.18;

            if (sine >= 0) {
                y += upperHeight * Math.pow(sine, 0.78) + instepLift;
                y += 0.06 * gaussian(t, 0.88, 0.08) * Math.pow(sine, 1.15);
            } else {
                y -= lowerDepth * Math.pow(-sine, 0.72) + archCut;
            }

            vertices.push({ x, y, z });
        }

        ridgeLine.push(startIndex + topIndex);
    }

    for (let slice = 0; slice < sliceCount - 1; slice += 1) {
        for (let segment = 0; segment < ringSegments; segment += 1) {
            faces.push({
                indices: [
                    vertexIndex(slice, segment),
                    vertexIndex(slice + 1, segment),
                    vertexIndex(slice + 1, segment + 1),
                    vertexIndex(slice, segment + 1),
                ],
            });
        }
    }

    faces.push({
        indices: Array.from({ length: ringSegments }, (_, segment) =>
            vertexIndex(0, ringSegments - 1 - segment),
        ),
    });
    faces.push({
        indices: Array.from({ length: ringSegments }, (_, segment) =>
            vertexIndex(sliceCount - 1, segment),
        ),
    });

    seamLines.push(ridgeLine.slice(2, -2));

    for (let slice = 7; slice <= 15; slice += 2) {
        seamLines.push([
            vertexIndex(slice, leftLaceIndex),
            vertexIndex(slice, rightLaceIndex),
        ]);
    }

    return { vertices, faces, seamLines };
}

function normalizeHeader(header: string) {
    return header.toLowerCase().replace(/[^a-z]/g, "");
}

function splitRow(line: string, delimiter: string) {
    return line.split(delimiter).map((cell) => cell.trim());
}

function parseCellNumber(cell: string, delimiter: string) {
    const normalized = delimiter === ";" ? cell.replace(",", ".") : cell;
    return Number.parseFloat(normalized);
}

function parseAngleData(text: string): EulerFrame[] {
    const trimmed = text.replace(/^\uFEFF/, "").trim();

    if (!trimmed) {
        throw new Error("Le fichier d'angles est vide.");
    }

    const lines = trimmed
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

    const delimiter =
        (lines[0].match(/;/g)?.length ?? 0) > (lines[0].match(/,/g)?.length ?? 0)
            ? ";"
            : ",";
    const firstRow = splitRow(lines[0], delimiter);
    const hasHeader = firstRow.some((cell) => Number.isNaN(Number.parseFloat(cell)));

    let dataStartIndex = 0;
    let yawIndex = 0;
    let pitchIndex = 1;
    let rollIndex = 2;

    if (hasHeader) {
        const headers = firstRow.map(normalizeHeader);
        yawIndex = headers.findIndex((header) => header === "yaw");
        pitchIndex = headers.findIndex((header) => header === "pitch");
        rollIndex = headers.findIndex((header) => header === "roll");
        dataStartIndex = 1;

        if (yawIndex === -1 || pitchIndex === -1 || rollIndex === -1) {
            throw new Error("Le fichier doit contenir les colonnes yaw, pitch et roll.");
        }
    } else if (firstRow.length < 3) {
        throw new Error("Le fichier doit contenir au moins trois colonnes numeriques.");
    }

    const frames = lines
        .slice(dataStartIndex)
        .map((line, index) => {
            const cells = splitRow(line, delimiter);
            const yaw = parseCellNumber(cells[yawIndex] ?? "", delimiter);
            const pitch = parseCellNumber(cells[pitchIndex] ?? "", delimiter);
            const roll = parseCellNumber(cells[rollIndex] ?? "", delimiter);

            if ([yaw, pitch, roll].some((value) => Number.isNaN(value))) {
                return null;
            }

            return {
                index,
                yaw,
                pitch,
                roll,
            } satisfies EulerFrame;
        })
        .filter((frame): frame is EulerFrame => frame !== null);

    if (frames.length === 0) {
        throw new Error("Aucune ligne d'angles valide n'a ete trouvee.");
    }

    return frames;
}

export default function RightShoeAnimation() {
    const [frames, setFrames] = useState<EulerFrame[]>([]);
    const [frameIndex, setFrameIndex] = useState(0);
    const [playbackState, setPlaybackState] = useState<PlaybackState>("stopped");
    const [loadError, setLoadError] = useState<string | null>(null);
    const [isLoadingSample, setIsLoadingSample] = useState(true);
    const [viewYaw, setViewYaw] = useState(INITIAL_VIEW_YAW);
    const [viewPitch, setViewPitch] = useState(INITIAL_VIEW_PITCH);
    const [viewZoom, setViewZoom] = useState(INITIAL_VIEW_ZOOM);
    const [isDragging, setIsDragging] = useState(false);

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const viewerRef = useRef<HTMLDivElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const dragStartRef = useRef<{
        x: number;
        y: number;
        yaw: number;
        pitch: number;
    } | null>(null);

    const currentFrame =
        playbackState === "stopped"
            ? DEFAULT_FRAME
            : (frames[frameIndex] ?? frames[0] ?? DEFAULT_FRAME);
    const visualFrameIndex = playbackState === "stopped" ? 0 : frameIndex;
    const viewerClassName = `${VIEWER_BASE_CLASS_NAME} ${
        isDragging ? "cursor-grabbing" : "cursor-grab"
    }`;

    useEffect(() => {
        let isMounted = true;

        async function bootstrapSample() {
            try {
                const response = await fetch(SAMPLE_FILE_URL, { cache: "force-cache" });

                if (!response.ok) {
                    throw new Error("Impossible de charger l'echantillon de marche.");
                }

                const text = await response.text();
                const parsedFrames = parseAngleData(text);

                if (!isMounted) {
                    return;
                }

                setFrames(parsedFrames);
                setFrameIndex(0);
                setPlaybackState("stopped");
                setLoadError(null);
            } catch (error) {
                if (!isMounted) {
                    return;
                }

                setLoadError(
                    error instanceof Error
                        ? error.message
                        : "Le chargement de l'echantillon a echoue.",
                );
            } finally {
                if (isMounted) {
                    setIsLoadingSample(false);
                }
            }
        }

        void bootstrapSample();

        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        if (playbackState !== "playing" || frames.length === 0) {
            return;
        }

        const intervalId = window.setInterval(() => {
            setFrameIndex((current) => {
                if (current >= frames.length - 1) {
                    setPlaybackState("paused");
                    return frames.length - 1;
                }

                return current + 1;
            });
        }, FRAME_DURATION_MS);

        return () => {
            window.clearInterval(intervalId);
        };
    }, [frames.length, playbackState]);

    const drawScene = useEffectEvent(() => {
        const canvas = canvasRef.current;
        const viewer = viewerRef.current;

        if (!canvas || !viewer) {
            return;
        }

        const rect = viewer.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
            return;
        }

        const devicePixelRatio = window.devicePixelRatio || 1;
        const width = Math.floor(rect.width * devicePixelRatio);
        const height = Math.floor(rect.height * devicePixelRatio);

        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
        }

        const context = canvas.getContext("2d");
        if (!context) {
            return;
        }

        context.setTransform(1, 0, 0, 1, 0, 0);
        context.scale(devicePixelRatio, devicePixelRatio);
        context.clearRect(0, 0, rect.width, rect.height);

        const background = context.createLinearGradient(0, 0, 0, rect.height);
        background.addColorStop(0, "rgba(168, 206, 140, 0.28)");
        background.addColorStop(1, "rgba(11, 20, 15, 0)");
        context.fillStyle = background;
        context.fillRect(0, 0, rect.width, rect.height);

        drawGroundGrid(context, rect.width, rect.height, viewYaw, viewPitch, viewZoom);
        drawShadow(context, rect.width, rect.height, viewYaw, viewPitch, viewZoom);

        const transformedVertices = SHOE_MESH.vertices.map((vertex) =>
            applyView(transformModelVertex(vertex, currentFrame), viewYaw, viewPitch),
        );
        const projectedVertices = transformedVertices.map((vertex) =>
            projectPoint(vertex, rect.width, rect.height, viewZoom),
        );

        const drawableFaces = SHOE_MESH.faces
            .map((face) => {
                const points3d = face.indices.map((index) => transformedVertices[index]);
                const faceCenter = scale(
                    points3d.reduce((sum, point) => add(sum, point), { x: 0, y: 0, z: 0 }),
                    1 / points3d.length,
                );

                const edgeOne = subtract(points3d[1], points3d[0]);
                const edgeTwo = subtract(points3d[2], points3d[0]);
                const normal = normalize(cross(edgeOne, edgeTwo));
                const lightDirection = normalize({ x: -0.35, y: 0.92, z: -0.4 });
                const lightAmount = clamp(
                    0.58 + dot(normal, lightDirection) * 0.42,
                    0.3,
                    1.15,
                );
                const baseColor = chooseFaceColor(faceCenter, normal);
                const highlightedColor =
                    normal.y > 0.35
                        ? mixColor(baseColor, 0.16, { r: 255, g: 255, b: 255 })
                        : baseColor;

                return {
                    centerDepth: faceCenter.z,
                    fillStyle: shadeColor(highlightedColor, lightAmount),
                    points2d: face.indices.map((index) => projectedVertices[index]),
                };
            })
            .sort((left, right) => right.centerDepth - left.centerDepth);

        drawableFaces.forEach((face) => {
            context.beginPath();
            face.points2d.forEach((point, index) => {
                if (index === 0) {
                    context.moveTo(point.x, point.y);
                } else {
                    context.lineTo(point.x, point.y);
                }
            });
            context.closePath();
            context.fillStyle = face.fillStyle;
            context.fill();
            context.strokeStyle = OUTLINE_COLOR;
            context.lineWidth = 1;
            context.stroke();
        });

        context.save();
        context.lineCap = "round";
        context.lineJoin = "round";
        context.strokeStyle = "rgba(255, 255, 255, 0.65)";
        context.lineWidth = 2;

        SHOE_MESH.seamLines.forEach((line) => {
            context.beginPath();
            line.forEach((index, pointIndex) => {
                const point = projectedVertices[index];
                if (pointIndex === 0) {
                    context.moveTo(point.x, point.y);
                } else {
                    context.lineTo(point.x, point.y);
                }
            });
            context.stroke();
        });

        context.restore();
    });

    useEffect(() => {
        drawScene();
    }, [currentFrame, viewPitch, viewYaw, viewZoom]);

    useEffect(() => {
        const viewer = viewerRef.current;
        if (!viewer) {
            return;
        }

        const resizeObserver = new ResizeObserver(() => {
            drawScene();
        });

        resizeObserver.observe(viewer);
        return () => {
            resizeObserver.disconnect();
        };
    }, []);

    async function loadBundledSample() {
        setIsLoadingSample(true);

        try {
            const response = await fetch(SAMPLE_FILE_URL, { cache: "force-cache" });

            if (!response.ok) {
                throw new Error("Impossible de recharger l'echantillon.");
            }

            const text = await response.text();
            const parsedFrames = parseAngleData(text);

            setFrames(parsedFrames);
            setFrameIndex(0);
            setPlaybackState("stopped");
            setLoadError(null);
        } catch (error) {
            setLoadError(
                error instanceof Error
                    ? error.message
                    : "Le rechargement de l'echantillon a echoue.",
            );
        } finally {
            setIsLoadingSample(false);
        }
    }

    async function handleFileImport(event: React.ChangeEvent<HTMLInputElement>) {
        const selectedFile = event.target.files?.[0];
        if (!selectedFile) {
            return;
        }

        try {
            const text = await selectedFile.text();
            const parsedFrames = parseAngleData(text);
            setFrames(parsedFrames);
            setFrameIndex(0);
            setPlaybackState("stopped");
            setLoadError(null);
        } catch (error) {
            setLoadError(
                error instanceof Error
                    ? error.message
                    : "Le fichier selectionne est invalide.",
            );
        } finally {
            event.target.value = "";
        }
    }

    function handlePlay() {
        if (frames.length === 0) {
            return;
        }

        if (frameIndex >= frames.length - 1 || playbackState === "stopped") {
            setFrameIndex(0);
        }

        setPlaybackState("playing");
    }

    function handlePause() {
        setPlaybackState("paused");
    }

    function handleStop() {
        setPlaybackState("stopped");
        setFrameIndex(0);
    }

    function handleSeek(event: React.ChangeEvent<HTMLInputElement>) {
        const nextIndex = Number.parseInt(event.target.value, 10);
        setFrameIndex(nextIndex);
        setPlaybackState("paused");
    }

    function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
        event.currentTarget.setPointerCapture(event.pointerId);
        dragStartRef.current = {
            x: event.clientX,
            y: event.clientY,
            yaw: viewYaw,
            pitch: viewPitch,
        };
        setIsDragging(true);
    }

    function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
        if (!dragStartRef.current) {
            return;
        }

        const deltaX = event.clientX - dragStartRef.current.x;
        const deltaY = event.clientY - dragStartRef.current.y;

        setViewYaw(dragStartRef.current.yaw + deltaX * 0.35);
        setViewPitch(clamp(dragStartRef.current.pitch + deltaY * 0.28, -70, 45));
    }

    function finishPointerInteraction(event: React.PointerEvent<HTMLDivElement>) {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }
        dragStartRef.current = null;
        setIsDragging(false);
    }

    function handleWheel(event: React.WheelEvent<HTMLDivElement>) {
        event.preventDefault();
        setViewZoom((current) => clamp(current - event.deltaY * 0.0016, MIN_ZOOM, MAX_ZOOM));
    }

    return (
        <div className={ROOT_CLASS_NAME}>
            <div className={HEADER_CLASS_NAME}>
                <div className={TITLE_GROUP_CLASS_NAME}>
                    <h4 className="text-base font-semibold">Animation 3D de la semelle droite</h4>
                    <p className="text-muted-foreground text-sm">
                        Faites glisser pour orbiter autour de la chaussure et utilisez la molette
                        pour zoomer sans modifier l&apos;animation.
                    </p>
                </div>
                <div className={ACTIONS_CLASS_NAME}>
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => void loadBundledSample()}
                        isDisabled={isLoadingSample}
                    >
                        {isLoadingSample ? "Chargement..." : "Charger l&apos;exemple"}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        Importer un fichier
                    </Button>
                </div>
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv,.txt,text/plain"
                className="hidden"
                onChange={handleFileImport}
            />

            <div
                ref={viewerRef}
                className={viewerClassName}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={finishPointerInteraction}
                onPointerCancel={finishPointerInteraction}
                onPointerLeave={finishPointerInteraction}
                onWheel={handleWheel}
            >
                <div className={VIEWER_GLOW_CLASS_NAME} />
                <div className={VIEWER_HIGHLIGHT_CLASS_NAME} />
                <canvas ref={canvasRef} className="h-full w-full" />
                <div className={READOUT_CLASS_NAME}>
                    Yaw {currentFrame.yaw.toFixed(1)}&deg; / Pitch{" "}
                    {currentFrame.pitch.toFixed(1)}&deg; / Roll{" "}
                    {currentFrame.roll.toFixed(1)}&deg;
                </div>
                <div className={CONTROL_WRAPPER_CLASS_NAME}>
                    <div className={CONTROL_STACK_CLASS_NAME}>
                        <button
                            type="button"
                            aria-label="Play"
                            onClick={handlePlay}
                            onPointerDown={(event) => event.stopPropagation()}
                            disabled={frames.length === 0 || playbackState === "playing"}
                            className={PLAY_BUTTON_CLASS_NAME}
                        >
                            <PlayIcon />
                        </button>
                        <button
                            type="button"
                            aria-label="Pause"
                            onClick={handlePause}
                            onPointerDown={(event) => event.stopPropagation()}
                            disabled={frames.length === 0 || playbackState !== "playing"}
                            className={PAUSE_BUTTON_CLASS_NAME}
                        >
                            <PauseIcon />
                        </button>
                        <button
                            type="button"
                            aria-label="Stop"
                            onClick={handleStop}
                            onPointerDown={(event) => event.stopPropagation()}
                            disabled={frames.length === 0}
                            className={STOP_BUTTON_CLASS_NAME}
                        >
                            <StopIcon />
                        </button>
                    </div>
                </div>
            </div>

            <div className={PROGRESS_CLASS_NAME}>
                <div className={PROGRESS_LABEL_CLASS_NAME}>
                    <span className="text-muted-foreground">Debut</span>
                    <span className="text-muted-foreground">Fin</span>
                </div>
                <input
                    type="range"
                    min={0}
                    max={Math.max(frames.length - 1, 0)}
                    value={visualFrameIndex}
                    onChange={handleSeek}
                    disabled={frames.length === 0}
                    className={PROGRESS_INPUT_CLASS_NAME}
                />
            </div>

            {loadError ? <p className="text-danger text-sm">{loadError}</p> : null}
        </div>
    );
}
