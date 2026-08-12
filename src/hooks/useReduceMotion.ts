import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo } from 'react-native';

const ReduceMotionContext = createContext(false);

/** Chỉ đăng ký một listener hệ điều hành cho toàn ứng dụng. */
export function ReduceMotionProvider({ children }: { children: ReactNode }) {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return React.createElement(ReduceMotionContext.Provider, { value: reduceMotion }, children);
}

/**
 * Trả về true nếu người dùng bật "Reduce Motion" ở hệ điều hành.
 * Component nên rút gọn/tắt animation khi giá trị này là true.
 */
export function useReduceMotion(): boolean {
  return useContext(ReduceMotionContext);
}
