import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MessageCircle, Search, Shield, ShieldAlert, ShieldCheck, User as UserIcon, Users } from 'lucide-react-native';
import AuthFlowScreen from '../screens/auth/AuthFlowScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';
import HomeScreen from '../screens/home/HomeScreen';
import StatusScreen from '../screens/home/StatusScreen';
import MessagesScreen from '../screens/messages/MessagesScreen';
import ChatScreen from '../screens/messages/ChatScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import PremiumScreen from '../screens/premium/PremiumScreen';
import LikesReceivedScreen from '../screens/premium/LikesReceivedScreen';
import LikesInboxScreen from '../screens/premium/LikesInboxScreen';
import VerifyScreen from '../screens/verify/VerifyScreen';
import BoostScreen from '../screens/boost/BoostScreen';
import DiscoverGridScreen from '../screens/discover/DiscoverGridScreen';
import BoostedProfileDetailScreen from '../screens/profile/BoostedProfileDetailScreen';
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
  AdminStack: undefined;
  AdminUserList: undefined;
  AdminModeration: undefined;
  AdminKyc: undefined;
  Chat: { userId: string; matchId?: string };
  CommunityChat: { communityId: string; communityName: string };
  Premium: undefined;
  LikesReceived: undefined;
  LikesInbox: undefined;
  Verify: undefined;
  Boost: undefined;
  DiscoverGrid: { includeSelf?: boolean } | undefined;
  ProfileDetail: { profile: ProfileDetailParam };
  AdminAuditLogs: undefined;
  AdminMessaging: undefined;
  Status: undefined;
};

export type ProfileDetailParam = {
  id: string;
  name: string;
  age: number;
  gender?: string | null;
  bio?: string | null;
  city?: string | null;
  country?: string | null;
  photos?: string[] | null;
  interests?: string[] | null;
  is_verified?: boolean;
  is_premium?: boolean;
  boosted_until?: string | null;
  relationship_goal?: string | null;
  distance_km?: number | null;
};

type UserTabParamList = {
  DiscoverTab: undefined;
  CommunityTab: undefined;
  MessagesTab: undefined;
  ProfileTab: undefined;
};

type AdminStackParamList = {
  AdminTabs: undefined;
  AdminUserList: undefined;
  AdminModeration: undefined;
  AdminKyc: undefined;
  AdminAuditLogs: undefined;
  AdminMessaging: undefined;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();
const UserTab = createBottomTabNavigator<UserTabParamList>();
const AdminStack = createNativeStackNavigator<AdminStackParamList>();

const linking = {
  prefixes: ['yamo://'],
  config: {
    screens: {
      ResetPassword: 'reset-password',
    },
  },
};

const UserTabNavigator = () => (
  <UserTab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: COLORS.primary,
      tabBarInactiveTintColor: '#cbd5f5',
      tabBarStyle: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 8, height: 80 },
      tabBarLabelStyle: { fontWeight: '700', fontSize: 12 },
    }}
  >
    <UserTab.Screen
      name="DiscoverTab"
      component={HomeScreen}
      options={{ title: 'Découvrir', tabBarIcon: ({ color, size }) => <Search color={color} size={size} /> }}
    />
    <UserTab.Screen
      name="CommunityTab"
      component={CommunityScreen}
      options={{ title: 'Communauté', tabBarIcon: ({ color, size }) => <Users color={color} size={size} /> }}
    />
    <UserTab.Screen
      name="MessagesTab"
      component={MessagesScreen}
      options={{ title: 'Messages', tabBarIcon: ({ color, size }) => <MessageCircle color={color} size={size} /> }}
    />
    <UserTab.Screen
      name="ProfileTab"
      component={ProfileScreen}
      options={{ title: 'Profil', tabBarIcon: ({ color, size }) => <UserIcon color={color} size={size} /> }}
    />
  </UserTab.Navigator>
);

const AdminStackNavigator = () => (
  <AdminStack.Navigator
    screenOptions={{
      headerTintColor: COLORS.primary,
      headerBackTitle: 'Retour',
      headerShadowVisible: false,
      headerStyle: { backgroundColor: COLORS.bg },
      headerTitleStyle: { color: COLORS.ink, fontWeight: '800' },
    }}
  >
    <AdminStack.Screen name="AdminTabs" component={AdminDashboardScreen} options={{ title: 'Dashboard' }} />
    <AdminStack.Screen name="AdminUserList" component={UserListScreen} options={{ title: 'Utilisateurs' }} />
    <AdminStack.Screen name="AdminModeration" component={AdminModerationScreen} options={{ title: 'Modération & RGPD' }} />
    <AdminStack.Screen name="AdminKyc" component={AdminKycScreen} options={{ title: 'Revues KYC' }} />
    <AdminStack.Screen name="AdminAuditLogs" component={AdminAuditLogScreen} options={{ title: 'Audit' }} />
    <AdminStack.Screen name="AdminMessaging" component={AdminMessagingScreen} options={{ title: 'Messages admin' }} />
  </AdminStack.Navigator>
);

const MainNavigator: React.FC = () => {
  const { currentUser, isAuthenticated } = useApp();
  const isAdmin = !!currentUser?.is_admin;

  return (
    <NavigationContainer linking={linking}>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <>
            <RootStack.Screen name="AuthFlow" component={AuthFlowScreen} />
            <RootStack.Screen name="ResetPassword" component={ResetPasswordScreen} />
          </>
        ) : isAdmin ? (
          <RootStack.Screen name="AdminStack" component={AdminStackNavigator} />
        ) : (
          <>
            <RootStack.Screen name="MainTabs" component={UserTabNavigator} />
            <RootStack.Screen name="Chat" component={ChatScreen} />
            <RootStack.Screen name="CommunityChat" component={CommunityChatScreen} />
            <RootStack.Screen name="Premium" component={PremiumScreen} />
            <RootStack.Screen name="LikesReceived" component={LikesReceivedScreen} />
            <RootStack.Screen name="LikesInbox" component={LikesInboxScreen} />
            <RootStack.Screen name="Verify" component={VerifyScreen} />
            <RootStack.Screen name="Boost" component={BoostScreen} />
            <RootStack.Screen name="DiscoverGrid" component={DiscoverGridScreen} />
            <RootStack.Screen name="ProfileDetail" component={BoostedProfileDetailScreen} />
            <RootStack.Screen name="Status" component={StatusScreen} />
          </>
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
};

export default MainNavigator;
