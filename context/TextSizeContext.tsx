import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type TextSizeContextType = {
  largeText: boolean;
  fs: (normal: number) => number; // font size helper
  setLargeText: (val: boolean) => void;
};

const TextSizeContext = createContext<TextSizeContextType>({
  largeText: false,
  fs: (n) => n,
  setLargeText: () => {},
});

export function TextSizeProvider({ children }: { children: React.ReactNode }) {
  const [largeText, setLargeTextState] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('largeText').then(v => {
      if (v === 'true') setLargeTextState(true);
    });
  }, []);

  function setLargeText(val: boolean) {
    setLargeTextState(val);
    AsyncStorage.setItem('largeText', String(val));
  }

  // Scale up by 20% when large text is on
  function fs(normal: number): number {
    return largeText ? Math.round(normal * 1.2) : normal;
  }

  return (
    <TextSizeContext.Provider value={{ largeText, fs, setLargeText }}>
      {children}
    </TextSizeContext.Provider>
  );
}

export function useTextSize() {
  return useContext(TextSizeContext);
}
