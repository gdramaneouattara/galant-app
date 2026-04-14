import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MessageCircle, Search, User as UserIcon, Shield, Users } from 'lucide-react-native';
import AuthFlowScreen from '../screens/auth/AuthFlowScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';
import HomeScreen from '../screens/home/HomeScreen';
import MessagesScreen from '../screens/messages/MessagesScreen';
import ChatScreen from '../screens/messages/ChatScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import PremiumScreen from '../screens/premium/PremiumScreen';
import LikesReceivedScreen from '../screens/premium/LikesReceivedScreen';
import VerifyScreen from '../screens/verify/VerifyScreen';
import BoostScreen from '../screens/boost/BoostScreen';
import DiscoverGridScreen from '../screens/discover/DiscoverGridScreen';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import UserListScreen from '../screens/admin/UserListScreen';
import AdminModerationScreen from '../screens/admin/AdminModerationScreen';
import AdminKycScreen from '../screens/admin/AdminKycScreen';
import AdminAuditLogScreen from '../screens/admin/AdminAuditLogScreen';
import AdminMessagingScreen from '../screens/admin/AdminMessagingScreen';
import CommunityScreen from '../screens/community/CommunityScreen';
import CommunityChatScreen from '../screens/community/CommunityChatScreen';
import { COLORS } from '../data/mock';
import { useApp } from '../state/AppContext';

export type RootStackParamList = {
  AuthFlow: undefined;
  ResetPassword: undefined;
  MainTabs: undefined;
  Chat: { userId: string; matchId: string };
  CommunityChat: { communityId: string; communityName: string };
  Premium: undefined;
  LikesReceived: undefined;
  Verify: undefined;
  Boost: undefined;
  DiscoverGrid: undefined;
  AdminDashboard: undefined;
  AdminUserList: undefined;
  AdminModeration: undefined;
  AdminKyc: undefined;
  AdminAuditLogs: undefined;
  AdminMessaging: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

const linking = {
  prefixes: ['yamo://'],
  config: {
    screens: {
      ResetPassword: 'reset-password',
    },
  },
};

type NavigatorProps = {
  isAuthenticated: boolean;
};

const AdminNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
    <Stack.Screen name="AdminUserList" component={UserListScreen} />
    <Stack.Screen name="AdminModeration" component={AdminModerationScreen} />
    <Stack.Screen name="AdminKyc" component={AdminKycScreen} />
    <Stack.Screen name="AdminAuditLogs" component={AdminAuditLogScreen} />
    <Stack.Screen name="AdminMessaging" component={AdminMessagingScreen} />
  </Stack.Navigator>
);

const TabNavigator = () => {
  const { currentUser } = useApp();

  return (
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
        name="Communauté"
        component={CommunityScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
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
      {currentUser?.is_admin && (
        <Tab.Screen
          name="Admin"
          component={AdminNavigator}
          options={{
            tabBarIcon: ({ color, size }) => <Shield color={color} size={size} />,
          }}
        />
      )}
    </Tab.Navigator>
  );
};

const MainNavigator: React.FC<NavigatorProps> = ({ isAuthenticated }) => (
  <NavigationContainer linking={linking}>
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <>
          <Stack.Screen name="AuthFlow" component={AuthFlowScreen} />
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="MainTabs" component={TabNavigator} />
          <Stack.Screen name="Chat" component={ChatScreen} />
          <Stack.Screen name="CommunityChat" component={CommunityChatScreen} />
          <Stack.Screen name="Premium" component={PremiumScreen} />
          <Stack.Screen name="LikesReceived" component={LikesReceivedScreen} />
          <Stack.Screen name="Verify" component={VerifyScreen} />
          <Stack.Screen name="Boost" component={BoostScreen} />
          <Stack.Screen name="DiscoverGrid" component={DiscoverGridScreen} />
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        </>
      )}
    </Stack.Navigator>
  </NavigationContainer>
);

export default MainNavigator;
