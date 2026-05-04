import {
  BlobSASPermissions,
  BlobServiceClient,
  SASProtocol,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters
} from "@azure/storage-blob";

function getCredential() {
  const account = process.env.AZURE_STORAGE_ACCOUNT;
  const key = process.env.AZURE_STORAGE_KEY;
  if (!account || !key) return null;
  return { account, credential: new StorageSharedKeyCredential(account, key) };
}

const containerName = process.env.AZURE_STORAGE_CONTAINER ?? "geocon-files";

export function isBlobConfigured(): boolean {
  return Boolean(process.env.AZURE_STORAGE_ACCOUNT && process.env.AZURE_STORAGE_KEY);
}

export function buildBlobPath(parentType: "project" | "subitem", parentId: string, filename: string) {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${parentType}s/${parentId}/${crypto.randomUUID()}-${safe}`;
}

export function createUploadSas(blobPath: string): { uploadUrl: string; blobPath: string } {
  const cfg = getCredential();
  if (!cfg) throw new Error("Azure Blob not configured");
  const expiresOn = new Date(Date.now() + 15 * 60 * 1000);
  const sas = generateBlobSASQueryParameters(
    {
      containerName,
      blobName: blobPath,
      permissions: BlobSASPermissions.parse("cw"),
      startsOn: new Date(Date.now() - 60 * 1000),
      expiresOn,
      protocol: SASProtocol.Https
    },
    cfg.credential
  ).toString();
  const uploadUrl = `https://${cfg.account}.blob.core.windows.net/${containerName}/${encodeURI(blobPath)}?${sas}`;
  return { uploadUrl, blobPath };
}

export function createReadSas(blobPath: string): string {
  const cfg = getCredential();
  if (!cfg) throw new Error("Azure Blob not configured");
  const expiresOn = new Date(Date.now() + 30 * 60 * 1000);
  const sas = generateBlobSASQueryParameters(
    {
      containerName,
      blobName: blobPath,
      permissions: BlobSASPermissions.parse("r"),
      expiresOn,
      protocol: SASProtocol.Https
    },
    cfg.credential
  ).toString();
  return `https://${cfg.account}.blob.core.windows.net/${containerName}/${encodeURI(blobPath)}?${sas}`;
}

export async function deleteBlob(blobPath: string) {
  const cfg = getCredential();
  if (!cfg) return;
  const service = new BlobServiceClient(`https://${cfg.account}.blob.core.windows.net`, cfg.credential);
  const container = service.getContainerClient(containerName);
  await container.deleteBlob(blobPath).catch(() => undefined);
}
