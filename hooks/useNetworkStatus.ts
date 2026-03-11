import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

export function useNetworkStatus() {
    const [isConnected, setIsConnected] = useState<boolean>(true);

    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener((state) => {
            setIsConnected(!!(state.isConnected && state.isInternetReachable));
        });

        // Check initial state
        NetInfo.fetch().then((state) => {
            setIsConnected(!!(state.isConnected && state.isInternetReachable));
        });

        return () => unsubscribe();
    }, []);

    return isConnected;
}
