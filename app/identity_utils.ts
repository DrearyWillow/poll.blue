export async function getDidFromHandle(handle: string): string {
    const response = await fetch(`https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle?handle=${handle}`);
    const json = await response.json();
    return json.did || throw new Error("No DID found");
}

export function getDidDocPath(did: string): string {
    switch (did.slice(0, 7)) {
        case "did:plc":
            return `https://plc.directory/${did}`;
        case "did:web":
            domain = did.split(":")[1];
            return `https://${domain}/.well-known/did.json`;
        default:
            throw new Error("Invalid DID");
    }
}

export async function fetchDidDoc(did: string): Promise<any> {
    const path_to_fetch = getDidDocPath(did);
    const response = await fetch(path_to_fetch);
    return response.json();
}

export function getPdsFromDidDoc(didDoc: any): string {
    return didDoc["service"][0]["serviceEndpoint"];
}

export async function getPds(handle_or_did: string): string {
    const did = await getDidFromHandle(handle_or_did);
    return getPdsFromDidDoc(await fetchDidDoc(did));
}
