import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MessageCircle, Search, Shield, ShieldAlert, ShieldCheck, User as UserIcon, Users } from 'lucide-react-native';
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
  AdminStack: undefined;
  Chat: { userId: string; matchId: string };
  CommunityChat: { communityId: string; communityName: string };
  Premium: undefined;
  LikesReceived: undefined;
  Verify: undefined;
  Boost: undefined;
  DiscoverGrid: undefined;
  AdminAuditLogs: undefined;
  AdminMessaging: undefined;
};

type UserTabParamList = {
  DiscoverTab: undefined;
  CommunityTab: undefined;
  MessagesTab: undefined;
  ProfileTab: undefined;
};

type AdminStackParamList = {
  AdminTabs: undefined;
  AdminAuditLogs: undefined;
  AdminMessaging: undefined;
};

type AdminTabParamList = {
  AdminDashboardTab: undefined;
  AdminUsersTab: undefined;
  AdminModerationTab: undefined;
  AdminKycTab: undefined;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();
const UserTab = createBottomTabNavigator<UserTabParamList>();
const AdminStack = createNativeStackNavigator<AdminStackParamList>();
const AdminTab = createBottomTabNavigator<AdminTabParamList>();

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

const UserTabNavigator = () => (
  <UserTab.Navigator
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
    <UserTab.Screen
      name="DiscoverTab"
      component={HomeScreen}
      options={{
        title: 'Découvrir',
        tabBarIcon: ({ color, size }) => <Search color={color} size={size} />,
      }}
    />
    <UserTab.Screen
      name="CommunityTab"
      component={CommunityScreen}
      options={{
        title: 'Communauté',
        tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
      }}
    />
    <UserTab.Screen
      name="MessagesTab"
      component={MessagesScreen}
      options={{
        title: 'Messages',
        tabBarIcon: ({ color, size }) => <MessageCircle color={color} size={size} />,
      }}
    />
    <UserTab.Screen
      name="ProfileTab"
      component={ProfileScreen}
      options={{
        title: 'Profil',
        tabBarIcon: ({ color, size }) => <UserIcon color={color} size={size} />,
      }}
    />
  </UserTab.Navigator>
);

const AdminTabNavigator = () => (
  <AdminTab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: '#7f1d1d',
      tabBarInactiveTintColor: '#94a3b8',
      tabBarStyle: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 8,
        height: 80,
        backgroundColor: '#fffaf5',
      },
      tabBarLabelStyle: {
        fontWeight: '700',
        fontSize: 12,
      },
    }}
  >
    <AdminTab.Screen
      name="AdminDashboardTab"
      component={AdminDashboardScreen}
      options={{
        title: 'Dashboard',
        tabBarIcon: ({ color, size }) => <Shield color={color} size={size} />,
      }}
    />
    <AdminTab.Screen
      name="AdminUsersTab"
      component={UserListScreen}
      options={{
        title: 'Utilisateurs',
        tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
      }}
    />
    <AdminTab.Screen
      name="AdminModerationTab"
      component={AdminModerationScreen}
      options={{
        title: 'Modération',
        tabBarIcon: ({ color, size }) => <ShieldAlert color={color} size={size} />,
      }}
    />
    <AdminTab.Screen
      name="AdminKycTab"
      component={AdminKycScreen}
      options={{
        title: 'KYC',
        tabBarIcon: ({ color, size }) => <ShieldCheck color={color} size={size} />,
      }}
    />
  </AdminTab.Navigator>
);

const AdminStackNavigator = () => (
  <AdminStack.Navigator
    screenOptions={{
      headerTintColor: COLORS.primary,
      headerBackTitle: 'Retour',
      headerShadowVisible: false,
      headerStyle: {
        backgroundColor: COLORS.bg,
      },
      headerTitleStyle: {
        color: COLORS.ink,
        fontWeight: '800',
      },
    }}
  >
    <AdminStack.Screen
      name="AdminTabs"
      component={AdminTabNavigator}
      options={{ headerShown: false }}
    />
    <AdminStack.Screen
      name="AdminAuditLogs"
      component={AdminAuditLogScreen}
      options={{ title: 'Audit' }}
    />
    <AdminStack.Screen
      name="AdminMessaging"
      component={AdminMessagingScreen}
      options={{ title: 'Messages admin' }}
    />
  </AdminStack.Navigator>
);

const MainNavigator: React.FC<NavigatorProps> = ({ isAuthenticated }) => {
  const { currentUser } = useApp();
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
          <>
            <RootStack.Screen name="AdminStack" component={AdminStackNavigator} />
            <RootStack.Screen name="ResetPassword" component={ResetPasswordScreen} />
          </>
        ) : (
          <>
            <RootStack.Screen name="MainTabs" component={UserTabNavigator} />
            <RootStack.Screen name="Chat" component={ChatScreen} />
            <RootStack.Screen name="CommunityChat" component={CommunityChatScreen} />
            <RootStack.Screen name="Premium" component={PremiumScreen} />
            <RootStack.Screen name="LikesReceived" component={LikesReceivedScreen} />
            <RootStack.Screen name="Verify" component={VerifyScreen} />
            <RootStack.Screen name="Boost" component={BoostScreen} />
            <RootStack.Screen name="DiscoverGrid" component={DiscoverGridScreen} />
            <RootStack.Screen name="ResetPassword" component={ResetPasswordScreen} />
          </>
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
};

export default MainNavigator;
