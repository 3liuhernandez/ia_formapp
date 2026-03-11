import { useAuth } from '@/context/AuthContext';
import { Redirect } from 'expo-router';

export default function Index() {
    const { user } = useAuth();

    if (!user) {
        return <Redirect href="/login" />;
    }

    return <Redirect href="/(tabs)/form" />;
}
