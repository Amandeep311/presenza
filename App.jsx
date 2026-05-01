// App.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import store from './src/store/store';
import AppNavigator from './src/navigation/AppNavigator';
import { ThemeProvider } from './src/context/ThemeContext';
import { LanguageProvider } from './src/context/LanguageContext';
import { ToastProvider } from './src/components/common/ToastProvider';

const App = () => {
  // Disable logs in production
  if (!__DEV__) {
    console.log = () => {};
    console.warn = () => {};
    console.info = () => {};
    console.debug = () => {};
  }

  return (
    <Provider store={store}>
      <ThemeProvider>
        <LanguageProvider>
          <NavigationContainer>
            <ToastProvider>
              <AppNavigator />
            </ToastProvider>
          </NavigationContainer>
        </LanguageProvider>
      </ThemeProvider>
    </Provider>
  );
};

export default App;
