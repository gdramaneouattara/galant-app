import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MessageCircle, Search, Shield, ShieldAlert, ShieldCheck, User as UserIcon, Calendar, MapPin } from 'lucide-react-native';
import AuthFlowScreen from '../screens/auth/AuthFlowScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';
import HomeScreen from '../screens/home/HomeScreen';
import StatusScreen from '../screens/home/StatusScreen';
import MessagesScreen from '../screens/messages/MessagesScreen';
import ChatScreen from '../screens/messages/ChatScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import GuideScreen from '../screens/guide/GuideScreen';
import VenueDetailScreen from '../screens/guide/VenueDetailScreen';
import AgendaScreen from '../screens/agenda/AgendaScreen';
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
import AdminMessagingScreen from '../screens/admin/AdminMessagingScreen';
import AdminVenueModerationScreen from '../screens/admin/AdminVenueModerationScreen';
import PartnerDashboardScreen from '../screens/partner/PartnerDashboardScreen';
import PartnerPremiumScreen from '../screens/partner/PartnerPremiumScreen';
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
  Chat: { userId: string; matchId?: string; venueChatId?: string; venueName?: string; venuePhoto?: string };
  Premium: undefined;
  LikesReceived: undefined;
  LikesInbox: undefined;
  Verify: undefined;
  Boost: undefined;
  DiscoverGrid: { includeSelf?: boolean } | undefined;
  ProfileDetail: { profile: ProfileDetailParam };
  VenueDetail: { venue: any };
  AdminMessaging: undefined;
  AdminVenues: undefined;
  PartnerDashboard: undefined;
  PartnerPremium: undefined;
  Status: undefined;
};

export type ProfileDetailParam = {
  id: string;
  name: string;
  age?: number | null;
  gender?: string | null;
  bio?: string | null;
  city?: string | null;
  country?: string | null;
  photos?: string[] | null;
  interests?: string[] | null;
  is_verified?: boolean;
  is_premium?: boolean;
  galanterie_score?: number | null;
  boosted_until?: string | null;
  golden_rose_until?: string | null;
  relationship_goal?: string | null;
  distance_km?: number | null;
  roses_count?: number | null;
  last_active_at?: string | null;
  likes_count?: number | null;
};

type UserTabParamList = {
  DiscoverTab: undefined;
  AgendaTab: undefined;
  GuideTab: undefined;
  MessagesTab: undefined;
  ProfileTab: undefined;
};

type AdminStackParamList = {
  AdminTabs: undefined;
  AdminUserList: undefined;
  AdminModeration: undefined;
  AdminKyc: undefined;
  AdminMessaging: undefined;
  AdminVenues: undefined;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();
const UserTab = createBottomTabNavigator<UserTabParamList>();
const AdminStack = createNativeStackNavigator<AdminStackParamList>();

const linking = {
  prefixes: ['galant://'],
  config: {
    screens: {
      ResetPassword: 'reset-password',
    },
  },
};

const UserTabNavigator = () => {
  const { colors, activeTheme, t } = useApp();
  return (
    <UserTab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: activeTheme === 'dark' ? '#334155' : '#cbd5f5',
        tabBarStyle: {
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          paddingTop: 8,
          height: 80,
          backgroundColor: colors.card,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: { fontWeight: '700', fontSize: 12 },
      }}
    >
      <UserTab.Screen
        name="DiscoverTab"
        component={HomeScreen}
        options={{ title: t('discover'), tabBarIcon: ({ color, size }) => <Search color={color} size={size} /> }}
      />
      <UserTab.Screen
        name="AgendaTab"
        component={AgendaScreen}
        options={{ title: t('agenda'), tabBarIcon: ({ color, size }) => <Calendar color={color} size={size} /> }}
      />
      <UserTab.Screen
        name="GuideTab"
        component={GuideScreen}
        options={{ title: t('guide'), tabBarIcon: ({ color, size }) => <MapPin color={color} size={size} /> }}
      />
      <UserTab.Screen
        name="MessagesTab"
        component={MessagesScreen}
        options={{ title: t('messages'), tabBarIcon: ({ color, size }) => <MessageCircle color={color} size={size} /> }}
      />
      <UserTab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{ title: t('profile'), tabBarIcon: ({ color, size }) => <UserIcon color={color} size={size} /> }}
      />
    </UserTab.Navigator>
  );
};

const AdminStackNavigator = () => {
  const { colors } = useApp();
  return (
    <AdminStack.Navigator
      screenOptions={{
        headerTintColor: COLORS.primary,
        headerBackTitle: 'Retour',
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.header },
        headerTitleStyle: { color: colors.text, fontWeight: '800' },
      }}
    >
      <AdminStack.Screen name="AdminTabs" component={AdminDashboardScreen} options={{ title: 'Dashboard' }} />
      <AdminStack.Screen name="AdminUserList" component={UserListScreen} options={{ title: 'Utilisateurs' }} />
      <AdminStack.Screen name="AdminModeration" component={AdminModerationScreen} options={{ title: 'Modération & RGPD' }} />
      <AdminStack.Screen name="AdminKyc" component={AdminKycScreen} options={{ title: 'Revues KYC' }} />
      <AdminStack.Screen name="AdminMessaging" component={AdminMessagingScreen} options={{ title: 'Messages admin' }} />
      <AdminStack.Screen name="AdminVenues" component={AdminVenueModerationScreen} options={{ title: 'Partenaires Venues' }} />
    </AdminStack.Navigator>
  );
};

const MainNavigator: React.FC = () => {
  const { currentUser, isAuthenticated } = useApp();
  const isAdmin = !!currentUser?.is_admin;
  const isPartner = !!currentUser?.is_partner;

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
        ) : isPartner ? (
          <>
            <RootStack.Screen name="PartnerDashboard" component={PartnerDashboardScreen} />
            <RootStack.Screen name="PartnerPremium" component={PartnerPremiumScreen} />
            <RootStack.Screen name="Chat" component={ChatScreen} />
            <RootStack.Screen name="VenueDetail" component={VenueDetailScreen} />
          </>
        ) : (
          <>
            <RootStack.Screen name="MainTabs" component={UserTabNavigator} />
            <RootStack.Screen name="Chat" component={ChatScreen} />
            <RootStack.Screen name="Premium" component={PremiumScreen} />
            <RootStack.Screen name="LikesReceived" component={LikesReceivedScreen} />
            <RootStack.Screen name="LikesInbox" component={LikesInboxScreen} />
            <RootStack.Screen name="Verify" component={VerifyScreen} />
            <RootStack.Screen name="Boost" component={BoostScreen} />
            <RootStack.Screen name="DiscoverGrid" component={DiscoverGridScreen} />
            <RootStack.Screen name="ProfileDetail" component={BoostedProfileDetailScreen} />
            <RootStack.Screen name="VenueDetail" component={VenueDetailScreen} />
            <RootStack.Screen name="Status" component={StatusScreen} />
          </>
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
};

export default MainNavigator;
