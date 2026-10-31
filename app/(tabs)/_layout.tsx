// import { SyncBadge } from '@/components/SyncBadge';
import { Colors, Spacing } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { Tabs, usePathname, useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function CustomTopHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const allTabs = [
    { name: 'form', label: 'Registrar', icon: 'create', path: '/form' },
    { name: 'records', label: 'Registros', icon: 'list', path: '/records' },
    { name: 'profile', label: 'Perfil', icon: 'person', path: '/profile' },
  ];

  return (
    <SafeAreaView edges={['top']} style={styles.topBarContainer}>
      <View style={styles.headerRow}>
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Ionicons name="people-circle" size={24} color={Colors.white} />
          </View>
          <Text style={styles.appName}>Elim<Text style={{ color: Colors.gold }}>APP</Text></Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.onlineStatus} />
        </View>
      </View>

      <View style={styles.tabsRow}>
        {allTabs.map((tab) => {
          const isFocused = pathname.includes(tab.path);
          return (
            <TouchableOpacity
              key={tab.name}
              onPress={() => router.push(tab.path as any)}
              style={styles.tabButton}
              activeOpacity={0.7}
            >
              <Ionicons
                name={(isFocused ? tab.icon : `${tab.icon}-outline`) as any}
                size={20}
                color={isFocused ? Colors.primary : Colors.textMuted}
              />
              <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
                {tab.label}
              </Text>
              {isFocused && <View style={styles.activeIndicator} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

export default function TabLayout() {

  return (
    <View style={{ flex: 1 }}>
      <CustomTopHeader />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: 'none' },
        }}
      >
        <Tabs.Screen name="index" options={{ href: null }} />
        <Tabs.Screen name="form" />
        <Tabs.Screen name="records" />
        <Tabs.Screen name="profile" />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  topBarContainer: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
    elevation: 4,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 100,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appName: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: -0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  onlineStatus: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.success,
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.sm,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: 2,
    position: 'relative',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  tabLabelActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '20%',
    right: '20%',
    height: 3,
    backgroundColor: Colors.gold,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  }
});
