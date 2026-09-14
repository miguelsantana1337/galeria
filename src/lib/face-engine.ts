type FaceResult = { embedding?: number[]; score: number };
type HumanEngine = {
  load(): Promise<void>;
  warmup(): Promise<void>;
  detect(
    input: HTMLImageElement,
    config?: object,
  ): Promise<{ face: FaceResult[] }>;
  match: { similarity(a: number[], b: number[]): number };
};
type HumanConstructor = new (config: object) => HumanEngine;

export async function extractCaptureTime(file: File) {
  try {
    const { parse } = await import("exifr");
    const metadata = await parse(file, ["DateTimeOriginal", "CreateDate"]);
    const captured = metadata?.DateTimeOriginal || metadata?.CreateDate;
    if (captured instanceof Date && !Number.isNaN(captured.getTime()))
      return { takenAt: captured.toISOString(), source: "exif" as const };
  } catch {
    /* Arquivos sem EXIF continuam disponíveis normalmente. */
  }
  return file.lastModified > 0
    ? {
        takenAt: new Date(file.lastModified).toISOString(),
        source: "file" as const,
      }
    : { takenAt: null, source: null };
}

let engine: HumanEngine | null = null;
let loading: Promise<HumanEngine> | null = null;

async function loadBrowserModule(): Promise<HumanConstructor> {
  const moduleUrl = "/human.esm.js";
  const browserBundle = (await import(/* webpackIgnore: true */ moduleUrl)) as {
    default: HumanConstructor;
  };
  return browserBundle.default;
}

export async function getFaceEngine(onProgress?: (message: string) => void) {
  if (engine) return engine;
  if (loading) return loading;
  loading = (async () => {
    onProgress?.("Carregando inteligência facial…");
    const Human = await loadBrowserModule();
    const human = new Human({
      backend: "webgl",
      modelBasePath: "/models",
      cacheModels: true,
      face: {
        enabled: true,
        detector: {
          enabled: true,
          rotation: true,
          maxDetected: 30,
          minConfidence: 0.35,
        },
        mesh: { enabled: true },
        description: { enabled: true },
        iris: { enabled: false },
        emotion: { enabled: false },
        antispoof: { enabled: false },
        liveness: { enabled: false },
      },
      body: { enabled: false },
      hand: { enabled: false },
      object: { enabled: false },
    });
    await human.load();
    await human.warmup();
    engine = human;
    onProgress?.("Reconhecimento pronto");
    return human;
  })();
  return loading;
}

export async function imageFromFile(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = "async";
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Imagem inválida"));
      image.src = url;
    });
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function extractFaces(file: File, maxFaces = 30) {
  const human = await getFaceEngine();
  const image = await imageFromFile(file);
  const result = await human.detect(image, {
    face: { detector: { maxDetected: maxFaces } },
  });
  return {
    width: image.naturalWidth,
    height: image.naturalHeight,
    faces: result.face
      .filter((face) => face.embedding?.length)
      .map((face) => ({ descriptor: face.embedding!, score: face.score })),
  };
}
