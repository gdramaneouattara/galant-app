import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MessageCircle, Search, User as UserIcon } from 'lucide-react-native';
import AuthFlowScreen from '../screens/auth/AuthFlowScreen';
import HomeScreen from '../screens/home/HomeScreen';
import MessagesScreen from '../screens/messages/MessagesScreen';
import ChatScreen from '../screens/messages/ChatScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import PremiumScreen from '../screens/premium/PremiumScreen';
import VerifyScreen from '../screens/verify/VerifyScreen';
import { COLORS } from '../data/mock';

export type RootStackParamList = {
  AuthFlow: undefined;
  MainTabs: undefined;
  Chat: { userId: string; matchId: string };
  Premium: undefined;
  Verify: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

type NavigatorProps = {
  isAuthenticated: boolean;
};

const TabNavigator = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: COLORS.primary,
      tabBarInactiveTintColor: '#cbd5f5',
      tabBarStyle: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 8,
        height: 80,
      },
      tabBarLabelStyle: {
        fontWeight: '700',
        fontSize: 12,
      },
    }}
  >
    <Tab.Screen
      name="Découvrir"
      component={HomeScreen}
      options={{
        tabBarIcon: ({ color, size }) => <Search color={color} size={size} />,
      }}
    />
    <Tab.Screen
      name="Messages"
      component={MessagesScreen}
      options={{
        tabBarIcon: ({ color, size }) => <MessageCircle color={color} size={size} />,
      }}
    />
    <Tab.Screen
      name="Profil"
      component={ProfileScreen}
      options={{
        tabBarIcon: ({ color, size }) => <UserIcon color={color} size={size} />,
      }}
    />
  </Tab.Navigator>
);

const MainNavigator: React.FC<NavigatorProps> = ({ isAuthenticated }) => (
  <NavigationContainer>
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <Stack.Screen name="AuthFlow" component={AuthFlowScreen} />
      ) : (
        <>
          <Stack.Screen name="MainTabs" component={TabNavigator} />
          <Stack.Screen name="Chat" component={ChatScreen} />
          <Stack.Screen name="Premium" component={PremiumScreen} />
          <Stack.Screen name="Verify" component={VerifyScreen} />
        </>
      )}
    </Stack.Navigator>
  </NavigationContainer>
);

export default MainNavigator;
