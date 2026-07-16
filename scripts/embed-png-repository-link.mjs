import { readFile, writeFile } from "node:fs/promises";

const [, , imagePath, repositoryUrl] = process.argv;

if (!imagePath || !repositoryUrl) {
  throw new Error(
    "Usage: node scripts/embed-png-repository-link.mjs <image.png> <repository-url>",
  );
}

const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const input = await readFile(imagePath);

if (!input.subarray(0, signature.length).equals(signature)) {
  throw new Error(`${imagePath} is not a PNG file`);
}

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, checksum]);
}

const chunks = [];
let offset = signature.length;

while (offset < input.length) {
  const length = input.readUInt32BE(offset);
  const type = input.toString("ascii", offset + 4, offset + 8);
  const end = offset + 12 + length;
  const chunk = input.subarray(offset, end);
  const data = input.subarray(offset + 8, offset + 8 + length);
  const isRepositoryText =
    type === "tEXt" && data.toString("latin1").startsWith("Repository\0");

  if (!isRepositoryText && type !== "IEND") {
    chunks.push(chunk);
  }

  if (type === "IEND") break;
  offset = end;
}

const repositoryText = Buffer.from(`Repository\0${repositoryUrl}`, "latin1");
const output = Buffer.concat([
  signature,
  ...chunks,
  makeChunk("tEXt", repositoryText),
  makeChunk("IEND", Buffer.alloc(0)),
]);

await writeFile(imagePath, output);
process.stdout.write(
  `Embedded Repository=${repositoryUrl} in ${imagePath} (${output.length} bytes)\n`,
);
