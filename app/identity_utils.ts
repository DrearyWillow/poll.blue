export async function getDidFromHandle(handle: string): string {
    if (handle.startsWith("did:")) {
        return handle;
    }
    const dnsname = `_atproto.${handle}`;
    try {
        const records = await Deno.resolveDns(dnsname, "TXT");
        const txtRecord = records[0];
        if (txtRecord.length !== 1) {
            return await getDidByHttp(handle);
        }
        return txtRecord[0].slice(4);

    }
    catch {
        return await getDidByHttp(handle);
    }
}

async function getDidByHttp(handle: string): Promise<string> {
    const path_to_fetch = `https://${handle}/.well-known/atproto-did`;
    const response = await fetch(path_to_fetch);
    return await response.text();
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
