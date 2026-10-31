// hooks/useFirstLaunch.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

const FIRST_LAUNCH_KEY = '@ElimAPP:first_launch';

export function useFirstLaunch() {
  const [isFirstLaunch, setIsFirstLaunch] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkFirstLaunch = async () => {
      try {
        const value = await AsyncStorage.getItem(FIRST_LAUNCH_KEY);
        const isFirst = value === null;

        if (isFirst) {
          // Marcamos que la app ya se ha lanzado para la próxima vez
          await AsyncStorage.setItem(FIRST_LAUNCH_KEY, 'true');
        }
        setIsFirstLaunch(isFirst);
      } catch (error) {
        console.error('[FirstLaunch] Error al comprobar el flag:', error);
        // En caso de error, asumimos que no es la primera vez para no bloquear al usuario
        setIsFirstLaunch(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkFirstLaunch();
  }, []);

  return { isFirstLaunch, isLoading };
}