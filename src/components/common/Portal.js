// src/components/common/Portal.js
import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';

let portalHostRef = null;

export const setPortalHost = (ref) => {
  portalHostRef = ref;
};

export const getPortalHost = () => portalHostRef;

const Portal = ({ children }) => {
  const [mounted, setMounted] = useState(false);
  const hostRef = useRef(null);

  useEffect(() => {
    setMounted(true);
    if (hostRef.current) {
      setPortalHost(hostRef.current);
    }
    return () => {
      setPortalHost(null);
    };
  }, []);

  if (!mounted) return null;

  // Create a direct React element instead of View wrapper
  return (
    <View 
      ref={hostRef} 
      style={styles.portalContainer} 
      pointerEvents="box-none"
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  portalContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'box-none',
    zIndex: 999999,
    elevation: 999999,
    backgroundColor: 'transparent',
  },
});

export default Portal;