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
  const width = opts?.width ?? 512;
  const height = opts?.height ?? 512;
  const compress = opts?.compress ?? 0.8;
  const format = opts?.format ?? ImageManipulator.SaveFormat.JPEG;

  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width, height } }],
    { compress, format, base64: false }
  );

  return {
    uri: result.uri,
    width: result.width,
    height: result.height,
  };
};