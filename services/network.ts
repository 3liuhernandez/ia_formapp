import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

type NetworkListener = (isConnected: boolean) => void;

let listeners: NetworkListener[] = [];
let currentStatus: boolean = false;
let unsubscribe: (() => void) | null = null;

export function startNetworkMonitor(): void {
    if (unsubscribe) return; // Already monitoring

    unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
        const isConnected = !!(state.isConnected && state.isInternetReachable);
        const wasDisconnected = !currentStatus;
        currentStatus = isConnected;

        // Notify all listeners
        listeners.forEach((listener) => listener(isConnected));

        // Log connection changes
        if (isConnected && wasDisconnected) {
            console.log('[Network] Conexión restaurada');
        } else if (!isConnected) {
            console.log('[Network] Sin conexión');
        }
    });
}

export function stopNetworkMonitor(): void {
    if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
    }
    listeners = [];
}

export function addNetworkListener(listener: NetworkListener): () => void {
    listeners.push(listener);
    return () => {
        listeners = listeners.filter((l) => l !== listener);
    };
}

export async function isOnline(): Promise<boolean> {
    const state = await NetInfo.fetch();
    return !!(state.isConnected && state.isInternetReachable);
}

export function getCurrentStatus(): boolean {
    return currentStatus;
}
