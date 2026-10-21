import * as ImageManipulator from 'expo-image-manipulator';

export interface CompressOptions {
  width?: number;
  height?: number;
  compress?: number;
  format?: ImageManipulator.SaveFormat;
}

export interface CompressedImage {
  uri: string;
  width: number;
  height: number;
}

export const compressImage = async (
  uri: string,
  opts?: CompressOptions
): Promise<CompressedImage> => {
  const compress = opts?.compress ?? 0.8;
  const format = opts?.format ?? ImageManipulator.SaveFormat.JPEG;

  // ⚠️ expo-image-manipulator PRESERVES aspect ratio only when `resize` gets a
  // single dimension. Passing both width AND height FORCES the exact size and
  // stretches/distorts the image. So:
  //   - width only  → scale by width, aspect kept
  //   - height only → scale by height, aspect kept
  //   - both        → treat as a bounding box: read original size, scale down
  //                    proportionally (never upscale)
  //   - neither     → cap width at 512, aspect kept
  let resize: { width?: number; height?: number } | null = null;

  if (opts?.width != null && opts?.height != null) {
    const info = await ImageManipulator.manipulateAsync(uri, [], {
      compress: 1,
      base64: false,
    });
    const scale = Math.min(opts.width / info.width, opts.height / info.height);
    if (scale < 1) {
      resize = { width: Math.round(info.width * scale) };
    }
  } else if (opts?.width != null) {
    resize = { width: opts.width };
  } else if (opts?.height != null) {
    resize = { height: opts.height };
  } else {
    resize = { width: 512 };
  }

  const result = await ImageManipulator.manipulateAsync(
    uri,
    resize ? [{ resize }] : [],
    { compress, format, base64: false }
  );

  return {
    uri: result.uri,
    width: result.width,
    height: result.height,
  };
};