import { router } from 'expo-router';
import { useEffect } from 'react';
import { InteractionManager } from 'react-native';

export default function AddActionRoute() {
  useEffect(() => {
    router.replace('/dashboard');
    const task = InteractionManager.runAfterInteractions(() => {
      router.push('/add-transaction');
    });

    return () => {
      task.cancel();
    };
  }, []);

  return null;
}
