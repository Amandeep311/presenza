// src/components/common/ToastProvider.js
import React, { useRef, useEffect } from 'react';
import { ToastProvider as RNToastProvider } from 'react-native-toast-notifications';
import { View, Text, StyleSheet, Platform } from 'react-native';

let globalToast = null;
let pendingToasts = [];

const CustomToast = ({ message, type }) => {
  const getBackgroundColor = () => {
    switch (type) {
      case 'success': return '#4CAF50';
      case 'error': return '#F44336';
      case 'warning': return '#FF9800';
      case 'info': return '#2196F3';
      default: return '#333333';
    }
  };

  return (
    <View style={[styles.toastContainer, { backgroundColor: getBackgroundColor() }]}>
      <Text style={styles.toastText}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  toastContainer: {
    marginTop: Platform.OS === 'ios' ? 30 : 30,
    marginHorizontal: 15,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  toastText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export const ToastProvider = ({ children }) => {
  const toastRef = useRef(null);

  useEffect(() => {
    if (toastRef.current) {
      globalToast = toastRef.current;
      // Process any pending toasts
      if (pendingToasts.length > 0) {
        pendingToasts.forEach(toast => {
          globalToast.show(toast.message, { type: toast.type, duration: toast.duration });
        });
        pendingToasts = [];
      }
      console.log('✅ Toast reference set');
    }
  }, []);

  return (
    <RNToastProvider
      ref={toastRef}
      placement="top"
      duration={3000}
      animationType="slide-in"
      animationDuration={300}
      swipeEnabled={true}
      offsetTop={0}
      renderToast={({ message, type }) => <CustomToast message={message} type={type} />}
    >
      {children}
    </RNToastProvider>
  );
};

// IMPROVED showToast function
export const showToast = (message, type = 'success', duration = 3000) => {
  console.log('📢 showToast called:', message, type);
  
  if (globalToast) {
    globalToast.show(message, { type, duration });
  } else {
    console.log('⏳ Toast not ready, queuing:', message);
    pendingToasts.push({ message, type, duration });
    // Retry after 500ms
    setTimeout(() => {
      if (globalToast && pendingToasts.length > 0) {
        pendingToasts.forEach(toast => {
          globalToast.show(toast.message, { type: toast.type, duration: toast.duration });
        });
        pendingToasts = [];
      }
    }, 500);
  }
};