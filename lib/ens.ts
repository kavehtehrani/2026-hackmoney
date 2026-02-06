import { createPublicClient, http } from "viem";
import { normalize } from "viem/ens";
import { mainnet } from "viem/chains";

const publicClient = createPublicClient({
  chain: mainnet,
  transport: http("https://eth.llamarpc.com"),
});

export async function resolveEnsName(name: string): Promise<string | null> {
  try {
    const address = await publicClient.getEnsAddress({
      name: normalize(name),
    });
    return address;
  } catch {
    return null;
  }
}

export async function lookupEnsName(address: `0x${string}`): Promise<string | null> {
  try {
    const name = await publicClient.getEnsName({ address });
    return name;
  } catch {
    return null;
  }
}

export function isEnsName(value: string): boolean {
  return value.endsWith(".eth");
}

// --- ENS Avatar ---

export async function getEnsAvatar(name: string): Promise<string | null> {
  try {
    return await publicClient.getEnsAvatar({ name: normalize(name) });
  } catch {
    return null;
  }
}

// --- ENS Profile ---

export interface ENSProfile {
  name: string;
  address: string | null;
  avatar: string | null;
  description: string | null;
  twitter: string | null;
  website: string | null;
  github: string | null;
}

export async function getEnsProfile(name: string): Promise<ENSProfile> {
  const normalized = normalize(name);
  const [address, avatar, description, twitter, website, github] = await Promise.all([
    publicClient.getEnsAddress({ name: normalized }).catch(() => null),
    publicClient.getEnsAvatar({ name: normalized }).catch(() => null),
    publicClient.getEnsText({ name: normalized, key: "description" }).catch(() => null),
    publicClient.getEnsText({ name: normalized, key: "com.twitter" }).catch(() => null),
    publicClient.getEnsText({ name: normalized, key: "url" }).catch(() => null),
    publicClient.getEnsText({ name: normalized, key: "com.github" }).catch(() => null),
  ]);
  return { name, address, avatar, description, twitter, website, github };
}

// --- Chain-Specific ENS Resolution (ENSIP-9/11) ---

/**
 * Calculate EVM coin type from chain ID using ENSIP-11 formula.
 * For EVM chains: coinType = 0x80000000 | chainId
 */
export function getEVMCoinType(chainId: number): bigint {
  return BigInt(0x80000000) | BigInt(chainId);
}

/**
 * Resolve ENS name to address for a specific chain.
 * Falls back to ETH address if no chain-specific address is set.
 */
export async function resolveEnsForChain(
  name: string,
  chainId: number
): Promise<string | null> {
  try {
    const normalized = normalize(name);

    // For mainnet (chainId 1), use default ETH resolution
    if (chainId === 1) {
      return await publicClient.getEnsAddress({ name: normalized }).catch(() => null);
    }

    // Try chain-specific address first (ENSIP-11)
    try {
      const chainAddr = await publicClient.getEnsAddress({
        name: normalized,
        coinType: getEVMCoinType(chainId),
      });
      if (chainAddr) return chainAddr;
    } catch {
      // Chain-specific address not set or not supported, fall back to ETH
    }

    // Fall back to default ETH address
    return await publicClient.getEnsAddress({ name: normalized }).catch(() => null);
  } catch (err) {
    console.error("ENS resolution error:", err);
    return null;
  }
}
