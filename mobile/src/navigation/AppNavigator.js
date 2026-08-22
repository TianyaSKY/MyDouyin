import React from 'react';
import { View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuthContext } from '../contexts/AuthContext';
import { colors, fontSize } from '../constants/theme';

import LoginScreen from '../screens/LoginScreen';
import InterestScreen from '../screens/InterestScreen';
import FeedScreen from '../screens/FeedScreen';
import ProfileScreen from '../screens/ProfileScreen';
import UploadScreen from '../screens/UploadScreen';
import CommentScreen from '../screens/CommentScreen';
import DashboardScreen from '../screens/DashboardScreen';
import SingleVideoScreen from '../screens/SingleVideoScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

/* ─── Bottom Tab Navigator ─── */
function MainTabs() {
  const { user } = useAuthContext();
  const isAdmin = user?.is_admin === 1;
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'rgba(0,0,0,0.95)',
          borderTopWidth: 0,
          height: 60,
          paddingBottom: 8,
          paddingTop: 4,
          position: 'absolute',
          elevation: 0,
        },
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.4)',
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Feed') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Dashboard') {
            iconName = focused ? 'analytics' : 'analytics-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }
          return <Ionicons name={iconName} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Feed"
        component={FeedScreen}
        options={{ tabBarLabel: '首页' }}
      />
      <Tab.Screen
        name="Upload"
        component={UploadScreen}
        options={{
          tabBarLabel: '',
          tabBarIcon: ({ focused }) => (
            <View style={styles.uploadBtn}>
              <Ionicons name="add" size={22} color="black" />
            </View>
          ),
        }}
      />
      {isAdmin && (
        <Tab.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{ tabBarLabel: '数据' }}
        />
      )}
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: '我' }}
      />
    </Tab.Navigator>
  );
}

/* ─── Root Navigator ─── */
export default function AppNavigator() {
  const { token, checkingAuth } = useAuthContext();

  if (checkingAuth) {
    return (
      <View style={styles.loadingScreen}>
        <Ionicons name="musical-notes" size={48} color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        {!token ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen
              name="Interest"
              component={InterestScreen}
              options={{ animation: 'slide_from_bottom' }}
            />
          </>
        ) : (
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen
              name="Comments"
              component={CommentScreen}
              options={{
                animation: 'slide_from_bottom',
                presentation: 'modal',
              }}
            />
            <Stack.Screen
              name="UserProfile"
              component={ProfileScreen}
            />
            <Stack.Screen
              name="SingleVideo"
              component={SingleVideoScreen}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadBtn: {
    width: 38,
    height: 26,
    borderRadius: 6,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
});
